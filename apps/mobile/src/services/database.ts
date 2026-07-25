import * as SQLite from 'expo-sqlite';

let db: SQLite.WebSQLDatabase;

export const initDatabase = async (): Promise<void> => {
  db = SQLite.openDatabase('dairy.db');

  await new Promise<void>((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
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
        )`,
      );
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS health_records (
          id TEXT PRIMARY KEY,
          cowId TEXT,
          vaccinationType TEXT,
          date TEXT,
          nextDueDate TEXT,
          notes TEXT,
          createdAt TEXT,
          updatedAt TEXT
        )`,
      );
      tx.executeSql(
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
        )`,
      );
      tx.executeSql(
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
        )`,
      );
      tx.executeSql(
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
        )`,
      );
      tx.executeSql(
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
        )`,
      );
      tx.executeSql(
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
        )`,
      );
    }, reject, resolve);
  });
};

export const getDb = () => db;

const uuid = () => Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

// --- Cows ---
export const localCows = {
  getAll: (search?: string): Promise<any[]> =>
    new Promise((resolve, reject) => {
      const q = search
        ? `SELECT * FROM cows WHERE name LIKE ? OR cowId LIKE ? OR pashuAadhar LIKE ? ORDER BY createdAt DESC`
        : `SELECT * FROM cows ORDER BY createdAt DESC`;
      const params = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [];
      db.transaction((tx) => {
        tx.executeSql(q, params, (_, { rows: { _array } }) => resolve(_array), (_, err) => { reject(err); return false; });
      });
    }),

  getById: (id: string): Promise<any> =>
    new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql('SELECT * FROM cows WHERE id = ?', [id], (_, { rows: { _array } }) => resolve(_array[0] || null), (_, err) => { reject(err); return false; });
      });
    }),

  getByTag: (aadhar: string): Promise<any> =>
    new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql('SELECT * FROM cows WHERE pashuAadhar = ?', [aadhar], (_, { rows: { _array } }) => resolve(_array[0] || null), (_, err) => { reject(err); return false; });
      });
    }),

  getNextId: (): Promise<string> =>
    new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql('SELECT MAX(CAST(SUBSTR(cowId,2) AS INTEGER)) as maxId FROM cows', [], (_, { rows: { _array } }) => {
          const next = (_array[0]?.maxId || 0) + 1;
          resolve(`C${String(next).padStart(3, '0')}`);
        }, (_, err) => { reject(err); return false; });
      });
    }),

  create: (data: any): Promise<any> =>
    new Promise((resolve, reject) => {
      const id = uuid();
      const now = new Date().toISOString();
      db.transaction((tx) => {
        tx.executeSql(
          `INSERT INTO cows (id, cowId, pashuAadhar, name, breed, dob, mother, father, status, photo, registrationMethod, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, data.cowId, data.pashuAadhar || null, data.name, data.breed, data.dob || null,
           data.mother || null, data.father || null, data.status || 'Active', data.photo || null,
           data.registrationMethod || null, now, now],
          () => resolve({ id, ...data }),
          (_, err) => { reject(err); return false; },
        );
      });
    }),

  update: (id: string, data: any): Promise<any> =>
    new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      db.transaction((tx) => {
        tx.executeSql(
          `UPDATE cows SET name=?, breed=?, pashuAadhar=?, dob=?, mother=?, father=?, status=?, registrationMethod=?, updatedAt=? WHERE id=?`,
          [data.name, data.breed, data.pashuAadhar || null, data.dob || null,
           data.mother || null, data.father || null, data.status || 'Active',
           data.registrationMethod || null, now, id],
          () => resolve({ id, ...data }),
          (_, err) => { reject(err); return false; },
        );
      });
    }),

  delete: (id: string): Promise<void> =>
    new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql('DELETE FROM cows WHERE id = ?', [id], () => resolve(), (_, err) => { reject(err); return false; });
      });
    }),

  getStats: (): Promise<{ totalCows: number; activeCows: number }> =>
    new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          'SELECT COUNT(*) as total, SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as active FROM cows',
          ['Active'],
          (_, { rows: { _array } }) => resolve({ totalCows: _array[0]?.total || 0, activeCows: _array[0]?.active || 0 }),
          (_, err) => { reject(err); return false; },
        );
      });
    }),
};

// --- Health ---
export const localHealth = {
  getAll: (cowId?: string): Promise<any[]> =>
    new Promise((resolve, reject) => {
      const q = cowId
        ? 'SELECT * FROM health_records WHERE cowId = ? ORDER BY date DESC'
        : 'SELECT * FROM health_records ORDER BY date DESC';
      const params = cowId ? [cowId] : [];
      db.transaction((tx) => {
        tx.executeSql(q, params, (_, { rows: { _array } }) => resolve(_array), (_, err) => { reject(err); return false; });
      });
    }),

  create: (data: any): Promise<any> =>
    new Promise((resolve, reject) => {
      const id = uuid();
      const now = new Date().toISOString();
      db.transaction((tx) => {
        tx.executeSql(
          `INSERT INTO health_records (id, cowId, vaccinationType, date, nextDueDate, notes, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?)`,
          [id, data.cowId, data.vaccinationType, data.date || null, data.nextDueDate || null, data.notes || null, now, now],
          () => resolve({ id, ...data }),
          (_, err) => { reject(err); return false; },
        );
      });
    }),

  getUpcoming: (days: number = 30): Promise<any[]> =>
    new Promise((resolve, reject) => {
      const future = new Date();
      future.setDate(future.getDate() + days);
      db.transaction((tx) => {
        tx.executeSql(
          `SELECT * FROM health_records WHERE nextDueDate IS NOT NULL AND nextDueDate <= ? ORDER BY nextDueDate ASC`,
          [future.toISOString().split('T')[0]],
          (_, { rows: { _array } }) => resolve(_array),
          (_, err) => { reject(err); return false; },
        );
      });
    }),

  getOverdue: (): Promise<any[]> =>
    new Promise((resolve, reject) => {
      const today = new Date().toISOString().split('T')[0];
      db.transaction((tx) => {
        tx.executeSql(
          `SELECT * FROM health_records WHERE nextDueDate IS NOT NULL AND nextDueDate <= ? ORDER BY nextDueDate ASC`,
          [today],
          (_, { rows: { _array } }) => resolve(_array),
          (_, err) => { reject(err); return false; },
        );
      });
    }),
};

// --- Milk ---
export const localMilk = {
  getAll: (cowId?: string): Promise<any[]> =>
    new Promise((resolve, reject) => {
      const q = cowId
        ? 'SELECT * FROM milk_feed WHERE cowId = ? ORDER BY milkingDate DESC'
        : 'SELECT * FROM milk_feed ORDER BY milkingDate DESC';
      const params = cowId ? [cowId] : [];
      db.transaction((tx) => {
        tx.executeSql(q, params, (_, { rows: { _array } }) => resolve(_array), (_, err) => { reject(err); return false; });
      });
    }),

  getTodayTotal: (): Promise<number> =>
    new Promise((resolve, reject) => {
      const today = new Date().toISOString().split('T')[0];
      db.transaction((tx) => {
        tx.executeSql(
          `SELECT COALESCE(SUM(morningMilk),0) + COALESCE(SUM(eveningMilk),0) as total FROM milk_feed WHERE milkingDate = ?`,
          [today],
          (_, { rows: { _array } }) => resolve(_array[0]?.total || 0),
          (_, err) => { reject(err); return false; },
        );
      });
    }),

  create: (data: any): Promise<any> =>
    new Promise((resolve, reject) => {
      const id = uuid();
      const now = new Date().toISOString();
      db.transaction((tx) => {
        tx.executeSql(
          `INSERT INTO milk_feed (id, cowId, milkingDate, dryDate, morningMilk, eveningMilk, feedGiven, notes, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [id, data.cowId, data.milkingDate, data.dryDate || null, data.morningMilk || null, data.eveningMilk || null, data.feedGiven || null, data.notes || null, now, now],
          () => resolve({ id, ...data }),
          (_, err) => { reject(err); return false; },
        );
      });
    }),
};

// --- Reproduction ---
export const localReproduction = {
  getFemale: (cowId: string): Promise<any[]> =>
    new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql('SELECT * FROM reproduction_female WHERE cowId = ? ORDER BY createdAt DESC', [cowId],
          (_, { rows: { _array } }) => resolve(_array),
          (_, err) => { reject(err); return false; },
        );
      });
    }),
  getMale: (cowId: string): Promise<any[]> =>
    new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql('SELECT * FROM reproduction_male WHERE cowId = ? ORDER BY createdAt DESC', [cowId],
          (_, { rows: { _array } }) => resolve(_array),
          (_, err) => { reject(err); return false; },
        );
      });
    }),
  getDueCalvings: (days: number = 30): Promise<any[]> =>
    new Promise((resolve, reject) => {
      const future = new Date();
      future.setDate(future.getDate() + days);
      db.transaction((tx) => {
        tx.executeSql(
          'SELECT * FROM reproduction_female WHERE expectedCalving IS NOT NULL AND expectedCalving <= ? ORDER BY expectedCalving ASC',
          [future.toISOString().split('T')[0]],
          (_, { rows: { _array } }) => resolve(_array),
          (_, err) => { reject(err); return false; },
        );
      });
    }),
  createFemale: (data: any) => localCreate('reproduction_female', data),
  createMale: (data: any) => localCreate('reproduction_male', data),
};

// --- Calves ---
export const localCalves = {
  getAll: (): Promise<any[]> =>
    new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql('SELECT * FROM calves ORDER BY createdAt DESC', [],
          (_, { rows: { _array } }) => resolve(_array),
          (_, err) => { reject(err); return false; },
        );
      });
    }),
  create: (data: any) => localCreate('calves', data),
};

// --- Insurance ---
export const localInsurance = {
  getAll: (): Promise<any[]> =>
    new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql('SELECT * FROM insurance ORDER BY insuredTill ASC', [],
          (_, { rows: { _array } }) => resolve(_array),
          (_, err) => { reject(err); return false; },
        );
      });
    }),
  create: (data: any) => localCreate('insurance', data),
};

// Generic helper
const localCreate = (table: string, data: any): Promise<any> =>
  new Promise((resolve, reject) => {
    const id = uuid();
    const now = new Date().toISOString();
    const keys = ['id', ...Object.keys(data), 'createdAt', 'updatedAt'];
    const vals = [id, ...Object.values(data), now, now];
    const placeholders = keys.map(() => '?').join(',');
    db.transaction((tx) => {
      tx.executeSql(
        `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`,
        vals,
        () => resolve({ id, ...data }),
        (_, err) => { reject(err); return false; },
      );
    });
  });
