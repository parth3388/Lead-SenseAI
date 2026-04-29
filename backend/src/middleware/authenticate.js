const jwt = require("jsonwebtoken");
const { AppError } = require("../utils/appError");

const SECRET = process.env.JWT_SECRET || "mysecretkey";

function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return next(new AppError(403, "No token provided"));
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    next(new AppError(401, "Invalid token"));
  }
}

module.exports = {
  authenticate,
  SECRET,
};
