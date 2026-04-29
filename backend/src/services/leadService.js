function isHighIntentLead(lead) {
  return (
    Number(lead.score || 0) >= 80 ||
    Number(lead.converted || 0) === 1 ||
    lead.tag === "Hot"
  );
}

function buildLeadReasoning(lead) {
  const reasons = [];

  if (Number(lead.score || 0) >= 80) reasons.push("the lead score is high");
  if (Number(lead.visits || 0) >= 4) reasons.push("the lead has returned multiple times");
  if (Number(lead.timeSpent || 0) >= 15) reasons.push("time spent suggests strong intent");
  if (Number(lead.budget || 0) >= 3000000) reasons.push("budget value is commercially strong");
  if (Number(lead.urgencyScore || 0) >= 8) reasons.push("the buyer urgency is high");
  if (lead.tag === "Hot") reasons.push("your team has tagged this lead as Hot");
  if (lead.status === "Qualified" || lead.status === "Converted") {
    reasons.push("the lead is already deep in the pipeline");
  }

  if (reasons.length === 0) {
    reasons.push("recent activity suggests moderate but growing interest");
  }

  return `This lead matters because ${reasons.join(", ")}.`;
}

function buildLeadRecommendation(lead) {
  const score = Number(lead.score || 0);

  if (score >= 85 || lead.tag === "Hot") {
    return "Prioritize a same-day call and send a curated shortlist immediately.";
  }

  if (score >= 65) {
    return "Follow up with a personalized message and qualify preferences, timing, and budget flexibility.";
  }

  return "Keep this lead in a nurture flow with educational content and a softer follow-up.";
}

function rankLeadsForRecommendations(items) {
  return [...items]
    .sort((a, b) => {
      const scoreA =
        Number(a.score || 0) +
        Number(a.visits || 0) * 2 +
        Number(a.timeSpent || 0) +
        Number(a.urgencyScore || 0) * 3 +
        (a.tag === "Hot" ? 20 : a.tag === "Warm" ? 10 : 0);
      const scoreB =
        Number(b.score || 0) +
        Number(b.visits || 0) * 2 +
        Number(b.timeSpent || 0) +
        Number(b.urgencyScore || 0) * 3 +
        (b.tag === "Hot" ? 20 : b.tag === "Warm" ? 10 : 0);

      return scoreB - scoreA;
    })
    .slice(0, 5)
    .map((lead) => ({
      id: lead.id,
      name: lead.name,
      score: lead.score,
      tag: lead.tag || "Warm",
      status: lead.status,
      location: lead.location,
      recommendation: buildLeadRecommendation(lead),
      reason: buildLeadReasoning(lead),
    }));
}

module.exports = {
  isHighIntentLead,
  buildLeadReasoning,
  buildLeadRecommendation,
  rankLeadsForRecommendations,
};
