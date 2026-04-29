const express = require("express");
const { submitPublicInterest } = require("../controllers/leadController");
const { validate } = require("../middleware/validate");
const { publicInterestSchema } = require("../schemas/leadSchemas");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.post(
  "/public-interest",
  validate(publicInterestSchema),
  asyncHandler(submitPublicInterest)
);

module.exports = router;
