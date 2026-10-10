import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_FvtoN3kjsB2A@ep-ancient-glade-b5fmcqzb-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require';

const pool = globalForPrisma.pool ?? new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const adapter = new PrismaPg(pool);

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? ['error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
  globalForPrisma.pool = pool;
}

export * from '@prisma/client';
export type { PrismaClient } from '@prisma/client';
