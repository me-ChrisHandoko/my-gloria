import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.number().port().default(3001),
  HOST: Joi.string().hostname().default('0.0.0.0'),

  // API
  API_PREFIX: Joi.string().default('api'),
  API_VERSION: Joi.string().default('v1'),

  // Database
  DATABASE_URL: Joi.string()
    .uri()
    .required()
    .description('PostgreSQL connection string'),
  DATABASE_POOL_SIZE: Joi.number().min(1).max(100).default(10),

  // CORS
  CORS_ORIGINS: Joi.string()
    .default('http://localhost:3000')
    .description('Comma-separated list of allowed origins'),

  // Rate Limiting
  RATE_LIMIT_TTL: Joi.number().min(1).default(60),
  RATE_LIMIT_MAX: Joi.number().min(1).default(100),

  // Security
  COOKIE_SECRET: Joi.string().min(32).required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  BCRYPT_ROUNDS: Joi.number().min(8).max(15).default(10),
  SESSION_SECRET: Joi.string().min(32).when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  // File Upload
  MAX_FILE_SIZE: Joi.number().min(1024).default(10485760), // 10MB
  MAX_FILES: Joi.number().min(1).max(20).default(5),
  ALLOWED_MIME_TYPES: Joi.string().default(
    'image/jpeg,image/png,image/gif,application/pdf',
  ),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('debug'),

  // Clerk Auth (Required for authentication)
  CLERK_PUBLISHABLE_KEY: Joi.string()
    .pattern(/^pk_(test|live)_/)
    .required()
    .description('Clerk publishable key'),
  CLERK_SECRET_KEY: Joi.string()
    .pattern(/^sk_(test|live)_/)
    .required()
    .description('Clerk secret key'),
  CLERK_WEBHOOK_SECRET: Joi.string()
    .pattern(/^whsec_/)
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
    .description('Clerk webhook secret for production'),
});

export const validateConfig = (config: Record<string, any>) => {
  const { error, value } = configValidationSchema.validate(config, {
    abortEarly: false,
    allowUnknown: true,
  });

  if (error) {
    const errorMessages = error.details
      .map((detail) => `${detail.path.join('.')}: ${detail.message}`)
      .join('\n');
    throw new Error(`Config validation error:\n${errorMessages}`);
  }

  return value;
};

export default registerAs('validation', () => ({
  schema: configValidationSchema,
  validate: validateConfig,
}));
