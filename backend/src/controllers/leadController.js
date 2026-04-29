const {
  isHighIntentLead,
} = require("../services/leadService");
const {
  listLeads: listLeadRecords,
  getLeadById,
  createLeadRecord,
  updateLeadRecord,
  deleteLeadRecord,
  addLeadNoteRecord,
  createLeadScoreSnapshot,
  logActivity,
} = require("../services/databaseService");
const { AppError } = require("../utils/appError");

function emitLeadUpdate(req, type, lead) {
  const io = req.app.get("io");

  if (!io) {
    return;
  }

  io.emit("lead-updated", {
    type,
    lead,
    highIntent: isHighIntentLead(lead),
  });
}

async function listLeads(req, res) {
  res.json(await listLeadRecords());
}

async function getLead(req, res) {
  const lead = await getLeadById(req.params.id);

  if (!lead) {
    throw new AppError(404, "Lead not found");
  }

  res.json(lead);
}

async function createLeadHandler(req, res) {
  const lead = await createLeadRecord(req.body, req.user.username);
  const io = req.app.get("io");

  if (io) {
    io.emit("new-lead", lead);
  }

  await createLeadScoreSnapshot(lead, req.user.username);
  await logActivity({
    actorUsername: req.user.username,
    leadId: lead.id,
    action: "lead.created",
    metadata: {
      status: lead.status,
      score: lead.score,
    },
  });

  emitLeadUpdate(req, "created", lead);
  res.status(201).json(lead);
}

function derivePublicLeadDetails(payload) {
  const budget = Number(payload.budget || 0);
  const safeInterest = String(payload.interest || "General property interest").trim();
  const interestLength = safeInterest.length;
  const urgencyScore = Number(payload.urgencyScore || 5);
  const customerType = payload.customerType === "buyer" ? "buyer" : "visitor";
  const buyerScore = Number(payload.buyerScore || 0);

  let visits = 1;
  let timeSpent = 4;
  let score = 42;
  let tag = "Warm";

  if (interestLength >= 80) {
    visits += 1;
    timeSpent += 4;
    score += 10;
  }

  if (budget >= 5000000) {
    visits += 2;
    timeSpent += 6;
    score += 28;
    tag = "Hot";
  } else if (budget >= 2000000) {
    visits += 1;
    timeSpent += 3;
    score += 18;
  } else if (budget > 0) {
    score += 8;
  }

  score += urgencyScore * 2;

  if (urgencyScore >= 8) {
    visits += 1;
    timeSpent += 3;
    tag = "Hot";
  }

  if (customerType === "buyer") {
    visits += 2;
    timeSpent += 5;
    score += 12;
  }

  if (buyerScore > 0) {
    score += buyerScore * 2;

    if (buyerScore >= 8) {
      tag = "Hot";
    }
  }

  return {
    visits,
    timeSpent,
    urgencyScore,
    score: Math.min(score, 98),
    tag,
  };
}

async function submitPublicInterest(req, res) {
  const safeInterest = String(req.body.interest || "General property interest").trim();
  const nearbyFacilities = Array.isArray(req.body.nearbyFacilities)
    ? req.body.nearbyFacilities.filter(Boolean)
    : [];
  const propertyDetails = [
    req.body.propertyTitle ? `Property: ${req.body.propertyTitle}` : null,
    req.body.customerType === "buyer" && req.body.buyerScore
      ? `Buyer score: ${req.body.buyerScore}/10`
      : "Customer type: Visitor",
    nearbyFacilities.length > 0
      ? `Nearby facilities: ${nearbyFacilities.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join(". ");

  const enrichedInterest = [safeInterest, propertyDetails]
    .filter(Boolean)
    .join(". ");
  const derivedDetails = derivePublicLeadDetails(req.body);
  const lead = await createLeadRecord(
    {
      name: req.body.name,
      location: req.body.location,
      budget: req.body.budget,
      urgencyScore: req.body.urgencyScore,
      industry: req.body.industry,
      interest: enrichedInterest,
      ...derivedDetails,
      source: req.body.customerType === "buyer" ? "Property Buyer" : "Property Visitor",
      status: "New",
      converted: 0,
    },
    null
  );

  await createLeadScoreSnapshot(lead, null);
  await logActivity({
    actorUsername: null,
    leadId: lead.id,
    action: "lead.public_interest_submitted",
    metadata: {
      source: lead.source,
      interest: lead.interest,
      location: lead.location,
      budget: lead.budget,
      customerType: req.body.customerType || "visitor",
      propertyTitle: req.body.propertyTitle || null,
      buyerScore: req.body.buyerScore || null,
    },
  });

  emitLeadUpdate(req, "created", lead);

  res.status(201).json({
    message: "Interest submitted successfully",
    lead,
  });
}

async function updateLeadHandler(req, res) {
  const lead = await updateLeadRecord(req.params.id, req.body);
  await createLeadScoreSnapshot(lead, req.user.username);
  await logActivity({
    actorUsername: req.user.username,
    leadId: lead.id,
    action: "lead.updated",
    metadata: req.body,
  });
  emitLeadUpdate(req, "updated", lead);
  res.json(lead);
}

async function addLeadNote(req, res) {
  const lead = await addLeadNoteRecord(req.params.id, req.body.text);
  await logActivity({
    actorUsername: req.user.username,
    leadId: lead.id,
    action: "lead.note_added",
    metadata: {
      text: req.body.text,
    },
  });
  emitLeadUpdate(req, "updated", lead);
  res.json(lead);
}

async function deleteLeadHandler(req, res) {
  const deletedLead = await deleteLeadRecord(req.params.id);
  const io = req.app.get("io");

  if (io) {
    io.emit("lead-deleted", { id: deletedLead.id });
  }

  await logActivity({
    actorUsername: req.user.username,
    action: "lead.deleted",
    metadata: {
      leadId: deletedLead.id,
      name: deletedLead.name,
    },
  });

  res.json({
    message: "Lead deleted",
    lead: deletedLead,
  });
}

module.exports = {
  listLeads,
  getLead,
  createLeadHandler,
  submitPublicInterest,
  updateLeadHandler,
  addLeadNote,
  deleteLeadHandler,
};
