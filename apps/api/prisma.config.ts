import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Only `migrate`/`db push`/`studio` need a real connection; `generate`
    // (run on every `npm ci` via postinstall) doesn't, so fall back instead
    // of throwing when DATABASE_URL isn't set. The running app reads
    // DATABASE_URL directly (see prisma/prisma.service.ts) — this value is
    // never used outside the Prisma CLI.
    url: process.env.DATABASE_URL ?? 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
  },
});
