const express = require("express");
const {
  listLeads,
  getLead,
  createLeadHandler,
  submitPublicInterest,
  updateLeadHandler,
  addLeadNote,
  deleteLeadHandler,
} = require("../controllers/leadController");
const { authenticate } = require("../middleware/authenticate");
const { validate } = require("../middleware/validate");
const {
  createLeadSchema,
  updateLeadSchema,
  leadIdSchema,
  noteSchema,
  publicInterestSchema,
} = require("../schemas/leadSchemas");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.post(
  "/public-interest",
  validate(publicInterestSchema),
  asyncHandler(submitPublicInterest)
);

router.use(authenticate);
router.get("/leads", asyncHandler(listLeads));
router.get("/leads/:id", validate(leadIdSchema), asyncHandler(getLead));
router.post("/leads", validate(createLeadSchema), asyncHandler(createLeadHandler));
router.patch("/leads/:id", validate(updateLeadSchema), asyncHandler(updateLeadHandler));
router.delete("/leads/:id", validate(leadIdSchema), asyncHandler(deleteLeadHandler));
router.post("/leads/:id/notes", validate(noteSchema), asyncHandler(addLeadNote));

router.get("/", asyncHandler(listLeads));
router.get("/:id", validate(leadIdSchema), asyncHandler(getLead));
router.post("/", validate(createLeadSchema), asyncHandler(createLeadHandler));
router.patch("/:id", validate(updateLeadSchema), asyncHandler(updateLeadHandler));
router.delete("/:id", validate(leadIdSchema), asyncHandler(deleteLeadHandler));
router.post("/:id/notes", validate(noteSchema), asyncHandler(addLeadNote));

module.exports = router;
