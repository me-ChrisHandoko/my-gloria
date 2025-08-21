import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import {
  ValidationPipe,
  VersioningType,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { AppModule } from './app.module';
import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';
import fastifyCompress from '@fastify/compress';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import fastifyMultipart from '@fastify/multipart';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Create Fastify adapter with best practice options
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: process.env.NODE_ENV === 'development',
      trustProxy: true,
      bodyLimit: 10485760, // 10MB
    }),
    {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    },
  );

  // Security - Helmet for secure headers
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [`'self'`],
        styleSrc: [`'self'`, `'unsafe-inline'`],
        scriptSrc: [`'self'`, `'unsafe-inline'`, `'unsafe-eval'`],
        imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
        fontSrc: [`'self'`],
      },
    },
  });

  // CORS configuration
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3000'];

  await app.register(fastifyCors, {
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Compression
  await app.register(fastifyCompress, {
    encodings: ['gzip', 'deflate'],
    threshold: 1024, // Only compress responses above 1KB
  });

  // Cookie support
  await app.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET || 'my-gloria-secret-key', // Should be in env
  });

  // Session support for impersonation
  await app.register(fastifySession, {
    secret:
      process.env.SESSION_SECRET ||
      'my-gloria-session-secret-key-change-in-production',
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      httpOnly: true,
      maxAge: 3600000, // 1 hour
      sameSite: 'lax',
    },
    saveUninitialized: false,
    rolling: true, // Reset expiry on activity
  });

  // Multipart support for file uploads
  await app.register(fastifyMultipart, {
    limits: {
      fieldNameSize: 100, // Max field name size in bytes
      fieldSize: 100000, // Max field value size in bytes
      fields: 10, // Max number of non-file fields
      fileSize: 10485760, // 10MB - Max file size in bytes
      files: 5, // Max number of file fields
      headerPairs: 2000, // Max number of header key=>value pairs
    },
  });

  // Global prefix and versioning
  const apiPrefix = process.env.API_PREFIX || 'api';

  app.setGlobalPrefix(apiPrefix);

  // Enable versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global validation pipe with transform
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: false, // Don't throw error if non-whitelisted values are provided, just strip them
      transform: true, // Automatically transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Enable implicit type conversion
      },
      validationError: {
        target: false, // Don't expose the target object in error messages
        value: false, // Don't expose the value in error messages
      },
      exceptionFactory: (errors) => {
        logger.error('Validation failed:', JSON.stringify(errors, null, 2));
        const messages = errors
          .map((err) => {
            const constraints = err.constraints
              ? Object.values(err.constraints).join(', ')
              : 'Unknown error';
            return `${err.property}: ${constraints}`;
          })
          .join('; ');
        return new BadRequestException(`Validation failed: ${messages}`);
      },
    }),
  );

  // Graceful shutdown
  app.enableShutdownHooks();

  // Start server
  const port = process.env.PORT || 3001;
  const host = process.env.HOST || '0.0.0.0'; // Listen on all interfaces

  await app.listen(port, host);

  logger.log(
    `🚀 Application is running on: http://${host}:${port}/${apiPrefix}`,
  );
  logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`🔒 CORS enabled for: ${corsOrigins.join(', ')}`);

  // Log to console as well to ensure we see it
  console.log(`✅ Server is listening on port ${port}`);
}

bootstrap().catch((error) => {
  console.error('❌ Error starting server:', error);
  process.exit(1);
});
