const TYPE_CONFIG = {
  Office: {
    prefixes: ["Corporate", "Business", "Trade", "Executive", "Prime"],
    suffixes: ["Hub", "Tower", "Square", "Centre", "Arcade"],
    facilities: [
      ["Parking", "Lift", "Power backup", "Reception", "CCTV"],
      ["Visitor parking", "Conference room", "Pantry", "Security desk", "Wi-Fi"],
      ["Food court", "Lift", "Power backup", "Meeting room", "Reception lounge"],
      ["Road-facing lobby", "CCTV", "Generator backup", "Pantry", "Visitor seating"],
      ["Metro shuttle", "Security", "Parking", "Reception", "High-speed internet"],
    ],
    summaries: [
      "A practical office space for sales teams, consultants, and growing businesses.",
      "Well-positioned commercial inventory for daily operations and client meetings.",
      "An office address designed for visibility, efficiency, and reliable amenities.",
      "Smart office suites built for local businesses that need access and footfall.",
      "A ready-to-use office setup with essential business facilities and strong road access.",
    ],
    baseBudget: 4200000,
    budgetStep: 350000,
    minArea: 320,
    areaStep: 45,
  },
  Shop: {
    prefixes: ["Market", "Retail", "Highstreet", "Bazaar", "Trade"],
    suffixes: ["Plaza", "Galleria", "Square", "Market", "Point"],
    facilities: [
      ["Parking", "Front signage", "Security", "Washroom", "Daily footfall"],
      ["Corner visibility", "Storage room", "CCTV", "Parking", "Main road access"],
      ["Food court nearby", "Security", "Escalator access", "Washroom", "Signage zone"],
      ["High street frontage", "Parking", "Generator backup", "Security", "Footfall zone"],
      ["Ground floor access", "Washroom", "Storage space", "CCTV", "Road-facing entry"],
    ],
    summaries: [
      "A shop unit for local brands and businesses that need strong customer movement.",
      "Retail space with practical frontage for boutiques, electronics, or service counters.",
      "A commercial shop option built for visibility and steady market activity.",
      "Street-facing retail inventory suited for strong walk-in traffic and promotions.",
      "A shop location with usable frontage and convenient public access.",
    ],
    baseBudget: 3600000,
    budgetStep: 300000,
    minArea: 220,
    areaStep: 35,
  },
  Apartment: {
    prefixes: ["Skyline", "Green", "Royal", "Harmony", "Lakeview"],
    suffixes: ["Residency", "Heights", "Homes", "Enclave", "Residences"],
    facilities: [
      ["Clubhouse", "Parking", "Security gate", "Lift", "Children park"],
      ["Gym", "Power backup", "CCTV", "Community hall", "Parking"],
      ["Swimming pool", "Lift", "Clubhouse", "Security", "Garden"],
      ["Jogging track", "Parking", "Community lawn", "Power backup", "Lift"],
      ["Retail block", "Security gate", "Children play zone", "Lift", "Parking"],
    ],
    summaries: [
      "A modern apartment option for families looking for daily comfort and residential amenities.",
      "Well-balanced apartment living with community facilities and secure access.",
      "A residential apartment project with useful amenities for end users and investors.",
      "Comfort-focused apartment inventory with lifestyle facilities and easy access roads.",
      "An apartment development designed for practical family living and community comfort.",
    ],
    baseBudget: 5200000,
    budgetStep: 600000,
    minArea: 850,
    areaStep: 140,
  },
  Villa: {
    prefixes: ["Royal", "Palm", "Green", "Elite", "Heritage"],
    suffixes: ["Villas", "Estate", "Greens", "Residency", "Retreat"],
    facilities: [
      ["Clubhouse", "Private parking", "Security gate", "Garden", "Power backup"],
      ["Landscape park", "Clubhouse", "Wide roads", "CCTV", "Private lawn"],
      ["Sports zone", "Garden", "Security", "Clubhouse", "Parking"],
      ["Private driveway", "Power backup", "Security gate", "Children park", "Jogging track"],
      ["Corner plots", "Community hall", "Garden", "CCTV", "Clubhouse"],
    ],
    summaries: [
      "A spacious villa option for families who want privacy, comfort, and gated amenities.",
      "Premium villa inventory with larger layouts, community security, and green surroundings.",
      "A family-focused villa development built around lifestyle space and secure access.",
      "Low-density villa living with practical amenities and residential comfort.",
      "A premium villa address with generous layout planning and everyday convenience.",
    ],
    baseBudget: 18000000,
    budgetStep: 2200000,
    minArea: 1800,
    areaStep: 220,
  },
};

const LOCALITY_PARTS = [
  "Civil Lines",
  "Station Road",
  "Bypass Road",
  "City Center",
  "Ring Road",
  "Market Road",
  "Central Avenue",
  "Extension Zone",
  "Main Corridor",
  "Premium Block",
];

function toSlug(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function toTitleCase(value) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function formatPrice(value) {
  if (value >= 10000000) {
    return `Rs ${(value / 10000000).toFixed(1)} Cr`;
  }

  return `Rs ${Math.round(value / 100000)} Lac`;
}

function buildHighlights(type, areaSqFt) {
  if (type === "Office") {
    return [`${areaSqFt} sq ft`, "Road-facing", "Ready workspace"];
  }

  if (type === "Shop") {
    return [`${areaSqFt} sq ft`, "Ground access", "Retail frontage"];
  }

  if (type === "Apartment") {
    return [`${areaSqFt} sq ft`, "Family layout", "Gated living"];
  }

  return [`${areaSqFt} sq ft`, "Private layout", "Premium community"];
}

export function generatePropertiesForSearch({ city, propertyType, areaSqFt, budget }) {
  const cleanCity = toTitleCase(city || "Sample City");
  const selectedType = TYPE_CONFIG[propertyType] ? propertyType : "Office";
  const config = TYPE_CONFIG[selectedType];
  const requestedArea = Number(areaSqFt || 0);
  const requestedBudget = Number(budget || 0);
  const baseArea = requestedArea > 0 ? requestedArea : config.minArea;
  const baseBudget = requestedBudget > 0 ? requestedBudget : config.baseBudget;

  return Array.from({ length: 5 }, (_, index) => {
    const area = baseArea + (index - 2) * config.areaStep;
    const safeArea = Math.max(config.minArea, area);
    const numericBudget = Math.max(config.baseBudget, baseBudget + index * config.budgetStep);
    const prefix = config.prefixes[index % config.prefixes.length];
    const suffix = config.suffixes[index % config.suffixes.length];
    const title = `${cleanCity} ${prefix} ${suffix}`;
    const location = `${LOCALITY_PARTS[index % LOCALITY_PARTS.length]}, ${cleanCity}`;

    return {
      id: `${toSlug(cleanCity)}-${selectedType.toLowerCase()}-${index + 1}`,
      title,
      city: cleanCity,
      location,
      price: formatPrice(numericBudget),
      numericBudget,
      type: selectedType,
      areaSqFt: safeArea,
      summary: config.summaries[index % config.summaries.length],
      highlights: buildHighlights(selectedType, safeArea),
      facilities: config.facilities[index % config.facilities.length],
    };
  });
}
