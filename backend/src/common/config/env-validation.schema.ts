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
  // Back-compat alias: accept JWT_SECRET_KEY but prefer JWT_SECRET.
  // allow("") so a leftover empty `JWT_SECRET_KEY=` line in an .env file does
  // not fail boot — Joi treats "" as present and rejects it by default.
  JWT_SECRET_KEY: Joi.string().allow("").optional(),
  FRONTEND_URL: Joi.string().uri().required(),

  // Optional comma-separated allowlist of additional origins allowed on the
  // WebSocket notification channel (defaults to FRONTEND_URL / localhost).
  FRONTEND_ALLOWED_ORIGINS: Joi.string().optional(),

  // OpenAPI/Swagger — defaults to enabled outside production; force with SWAGGER_ENABLED
  SWAGGER_ENABLED: Joi.string().valid("true", "false").optional(),

  // Optional: run pending PUBLIC migrations once at boot (advisory-locked, so a
  // scale-out deploy applies them exactly once). Defaults off; prefer a
  // pre-deploy migration job. See docs/DEPLOYMENT.md §3.
  RUN_MIGRATIONS_ON_BOOT: Joi.string().valid("true", "false").optional().default("false"),

  // AI Agent (Resilience)
  AI_AGENT_URL: Joi.string().uri().default("http://localhost:8000"),

  // PDF render worker (optional). When PDF_WORKER_URL is set, PDFs are rendered
  // by the standalone Chromium worker (`backend/src/worker.ts`) instead of
  // in-process, keeping the API free of a browser.
  PDF_WORKER_URL: Joi.string().uri().optional(),
  PDF_WORKER_TOKEN: Joi.string().optional(),
  PDF_WORKER_TIMEOUT_MS: Joi.number().optional(),
  PDF_NAV_TIMEOUT_MS: Joi.number().optional(),

  // Rate limiting (per-instance window shared via Redis). Env-tunable so prod
  // limits can be raised for a launch or load test without a code change.
  THROTTLE_TTL_MS: Joi.number().integer().positive().optional().default(60000),
  THROTTLE_LIMIT: Joi.number().integer().positive().optional().default(10),

  // Email delivery. Resend is the default provider; SMTP is the fallback.
  // EMAIL_FROM must be a sender verified with the chosen provider or the
  // provider will reject every send. EMAIL_PREVIEW_ONLY defaults to on outside
  // production (see EmailService.isPreviewOnly) so dev never sends real mail.
  EMAIL_PROVIDER: Joi.string().valid("resend", "smtp").optional().default("resend"),
  EMAIL_FROM: Joi.string().optional(),
  EMAIL_PREVIEW_ONLY: Joi.string().valid("true", "false").optional().default("true"),
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().optional(),
  SMTP_SECURE: Joi.string().valid("true", "false").optional(),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASS: Joi.string().optional(),

  // Third Party APIs
  PAYSTACK_SECRET_KEY: Joi.string().optional(),
  PAYPAL_CLIENT_ID: Joi.string().optional(),
  PAYPAL_CLIENT_SECRET: Joi.string().optional(),
  PAYPAL_WEBHOOK_ID: Joi.string().optional(),
  PAYPAL_SANDBOX: Joi.string().valid("true", "false").optional().default("false"),
  PAYPAL_ENV: Joi.string().valid("sandbox", "live").optional(),
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

  // Initial superadmin (production seeding enforced elsewhere)
  SUPERADMIN_EMAIL: Joi.string().email().optional(),
  SUPERADMIN_PASSWORD: Joi.string().optional(),
});
