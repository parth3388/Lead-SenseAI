const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { isDatabaseEnabled } = require("../config/database");
const {
  getUsers,
  getLeads,
  getLeadScores,
  getActivityLogs,
  getNextLeadId,
} = require("../data/store");
const User = require("../models/User");
const Lead = require("../models/Lead");
const LeadScore = require("../models/LeadScore");
const ActivityLog = require("../models/ActivityLog");
const { AppError } = require("../utils/appError");

function normalizeLeadDocument(lead) {
  if (!lead) {
    return null;
  }

  const source = typeof lead.toObject === "function" ? lead.toObject() : lead;

  return {
    ...source,
    id: source._id ? String(source._id) : source.id,
    createdBy:
      source.createdBy && typeof source.createdBy === "object"
        ? source.createdBy.username
        : source.createdBy,
    assignedTo:
      source.assignedTo && typeof source.assignedTo === "object"
        ? source.assignedTo.username
        : source.assignedTo,
  };
}

async function resolveUserByUsername(username) {
  if (!username) {
    return null;
  }

  if (!isDatabaseEnabled()) {
    return getUsers().find((user) => user.username === username) || null;
  }

  return User.findOne({ username });
}

async function findUserByCredentials(username, password) {
  if (!isDatabaseEnabled()) {
    return (
      getUsers().find(
        (user) => user.username === username && user.password === password
      ) || null
    );
  }

  const user = await User.findOne({ username });

  if (!user) {
    return null;
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  return matches ? user : null;
}

async function createUser({ username, password, role }) {
  if (!isDatabaseEnabled()) {
    const users = getUsers();

    if (users.some((user) => user.username === username)) {
      throw new AppError(400, "User exists");
    }

    const user = {
      id: `mem-${username}`,
      username,
      password,
      role: role || "sales",
    };

    users.push(user);
    return user;
  }

  const existingUser = await User.findOne({ username });

  if (existingUser) {
    throw new AppError(400, "User exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  return User.create({
    username,
    passwordHash,
    role: role || "sales",
  });
}

async function listLeads() {
  if (!isDatabaseEnabled()) {
    return getLeads();
  }

  const leads = await Lead.find()
    .populate("createdBy", "username role")
    .populate("assignedTo", "username role")
    .sort({ createdAt: -1 });

  return leads.map(normalizeLeadDocument);
}

async function getLeadById(id) {
  if (!isDatabaseEnabled()) {
    return getLeads().find((lead) => String(lead.id) === String(id)) || null;
  }

  if (!mongoose.Types.ObjectId.isValid(String(id))) {
    return null;
  }

  const lead = await Lead.findById(id)
    .populate("createdBy", "username role")
    .populate("assignedTo", "username role");

  return normalizeLeadDocument(lead);
}

async function createLeadRecord(payload, currentUsername) {
  if (!isDatabaseEnabled()) {
    const actor = getUsers().find((user) => user.username === currentUsername) || null;
    const leads = getLeads();
    const lead = {
      id: getNextLeadId(),
      notes: [],
      createdBy: actor?.username,
      assignedTo: payload.assignedTo || actor?.username || null,
      ...payload,
    };

    if (lead.status === "Converted") {
      lead.converted = 1;
    }

    leads.push(lead);
    return lead;
  }

  const actor = await resolveUserByUsername(currentUsername);
  const assignedUser = await resolveUserByUsername(payload.assignedTo || currentUsername);

  const lead = await Lead.create({
    ...payload,
    converted:
      payload.status === "Converted"
        ? 1
        : payload.converted !== undefined
          ? payload.converted
          : 0,
    createdBy: actor?._id,
    assignedTo: assignedUser?._id,
  });

  return getLeadById(lead._id);
}

async function updateLeadRecord(id, payload) {
  if (!isDatabaseEnabled()) {
    const lead = getLeads().find((item) => String(item.id) === String(id));

    if (!lead) {
      throw new AppError(404, "Lead not found");
    }

    Object.assign(lead, payload);

    if (lead.status === "Converted") {
      lead.converted = 1;
    }

    if (payload.status && payload.status !== "Converted" && payload.converted === undefined) {
      lead.converted = 0;
    }

    return lead;
  }

  if (!mongoose.Types.ObjectId.isValid(String(id))) {
    throw new AppError(404, "Lead not found");
  }

  const updatePayload = { ...payload };

  if (payload.assignedTo) {
    const assignedUser = await resolveUserByUsername(payload.assignedTo);
    updatePayload.assignedTo = assignedUser?._id || undefined;
  }

  if (payload.status === "Converted") {
    updatePayload.converted = 1;
  }

  if (payload.status && payload.status !== "Converted" && payload.converted === undefined) {
    updatePayload.converted = 0;
  }

  const updated = await Lead.findByIdAndUpdate(id, updatePayload, {
    new: true,
    runValidators: true,
  });

  if (!updated) {
    throw new AppError(404, "Lead not found");
  }

  return getLeadById(updated._id);
}

async function deleteLeadRecord(id) {
  if (!isDatabaseEnabled()) {
    const leads = getLeads();
    const index = leads.findIndex((lead) => String(lead.id) === String(id));

    if (index === -1) {
      throw new AppError(404, "Lead not found");
    }

    const [deletedLead] = leads.splice(index, 1);
    return deletedLead;
  }

  if (!mongoose.Types.ObjectId.isValid(String(id))) {
    throw new AppError(404, "Lead not found");
  }

  const deletedLead = await Lead.findByIdAndDelete(id);

  if (!deletedLead) {
    throw new AppError(404, "Lead not found");
  }

  await Promise.all([
    LeadScore.deleteMany({ lead: deletedLead._id }),
    ActivityLog.deleteMany({ lead: deletedLead._id }),
  ]);

  return normalizeLeadDocument(deletedLead);
}

async function addLeadNoteRecord(id, text) {
  if (!isDatabaseEnabled()) {
    const lead = getLeads().find((item) => String(item.id) === String(id));

    if (!lead) {
      throw new AppError(404, "Lead not found");
    }

    const existingNotes = Array.isArray(lead.notes) ? lead.notes : [];
    lead.notes = [
      ...existingNotes,
      {
        id: existingNotes.length + 1,
        text,
        createdAt: new Date().toISOString(),
      },
    ];

    return lead;
  }

  if (!mongoose.Types.ObjectId.isValid(String(id))) {
    throw new AppError(404, "Lead not found");
  }

  const lead = await Lead.findById(id);

  if (!lead) {
    throw new AppError(404, "Lead not found");
  }

  lead.notes.push({ text });
  await lead.save();
  return getLeadById(lead._id);
}

async function createLeadScoreSnapshot(lead, currentUsername) {
  const numericScore = Number(lead.score || 0);

  if (!isDatabaseEnabled()) {
    getLeadScores().push({
      id: getLeadScores().length + 1,
      leadId: lead.id,
      score: numericScore,
      factors: {
        visits: lead.visits,
        timeSpent: lead.timeSpent,
        budget: lead.budget,
        urgencyScore: lead.urgencyScore,
        tag: lead.tag,
        status: lead.status,
      },
      scoredBy: currentUsername || null,
      scoredAt: new Date().toISOString(),
    });
    return;
  }

  const actor = await resolveUserByUsername(currentUsername);
  const scoreRecord = await LeadScore.create({
    lead: lead.id,
    score: numericScore,
    factors: {
      visits: lead.visits,
      timeSpent: lead.timeSpent,
      budget: lead.budget,
      urgencyScore: lead.urgencyScore,
      tag: lead.tag,
      status: lead.status,
    },
    scoredBy: actor?._id,
  });

  await Lead.findByIdAndUpdate(lead.id, {
    latestScoreRef: scoreRecord._id,
  });
}

async function logActivity({ actorUsername, leadId, action, metadata = {} }) {
  if (!isDatabaseEnabled()) {
    getActivityLogs().push({
      id: getActivityLogs().length + 1,
      actor: actorUsername || null,
      leadId: leadId || null,
      action,
      metadata,
      createdAt: new Date().toISOString(),
    });
    return;
  }

  const [actor, lead] = await Promise.all([
    resolveUserByUsername(actorUsername),
    leadId ? Lead.findById(leadId) : Promise.resolve(null),
  ]);

  await ActivityLog.create({
    actor: actor?._id,
    lead: lead?._id,
    action,
    metadata,
  });
}

module.exports = {
  findUserByCredentials,
  createUser,
  listLeads,
  getLeadById,
  createLeadRecord,
  updateLeadRecord,
  deleteLeadRecord,
  addLeadNoteRecord,
  createLeadScoreSnapshot,
  logActivity,
};
