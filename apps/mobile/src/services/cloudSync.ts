import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isCloudSyncConfigured } from './supabase';
import { getDb } from './database';
import { setSyncTrigger } from './syncTrigger';

// Set to the last sync outcome so a debug screen / log can surface it.
export let lastSyncStatus = 'never run';

// The current owner (Clerk user id) — set by AuthContext on sign-in.
let currentOwnerId: string | null = null;
export const setSyncOwner = (id: string | null) => { currentOwnerId = id; };

// Debounced sync fired after local writes so data backs up within seconds.
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const scheduleSync = () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => { void syncAll(currentOwnerId); }, 1500);
};
setSyncTrigger(scheduleSync);

// Tables mirrored to Supabase (see apps/mobile/supabase/mobile-schema.sql).
// `bulls`, `feed_records` and `expenses` are kept last: on installs whose Supabase
// project hasn't had the updated schema applied yet, their per-table error won't
// block the tables synced before them.
const TABLES = ['cows', 'health_records', 'milk_feed', 'heat_records', 'calves', 'custom_vaccines', 'reminders', 'bulls', 'feed_records', 'expenses'];

let syncing = false;

// Columns that exist on the local SQLite table — pulled cloud rows are filtered
// to these so server-only columns (owner_id, updated_at) never hit SQLite.
const localColumns = async (table: string): Promise<string[]> => {
  const info: any[] = await getDb().getAllAsync(`PRAGMA table_info(${table})`);
  return info.map((c) => c.name);
};

// Two-way sync for the signed-in user: push local rows up (last-writer-wins via
// the server's updated_at trigger), then pull rows changed elsewhere since the
// last successful pull. Silently no-ops offline or before cloud is configured.
export async function syncAll(ownerId?: string | null): Promise<void> {
  if (!isCloudSyncConfigured || !supabase || !ownerId || syncing) return;
  syncing = true;
  let pushed = 0;
  try {
    const db = getDb();
    for (const table of TABLES) {
      // PUSH: upsert every local row, stamped with the owner.
      const rows: any[] = await db.getAllAsync(`SELECT * FROM ${table}`);
      if (rows.length) {
        const payload = rows.map((r) => ({ ...r, owner_id: ownerId }));
        const { error } = await supabase.from(table).upsert(payload, { onConflict: 'id' });
        if (error) throw new Error(`push ${table}: ${error.message} (${(error as any).code || ''})`);
        pushed += rows.length;
      }

      // PULL: rows for this owner changed since we last pulled.
      const key = `sync:lastPull:${table}`;
      const since = (await AsyncStorage.getItem(key)) || '1970-01-01T00:00:00+00:00';
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('owner_id', ownerId)
        .gt('updated_at', since)
        .order('updated_at', { ascending: true });
      if (error) throw error;

      if (data && data.length) {
        const cols = await localColumns(table);
        for (const row of data as any[]) {
          const keys = cols.filter((c) => c in row && row[c] !== undefined && c !== 'owner_id');
          if (!keys.length) continue;
          const quoted = keys.map((c) => `"${c}"`).join(',');
          const placeholders = keys.map(() => '?').join(',');
          const setClause = keys.filter((c) => c !== 'id').map((c) => `"${c}"=excluded."${c}"`).join(',');
          await db.runAsync(
            `INSERT INTO ${table} (${quoted}) VALUES (${placeholders})
             ON CONFLICT(id) DO UPDATE SET ${setClause}`,
            keys.map((c) => row[c] ?? null)
          );
        }
        await AsyncStorage.setItem(key, (data[data.length - 1] as any).updated_at);
      }
    }
    lastSyncStatus = `ok: pushed ${pushed} @ ${new Date().toISOString()}`;
  } catch (e: any) {
    // Offline / transient / auth-not-ready — stay local and retry next trigger.
    lastSyncStatus = `err: ${e?.message || String(e)}`;
    console.log('[cloudSync] skipped:', e?.message || String(e));
  } finally {
    syncing = false;
  }
}
