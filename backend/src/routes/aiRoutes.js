const express = require("express");
const {
  aiAnalysis,
  aiRecommendations,
  leadReasoning,
  generateEmail,
  generateOutreach,
  scrapeLeads,
} = require("../controllers/aiController");
const { authenticate } = require("../middleware/authenticate");
const { validate } = require("../middleware/validate");
const {
  leadReasoningSchema,
  generateEmailSchema,
  generateOutreachSchema,
  scrapeLeadsSchema,
} = require("../schemas/aiSchemas");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.use(authenticate);
router.get("/ai-analysis", asyncHandler(aiAnalysis));
router.get("/ai-recommendations", asyncHandler(aiRecommendations));
router.get("/lead-reasoning/:id", validate(leadReasoningSchema), asyncHandler(leadReasoning));
router.post("/generate-email", validate(generateEmailSchema), asyncHandler(generateEmail));
router.post("/generate-outreach", validate(generateOutreachSchema), asyncHandler(generateOutreach));
router.post("/scrape-leads", validate(scrapeLeadsSchema), asyncHandler(scrapeLeads));

module.exports = router;
