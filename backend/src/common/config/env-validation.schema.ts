import * as Joi from "joi";

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test", "provision")
    .default("development"),
  PORT: Joi.number().default(3000),

  // Database
  DATABASE_URL: Joi.string()
    .required()
    .description("Connection string for PostgreSQL"),

  // Redis (Caching & Scalability) — REDIS_URL preferred; HOST/PORT fallback for local dev
  REDIS_URL: Joi.string().uri().optional(),
  REDIS_HOST: Joi.string().optional().default("localhost"),
  REDIS_PORT: Joi.number().optional().default(6379),

  // Security — single canonical secret (64+ chars in production)
  JWT_SECRET: Joi.string().min(16).required().messages({
    'string.min': 'JWT_SECRET must be at least 16 chars (64+ in production)',
  }),
  // Back-compat alias: accept JWT_SECRET_KEY but prefer JWT_SECRET
  JWT_SECRET_KEY: Joi.string().optional(),
  FRONTEND_URL: Joi.string().uri().required(),

  // AI Agent (Resilience)
  AI_AGENT_URL: Joi.string().uri().default("http://localhost:8000"),

  // Third Party APIs
  PAYSTACK_SECRET_KEY: Joi.string().optional(),
  RESEND_API_KEY: Joi.string().optional(),
});
