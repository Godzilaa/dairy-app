// Applies mobile-schema.sql to the Supabase Postgres named in apps/api/.env.
// Run: node apps/mobile/supabase/apply-schema.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Reuse the `postgres` driver already installed for the API workspace.
const require = createRequire(join(__dirname, '../../api/package.json'));
const postgres = require('postgres');

const env = readFileSync(join(__dirname, '../../api/.env'), 'utf8');
const url = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
if (!url) throw new Error('DATABASE_URL not found in apps/api/.env');

const sql = readFileSync(join(__dirname, 'mobile-schema.sql'), 'utf8');

const client = postgres(url, { prepare: false });
try {
  await client.unsafe(sql);
  const rows = await client`
    select table_name from information_schema.tables
    where table_schema = 'public'
      and table_name in ('cows','health_records','milk_feed','heat_records','calves','bulls','custom_vaccines')
    order by table_name`;
  console.log('✅ schema applied. tables present:', rows.map((r) => r.table_name).join(', '));
} finally {
  await client.end();
}
