import * as mongoose from 'mongoose';
import { resolveMongoUri, resolveMongoConnectionOptions } from './database-config.util';
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
    ).toEqual({
      uri: 'mongodb://mongo:secret@mongodb.railway.internal:27017',
      dbName: 'factory_mng',
    });

    expect(
      resolveMongoConnectionOptions({
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://mongo:secret@mongodb.railway.internal:27017/custom_erp',
      }),
    ).toEqual({
      uri: 'mongodb://mongo:secret@mongodb.railway.internal:27017/custom_erp',
    });
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
