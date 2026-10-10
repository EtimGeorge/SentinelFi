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

  // Optional comma-separated allowlist of additional origins allowed on the
  // WebSocket notification channel (defaults to FRONTEND_URL / localhost).
  FRONTEND_ALLOWED_ORIGINS: Joi.string().optional(),

  // OpenAPI/Swagger — defaults to enabled outside production; force with SWAGGER_ENABLED
  SWAGGER_ENABLED: Joi.string().valid("true", "false").optional(),

  // AI Agent (Resilience)
  AI_AGENT_URL: Joi.string().uri().default("http://localhost:8000"),

  // PDF render worker (optional). When PDF_WORKER_URL is set, PDFs are rendered
  // by the standalone Chromium worker (`backend/src/worker.ts`) instead of
  // in-process, keeping the API free of a browser.
  PDF_WORKER_URL: Joi.string().uri().optional(),
  PDF_WORKER_TOKEN: Joi.string().optional(),
  PDF_WORKER_TIMEOUT_MS: Joi.number().optional(),
  PDF_NAV_TIMEOUT_MS: Joi.number().optional(),

  // Third Party APIs
  PAYSTACK_SECRET_KEY: Joi.string().optional(),
  RESEND_API_KEY: Joi.string().optional(),

  // Cloudflare R2 object storage (optional — local-disk fallback without it).
  // Required for uploads to survive deploys in production.
  R2_ACCOUNT_ID: Joi.string().allow("").optional(),
  R2_ACCESS_KEY_ID: Joi.string().allow("").optional(),
  R2_SECRET_ACCESS_KEY: Joi.string().allow("").optional(),
  R2_BUCKET: Joi.string().allow("").optional(),
  R2_ENDPOINT: Joi.string().uri().allow("").optional(),
  R2_REGION: Joi.string().optional().default("auto"),
  R2_PUBLIC_BASE_URL: Joi.string().uri().allow("").optional(),

  // Ads (monetization — all optional; 'test' provider when unset)
  ADS_PROVIDER: Joi.string().valid("test", "adsense", "admanager").optional().default("test"),
  ADS_ENABLED: Joi.string().valid("true", "false").optional().default("true"),
  ADSENSE_CLIENT_ID: Joi.string().optional(),
  ADSENSE_BANNER_SLOT: Joi.string().optional(),
  // Shared secret for rewarded-network server-side verification (SSV).
  // Leave unset in dev/test; REQUIRED in production with a real network.
  ADS_SSV_SECRET: Joi.string().optional(),
});
