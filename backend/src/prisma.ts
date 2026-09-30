import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const currentDir = typeof __dirname !== 'undefined'
  ? __dirname
  : path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(currentDir, '..');
dotenv.config({ path: path.join(backendRoot, '.env') });

// Prevent multiple instances of PrismaClient in development/HMR
declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  globalThis.prismaGlobal ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

export default prisma;
