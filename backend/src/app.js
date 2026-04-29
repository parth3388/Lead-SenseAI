const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { loadEnvironment } = require("./config/env");
const { requestLogger } = require("./middleware/requestLogger");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const { createRateLimiter } = require("./middleware/rateLimiter");
const authRoutes = require("./routes/authRoutes");
const leadRoutes = require("./routes/leadRoutes");
const aiRoutes = require("./routes/aiRoutes");
const publicRoutes = require("./routes/publicRoutes");

loadEnvironment();

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  ...(process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
].filter(Boolean);

function isAllowedOrigin(origin) {
  return !origin || allowedOrigins.includes(origin);
}

function createServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
          return callback(null, true);
        }

        return callback(new Error("CORS origin not allowed"));
      },
    },
  });

  app.set("io", io);

  app.use(
    cors({
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
          return callback(null, true);
        }

        return callback(new Error("CORS origin not allowed"));
      },
    })
  );
  app.use(express.json());
  app.use(requestLogger);
  app.use(createRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 200 }));

  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1", publicRoutes);
  app.use("/api/v1", aiRoutes);
  app.use("/api/v1/leads", leadRoutes);

  app.use("/", authRoutes);
  app.use("/", publicRoutes);
  app.use("/", aiRoutes);
  app.use("/", leadRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return { app, server, io };
}

module.exports = {
  createServer,
};
