# LeadSense AI

LeadSense AI is organized as a small monorepo with separate application areas for the web app, Node.js backend, and Python lead-scoring service.

## Structure

```text
LeadSense-AI/
|- backend/                    # Express API, auth, lead management, AI endpoints
|- frontend/                   # Next.js customer flow and dashboard UI
|- services/
|  \- lead-scoring-api/        # FastAPI lead scoring service and ML assets
|     |- app/                  # Python API package
|     |- data/                 # Local database files
|     |- models/               # Serialized ML model files
|     \- scripts/              # Training and utility scripts
\- .gitignore
```

## Notes

- `frontend/app/` now contains only Next.js route files and frontend assets.
- The Python API that had been mixed into the frontend has been moved to `services/lead-scoring-api/`.
- Generated artifacts such as `.next`, `node_modules`, Python caches, logs, `.db`, and `.pkl` files are ignored at the repo level.

## Lead Scraping Ingestion

LeadSense can scrape configured lead pages and append model-ready rows to `backend/ai/data.csv`.

1. Copy `backend/ai/scraper_config.example.json` to `backend/ai/scraper_config.json`.
2. Replace the example URL with the sites you are allowed to scrape.
3. Run from `backend/`:

```bash
python ai/scrape_leads.py --config ai/scraper_config.json
```

You can also trigger it through the authenticated backend endpoint:

```http
POST /api/v1/scrape-leads
```

Example body:

```json
{
  "delaySeconds": 1,
  "sources": [
    {
      "name": "Partner leads page",
      "url": "https://example.com/leads",
      "defaultBudget": 1000000,
      "defaultUrgency": 5,
      "converted": -1
    }
  ]
}
```

The scraper respects `robots.txt` by default, deduplicates scraped contacts with `backend/ai/.scraped_lead_fingerprints.json`, and keeps the CSV schema as `visits,timeSpent,budget,urgencyScore,converted`.

For automatic source selection, set `autoSelectSources` to `true` and add approved sites to `sourceCatalog`, or run:

```bash
python ai/scrape_leads.py --config ai/scraper_config.json --auto
```
