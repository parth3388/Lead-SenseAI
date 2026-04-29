const { AppError } = require("../utils/appError");
const {
  rankLeadsForRecommendations,
  buildLeadReasoning,
} = require("../services/leadService");
const { listLeads, getLeadById } = require("../services/databaseService");
const {
  hasOpenAIKey,
  openai,
  buildFallbackEmail,
  buildFallbackText,
  generateOpenAIText,
  getAiAnalysis,
  runLeadScraper,
} = require("../services/aiService");

async function aiAnalysis(req, res, next) {
  try {
    const result = await getAiAnalysis();
    res.json(result);
  } catch (error) {
    next(new AppError(500, "AI Error"));
  }
}

async function aiRecommendations(req, res) {
  const rankedLeads = rankLeadsForRecommendations(await listLeads());

  if (!hasOpenAIKey) {
    return res.json({
      recommendations: rankedLeads,
      fallback: true,
      message: "OPENAI_API_KEY is not configured. Returned heuristic recommendations.",
    });
  }

  const completion = await generateOpenAIText({
    system: "You generate concise, action-oriented lead recommendations for sales teams.",
    prompt: `Return a valid JSON array with fields id and recommendation only for these prioritized real-estate leads: ${JSON.stringify(rankedLeads)}`,
  });

  let aiRecommendationsList = [];

  try {
    aiRecommendationsList = JSON.parse(completion);
  } catch (error) {
    aiRecommendationsList = [];
  }

  const merged = rankedLeads.map((lead) => {
    const aiMatch = aiRecommendationsList.find((item) => item.id === lead.id);

    return {
      ...lead,
      recommendation: aiMatch?.recommendation || lead.recommendation,
    };
  });

  res.json({ recommendations: merged });
}

async function leadReasoning(req, res) {
  const lead = await getLeadById(req.params.id);

  if (!lead) {
    throw new AppError(404, "Lead not found");
  }
  const fallbackReason = buildLeadReasoning(lead);

  if (!hasOpenAIKey) {
    return res.json({
      reasoning: fallbackReason,
      fallback: true,
      message: "OPENAI_API_KEY is not configured. Returned heuristic reasoning.",
    });
  }

  const reasoning = await generateOpenAIText({
    system: "You explain why a sales lead is valuable in short, plain CRM-friendly language.",
    prompt: `Explain why this lead is important in 2 short sentences: ${JSON.stringify(lead)}`,
  });

  res.json({
    reasoning: reasoning || fallbackReason,
  });
}

async function generateEmail(req, res) {
  const { name, budget, location } = req.body;

  if (!hasOpenAIKey) {
    return res.json({
      email: buildFallbackEmail({ name, budget, location }),
      fallback: true,
      message: "OPENAI_API_KEY is not configured. Returned a template email instead.",
    });
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: "You are a sales expert.",
      },
      {
        role: "user",
        content: `Write a professional sales email for a real estate lead named ${name}, budget ${budget}, location ${location}`,
      },
    ],
  });

  res.json({
    email: response.choices[0].message.content,
  });
}

async function generateOutreach(req, res) {
  const { channel = "email", lead } = req.body;
  const { name, budget, location, industry, status } = lead;

  if (!hasOpenAIKey) {
    return res.json({
      channel,
      message:
        channel === "text"
          ? buildFallbackText({ name, location })
          : buildFallbackEmail({ name, budget, location }),
      fallback: true,
      note: "OPENAI_API_KEY is not configured. Returned a template message instead.",
    });
  }

  const outreach = await generateOpenAIText({
    system: "You create concise, personalized real-estate outreach messages for sales teams.",
    prompt: `Create a ${channel} outreach message for this lead. Keep it professional and personalized. Lead data: ${JSON.stringify({ name, budget, location, industry, status })}`,
  });

  res.json({
    channel,
    message: outreach,
  });
}

async function scrapeLeads(req, res, next) {
  try {
    const result = await runLeadScraper(req.body || {});
    res.json(result);
  } catch (error) {
    next(new AppError(500, error.message || "Lead scraper failed"));
  }
}

module.exports = {
  aiAnalysis,
  aiRecommendations,
  leadReasoning,
  generateEmail,
  generateOutreach,
  scrapeLeads,
};
