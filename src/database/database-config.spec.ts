import * as mongoose from 'mongoose';
import {
  resolveMongoUri,
  resolveMongoConnectionOptions,
  resolveMongoIdleDisconnectMs,
} from './database-config.util';
import { MongoLifecycleService } from './mongo-lifecycle.service';
import { UserSchema, StockSchema } from './entities';

describe('MongoDB Database Configuration & Schemas', () => {
  it('resolves direct MongoDB URIs across MONGODB_URI, MONGO_URL, and DATABASE_URL', () => {
    expect(
      resolveMongoUri({
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://user:pass@mongo.railway.internal:27017/factory_mng',
      }),
    ).toBe('mongodb://user:pass@mongo.railway.internal:27017/factory_mng');

    expect(
      resolveMongoUri({
        NODE_ENV: 'production',
        MONGO_URL: 'mongodb+srv://user:pass@cluster.mongodb.net/factory_mng',
      }),
    ).toBe('mongodb+srv://user:pass@cluster.mongodb.net/factory_mng');

    expect(
      resolveMongoUri({
        NODE_ENV: 'production',
        DATABASE_URL: 'mongodb://user:pass@host:27017/db',
      }),
    ).toBe('mongodb://user:pass@host:27017/db');
  });

  it('builds MongoDB URI from Railway MONGOHOST/MONGOUSER/MONGOPASSWORD vars', () => {
    expect(
      resolveMongoUri({
        NODE_ENV: 'production',
        MONGOHOST: 'mongo.railway.internal',
        MONGOPORT: '27017',
        MONGOUSER: 'mongo',
        MONGOPASSWORD: 'p@ss:word',
        MONGODATABASE: 'factory',
      }),
    ).toBe('mongodb://mongo:p%40ss%3Aword@mongo.railway.internal:27017/factory?authSource=admin');
  });

  it('throws in production when no MongoDB URI is provided and falls back locally in dev', () => {
    expect(() => resolveMongoUri({ NODE_ENV: 'production' })).toThrow();
    expect(resolveMongoUri({ NODE_ENV: 'development' })).toBe(
      'mongodb://127.0.0.1:27017/factory_mng',
    );
  });

  it('defaults dbName to factory_mng when Railway MONGO_URL has no database path', () => {
    expect(
      resolveMongoConnectionOptions({
        NODE_ENV: 'production',
        MONGO_URL: 'mongodb://mongo:secret@mongodb.railway.internal:27017',
      }),
    ).toEqual(
      expect.objectContaining({
        uri: 'mongodb://mongo:secret@mongodb.railway.internal:27017',
        dbName: 'factory_mng',
        serverMonitoringMode: 'poll',
        minPoolSize: 0,
      }),
    );

    const custom = resolveMongoConnectionOptions({
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://mongo:secret@mongodb.railway.internal:27017/custom_erp',
    });
    expect(custom.uri).toBe('mongodb://mongo:secret@mongodb.railway.internal:27017/custom_erp');
    expect(custom.dbName).toBeUndefined();
  });

  it('resolves idle disconnect timeout defaults for production and overrides', () => {
    expect(resolveMongoIdleDisconnectMs({ NODE_ENV: 'production' })).toBe(180000);
    expect(resolveMongoIdleDisconnectMs({ NODE_ENV: 'development' })).toBe(0);
    expect(resolveMongoIdleDisconnectMs({ NODE_ENV: 'production', MONGO_IDLE_DISCONNECT_MS: '0' })).toBe(0);
    expect(
      resolveMongoIdleDisconnectMs({ NODE_ENV: 'production', MONGO_IDLE_DISCONNECT_MS: 'false' }),
    ).toBe(0);
    expect(
      resolveMongoIdleDisconnectMs({ NODE_ENV: 'development', MONGO_IDLE_DISCONNECT_MS: '45000' }),
    ).toBe(45000);
  });

  it('disconnects idle MongoDB connection and reconnects safely on concurrent requests', async () => {
    jest.useFakeTimers();
    try {
      const mockConnection = {
        readyState: 1,
        close: jest.fn().mockImplementation(async () => {
          mockConnection.readyState = 0;
        }),
        openUri: jest.fn().mockImplementation(async () => {
          mockConnection.readyState = 1;
          return mockConnection;
        }),
        asPromise: jest.fn().mockResolvedValue(undefined),
      };
      const mockConfig = {
        get: (key: string) =>
          ({
            NODE_ENV: 'production',
            MONGO_URL: 'mongodb://mongo:secret@mongodb.railway.internal:27017',
            MONGO_IDLE_DISCONNECT_MS: '5000',
          })[key],
      };

      const lifecycle = new MongoLifecycleService(mockConnection as any, mockConfig as any);
      lifecycle.onApplicationBootstrap();

      // Advance past idle threshold -> connection closes cleanly
      await jest.advanceTimersByTimeAsync(5000);
      expect(mockConnection.close).toHaveBeenCalledTimes(1);
      expect(mockConnection.readyState).toBe(0);

      // Concurrent incoming requests trigger a single openUri reconnect
      await Promise.all([lifecycle.acquireRequest(), lifecycle.acquireRequest()]);
      expect(mockConnection.openUri).toHaveBeenCalledTimes(1);
      expect(mockConnection.readyState).toBe(1);

      // While 1 request remains active, idle timer must NOT close connection
      lifecycle.releaseRequest();
      await jest.advanceTimersByTimeAsync(10000);
      expect(mockConnection.close).toHaveBeenCalledTimes(1);

      // Final request finishes -> idle timer fires and closes again
      lifecycle.releaseRequest();
      await jest.advanceTimersByTimeAsync(5000);
      expect(mockConnection.close).toHaveBeenCalledTimes(2);

      lifecycle.onModuleDestroy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('strips passwordHash, tokenVersion, _id, and __v on User JSON serialization', () => {
    const TestModel =
      mongoose.models.UserTransformTest || mongoose.model('UserTransformTest', UserSchema);
    const doc = new TestModel({
      email: 'admin@factory.com',
      fullName: 'Admin',
      passwordHash: '$2b$10$secret',
      tokenVersion: 4,
    });

    const json = doc.toJSON() as Record<string, any>;
    expect(typeof json.id).toBe('string');
    expect(json._id).toBeUndefined();
    expect(json.__v).toBeUndefined();
    expect(json.passwordHash).toBeUndefined();
    expect(json.tokenVersion).toBeUndefined();
    expect(json.email).toBe('admin@factory.com');
  });

  it('defines unique compound index on Stock (product, warehouse)', () => {
    const indexes = StockSchema.indexes();
    expect(indexes).toEqual(
      expect.arrayContaining([
        [{ product: 1, warehouse: 1 }, expect.objectContaining({ unique: true })],
      ]),
    );
  });
});
