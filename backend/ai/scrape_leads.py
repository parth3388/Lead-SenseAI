"""Scrape configured lead sources and append model-ready rows to data.csv.

The script intentionally uses the Python standard library so it can run in this
project without extra installation steps. Configure sources in JSON, then run:

    python ai/scrape_leads.py --config ai/scraper_config.json
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import html
import json
import re
import time
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib import robotparser
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen


CSV_COLUMNS = ["visits", "timeSpent", "budget", "urgencyScore", "converted"]
DEFAULT_USER_AGENT = "LeadSenseAI/1.0 (+https://localhost)"
SAFE_AUTO_SOURCES = [
    {
        "name": "Scraping demo page",
        "url": "https://quotes.toscrape.com/",
        "defaultBudget": 1_000_000,
        "defaultUrgency": 4,
        "converted": -1,
    },
    {
        "name": "Public test e-commerce page",
        "url": "https://webscraper.io/test-sites/e-commerce/allinone",
        "defaultBudget": 1_500_000,
        "defaultUrgency": 5,
        "converted": -1,
    },
]

EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
PHONE_RE = re.compile(r"(?:\+?\d[\d\s().-]{7,}\d)")
BUDGET_RE = re.compile(
    r"(?:budget|price|amount|cost|rs\.?|inr|₹|\$)\s*[:\-]?\s*(₹|\$|rs\.?|inr)?\s*([0-9][0-9,]*(?:\.\d+)?)\s*(lakh|lac|cr|crore|k|m|million)?",
    re.IGNORECASE,
)
AREA_RE = re.compile(r"([0-9][0-9,]*)\s*(?:sq\.?\s*ft|sqft|square\s*feet)", re.IGNORECASE)
URGENT_RE = re.compile(r"\b(urgent|immediate|asap|today|hot|ready to buy|book now)\b", re.IGNORECASE)
MEDIUM_INTENT_RE = re.compile(r"\b(interested|callback|call back|visit|schedule|enquiry|inquiry)\b", re.IGNORECASE)


class TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._skip_depth = 0
        self.parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"script", "style", "noscript", "svg"}:
            self._skip_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style", "noscript", "svg"} and self._skip_depth:
            self._skip_depth -= 1

    def handle_data(self, data: str) -> None:
        if not self._skip_depth:
            value = " ".join(html.unescape(data).split())
            if value:
                self.parts.append(value)

    def text(self) -> str:
        return " ".join(self.parts)


@dataclass
class SourceResult:
    name: str
    url: str
    status: str
    rows_found: int = 0
    rows_added: int = 0
    duplicates: int = 0
    reason: str | None = None


def load_config(config_path: Path) -> dict[str, Any]:
    if not config_path.exists():
        raise FileNotFoundError(f"Config file not found: {config_path}")

    with config_path.open("r", encoding="utf-8") as file:
        config = json.load(file)

    has_sources = isinstance(config.get("sources"), list) and bool(config["sources"])
    has_auto_sources = bool(config.get("autoSelectSources"))

    if not has_sources and not has_auto_sources:
        raise ValueError("Config must contain a non-empty 'sources' array or autoSelectSources=true.")

    return config


def select_sources(config: dict[str, Any]) -> list[dict[str, Any]]:
    if isinstance(config.get("sources"), list) and config["sources"]:
        return config["sources"]

    catalog = config.get("sourceCatalog")
    if not isinstance(catalog, list) or not catalog:
        catalog = SAFE_AUTO_SOURCES

    enabled_sources = [
        source for source in catalog if source.get("enabled", True) and source.get("url")
    ]
    max_sources = int(config.get("maxAutoSources", 3))
    return enabled_sources[:max_sources]


def can_fetch(url: str, user_agent: str) -> tuple[bool, str | None]:
    parsed = urlparse(url)
    robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
    parser = robotparser.RobotFileParser(robots_url)

    try:
        parser.read()
    except Exception as exc:  # robotparser swallows many network details.
        return True, f"robots.txt unavailable: {exc}"

    return parser.can_fetch(user_agent, url), None


def fetch_html(url: str, user_agent: str, timeout: int) -> str:
    request = Request(
        url,
        headers={
            "User-Agent": user_agent,
            "Accept": "text/html,application/xhtml+xml",
        },
    )

    with urlopen(request, timeout=timeout) as response:
        content_type = response.headers.get("content-type", "")
        if "text/html" not in content_type and "application/xhtml+xml" not in content_type:
            raise ValueError(f"Unsupported content type: {content_type or 'unknown'}")

        charset = response.headers.get_content_charset() or "utf-8"
        return response.read().decode(charset, errors="replace")


def extract_text(markup: str) -> str:
    parser = TextExtractor()
    parser.feed(markup)
    return parser.text()


def parse_budget(text: str, default_budget: int) -> int:
    budgets: list[int] = []

    for match in BUDGET_RE.finditer(text):
        number = float(match.group(2).replace(",", ""))
        unit = (match.group(3) or "").lower()

        if unit in {"lakh", "lac"}:
            number *= 100_000
        elif unit in {"cr", "crore"}:
            number *= 10_000_000
        elif unit == "k":
            number *= 1_000
        elif unit in {"m", "million"}:
            number *= 1_000_000

        budgets.append(int(number))

    if budgets:
        return max(budgets)

    return default_budget


def estimate_urgency(text: str, default_urgency: int) -> int:
    if URGENT_RE.search(text):
        return 9
    if MEDIUM_INTENT_RE.search(text):
        return max(default_urgency, 6)
    return default_urgency


def estimate_time_spent(text: str, contacts_count: int) -> int:
    word_count = len(text.split())
    return max(3, min(45, round(word_count / 90) + contacts_count * 2))


def estimate_visits(text: str, contacts_count: int) -> int:
    areas = AREA_RE.findall(text)
    return max(1, min(30, contacts_count + len(areas) + len(MEDIUM_INTENT_RE.findall(text))))


def estimate_converted(text: str, budget: int, urgency: int, source_default: int) -> int:
    if source_default in {0, 1}:
        return source_default

    if urgency >= 8 and budget >= 2_500_000:
        return 1
    if re.search(r"\b(booked|converted|paid|confirmed)\b", text, re.IGNORECASE):
        return 1
    return 0


def build_rows(source: dict[str, Any], page_text: str) -> list[dict[str, int | str]]:
    default_budget = int(source.get("defaultBudget", 1_000_000))
    default_urgency = int(source.get("defaultUrgency", 5))
    source_default_converted = int(source.get("converted", -1))
    contacts = sorted(set(EMAIL_RE.findall(page_text) + PHONE_RE.findall(page_text)))
    contacts_count = max(1, len(contacts))
    budget = parse_budget(page_text, default_budget)
    urgency = estimate_urgency(page_text, default_urgency)
    time_spent = estimate_time_spent(page_text, contacts_count)
    visits = estimate_visits(page_text, contacts_count)
    converted = estimate_converted(page_text, budget, urgency, source_default_converted)

    rows = []
    for index in range(contacts_count):
        contact = contacts[index] if contacts else f"{source.get('url')}#lead"
        rows.append(
            {
                "visits": visits + index,
                "timeSpent": time_spent,
                "budget": budget,
                "urgencyScore": urgency,
                "converted": converted,
                "_fingerprint": fingerprint(source.get("url", ""), contact, budget),
            }
        )

    return rows


def fingerprint(url: str, contact: str, budget: int) -> str:
    raw = f"{url}|{contact}|{budget}".lower().encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def load_fingerprints(path: Path) -> set[str]:
    if not path.exists():
        return set()

    with path.open("r", encoding="utf-8") as file:
        data = json.load(file)

    if isinstance(data, list):
        return set(str(item) for item in data)

    return set()


def save_fingerprints(path: Path, values: set[str]) -> None:
    path.write_text(json.dumps(sorted(values), indent=2), encoding="utf-8")


def ensure_csv(csv_path: Path) -> None:
    if csv_path.exists():
        return

    csv_path.parent.mkdir(parents=True, exist_ok=True)
    with csv_path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=CSV_COLUMNS)
        writer.writeheader()


def append_rows(csv_path: Path, rows: list[dict[str, int | str]]) -> None:
    ensure_csv(csv_path)

    with csv_path.open("a", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=CSV_COLUMNS)
        for row in rows:
            writer.writerow({column: row[column] for column in CSV_COLUMNS})


def scrape(config: dict[str, Any], csv_path: Path, ignore_robots: bool = False) -> dict[str, Any]:
    user_agent = config.get("userAgent", DEFAULT_USER_AGENT)
    timeout = int(config.get("timeoutSeconds", 15))
    delay = float(config.get("delaySeconds", 1.0))
    sources = select_sources(config)
    fingerprint_path = csv_path.with_name(".scraped_lead_fingerprints.json")
    known_fingerprints = load_fingerprints(fingerprint_path)
    results: list[SourceResult] = []
    total_added = 0
    total_found = 0
    total_duplicates = 0

    for source in sources:
        name = source.get("name") or source.get("url")
        url = source.get("url")

        if not url:
            results.append(SourceResult(name=name or "unknown", url="", status="skipped", reason="Missing URL"))
            continue

        if not ignore_robots:
            allowed, robots_note = can_fetch(url, user_agent)
            if not allowed:
                results.append(SourceResult(name=name, url=url, status="skipped", reason="Blocked by robots.txt"))
                continue
        else:
            robots_note = None

        try:
            markup = fetch_html(url, user_agent, timeout)
            page_text = extract_text(markup)
            rows = build_rows(source, page_text)
            new_rows = [row for row in rows if row["_fingerprint"] not in known_fingerprints]
            duplicates = len(rows) - len(new_rows)

            append_rows(csv_path, new_rows)
            known_fingerprints.update(str(row["_fingerprint"]) for row in new_rows)

            total_found += len(rows)
            total_added += len(new_rows)
            total_duplicates += duplicates
            results.append(
                SourceResult(
                    name=name,
                    url=url,
                    status="ok",
                    rows_found=len(rows),
                    rows_added=len(new_rows),
                    duplicates=duplicates,
                    reason=robots_note,
                )
            )
        except (HTTPError, URLError, TimeoutError, ValueError) as exc:
            results.append(SourceResult(name=name, url=url, status="error", reason=str(exc)))

        time.sleep(delay)

    save_fingerprints(fingerprint_path, known_fingerprints)

    return {
        "csvPath": str(csv_path),
        "sourcesChecked": len(sources),
        "autoSelected": bool(config.get("autoSelectSources")) and not config.get("sources"),
        "rowsFound": total_found,
        "rowsAdded": total_added,
        "duplicatesSkipped": total_duplicates,
        "results": [result.__dict__ for result in results],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape lead sources into ai/data.csv")
    parser.add_argument("--config", default="ai/scraper_config.json", help="Path to scraper JSON config")
    parser.add_argument("--csv", default="ai/data.csv", help="Path to output CSV")
    parser.add_argument("--auto", action="store_true", help="Use the built-in safe source catalog when no sources are configured")
    parser.add_argument("--ignore-robots", action="store_true", help="Allow scraping even if robots.txt disallows it")
    args = parser.parse_args()

    config = load_config(Path(args.config))
    if args.auto:
        config["autoSelectSources"] = True
    result = scrape(config, Path(args.csv), ignore_robots=args.ignore_robots)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
