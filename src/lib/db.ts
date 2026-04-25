import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function getDatabaseUrl(): string {
  // Neon provides multiple connection strings
  // Prefer unpooled (direct) connection for Prisma
  if (process.env.DATABASE_URL_UNPOOLED) {
    return process.env.DATABASE_URL_UNPOOLED
  }
  if (process.env.POSTGRES_URL_NON_POOLING) {
    return process.env.POSTGRES_URL_NON_POOLING
  }
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL
  }
  // Fallback to pooled URL
  return process.env.POSTGRES_URL ?? ''
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    // Connection timeout to prevent hanging
    // @ts-ignore - newer Prisma versions support this
    timeout: 5000,
    // @ts-ignore
    transactionTimeout: 10000,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db