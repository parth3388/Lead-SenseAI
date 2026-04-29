const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
    versionKey: false,
  }
);

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    interest: {
      type: String,
      trim: true,
      default: "",
    },
    budget: {
      type: Number,
      default: 0,
    },
    visits: {
      type: Number,
      default: 0,
    },
    timeSpent: {
      type: Number,
      default: 0,
    },
    urgencyScore: {
      type: Number,
      default: 5,
      min: 1,
      max: 10,
    },
    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: ["New", "Contacted", "Qualified", "Converted", "Lost"],
      default: "New",
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      default: "Website",
      trim: true,
    },
    industry: {
      type: String,
      default: "Residential",
      trim: true,
    },
    tag: {
      type: String,
      enum: ["Cold", "Warm", "Hot"],
      default: "Warm",
    },
    notes: {
      type: [noteSchema],
      default: [],
    },
    date: {
      type: String,
      default: () => new Date().toISOString().slice(0, 10),
    },
    converted: {
      type: Number,
      enum: [0, 1],
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    latestScoreRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeadScore",
    },
  },
  {
    timestamps: true,
  }
);

leadSchema.index({ assignedTo: 1, status: 1 });
leadSchema.index({ tag: 1, score: -1 });
leadSchema.index({ location: 1, createdAt: -1 });

module.exports = mongoose.models.Lead || mongoose.model("Lead", leadSchema);
