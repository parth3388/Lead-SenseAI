const { z } = require("zod");

const idParamsSchema = z.object({
  id: z.string().trim().min(1, "Lead id is required"),
});

const leadBaseFields = {
  name: z.string().trim().min(1).optional(),
  interest: z.string().trim().min(1).max(500).optional(),
  budget: z.coerce.number().nonnegative().optional(),
  visits: z.coerce.number().int().nonnegative().optional(),
  timeSpent: z.coerce.number().nonnegative().optional(),
  urgencyScore: z.coerce.number().int().min(1).max(10).optional(),
  score: z.coerce.number().min(0).max(100).optional(),
  status: z.enum(["New", "Contacted", "Qualified", "Converted", "Lost"]).optional(),
  location: z.string().trim().min(1).optional(),
  source: z.string().trim().min(1).optional(),
  industry: z.string().trim().min(1).optional(),
  tag: z.enum(["Cold", "Warm", "Hot"]).optional(),
  date: z.string().trim().min(1).optional(),
  converted: z.coerce.number().int().min(0).max(1).optional(),
  assignedTo: z.string().trim().min(1).optional(),
};

const createLeadSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Name is required"),
    interest: z.string().trim().min(1).max(500).optional(),
    budget: z.coerce.number().nonnegative().default(0),
    visits: z.coerce.number().int().nonnegative().default(0),
    timeSpent: z.coerce.number().nonnegative().default(0),
    urgencyScore: z.coerce.number().int().min(1).max(10).default(5),
    score: z.coerce.number().min(0).max(100).default(0),
    status: z.enum(["New", "Contacted", "Qualified", "Converted", "Lost"]).default("New"),
    location: z.string().trim().min(1, "Location is required"),
    source: z.string().trim().min(1).default("Website"),
    industry: z.string().trim().min(1).default("Residential"),
    tag: z.enum(["Cold", "Warm", "Hot"]).default("Warm"),
    date: z.string().trim().min(1).default(() => new Date().toISOString().slice(0, 10)),
    converted: z.coerce.number().int().min(0).max(1).default(0),
    assignedTo: z.string().trim().min(1).optional(),
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

const publicInterestSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Name is required"),
    interest: z.string().trim().max(500).default("General property interest"),
    location: z.string().trim().min(1, "Location is required"),
    budget: z.coerce.number().nonnegative().default(0),
    urgencyScore: z.coerce.number().int().min(1).max(10).default(5),
    industry: z.string().trim().min(1).default("Residential"),
    customerType: z.enum(["visitor", "buyer"]).default("visitor"),
    propertyTitle: z.string().trim().min(1).max(120).optional(),
    buyerScore: z.coerce.number().int().min(1).max(10).optional(),
    nearbyFacilities: z.array(z.string().trim().min(1)).max(8).optional(),
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

const updateLeadSchema = z.object({
  body: z
    .object(leadBaseFields)
    .refine((value) => Object.keys(value).length > 0, "At least one field is required"),
  params: idParamsSchema,
  query: z.object({}).default({}),
});

const leadIdSchema = z.object({
  body: z.object({}).default({}),
  params: idParamsSchema,
  query: z.object({}).default({}),
});

const noteSchema = z.object({
  body: z.object({
    text: z.string().trim().min(1, "Note text is required"),
  }),
  params: idParamsSchema,
  query: z.object({}).default({}),
});

module.exports = {
  createLeadSchema,
  updateLeadSchema,
  leadIdSchema,
  noteSchema,
  publicInterestSchema,
};
