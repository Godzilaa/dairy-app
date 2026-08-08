import * as SQLite from 'expo-sqlite';
import { triggerSync } from './syncTrigger';

let db: SQLite.SQLiteDatabase;

const createSchema = async (): Promise<void> => {
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS cows (
      id TEXT PRIMARY KEY,
      cowId TEXT UNIQUE,
      pashuAadhar TEXT,
      name TEXT,
      breed TEXT,
      dob TEXT,
      mother TEXT,
      father TEXT,
      status TEXT DEFAULT 'Active',
      photo TEXT,
      registrationMethod TEXT,
      insuranceId TEXT,
      createdAt TEXT,
      updatedAt TEXT
    )`
  );
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS health_records (
      id TEXT PRIMARY KEY,
      cowId TEXT,
      recordType TEXT DEFAULT 'vaccination',
      vaccinationType TEXT,
      date TEXT,
      nextDueDate TEXT,
      medicineName TEXT,
      treatmentPeriod TEXT,
      treatmentMode TEXT,
      medicinesGiven TEXT,
      notes TEXT,
      createdAt TEXT,
      updatedAt TEXT
    )`
  );
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS reproduction_female (
      id TEXT PRIMARY KEY,
      cowId TEXT,
      heatDate TEXT,
      aiDate TEXT,
      pregnancyCheck TEXT,
      expectedCalving TEXT,
      method TEXT,
      amount REAL,
      doneBy TEXT,
      session TEXT,
      createdAt TEXT,
      updatedAt TEXT
    )`
  );
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS reproduction_male (
      id TEXT PRIMARY KEY,
      cowId TEXT,
      heatDate TEXT,
      serviceDate TEXT,
      pregnancyCheck TEXT,
      expectedCalving TEXT,
      amount REAL,
      doneBy TEXT,
      session TEXT,
      createdAt TEXT,
      updatedAt TEXT
    )`
  );
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS milk_feed (
      id TEXT PRIMARY KEY,
      cowId TEXT,
      milkingDate TEXT,
      dryDate TEXT,
      morningMilk REAL,
      eveningMilk REAL,
      feedGiven TEXT,
      notes TEXT,
      createdAt TEXT,
      updatedAt TEXT
    )`
  );
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS calves (
      id TEXT PRIMARY KEY,
      cowId TEXT,
      name TEXT,
      breed TEXT,
      mother TEXT,
      father TEXT,
      dob TEXT,
      gender TEXT,
      photo TEXT,
      createdAt TEXT,
      updatedAt TEXT
    )`
  );
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS insurance (
      id TEXT PRIMARY KEY,
      cowId TEXT,
      insuredOn TEXT,
      insuredTill TEXT,
      insuredWith TEXT,
      insuredBy TEXT,
      amount REAL,
      claimAmount REAL,
      createdAt TEXT,
      updatedAt TEXT
    )`
  );
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS heat_records (
      id TEXT PRIMARY KEY,
      cowId TEXT,
      heatIdentificationDate TEXT,
      conceptionDate TEXT,
      repeatHeatDate TEXT,
      notes TEXT,
      createdAt TEXT,
      updatedAt TEXT
    )`
  );
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS custom_vaccines (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE,
      createdAt TEXT
    )`
  );
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      title TEXT,
      details TEXT,
      date TEXT,
      time TEXT,
      done INTEGER DEFAULT 0,
      createdAt TEXT,
      updatedAt TEXT,
      deletedAt TEXT
    )`
  );

  await runMigrations();
};

// Opening the DB or the first exec can transiently fail right after a Fast Refresh
// (the previous native SQLite handle is torn down → NullPointerException). Retry a
// few times with a fresh connection so the app self-heals instead of hard-crashing.
export const initDatabase = async (): Promise<void> => {
  let lastErr: any;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      // On retries, force a brand-new native connection — the cached one may be a
      // stale handle left over from a Fast Refresh (→ NullPointerException).
      db = await SQLite.openDatabaseAsync('dairy.db', attempt === 0 ? undefined : { useNewConnection: true });
      await createSchema();
      return;
    } catch (e) {
      lastErr = e;
      try { await (db as any)?.closeAsync?.(); } catch {}
      db = undefined as any;
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
    }
  }
  throw lastErr;
};

// Add columns that may be missing on databases created by older app versions.
// SQLite throws "duplicate column name" if the column already exists — safe to ignore.
const addColumn = async (table: string, column: string, type: string): Promise<void> => {
  try {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  } catch {
    /* column already exists */
  }
};

// Tables that sync to the cloud and support soft-delete tombstones.
const SYNCED_TABLES = ['cows', 'health_records', 'milk_feed', 'heat_records', 'calves', 'reminders'];

const runMigrations = async (): Promise<void> => {
  await addColumn('health_records', 'recordType', "TEXT DEFAULT 'vaccination'");
  await addColumn('health_records', 'medicineName', 'TEXT');
  await addColumn('health_records', 'treatmentPeriod', 'TEXT');
  await addColumn('health_records', 'treatmentMode', 'TEXT');
  await addColumn('health_records', 'medicinesGiven', 'TEXT');
  await addColumn('calves', 'photo', 'TEXT');

  // Soft-delete tombstones so deletions propagate across devices via sync.
  for (const tbl of SYNCED_TABLES) {
    await addColumn(tbl, 'deletedAt', 'TEXT');
  }
  // Indexes for the per-cow grouping / lookups.
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_health_cow ON health_records(cowId)');
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_milk_cow ON milk_feed(cowId)');
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_milk_date ON milk_feed(milkingDate)');
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_heat_cow ON heat_records(cowId)');
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_calves_cow ON calves(cowId)');
};

export const getDb = () => db;

const uuid = () => Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

export const localCows = {
  getAll: async (search?: string): Promise<any[]> => {
    if (search) {
      return db.getAllAsync(
        'SELECT * FROM cows WHERE deletedAt IS NULL AND (name LIKE ? OR cowId LIKE ? OR pashuAadhar LIKE ?) ORDER BY createdAt DESC',
        [`%${search}%`, `%${search}%`, `%${search}%`]
      );
    }
    return db.getAllAsync('SELECT * FROM cows WHERE deletedAt IS NULL ORDER BY createdAt DESC');
  },

  getById: async (id: string): Promise<any> =>
    db.getFirstAsync('SELECT * FROM cows WHERE id = ? AND deletedAt IS NULL', [id]),

  getByTag: async (aadhar: string): Promise<any> =>
    db.getFirstAsync('SELECT * FROM cows WHERE pashuAadhar = ? AND deletedAt IS NULL', [aadhar]),

  getNextId: async (): Promise<string> => {
    const row = await db.getFirstAsync<{ maxId: number | null }>(
      'SELECT MAX(CAST(SUBSTR(cowId,2) AS INTEGER)) as maxId FROM cows WHERE deletedAt IS NULL'
    );
    const next = (row?.maxId || 0) + 1;
    return `C${String(next).padStart(3, '0')}`;
  },

  create: async (data: any): Promise<any> => {
    const id = uuid();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO cows (id, cowId, pashuAadhar, name, breed, dob, mother, father, status, photo, registrationMethod, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.cowId, data.pashuAadhar || null, data.name, data.breed, data.dob || null,
       data.mother || null, data.father || null, data.status || 'Active', data.photo || null,
       data.registrationMethod || null, now, now]
    );
    triggerSync();
    return { id, ...data };
  },

  update: async (id: string, data: any): Promise<any> => {
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE cows SET name=?, breed=?, pashuAadhar=?, dob=?, mother=?, father=?, status=?, photo=?, registrationMethod=?, updatedAt=? WHERE id=?`,
      [data.name, data.breed, data.pashuAadhar || null, data.dob || null,
       data.mother || null, data.father || null, data.status || 'Active',
       data.photo || null, data.registrationMethod || null, now, id]
    );
    triggerSync();
    return { id, ...data };
  },

  delete: async (id: string): Promise<void> => {
    // Soft delete (tombstone) so the deletion syncs to other devices.
    const now = new Date().toISOString();
    await db.runAsync('UPDATE cows SET deletedAt=?, updatedAt=? WHERE id=?', [now, now, id]);
    triggerSync();
  },

  getStats: async (): Promise<{ totalCows: number; activeCows: number; milkingCows: number }> => {
    const row = await db.getFirstAsync<{ total: number; active: number; milking: number }>(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active,
              SUM(CASE WHEN status = 'Milking' THEN 1 ELSE 0 END) as milking
       FROM cows WHERE deletedAt IS NULL`
    );
    return { totalCows: row?.total || 0, activeCows: row?.active || 0, milkingCows: row?.milking || 0 };
  },
};

export const localHealth = {
  getAll: async (cowId?: string): Promise<any[]> => {
    if (cowId) {
      return db.getAllAsync('SELECT * FROM health_records WHERE cowId = ? AND deletedAt IS NULL ORDER BY date DESC', [cowId]);
    }
    return db.getAllAsync('SELECT * FROM health_records WHERE deletedAt IS NULL ORDER BY date DESC');
  },

  create: async (data: any): Promise<any> => {
    const id = uuid();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO health_records
        (id, cowId, recordType, vaccinationType, date, nextDueDate, medicineName, treatmentPeriod, treatmentMode, medicinesGiven, notes, createdAt, updatedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, data.cowId, data.recordType || 'vaccination', data.vaccinationType || null,
       data.date || null, data.nextDueDate || null, data.medicineName || null,
       data.treatmentPeriod || null, data.treatmentMode || null, data.medicinesGiven || null,
       data.notes || null, now, now]
    );
    triggerSync();
    return { id, ...data };
  },

  update: async (id: string, data: any): Promise<any> => {
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE health_records SET
        vaccinationType=?, date=?, nextDueDate=?, medicineName=?, treatmentPeriod=?,
        treatmentMode=?, medicinesGiven=?, notes=?, updatedAt=? WHERE id=?`,
      [data.vaccinationType || null, data.date || null, data.nextDueDate || null,
       data.medicineName || null, data.treatmentPeriod || null, data.treatmentMode || null,
       data.medicinesGiven || null, data.notes || null, now, id]
    );
    triggerSync();
    return { id, ...data };
  },

  delete: async (id: string): Promise<void> => {
    const now = new Date().toISOString();
    await db.runAsync('UPDATE health_records SET deletedAt=?, updatedAt=? WHERE id=?', [now, now, id]);
    triggerSync();
  },

  getUpcoming: async (days: number = 30): Promise<any[]> => {
    const future = new Date();
    future.setDate(future.getDate() + days);
    return db.getAllAsync(
      `SELECT * FROM health_records WHERE deletedAt IS NULL AND nextDueDate IS NOT NULL AND nextDueDate <= ? ORDER BY nextDueDate ASC`,
      [future.toISOString().split('T')[0]]
    );
  },

  getOverdue: async (): Promise<any[]> => {
    const today = new Date().toISOString().split('T')[0];
    return db.getAllAsync(
      `SELECT * FROM health_records WHERE deletedAt IS NULL AND nextDueDate IS NOT NULL AND nextDueDate <= ? ORDER BY nextDueDate ASC`,
      [today]
    );
  },
};

export const localMilk = {
  getAll: async (cowId?: string): Promise<any[]> => {
    if (cowId) {
      return db.getAllAsync('SELECT * FROM milk_feed WHERE cowId = ? AND deletedAt IS NULL ORDER BY milkingDate DESC', [cowId]);
    }
    return db.getAllAsync('SELECT * FROM milk_feed WHERE deletedAt IS NULL ORDER BY milkingDate DESC');
  },

  getTodayTotal: async (): Promise<number> => {
    const today = new Date().toISOString().split('T')[0];
    const row = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(morningMilk),0) + COALESCE(SUM(eveningMilk),0) as total FROM milk_feed WHERE milkingDate = ? AND deletedAt IS NULL`,
      [today]
    );
    return row?.total || 0;
  },

  // Per-day milk totals for a given month (0-indexed month), oldest first.
  getMonthDaily: async (year: number, month: number): Promise<{ date: string; total: number }[]> => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return db.getAllAsync<{ date: string; total: number }>(
      `SELECT milkingDate as date,
              COALESCE(SUM(morningMilk),0) + COALESCE(SUM(eveningMilk),0) as total
       FROM milk_feed WHERE milkingDate LIKE ? AND deletedAt IS NULL
       GROUP BY milkingDate ORDER BY milkingDate ASC`,
      [`${prefix}%`]
    );
  },

  // Per-cow, per-day milk totals for a given month — powers the per-cow charts.
  getMonthDailyByCow: async (year: number, month: number): Promise<{ cowId: string; date: string; total: number }[]> => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return db.getAllAsync<{ cowId: string; date: string; total: number }>(
      `SELECT cowId, milkingDate as date,
              COALESCE(SUM(morningMilk),0) + COALESCE(SUM(eveningMilk),0) as total
       FROM milk_feed WHERE milkingDate LIKE ? AND deletedAt IS NULL
       GROUP BY cowId, milkingDate ORDER BY cowId ASC, milkingDate ASC`,
      [`${prefix}%`]
    );
  },

  // Per-cow, per-day morning & evening milk for a month — powers the line chart.
  getMonthMorningEveningByCow: async (year: number, month: number): Promise<{ cowId: string; date: string; morning: number; evening: number }[]> => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return db.getAllAsync<{ cowId: string; date: string; morning: number; evening: number }>(
      `SELECT cowId, milkingDate as date,
              COALESCE(SUM(morningMilk),0) as morning,
              COALESCE(SUM(eveningMilk),0) as evening
       FROM milk_feed WHERE milkingDate LIKE ? AND deletedAt IS NULL
       GROUP BY cowId, milkingDate ORDER BY cowId ASC, milkingDate ASC`,
      [`${prefix}%`]
    );
  },

  create: async (data: any): Promise<any> => {
    const id = uuid();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO milk_feed (id, cowId, milkingDate, dryDate, morningMilk, eveningMilk, feedGiven, notes, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [id, data.cowId, data.milkingDate, data.dryDate || null, data.morningMilk || null, data.eveningMilk || null, data.feedGiven || null, data.notes || null, now, now]
    );
    triggerSync();
    return { id, ...data };
  },

  update: async (id: string, data: any): Promise<any> => {
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE milk_feed SET milkingDate=?, morningMilk=?, eveningMilk=?, feedGiven=?, notes=?, updatedAt=? WHERE id=?`,
      [data.milkingDate, data.morningMilk ?? null, data.eveningMilk ?? null, data.feedGiven || null, data.notes || null, now, id]
    );
    triggerSync();
    return { id, ...data };
  },

  delete: async (id: string): Promise<void> => {
    const now = new Date().toISOString();
    await db.runAsync('UPDATE milk_feed SET deletedAt=?, updatedAt=? WHERE id=?', [now, now, id]);
    triggerSync();
  },
};

export const localReproduction = {
  getFemale: async (cowId: string): Promise<any[]> =>
    db.getAllAsync('SELECT * FROM reproduction_female WHERE cowId = ? ORDER BY createdAt DESC', [cowId]),

  getMale: async (cowId: string): Promise<any[]> =>
    db.getAllAsync('SELECT * FROM reproduction_male WHERE cowId = ? ORDER BY createdAt DESC', [cowId]),

  getDueCalvings: async (days: number = 30): Promise<any[]> => {
    const future = new Date();
    future.setDate(future.getDate() + days);
    return db.getAllAsync(
      'SELECT * FROM reproduction_female WHERE expectedCalving IS NOT NULL AND expectedCalving <= ? ORDER BY expectedCalving ASC',
      [future.toISOString().split('T')[0]]
    );
  },

  createFemale: (data: any) => localCreate('reproduction_female', data),
  createMale: (data: any) => localCreate('reproduction_male', data),
};

export const localHeat = {
  getAll: async (cowId?: string): Promise<any[]> => {
    if (cowId) {
      return db.getAllAsync(
        'SELECT * FROM heat_records WHERE cowId = ? AND deletedAt IS NULL ORDER BY heatIdentificationDate DESC, createdAt DESC',
        [cowId]
      );
    }
    return db.getAllAsync('SELECT * FROM heat_records WHERE deletedAt IS NULL ORDER BY heatIdentificationDate DESC, createdAt DESC');
  },

  create: (data: any) => localCreate('heat_records', data),

  update: async (id: string, data: any): Promise<any> => {
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE heat_records SET heatIdentificationDate=?, conceptionDate=?, repeatHeatDate=?, notes=?, updatedAt=? WHERE id=?`,
      [data.heatIdentificationDate || null, data.conceptionDate || null, data.repeatHeatDate || null, data.notes || null, now, id]
    );
    triggerSync();
    return { id, ...data };
  },

  delete: async (id: string): Promise<void> => {
    const now = new Date().toISOString();
    await db.runAsync('UPDATE heat_records SET deletedAt=?, updatedAt=? WHERE id=?', [now, now, id]);
    triggerSync();
  },
};

// Bovine gestation ~9 months — expected calving = conception + 9 months.
export const GESTATION_MONTHS = 9;
export const expectedDueDate = (conceptionISO?: string | null): string => {
  if (!conceptionISO) return '';
  const d = new Date(conceptionISO);
  if (isNaN(d.getTime())) return '';
  d.setMonth(d.getMonth() + GESTATION_MONTHS);
  return d.toISOString().split('T')[0];
};

// Aggregates heat + medication follow-up dates for the dashboard calendar.
export type CalendarEvent = {
  date: string;        // YYYY-MM-DD
  type: 'heat' | 'repeatHeat' | 'medication' | 'treatment' | 'dueDate' | 'reminder';
  cowId: string;       // '' for general reminders
  title: string;
  time?: string;       // HH:MM, reminders only
};

export const localReminders = {
  getAll: async (): Promise<any[]> =>
    db.getAllAsync('SELECT * FROM reminders WHERE deletedAt IS NULL ORDER BY date ASC, time ASC'),

  create: async (data: any): Promise<any> => {
    const id = uuid();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO reminders (id, title, details, date, time, done, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?)`,
      [id, data.title, data.details || null, data.date || null, data.time || null, data.done ? 1 : 0, now, now]
    );
    triggerSync();
    return { id, ...data };
  },

  update: async (id: string, data: any): Promise<any> => {
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE reminders SET title=?, details=?, date=?, time=?, done=?, updatedAt=? WHERE id=?`,
      [data.title, data.details || null, data.date || null, data.time || null, data.done ? 1 : 0, now, id]
    );
    triggerSync();
    return { id, ...data };
  },

  delete: async (id: string): Promise<void> => {
    const now = new Date().toISOString();
    await db.runAsync('UPDATE reminders SET deletedAt=?, updatedAt=? WHERE id=?', [now, now, id]);
    triggerSync();
  },
};

export const localEvents = {
  getAll: async (): Promise<CalendarEvent[]> => {
    const events: CalendarEvent[] = [];

    // Medication / vaccination follow-ups (next due date)
    const health = await db.getAllAsync<any>(
      `SELECT cowId, recordType, vaccinationType, medicineName, date, nextDueDate FROM health_records WHERE deletedAt IS NULL`
    );
    for (const h of health) {
      if (h.nextDueDate) {
        events.push({
          date: h.nextDueDate,
          type: 'medication',
          cowId: h.cowId,
          title: `${h.vaccinationType || h.medicineName || 'Vaccination'} due`,
        });
      }
      if (h.recordType === 'treatment' && h.date) {
        events.push({
          date: h.date,
          type: 'treatment',
          cowId: h.cowId,
          title: `${h.medicineName || 'Treatment'}`,
        });
      }
    }

    // Heat cycle events
    const heat = await db.getAllAsync<any>(
      `SELECT cowId, heatIdentificationDate, conceptionDate, repeatHeatDate FROM heat_records WHERE deletedAt IS NULL`
    );
    for (const r of heat) {
      if (r.heatIdentificationDate) {
        events.push({ date: r.heatIdentificationDate, type: 'heat', cowId: r.cowId, title: 'Heat identified' });
      }
      if (r.repeatHeatDate) {
        events.push({ date: r.repeatHeatDate, type: 'repeatHeat', cowId: r.cowId, title: 'Repeat heat expected' });
      }
      // Expected calving = conception + 9 months.
      const due = expectedDueDate(r.conceptionDate);
      if (due) {
        events.push({ date: due, type: 'dueDate', cowId: r.cowId, title: 'Expected calving (due date)' });
      }
    }

    // Custom user reminders
    const reminders = await db.getAllAsync<any>(
      `SELECT title, details, date, time FROM reminders WHERE deletedAt IS NULL AND done = 0`
    );
    for (const r of reminders) {
      if (r.date) {
        events.push({ date: r.date, type: 'reminder', cowId: '', title: r.title || 'Reminder', time: r.time || undefined });
      }
    }

    return events;
  },
};

export const localVaccines = {
  // Built-in vaccine types every farm needs, shown first.
  DEFAULTS: ['FMD', 'LSD', 'Deworming'],

  getCustom: async (): Promise<string[]> => {
    const rows = await db.getAllAsync<{ name: string }>(
      'SELECT name FROM custom_vaccines ORDER BY createdAt ASC'
    );
    return rows.map((r) => r.name);
  },

  addCustom: async (name: string): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
    await db.runAsync(
      'INSERT OR IGNORE INTO custom_vaccines (id, name, createdAt) VALUES (?,?,?)',
      [uuid(), trimmed, now]
    );
  },
};

export const localCalves = {
  getAll: async (): Promise<any[]> =>
    db.getAllAsync('SELECT * FROM calves WHERE deletedAt IS NULL ORDER BY createdAt DESC'),

  create: (data: any) => localCreate('calves', data),
};

export const localInsurance = {
  getAll: async (): Promise<any[]> =>
    db.getAllAsync('SELECT * FROM insurance ORDER BY insuredTill ASC'),

  create: (data: any) => localCreate('insurance', data),
};

const localCreate = async (table: string, data: Record<string, any>): Promise<any> => {
  const id = uuid();
  const now = new Date().toISOString();
  const keys = ['id', ...Object.keys(data), 'createdAt', 'updatedAt'];
  const vals: (string | number | null)[] = [id, ...Object.values(data), now, now];
  const placeholders = keys.map(() => '?').join(',');
  await db.runAsync(
    `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`,
    vals
  );
  triggerSync();
  return { id, ...data };
};
