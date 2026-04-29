const { z } = require("zod");

const loginSchema = z.object({
  body: z.object({
    username: z.string().trim().min(1, "Username is required"),
    password: z.string().trim().min(1, "Password is required"),
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

const signupSchema = z.object({
  body: z.object({
    username: z.string().trim().min(3, "Username must be at least 3 characters"),
    password: z.string().trim().min(4, "Password must be at least 4 characters"),
    role: z.enum(["admin", "sales", "customer"]).optional(),
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

module.exports = {
  loginSchema,
  signupSchema,
};
