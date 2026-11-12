export interface MongoEnvConfig {
  NODE_ENV?: string;
  MONGODB_URI?: string;
  MONGO_URL?: string;
  DATABASE_URL?: string;
  MONGO_DB_NAME?: string;
  MONGO_IDLE_DISCONNECT_MS?: string;
  MONGOHOST?: string;
  MONGOPORT?: string;
  MONGOUSER?: string;
  MONGOPASSWORD?: string;
  MONGODATABASE?: string;
  MONGO_INITDB_ROOT_USERNAME?: string;
  MONGO_INITDB_ROOT_PASSWORD?: string;
}

/**
 * Resolves the MongoDB connection URI for local development or Railway production.
 * Throws in production when no MongoDB connection configuration is supplied.
 */
export function resolveMongoUri(env: MongoEnvConfig): string {
  const directUri = [env.MONGODB_URI, env.MONGO_URL, env.DATABASE_URL]
    .map((val) => val?.trim())
    .find((val) => Boolean(val && /^mongodb(\+srv)?:\/\//i.test(val)));

  if (directUri) {
    return directUri;
  }

  const host = env.MONGOHOST?.trim();
  if (host) {
    const port = env.MONGOPORT?.trim() || '27017';
    const user = (env.MONGOUSER || env.MONGO_INITDB_ROOT_USERNAME)?.trim();
    const pass = (env.MONGOPASSWORD || env.MONGO_INITDB_ROOT_PASSWORD)?.trim();
    const dbName = env.MONGODATABASE?.trim() || 'factory_mng';
    const auth =
      user && pass ? `${encodeURIComponent(user)}:${encodeURIComponent(pass)}@` : '';
    const authSource = auth ? '?authSource=admin' : '';
    return `mongodb://${auth}${host}:${port}/${dbName}${authSource}`;
  }

  if (env.NODE_ENV === 'production') {
    throw new Error(
      'MongoDB connection URI is required in production (set MONGODB_URI, MONGO_URL, or DATABASE_URL).',
    );
  }

  return 'mongodb://127.0.0.1:27017/factory_mng';
}

const DEFAULT_IDLE_DISCONNECT_MS = 3 * 60 * 1000;

/**
 * Resolves how long (ms) MongoDB may stay idle before Mongoose closes sockets so
 * Railway Serverless can sleep. Returns 0 when disabled (default outside production).
 */
export function resolveMongoIdleDisconnectMs(env: MongoEnvConfig): number {
  const raw = env.MONGO_IDLE_DISCONNECT_MS?.trim();
  if (raw !== undefined && raw !== '') {
    if (raw.toLowerCase() === 'false' || raw === '0') {
      return 0;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
  }

  return env.NODE_ENV === 'production' ? DEFAULT_IDLE_DISCONNECT_MS : 0;
}

/**
 * Resolves URI + optional dbName fallback and serverless-friendly pool/timeout
 * settings so shared Mongo instances stay isolated in `factory_mng` and cold wakes
 * have time to reconnect.
 */
export function resolveMongoConnectionOptions(env: MongoEnvConfig): {
  uri: string;
  dbName?: string;
  serverSelectionTimeoutMS: number;
  connectTimeoutMS: number;
  socketTimeoutMS: number;
  minPoolSize: number;
  maxIdleTimeMS: number;
  serverMonitoringMode: 'poll';
  heartbeatFrequencyMS: number;
} {
  const uri = resolveMongoUri(env);
  const driverDefaults = {
    serverSelectionTimeoutMS: 20000,
    connectTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    minPoolSize: 0,
    maxIdleTimeMS: 60000,
    serverMonitoringMode: 'poll' as const,
    heartbeatFrequencyMS: 60000,
  };

  const explicitDbName = (env.MONGO_DB_NAME || env.MONGODATABASE)?.trim();
  if (explicitDbName) {
    return { uri, dbName: explicitDbName, ...driverDefaults };
  }

  try {
    const parsed = new URL(uri);
    if (!parsed.pathname || parsed.pathname === '/') {
      return { uri, dbName: 'factory_mng', ...driverDefaults };
    }
  } catch {
    // Fallback to URI as-is if multi-host seedlist fails URL() parsing
  }

  return { uri, ...driverDefaults };
}

/** Reads MongoDB-related environment keys from a ConfigService-like getter. */
export function readMongoEnv(get: (key: string) => string | undefined): MongoEnvConfig {
  return {
    NODE_ENV: get('NODE_ENV'),
    MONGODB_URI: get('MONGODB_URI'),
    MONGO_URL: get('MONGO_URL'),
    DATABASE_URL: get('DATABASE_URL'),
    MONGO_DB_NAME: get('MONGO_DB_NAME'),
    MONGO_IDLE_DISCONNECT_MS: get('MONGO_IDLE_DISCONNECT_MS'),
    MONGOHOST: get('MONGOHOST'),
    MONGOPORT: get('MONGOPORT'),
    MONGOUSER: get('MONGOUSER'),
    MONGOPASSWORD: get('MONGOPASSWORD'),
    MONGODATABASE: get('MONGODATABASE'),
    MONGO_INITDB_ROOT_USERNAME: get('MONGO_INITDB_ROOT_USERNAME'),
    MONGO_INITDB_ROOT_PASSWORD: get('MONGO_INITDB_ROOT_PASSWORD'),
  };
}
