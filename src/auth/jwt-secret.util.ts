import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';

const logger = new Logger('JwtSecret');
let cachedDevSecret: string | null = null;

/**
 * Resolves JWT signing/verification secret safely.
 * Fails fast in production when JWT_SECRET is missing or weak.
 */
export function resolveJwtSecret(configService: ConfigService): string {
  const configured = configService.get<string>('JWT_SECRET')?.trim();
  const isProduction = configService.get<string>('NODE_ENV') === 'production';

  if (configured && configured !== 'secretKey123' && configured.length >= 16) {
    return configured;
  }

  if (isProduction) {
    throw new Error(
      'JWT_SECRET must be configured with a strong secret (>= 16 characters) in production.',
    );
  }

  if (!cachedDevSecret) {
    cachedDevSecret = randomBytes(32).toString('hex');
    logger.warn(
      'JWT_SECRET is missing or weak; generated an ephemeral development secret for this process.',
    );
  }

  return cachedDevSecret;
}
