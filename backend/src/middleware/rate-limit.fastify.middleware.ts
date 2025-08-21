import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyRateLimit from '@fastify/rate-limit';
import { Injectable } from '@nestjs/common';

/**
 * Rate limit configuration types
 */
export interface RateLimitConfig {
  max?: number;
  timeWindow?: number | string;
  message?: string;
  keyGenerator?: (request: FastifyRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  allowList?: string[] | ((request: FastifyRequest) => boolean);
  ban?: number;
  onBanReached?: (request: FastifyRequest, key: string) => void;
}

/**
 * Register global rate limiter
 */
export async function registerGlobalRateLimit(fastify: FastifyInstance) {
  await fastify.register(fastifyRateLimit, {
    max: 100, // 100 requests
    timeWindow: '15 minutes',
    errorResponseBuilder: function (request: FastifyRequest, context: any) {
      return {
        statusCode: 429,
        error: 'Too Many Requests',
        message: `You have exceeded the ${context.max} requests in ${context.after} limit!`,
        date: Date.now(),
        expiresIn: context.ttl,
      };
    },
  });
}

/**
 * Create route-specific rate limiter
 */
export function createRateLimiter(config: RateLimitConfig = {}) {
  return {
    config: {
      rateLimit: {
        max: config.max || 100,
        timeWindow: config.timeWindow || '15 minutes',
        keyGenerator:
          config.keyGenerator ||
          function (request: FastifyRequest) {
            const userId = (request as any).user?.clerkUserId || 'anonymous';
            return `${request.ip}:${userId}`;
          },
        skipSuccessfulRequests: config.skipSuccessfulRequests || false,
        skipFailedRequests: config.skipFailedRequests || false,
        allowList: config.allowList,
        ban: config.ban,
        onBanReached: config.onBanReached,
        errorResponseBuilder: function (request: FastifyRequest, context: any) {
          return {
            statusCode: 429,
            error: 'Too Many Requests',
            message:
              config.message ||
              `Rate limit exceeded. Max ${context.max} requests per ${context.after}`,
            date: Date.now(),
            expiresIn: context.ttl,
          };
        },
      },
    },
  };
}

/**
 * Rate limit configurations for different endpoints
 */
export const rateLimitConfigs = {
  // Global default
  global: createRateLimiter({
    max: 100,
    timeWindow: '15 minutes',
    message: 'Too many requests from this IP, please try again later.',
  }),

  // Strict rate limiter for authentication endpoints
  auth: createRateLimiter({
    max: 5,
    timeWindow: '15 minutes',
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true,
  }),

  // Rate limiter for write operations (POST, PUT, DELETE)
  write: createRateLimiter({
    max: 30,
    timeWindow: '1 minute',
    message: 'Too many write operations, please slow down.',
  }),

  // Strict rate limiter for sync operations
  sync: createRateLimiter({
    max: 2,
    timeWindow: '1 hour',
    message: 'Sync operations are limited. Please try again later.',
  }),

  // Rate limiter for bulk operations
  bulkOperation: createRateLimiter({
    max: 5,
    timeWindow: '5 minutes',
    message: 'Bulk operations are limited. Please try again later.',
  }),

  // Rate limiter for file uploads
  fileUpload: createRateLimiter({
    max: 10,
    timeWindow: '10 minutes',
    message: 'File upload limit exceeded. Please try again later.',
  }),

  // Rate limiter for exports
  export: createRateLimiter({
    max: 10,
    timeWindow: '1 hour',
    message: 'Export limit exceeded. Please try again later.',
  }),
};

/**
 * Dynamic rate limiter based on user role
 */
export function createDynamicRateLimiter(
  request: FastifyRequest,
): RateLimitConfig {
  const user = (request as any).user;

  if (!user) {
    // Anonymous users - most restrictive
    return {
      max: 50,
      timeWindow: '15 minutes',
      message:
        'Anonymous rate limit exceeded. Please authenticate for higher limits.',
    };
  }

  if (user.isSuperadmin) {
    // Superadmins - highest limit
    return {
      max: 1000,
      timeWindow: '15 minutes',
    };
  }

  if (user.roles?.includes('admin')) {
    // Admins - high limit
    return {
      max: 500,
      timeWindow: '15 minutes',
    };
  }

  // Regular authenticated users
  return {
    max: 100,
    timeWindow: '15 minutes',
  };
}

/**
 * Apply dynamic rate limiting to a route
 */
export async function applyDynamicRateLimit(
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const config = createDynamicRateLimiter(request);
  const limiter = createRateLimiter(config);

  // Apply the rate limit configuration to the current request
  (request as any).routeConfig = limiter.config;
}

/**
 * API endpoint-specific rate limiters
 */
export const apiRateLimiters = {
  // Organization module endpoints
  schools: {
    create: createRateLimiter({
      max: 5,
      timeWindow: '1 minute',
      message: 'School creation is limited to 5 per minute',
    }),
    sync: createRateLimiter({
      max: 2,
      timeWindow: '1 hour',
      message: 'School sync is limited to 2 per hour',
    }),
  },

  departments: {
    create: createRateLimiter({
      max: 10,
      timeWindow: '1 minute',
      message: 'Department creation is limited to 10 per minute',
    }),
    move: createRateLimiter({
      max: 5,
      timeWindow: '5 minutes',
      message: 'Department moves are limited to 5 per 5 minutes',
    }),
  },

  positions: {
    create: createRateLimiter({
      max: 10,
      timeWindow: '1 minute',
      message: 'Position creation is limited to 10 per minute',
    }),
    assign: createRateLimiter({
      max: 20,
      timeWindow: '1 minute',
      message: 'Position assignments are limited to 20 per minute',
    }),
  },

  hierarchy: {
    update: createRateLimiter({
      max: 10,
      timeWindow: '1 minute',
      message: 'Hierarchy updates are limited to 10 per minute',
    }),
  },

  workOrders: {
    create: createRateLimiter({
      max: 15,
      timeWindow: '1 minute',
      message: 'Work order creation is limited to 15 per minute',
    }),
    bulkUpdate: createRateLimiter({
      max: 5,
      timeWindow: '5 minutes',
      message: 'Bulk work order updates are limited to 5 per 5 minutes',
    }),
  },

  reports: {
    generate: createRateLimiter({
      max: 5,
      timeWindow: '10 minutes',
      message: 'Report generation is limited to 5 per 10 minutes',
    }),
    export: createRateLimiter({
      max: 10,
      timeWindow: '1 hour',
      message: 'Report exports are limited to 10 per hour',
    }),
  },
};

/**
 * Register rate limiting for specific routes
 */
export function registerRouteRateLimit(
  fastify: FastifyInstance,
  path: string,
  config: RateLimitConfig,
) {
  const limiter = createRateLimiter(config);

  fastify.route({
    method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    url: path,
    config: limiter.config,
    handler: async (request, reply) => {
      // This handler will be overridden by the actual route handler
      reply.code(404).send({ error: 'Not Found' });
    },
  });
}

/**
 * Helper function to apply rate limiting in NestJS controllers
 */
export function RateLimit(config: RateLimitConfig) {
  return function (
    target: any,
    propertyName?: string,
    descriptor?: PropertyDescriptor,
  ) {
    // Store rate limit config as metadata
    const limiterConfig = createRateLimiter(config);

    if (descriptor) {
      // Method decorator
      Reflect.defineMetadata(
        'rateLimit',
        limiterConfig.config,
        descriptor.value,
      );
    } else {
      // Class decorator
      Reflect.defineMetadata('rateLimit', limiterConfig.config, target);
    }
  };
}

/**
 * Injectable service for dynamic rate limiting
 */
@Injectable()
export class RateLimitService {
  private readonly limiters = new Map<string, RateLimitConfig>();

  constructor() {
    // Initialize default limiters
    this.limiters.set('global', { max: 100, timeWindow: '15 minutes' });
    this.limiters.set('auth', {
      max: 5,
      timeWindow: '15 minutes',
      skipSuccessfulRequests: true,
    });
    this.limiters.set('write', { max: 30, timeWindow: '1 minute' });
    this.limiters.set('sync', { max: 2, timeWindow: '1 hour' });
  }

  /**
   * Get rate limiter configuration by name
   */
  getLimiter(name: string): RateLimitConfig {
    return this.limiters.get(name) || this.limiters.get('global')!;
  }

  /**
   * Create custom rate limiter
   */
  createCustomLimiter(config: RateLimitConfig): any {
    return createRateLimiter(config);
  }

  /**
   * Get dynamic rate limit based on user
   */
  getDynamicLimit(user: any): RateLimitConfig {
    if (!user) {
      return { max: 50, timeWindow: '15 minutes' };
    }

    if (user.isSuperadmin) {
      return { max: 1000, timeWindow: '15 minutes' };
    }

    if (user.roles?.includes('admin')) {
      return { max: 500, timeWindow: '15 minutes' };
    }

    return { max: 100, timeWindow: '15 minutes' };
  }

  /**
   * Check if IP is banned
   */
  async checkBan(ip: string, store: any): Promise<boolean> {
    const key = `ban:${ip}`;
    const banned = await store.get(key);
    return banned !== null;
  }

  /**
   * Ban an IP address
   */
  async banIP(ip: string, duration: number, store: any): Promise<void> {
    const key = `ban:${ip}`;
    await store.set(key, true, duration);
  }
}

export default {
  registerGlobalRateLimit,
  createRateLimiter,
  rateLimitConfigs,
  apiRateLimiters,
  registerRouteRateLimit,
  RateLimit,
  RateLimitService,
  createDynamicRateLimiter,
  applyDynamicRateLimit,
};
