import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || '';

const usePostgres = !!(connectionString && process.env.NODE_ENV === 'production');

let database:
  | ReturnType<typeof memoryAdapter>
  | ReturnType<typeof drizzleAdapter>;

if (usePostgres) {
  const pgClient = postgres(connectionString, { prepare: false });
  const db = drizzle(pgClient, {
    schema: {
      user: null as any,
      session: null as any,
      account: null as any,
      verification: null as any,
    },
  });
  database = drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: null as any,
      session: null as any,
      account: null as any,
      verification: null as any,
    },
  });
} else {
  database = memoryAdapter({
    user: [],
    session: [],
    account: [],
    verification: [],
  });
}

export const auth = betterAuth({
  database,
  emailAndPassword: {
    enabled: true,
    async sendResetPassword(url, user) {},
  },
  user: {
    additionalFields: {
      name: {
        type: 'string',
        required: false,
      },
      phone: {
        type: 'string',
        required: false,
      },
    },
  },
  trustedOrigins: process.env.TRUSTED_ORIGINS
    ? process.env.TRUSTED_ORIGINS.split(',')
    : ['*'],
});
