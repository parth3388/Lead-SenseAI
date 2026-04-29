const mongoose = require("mongoose");

const leadScoreSchema = new mongoose.Schema(
  {
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
      index: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    factors: {
      visits: Number,
      timeSpent: Number,
      budget: Number,
      urgencyScore: Number,
      tag: String,
      status: String,
    },
    modelVersion: {
      type: String,
      default: "v1",
    },
    scoredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    scoredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

leadScoreSchema.index({ lead: 1, scoredAt: -1 });

module.exports =
  mongoose.models.LeadScore || mongoose.model("LeadScore", leadScoreSchema);
