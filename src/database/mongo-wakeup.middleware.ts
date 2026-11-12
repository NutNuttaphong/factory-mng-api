import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { MongoLifecycleService } from './mongo-lifecycle.service';

/**
 * Ensures the MongoDB connection is active before handling HTTP requests and tracks
 * active requests so idle disconnect only happens when no requests are in flight.
 */
@Injectable()
export class MongoWakeupMiddleware implements NestMiddleware {
  constructor(private readonly mongoLifecycle: MongoLifecycleService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (req.method === 'OPTIONS') {
      next();
      return;
    }

    await this.mongoLifecycle.acquireRequest();
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      this.mongoLifecycle.releaseRequest();
    };

    res.once('finish', release);
    res.once('close', release);
    next();
  }
}
