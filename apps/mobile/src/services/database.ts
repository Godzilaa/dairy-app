import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase;

export const initDatabase = async (): Promise<void> => {
  db = await SQLite.openDatabaseAsync('dairy.db');

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
      vaccinationType TEXT,
      date TEXT,
      nextDueDate TEXT,
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
};

export const getDb = () => db;

const uuid = () => Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

export const localCows = {
  getAll: async (search?: string): Promise<any[]> => {
    if (search) {
      return db.getAllAsync(
        'SELECT * FROM cows WHERE name LIKE ? OR cowId LIKE ? OR pashuAadhar LIKE ? ORDER BY createdAt DESC',
        [`%${search}%`, `%${search}%`, `%${search}%`]
      );
    }
    return db.getAllAsync('SELECT * FROM cows ORDER BY createdAt DESC');
  },

  getById: async (id: string): Promise<any> =>
    db.getFirstAsync('SELECT * FROM cows WHERE id = ?', [id]),

  getByTag: async (aadhar: string): Promise<any> =>
    db.getFirstAsync('SELECT * FROM cows WHERE pashuAadhar = ?', [aadhar]),

  getNextId: async (): Promise<string> => {
    const row = await db.getFirstAsync<{ maxId: number | null }>(
      'SELECT MAX(CAST(SUBSTR(cowId,2) AS INTEGER)) as maxId FROM cows'
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
    return { id, ...data };
  },

  update: async (id: string, data: any): Promise<any> => {
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE cows SET name=?, breed=?, pashuAadhar=?, dob=?, mother=?, father=?, status=?, registrationMethod=?, updatedAt=? WHERE id=?`,
      [data.name, data.breed, data.pashuAadhar || null, data.dob || null,
       data.mother || null, data.father || null, data.status || 'Active',
       data.registrationMethod || null, now, id]
    );
    return { id, ...data };
  },

  delete: async (id: string): Promise<void> => {
    await db.runAsync('DELETE FROM cows WHERE id = ?', [id]);
  },

  getStats: async (): Promise<{ totalCows: number; activeCows: number }> => {
    const row = await db.getFirstAsync<{ total: number; active: number }>(
      'SELECT COUNT(*) as total, SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as active FROM cows',
      ['Active']
    );
    return { totalCows: row?.total || 0, activeCows: row?.active || 0 };
  },
};

export const localHealth = {
  getAll: async (cowId?: string): Promise<any[]> => {
    if (cowId) {
      return db.getAllAsync('SELECT * FROM health_records WHERE cowId = ? ORDER BY date DESC', [cowId]);
    }
    return db.getAllAsync('SELECT * FROM health_records ORDER BY date DESC');
  },

  create: async (data: any): Promise<any> => {
    const id = uuid();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO health_records (id, cowId, vaccinationType, date, nextDueDate, notes, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?)`,
      [id, data.cowId, data.vaccinationType, data.date || null, data.nextDueDate || null, data.notes || null, now, now]
    );
    return { id, ...data };
  },

  getUpcoming: async (days: number = 30): Promise<any[]> => {
    const future = new Date();
    future.setDate(future.getDate() + days);
    return db.getAllAsync(
      `SELECT * FROM health_records WHERE nextDueDate IS NOT NULL AND nextDueDate <= ? ORDER BY nextDueDate ASC`,
      [future.toISOString().split('T')[0]]
    );
  },

  getOverdue: async (): Promise<any[]> => {
    const today = new Date().toISOString().split('T')[0];
    return db.getAllAsync(
      `SELECT * FROM health_records WHERE nextDueDate IS NOT NULL AND nextDueDate <= ? ORDER BY nextDueDate ASC`,
      [today]
    );
  },
};

export const localMilk = {
  getAll: async (cowId?: string): Promise<any[]> => {
    if (cowId) {
      return db.getAllAsync('SELECT * FROM milk_feed WHERE cowId = ? ORDER BY milkingDate DESC', [cowId]);
    }
    return db.getAllAsync('SELECT * FROM milk_feed ORDER BY milkingDate DESC');
  },

  getTodayTotal: async (): Promise<number> => {
    const today = new Date().toISOString().split('T')[0];
    const row = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(morningMilk),0) + COALESCE(SUM(eveningMilk),0) as total FROM milk_feed WHERE milkingDate = ?`,
      [today]
    );
    return row?.total || 0;
  },

  create: async (data: any): Promise<any> => {
    const id = uuid();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO milk_feed (id, cowId, milkingDate, dryDate, morningMilk, eveningMilk, feedGiven, notes, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [id, data.cowId, data.milkingDate, data.dryDate || null, data.morningMilk || null, data.eveningMilk || null, data.feedGiven || null, data.notes || null, now, now]
    );
    return { id, ...data };
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

export const localCalves = {
  getAll: async (): Promise<any[]> =>
    db.getAllAsync('SELECT * FROM calves ORDER BY createdAt DESC'),

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
  return { id, ...data };
};
