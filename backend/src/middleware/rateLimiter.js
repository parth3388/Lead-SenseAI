const { AppError } = require("../utils/appError");

function createRateLimiter({ windowMs, maxRequests }) {
  const requests = new Map();

  return (req, res, next) => {
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const entry = requests.get(key);

    if (!entry || now > entry.expiresAt) {
      requests.set(key, {
        count: 1,
        expiresAt: now + windowMs,
      });
      return next();
    }

    if (entry.count >= maxRequests) {
      res.setHeader("Retry-After", Math.ceil((entry.expiresAt - now) / 1000));
      return next(new AppError(429, "Too many requests. Please try again later."));
    }

    entry.count += 1;
    next();
  };
}

module.exports = {
  createRateLimiter,
};
