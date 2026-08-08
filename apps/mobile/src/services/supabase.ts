import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getClerkToken } from './clerkToken';

// Project ref is known from the server's DATABASE_URL; the anon (public) key must
// be supplied via env — it is NOT in the repo. Set both in apps/mobile/.env:
//   EXPO_PUBLIC_SUPABASE_URL=https://olvazkyvzyosjbzlbkjk.supabase.co
//   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
const url = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://olvazkyvzyosjbzlbkjk.supabase.co';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Sync is opt-in: without an anon key the app stays fully local (offline-only).
export const isCloudSyncConfigured = !!anonKey;

// A single lazily-created client. Auth is handled by Clerk, so we don't persist a
// Supabase session here; rows are scoped by owner_email.
export const supabase: SupabaseClient | null = isCloudSyncConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      // Every request carries the signed-in user's Clerk token; Supabase validates
      // it against the registered Clerk third-party auth provider and RLS scopes
      // rows to auth.jwt()->>'sub'.
      accessToken: async () => (await getClerkToken()) ?? '',
    })
  : null;
