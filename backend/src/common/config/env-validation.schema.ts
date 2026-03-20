import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'provision')
    .default('development'),
  PORT: Joi.number().default(3000),
  
  // Database
  DATABASE_URL: Joi.string().required().description('Connection string for PostgreSQL'),
  
  // Redis (Cashing & Scalability)
  REDIS_HOST: Joi.string().required().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  
  // Security
  JWT_SECRET: Joi.string().required(),
  FRONTEND_URL: Joi.string().uri().required(),
  
  // AI Agent (Resilience)
  AI_AGENT_URL: Joi.string().uri().default('http://localhost:8000'),
  
  // Third Party APIs
  PAYSTACK_SECRET_KEY: Joi.string().optional(),
  RESEND_API_KEY: Joi.string().optional(),
});
