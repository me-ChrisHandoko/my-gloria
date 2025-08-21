# Fastify Rate Limit Usage Guide

## Overview
This guide shows how to use the Fastify rate limiting system with NestJS.

## Installation
```bash
npm install @fastify/rate-limit
```

## Setup

### 1. Global Rate Limiting in main.ts

```typescript
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyRateLimit from '@fastify/rate-limit';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );

  // Register global rate limiting
  await app.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '15 minutes',
    errorResponseBuilder: function (request, context) {
      return {
        statusCode: 429,
        error: 'Too Many Requests',
        message: `You have exceeded the ${context.max} requests in ${context.after} limit!`,
        date: Date.now(),
        expiresIn: context.ttl
      };
    }
  });

  await app.listen(3000);
}
```

### 2. Using Pre-configured Rate Limiters

```typescript
import { rateLimitConfigs, apiRateLimiters } from './middleware/rate-limit.fastify.middleware';

// In your Fastify route definitions
fastify.route({
  method: 'POST',
  url: '/api/auth/login',
  ...rateLimitConfigs.auth.config, // Apply auth rate limit
  handler: async (request, reply) => {
    // Login logic
  }
});

// For specific API endpoints
fastify.route({
  method: 'POST',
  url: '/api/schools',
  ...apiRateLimiters.schools.create.config, // School creation limit
  handler: async (request, reply) => {
    // Create school
  }
});
```

## Usage Methods

### Method 1: Route-Specific Configuration

```typescript
fastify.route({
  method: 'POST',
  url: '/api/workorders',
  config: {
    rateLimit: {
      max: 15,
      timeWindow: '1 minute',
      keyGenerator: function (request) {
        return request.ip; // Rate limit by IP
      }
    }
  },
  handler: async (request, reply) => {
    // Handler logic
  }
});
```

### Method 2: Using in NestJS Controllers

```typescript
import { Controller, Post, Get } from '@nestjs/common';
import { RateLimit } from './middleware/rate-limit.fastify.middleware';

@Controller('workorders')
export class WorkOrderController {
  
  @Post()
  @RateLimit({ max: 15, timeWindow: '1 minute' })
  async create() {
    // Create work order
  }

  @Post('bulk')
  @RateLimit({ max: 5, timeWindow: '5 minutes', message: 'Bulk operations are limited' })
  async bulkCreate() {
    // Bulk create
  }

  @Get('export')
  @RateLimit({ max: 10, timeWindow: '1 hour', message: 'Exports are limited' })
  async export() {
    // Export data
  }
}
```

### Method 3: Dynamic Rate Limiting Based on User Role

```typescript
import { FastifyInstance, FastifyRequest } from 'fastify';
import { createDynamicRateLimiter } from './middleware/rate-limit.fastify.middleware';

// In your route handler
fastify.addHook('preHandler', async (request, reply) => {
  const config = createDynamicRateLimiter(request);
  
  // Apply dynamic rate limit based on user role
  const limiter = createRateLimiter(config);
  (request as any).routeConfig = limiter.config;
});
```

### Method 4: Using RateLimitService

```typescript
import { Injectable } from '@nestjs/common';
import { RateLimitService } from './middleware/rate-limit.fastify.middleware';

@Injectable()
export class SomeService {
  constructor(private rateLimitService: RateLimitService) {}

  async handleRequest(request: FastifyRequest) {
    // Get dynamic limit based on user
    const user = (request as any).user;
    const config = this.rateLimitService.getDynamicLimit(user);
    
    // Apply custom rate limiting
    const customLimiter = this.rateLimitService.createCustomLimiter({
      max: config.max,
      timeWindow: config.timeWindow,
      message: 'Custom rate limit exceeded'
    });
    
    // Use the limiter configuration
    return customLimiter;
  }

  async checkAndBanIP(ip: string, store: any) {
    // Check if IP is banned
    const isBanned = await this.rateLimitService.checkBan(ip, store);
    
    if (!isBanned && shouldBan) {
      // Ban IP for 1 hour
      await this.rateLimitService.banIP(ip, 3600000, store);
    }
  }
}
```

## Available Pre-configured Rate Limiters

### General Limiters
- **global**: 100 requests per 15 minutes
- **auth**: 5 requests per 15 minutes (skips successful requests)
- **write**: 30 requests per minute
- **sync**: 2 requests per hour
- **bulkOperation**: 5 requests per 5 minutes
- **fileUpload**: 10 requests per 10 minutes
- **export**: 10 requests per hour

### API-Specific Limiters
```typescript
apiRateLimiters.schools.create    // 5 per minute
apiRateLimiters.schools.sync      // 2 per hour
apiRateLimiters.departments.create // 10 per minute
apiRateLimiters.departments.move   // 5 per 5 minutes
apiRateLimiters.positions.create   // 10 per minute
apiRateLimiters.positions.assign   // 20 per minute
apiRateLimiters.hierarchy.update   // 10 per minute
apiRateLimiters.workOrders.create  // 15 per minute
apiRateLimiters.workOrders.bulkUpdate // 5 per 5 minutes
apiRateLimiters.reports.generate   // 5 per 10 minutes
apiRateLimiters.reports.export     // 10 per hour
```

## Dynamic Rate Limits by User Role

| User Type | Max Requests | Time Window |
|-----------|--------------|-------------|
| Anonymous | 50 | 15 minutes |
| Regular User | 100 | 15 minutes |
| Admin | 500 | 15 minutes |
| Superadmin | 1000 | 15 minutes |

## Advanced Configuration

### Custom Key Generator
```typescript
{
  keyGenerator: function (request) {
    // Rate limit by user ID + IP
    const userId = request.user?.id || 'anonymous';
    return `${request.ip}:${userId}`;
  }
}
```

### Skip Successful/Failed Requests
```typescript
{
  skipSuccessfulRequests: true, // Don't count 2xx responses
  skipFailedRequests: true      // Don't count 4xx/5xx responses
}
```

### Allow List
```typescript
{
  allowList: ['192.168.1.1', '10.0.0.1'], // IPs to skip
  // OR
  allowList: function (request) {
    return request.user?.isSuperadmin; // Skip for superadmins
  }
}
```

### Ban Support
```typescript
{
  ban: 10, // Ban after 10 violations
  onBanReached: function (request, key) {
    console.log(`Banned: ${key}`);
    // Send alert, log to database, etc.
  }
}
```

## Error Response Format

```json
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "You have exceeded the 100 requests in 15 minutes limit!",
  "date": 1701234567890,
  "expiresIn": 60000
}
```

## Headers

The rate limiter adds these headers to responses:

- `X-RateLimit-Limit`: Maximum number of requests
- `X-RateLimit-Remaining`: Number of remaining requests
- `X-RateLimit-Reset`: Time when the limit resets
- `Retry-After`: Seconds until retry is allowed (on 429 responses)

## Testing Rate Limits

```typescript
describe('Rate Limiting', () => {
  it('should enforce rate limits', async () => {
    const app = await createTestApp();
    
    // Make requests up to the limit
    for (let i = 0; i < 100; i++) {
      const response = await app.inject({
        method: 'GET',
        url: '/api/test'
      });
      expect(response.statusCode).toBe(200);
    }
    
    // Next request should be rate limited
    const response = await app.inject({
      method: 'GET',
      url: '/api/test'
    });
    expect(response.statusCode).toBe(429);
  });
});
```

## Migration from Express Rate Limit

| Express | Fastify |
|---------|---------|
| `windowMs: 15 * 60 * 1000` | `timeWindow: '15 minutes'` |
| `max: 100` | `max: 100` |
| `message: 'Too many...'` | `errorResponseBuilder: function...` |
| `keyGenerator: (req) => req.ip` | `keyGenerator: (request) => request.ip` |
| `handler: (req, res) => {...}` | `errorResponseBuilder: function...` |

## Performance Tips

1. **Use Redis Store for Production**: Better performance and multi-instance support
2. **Optimize Key Generation**: Simple keys perform better
3. **Skip Successful Requests**: For auth endpoints, only count failures
4. **Use Allow Lists**: Skip rate limiting for trusted IPs/users
5. **Monitor and Adjust**: Track 429 responses and adjust limits accordingly