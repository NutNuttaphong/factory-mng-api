import './polyfill';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 20;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const expressApp = app.getHttpAdapter().getInstance();
  if (typeof expressApp?.disable === 'function') {
    expressApp.disable('x-powered-by');
  }

  // Baseline security headers without extra runtime dependencies
  app.use((req: any, res: any, next: () => void) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    // Simple per-IP rate limiting for login endpoint
    if (req.method === 'POST' && req.path === '/api/auth/login') {
      const now = Date.now();
      if (loginAttempts.size > 1000) {
        for (const [key, entry] of loginAttempts.entries()) {
          if (entry.resetAt <= now) loginAttempts.delete(key);
        }
      }
      const ip = String(req.headers['x-forwarded-for'] || req.ip || 'unknown').split(',')[0].trim();
      const record = loginAttempts.get(ip);
      if (!record || record.resetAt <= now) {
        loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
      } else {
        record.count += 1;
        if (record.count > LOGIN_MAX_ATTEMPTS) {
          res.status(429).json({
            statusCode: 429,
            message: 'Too many login attempts. Please try again later.',
          });
          return;
        }
      }
    }
    next();
  });

  // Configure CORS (use CORS_ORIGIN allowlist when provided)
  const rawCorsOrigins = process.env.CORS_ORIGIN?.trim();
  const allowedOrigins = rawCorsOrigins
    ? rawCorsOrigins.split(',').map((origin) => origin.trim()).filter(Boolean)
    : null;

  app.enableCors(
    allowedOrigins && allowedOrigins.length > 0
      ? { origin: allowedOrigins, credentials: true }
      : undefined,
  );

  // Set global prefix for API endpoints
  app.setGlobalPrefix('api');

  // Enable validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/api`);
}
bootstrap();
