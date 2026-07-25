# Supabase Setup for Dairy API

Better Auth uses Supabase PostgreSQL to store user accounts, sessions, and credentials.
All dairy data stays **on-device** (local SQLite) and is NOT uploaded.

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up (free tier is fine)
2. Create a new project (Singapore region recommended for India)
3. Wait for the database to provision (~2 minutes)

## 2. Get Connection String

1. In your Supabase project dashboard, go to **Project Settings → Database**
2. Under **Connection string → URI**, copy the `postgresql://` URI
3. It looks like:
   ```
   postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```

## 3. Set Environment Variable

```bash
# In your production environment (Render, etc.)
export DATABASE_URL="postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"

# Also required
export BETTER_AUTH_SECRET="$(openssl rand -hex 32)"
```

## 4. Run Better Auth Migrations

Better Auth needs tables (`user`, `session`, `account`, `verification`) created.

```bash
# From apps/api/
pnpm exec @better-auth/cli generate
pnpm exec @better-auth/cli migrate
```

This connects to your `DATABASE_URL` and creates the required tables.

## 5. For Local Development

Leave `DATABASE_URL` empty in `.env`. The API automatically uses the
**in-memory adapter** for development — no database needed.

## 6. Verify Setup

```bash
# Start the API
pnpm run start:prod  # or pnpm run dev

# Test sign-up
curl -X POST http://localhost:3000/api/auth/sign-up/email \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"test1234","name":"Test"}'

# Test sign-in
curl -X POST http://localhost:3000/api/auth/sign-in/email \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"test1234"}'
```

## Troubleshooting

- **`ERR_PACKAGE_PATH_NOT_EXPORTED`**: You must use `better-auth/adapters/drizzle` not `better-auth/adapters/drizzle-adapter` for the import path
- **SSL errors**: Add `?sslmode=require` to the DATABASE_URL
- **Connection refused**: Make sure Supabase's "Connection Pooling" is enabled (it's on by default)
