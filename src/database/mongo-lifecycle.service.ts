import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, ConnectionStates } from 'mongoose';
import {
  readMongoEnv,
  resolveMongoConnectionOptions,
  resolveMongoIdleDisconnectMs,
} from './database-config.util';

/**
 * Closes idle Mongoose connections in production after inactivity so Railway
 * Serverless can sleep without background MongoDB driver heartbeats/keepalives,
 * and transparently reconnects before handling incoming requests.
 */
@Injectable()
export class MongoLifecycleService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(MongoLifecycleService.name);
  private readonly idleDisconnectMs: number;
  private idleTimer: NodeJS.Timeout | null = null;
  private activeRequests = 0;
  private connectPromise: Promise<void> | null = null;
  private closePromise: Promise<void> | null = null;
  private isShuttingDown = false;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly configService: ConfigService,
  ) {
    const env = readMongoEnv((key) => this.configService.get<string>(key));
    this.idleDisconnectMs = resolveMongoIdleDisconnectMs(env);
  }

  onApplicationBootstrap(): void {
    this.scheduleIdleTimer();
  }

  onModuleDestroy(): void {
    this.isShuttingDown = true;
    this.clearIdleTimer();
  }

  /** Ensures MongoDB is connected and marks one active in-flight HTTP request. */
  async acquireRequest(): Promise<void> {
    this.activeRequests += 1;
    this.clearIdleTimer();
    try {
      await this.ensureConnected();
    } catch (err) {
      this.releaseRequest();
      throw err;
    }
  }

  /** Marks an in-flight HTTP request finished and starts the idle timer if empty. */
  releaseRequest(): void {
    if (this.activeRequests > 0) {
      this.activeRequests -= 1;
    }
    if (this.activeRequests === 0) {
      this.scheduleIdleTimer();
    }
  }

  /** Reconnects Mongoose if closed so models bound to this connection stay usable. */
  async ensureConnected(): Promise<void> {
    if (this.closePromise) {
      await this.closePromise;
    }

    if (this.connection.readyState === ConnectionStates.connected) {
      return;
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    if (this.connection.readyState === ConnectionStates.connecting) {
      this.connectPromise = this.connection
        .asPromise()
        .then(() => undefined)
        .finally(() => {
          this.connectPromise = null;
        });
      return this.connectPromise;
    }

    this.connectPromise = (async () => {
      const env = readMongoEnv((key) => this.configService.get<string>(key));
      const { uri, ...connectOptions } = resolveMongoConnectionOptions(env);
      this.logger.log('Reconnecting MongoDB after idle sleep...');
      await this.connection.openUri(uri, connectOptions);
    })()
      .catch((err) => {
        this.logger.error('Failed to reconnect MongoDB', err instanceof Error ? err.stack : err);
        throw new ServiceUnavailableException('Database is waking up, please retry shortly');
      })
      .finally(() => {
        this.connectPromise = null;
      });

    return this.connectPromise;
  }

  async disconnectIfIdle(): Promise<void> {
    if (
      this.isShuttingDown ||
      this.activeRequests > 0 ||
      this.connectPromise ||
      this.connection.readyState === ConnectionStates.disconnected
    ) {
      return;
    }

    if (this.closePromise) {
      return this.closePromise;
    }

    this.closePromise = this.connection
      .close(false)
      .then(() => {
        this.logger.log(
          `Closed idle MongoDB connection after ${Math.round(this.idleDisconnectMs / 1000)}s of inactivity.`,
        );
      })
      .catch((err) => {
        this.logger.warn(
          `Error closing idle MongoDB connection: ${err instanceof Error ? err.message : String(err)}`,
        );
      })
      .finally(() => {
        this.closePromise = null;
      });

    return this.closePromise;
  }

  private scheduleIdleTimer(): void {
    this.clearIdleTimer();
    if (this.isShuttingDown || this.idleDisconnectMs <= 0 || this.activeRequests > 0) {
      return;
    }

    this.idleTimer = setTimeout(() => {
      this.idleTimer = null;
      void this.disconnectIfIdle();
    }, this.idleDisconnectMs);
    this.idleTimer.unref?.();
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }
}
