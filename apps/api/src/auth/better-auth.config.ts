import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as authSchema from '../db/schema';

const connectionString = process.env.DATABASE_URL || '';

const usePostgres = !!(connectionString && process.env.NODE_ENV === 'production');

let database:
  | ReturnType<typeof memoryAdapter>
  | ReturnType<typeof drizzleAdapter>;

if (usePostgres) {
  const pgClient = postgres(connectionString, { prepare: false });
  const db = drizzle(pgClient, { schema: authSchema });
  database = drizzleAdapter(db, { provider: 'pg' });
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
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  emailAndPassword: {
    enabled: true,
    async sendResetPassword(url, user) {},
  },
  user: {
    additionalFields: {
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
