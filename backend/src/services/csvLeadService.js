const fs = require("fs");
const path = require("path");

const NAMES = [
  "Vikas", "Rahul", "Priya", "Amit", "Sneha", "Arjun", "Neha", "Karan", "Pooja", "Rohan",
  "Ananya", "Suresh", "Meera", "Aditya", "Kavya", "Manish", "Isha", "Vivek", "Simran", "Nitin",
];

const LOCATIONS = [
  "Delhi", "Mumbai", "Bengaluru", "Pune", "Hyderabad", "Chennai", "Gurgaon", "Noida", "Ahmedabad", "Kolkata",
];

const SOURCES = ["Website", "Facebook", "Google Ads", "Referral", "Demo Website"];
const INDUSTRIES = ["Residential", "Commercial", "Investment", "Retail"];

function parseCsvDataset() {
  const csvPath = path.join(__dirname, "..", "..", "ai", "data.csv");
  const raw = fs.readFileSync(csvPath, "utf8").trim();
  const [headerLine, ...lines] = raw.split(/\r?\n/);
  const headers = headerLine.split(",");

  return lines.map((line) => {
    const values = line.split(",");
    return headers.reduce((row, header, index) => {
      row[header] = Number(values[index]);
      return row;
    }, {});
  });
}

function toLeadStatus(row) {
  if (row.converted === 1) {
    return row.urgencyScore >= 8 ? "Qualified" : "Contacted";
  }

  return row.visits >= 4 ? "Contacted" : "New";
}

function toLeadTag(row) {
  if (row.converted === 1 || row.urgencyScore >= 8 || row.budget >= 5000000) {
    return "Hot";
  }

  if (row.visits >= 4 || row.budget >= 2000000) {
    return "Warm";
  }

  return "Cold";
}

function toLeadScore(row) {
  const score =
    row.visits * 4 +
    row.timeSpent * 1.4 +
    row.urgencyScore * 4 +
    Math.min(row.budget / 150000, 25) +
    (row.converted ? 8 : 0);

  return Math.max(0, Math.min(99, Math.round(score)));
}

function buildCsvLeads({ createdBy, assignedTo } = {}) {
  const today = new Date();

  return parseCsvDataset().map((row, index) => {
    const name = `${NAMES[index % NAMES.length]} ${index + 1}`;
    const location = LOCATIONS[index % LOCATIONS.length];
    const industry = INDUSTRIES[index % INDUSTRIES.length];
    const source = SOURCES[index % SOURCES.length];
    const status = toLeadStatus(row);
    const tag = toLeadTag(row);
    const score = toLeadScore(row);
    const createdAt = new Date(today);
    createdAt.setDate(today.getDate() - index);

    return {
      id: index + 1,
      name,
      interest:
        industry === "Commercial"
          ? `Looking for a commercial property in ${location} with budget flexibility around ${row.budget}.`
          : `Interested in ${industry.toLowerCase()} options in ${location} with quick follow-up and budget near ${row.budget}.`,
      budget: row.budget,
      visits: row.visits,
      timeSpent: row.timeSpent,
      urgencyScore: row.urgencyScore,
      score,
      status,
      location,
      source,
      industry,
      tag,
      notes: [],
      date: createdAt.toISOString().slice(0, 10),
      converted: row.converted,
      createdBy,
      assignedTo,
    };
  });
}

module.exports = {
  buildCsvLeads,
};
