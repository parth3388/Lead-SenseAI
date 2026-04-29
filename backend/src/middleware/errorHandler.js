const { AppError } = require("../utils/appError");
const { logger } = require("../utils/logger");

function notFoundHandler(req, res, next) {
  next(new AppError(404, `Route not found: ${req.originalUrl}`));
}

function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || 500;
  const response = {
    message: error.message || "Internal server error",
  };

  if (error.details) {
    response.details = error.details;
  }

  logger.error("Request failed", {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    error: error.message,
    details: error.details,
  });

  res.status(statusCode).json(response);
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
