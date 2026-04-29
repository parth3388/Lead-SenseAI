const express = require("express");
const { login, signup } = require("../controllers/authController");
const { validate } = require("../middleware/validate");
const { loginSchema, signupSchema } = require("../schemas/authSchemas");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.post("/login", validate(loginSchema), asyncHandler(login));
router.post("/signup", validate(signupSchema), asyncHandler(signup));

module.exports = router;
