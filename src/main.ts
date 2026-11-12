import './polyfill';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { InMemoryRateLimiter, parseTrustProxy, resolveClientIp } from './common/security.util';

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const loginLimiter = new InMemoryRateLimiter(LOGIN_WINDOW_MS, 20);
const changePasswordLimiter = new InMemoryRateLimiter(LOGIN_WINDOW_MS, 10);

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const expressApp = app.getHttpAdapter().getInstance();
  if (typeof expressApp?.disable === 'function') {
    expressApp.disable('x-powered-by');
  }
  if (typeof expressApp?.set === 'function') {
    expressApp.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY, process.env.NODE_ENV));
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

    // Proxy-aware per-IP rate limiting for authentication endpoints
    if (req.method === 'POST' && (req.path === '/api/auth/login' || req.path === '/api/auth/change-password')) {
      const limiter = req.path === '/api/auth/login' ? loginLimiter : changePasswordLimiter;
      const ip = resolveClientIp(req);
      const result = limiter.consume(ip);
      if (!result.allowed) {
        res.setHeader('Retry-After', String(result.retryAfterSeconds));
        res.status(429).json({
          statusCode: 429,
          message: 'Too many authentication attempts. Please try again later.',
        });
        return;
      }
    }
    next();
  });

  // Configure CORS (use CORS_ORIGIN allowlist; do not expose wildcard CORS in production)
  const rawCorsOrigins = process.env.CORS_ORIGIN?.trim();
  const allowedOrigins = rawCorsOrigins
    ? rawCorsOrigins.split(',').map((origin) => origin.trim()).filter(Boolean)
    : null;

  if (allowedOrigins && allowedOrigins.length > 0) {
    app.enableCors({ origin: allowedOrigins, credentials: true });
  } else if (process.env.NODE_ENV === 'production') {
    logger.warn('CORS_ORIGIN is not set in production; cross-origin browser requests are disabled.');
  } else {
    app.enableCors();
  }

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
