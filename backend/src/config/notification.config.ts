import { registerAs } from '@nestjs/config';

export default registerAs('notification', () => ({
  defaultLocale: process.env.NOTIFICATION_DEFAULT_LOCALE || 'en',
  supportedLocales: (
    process.env.NOTIFICATION_SUPPORTED_LOCALES || 'en,id'
  ).split(','),

  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    from: process.env.EMAIL_FROM || 'noreply@ypkgloria.org',
    maxConnections: parseInt(process.env.EMAIL_MAX_CONNECTIONS || '5', 10),
    connectionTimeout: parseInt(
      process.env.EMAIL_CONNECTION_TIMEOUT || '60000',
      10,
    ),
  },

  mjml: {
    minify: process.env.NODE_ENV === 'production',
    validationLevel: process.env.MJML_VALIDATION_LEVEL || 'soft',
    keepComments: process.env.NODE_ENV !== 'production',
  },

  templates: {
    cacheEnabled: process.env.TEMPLATE_CACHE_ENABLED !== 'false',
    cacheTTL: parseInt(process.env.TEMPLATE_CACHE_TTL || '3600', 10),
    abTestingEnabled: process.env.TEMPLATE_AB_TESTING_ENABLED === 'true',
  },

  queue: {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
    },
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  },

  rateLimit: {
    windowMs: parseInt(
      process.env.NOTIFICATION_RATE_LIMIT_WINDOW || '60000',
      10,
    ), // 1 minute
    maxPerWindow: parseInt(process.env.NOTIFICATION_RATE_LIMIT_MAX || '10', 10),
  },

  circuitBreaker: {
    threshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '50', 10), // 50%
    timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '60000', 10), // 1 minute
    resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET || '300000', 10), // 5 minutes
  },

  batch: {
    size: parseInt(process.env.NOTIFICATION_BATCH_SIZE || '100', 10),
    timeout: parseInt(process.env.NOTIFICATION_BATCH_TIMEOUT || '5000', 10), // 5 seconds
  },

  retention: {
    daysToKeep: parseInt(process.env.NOTIFICATION_RETENTION_DAYS || '90', 10),
    cleanupEnabled: process.env.NOTIFICATION_CLEANUP_ENABLED !== 'false',
    cleanupSchedule: process.env.NOTIFICATION_CLEANUP_SCHEDULE || '0 0 2 * * *', // 2 AM daily
  },
}));
