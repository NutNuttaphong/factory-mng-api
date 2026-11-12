export interface MongoEnvConfig {
  NODE_ENV?: string;
  MONGODB_URI?: string;
  MONGO_URL?: string;
  DATABASE_URL?: string;
  MONGO_DB_NAME?: string;
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

/**
 * Resolves URI + optional dbName fallback so shared Mongo instances (e.g. Railway
 * default `MONGO_URL` without a `/dbname` path) stay isolated in `factory_mng`.
 */
export function resolveMongoConnectionOptions(env: MongoEnvConfig): {
  uri: string;
  dbName?: string;
} {
  const uri = resolveMongoUri(env);
  const explicitDbName = (env.MONGO_DB_NAME || env.MONGODATABASE)?.trim();
  if (explicitDbName) {
    return { uri, dbName: explicitDbName };
  }

  try {
    const parsed = new URL(uri);
    if (!parsed.pathname || parsed.pathname === '/') {
      return { uri, dbName: 'factory_mng' };
    }
  } catch {
    // Fallback to URI as-is if multi-host seedlist fails URL() parsing
  }

  return { uri };
}
