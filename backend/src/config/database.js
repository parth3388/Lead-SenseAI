const mongoose = require("mongoose");
const { logger } = require("../utils/logger");
const {
  seedDatabaseIfNeeded,
  seedInMemoryLeadsFromCsv,
} = require("../services/bootstrapService");

let databaseEnabled = false;

async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    logger.warn("MONGODB_URI not configured. Using in-memory fallback store.");
    databaseEnabled = false;
    seedInMemoryLeadsFromCsv();
    return false;
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      dbName: process.env.MONGODB_DB || "leadsense_ai",
    });

    databaseEnabled = true;
    logger.info("MongoDB connected");
    await seedDatabaseIfNeeded();
    return true;
  } catch (error) {
    databaseEnabled = false;
    logger.warn("MongoDB connection failed. Using in-memory fallback store.", {
      error: error.message,
    });
    seedInMemoryLeadsFromCsv();
    return false;
  }
}

function isDatabaseEnabled() {
  return databaseEnabled && mongoose.connection.readyState === 1;
}

module.exports = {
  connectDatabase,
  isDatabaseEnabled,
};
