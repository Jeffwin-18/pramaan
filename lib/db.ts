import { PrismaClient } from '@prisma/client';
// Lazy: the client is constructed on first query, so pages that never touch the DB render without it.
const g = globalThis as unknown as { prisma?: PrismaClient };
const get = () => (g.prisma ??= new PrismaClient());
export const prisma = new Proxy({} as PrismaClient, { get: (_t, p) => (get() as any)[p] });
