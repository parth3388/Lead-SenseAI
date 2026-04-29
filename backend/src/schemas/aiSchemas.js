const { z } = require("zod");

const leadReasoningSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    id: z.string().trim().min(1, "Lead id is required"),
  }),
  query: z.object({}).default({}),
});

const generateEmailSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Name is required"),
    budget: z.coerce.number().positive("Budget is required"),
    location: z.string().trim().min(1, "Location is required"),
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

const generateOutreachSchema = z.object({
  body: z.object({
    channel: z.enum(["email", "text"]).default("email"),
    lead: z.object({
      name: z.string().trim().min(1, "Name is required"),
      budget: z.coerce.number().nonnegative().optional(),
      location: z.string().trim().min(1, "Location is required"),
      industry: z.string().trim().optional(),
      status: z.string().trim().optional(),
    }),
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

const scrapeLeadsSchema = z.object({
  body: z
    .object({
      userAgent: z.string().trim().min(1).optional(),
      timeoutSeconds: z.coerce.number().int().positive().max(60).optional(),
      delaySeconds: z.coerce.number().nonnegative().max(30).optional(),
      autoSelectSources: z.boolean().optional(),
      maxAutoSources: z.coerce.number().int().positive().max(10).optional(),
      sources: z
        .array(
          z.object({
            name: z.string().trim().min(1).optional(),
            url: z.string().trim().url("Source URL must be valid"),
            defaultBudget: z.coerce.number().int().positive().optional(),
            defaultUrgency: z.coerce.number().int().min(1).max(10).optional(),
            converted: z.coerce.number().int().min(-1).max(1).optional(),
          })
        )
        .optional(),
      sourceCatalog: z
        .array(
          z.object({
            name: z.string().trim().min(1).optional(),
            url: z.string().trim().url("Source URL must be valid"),
            defaultBudget: z.coerce.number().int().positive().optional(),
            defaultUrgency: z.coerce.number().int().min(1).max(10).optional(),
            converted: z.coerce.number().int().min(-1).max(1).optional(),
            enabled: z.boolean().optional(),
          })
        )
        .optional(),
    })
    .default({}),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

module.exports = {
  leadReasoningSchema,
  generateEmailSchema,
  generateOutreachSchema,
  scrapeLeadsSchema,
};
