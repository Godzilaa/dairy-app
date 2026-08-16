import { getDb } from './database';

// Tables included in a full backup snapshot (includes tombstoned rows so a
// restore is faithful).
const BACKUP_TABLES = ['cows', 'health_records', 'milk_feed', 'feed_records', 'heat_records', 'calves', 'bulls', 'custom_vaccines', 'reminders', 'expenses'];

export type BackupFile = {
  app: 'gopala';
  version: 1;
  exportedAt: string;
  tables: Record<string, any[]>;
};

// Serialize every local table into a single JSON snapshot.
export async function buildBackup(): Promise<BackupFile> {
  const db = getDb();
  const tables: Record<string, any[]> = {};
  for (const t of BACKUP_TABLES) {
    try { tables[t] = await db.getAllAsync(`SELECT * FROM ${t}`); } catch { tables[t] = []; }
  }
  return { app: 'gopala', version: 1, exportedAt: new Date().toISOString(), tables };
}

// Restore a snapshot into SQLite with INSERT OR REPLACE (id is the primary key),
// so it merges by id — existing rows are overwritten, new ones added. Returns the
// number of rows written.
export async function restoreBackup(file: BackupFile): Promise<number> {
  if (!file || file.app !== 'gopala' || !file.tables) throw new Error('Not a valid Gopala backup file');
  const db = getDb();
  let written = 0;
  for (const t of BACKUP_TABLES) {
    const rows = file.tables[t] || [];
    if (!rows.length) continue;
    const localCols = (await db.getAllAsync<any>(`PRAGMA table_info(${t})`)).map((c) => c.name);
    for (const row of rows) {
      const keys = Object.keys(row).filter((k) => localCols.includes(k));
      if (!keys.length) continue;
      const cols = keys.map((k) => `"${k}"`).join(',');
      const ph = keys.map(() => '?').join(',');
      await db.runAsync(
        `INSERT OR REPLACE INTO ${t} (${cols}) VALUES (${ph})`,
        keys.map((k) => row[k] ?? null),
      );
      written += 1;
    }
  }
  return written;
}
