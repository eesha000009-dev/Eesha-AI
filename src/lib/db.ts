import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create Prisma client with error handling
// Uses a lazy initialization pattern so that the client is only created
// when first accessed at runtime (not at import/build time).
// This prevents build failures when DATABASE_URL is not set during `next build`.
function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    // Only pass datasources if DATABASE_URL is actually available.
    // At build time, DATABASE_URL is not set, so we skip it to avoid
    // PrismaClientConstructorValidationError.
    ...(process.env.DATABASE_URL ? {
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    } : {}),
  });
}

// Lazy initialization: only create PrismaClient when first accessed
// This prevents "Invalid value undefined for datasource" errors during build
let _db: PrismaClient | undefined;

function getDb(): PrismaClient {
  if (!_db) {
    if (globalForPrisma.prisma) {
      _db = globalForPrisma.prisma;
    } else {
      _db = createPrismaClient();
      if (process.env.NODE_ENV !== 'production') {
        globalForPrisma.prisma = _db;
      }
    }
  }
  return _db;
}

// Export a Proxy that lazily creates the PrismaClient on first property access.
// This means `import { db } from '@/lib/db'` won't crash at build time,
// but any actual usage (like db.user.findUnique()) will work at runtime.
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const actual = getDb();
    const value = Reflect.get(actual, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(actual);
    }
    return value;
  },
});

// Helper to check if database is available
export function isDatabaseAvailable(): boolean {
  return !!process.env.DATABASE_URL;
}
