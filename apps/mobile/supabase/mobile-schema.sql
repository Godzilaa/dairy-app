-- Gopala mobile ⇄ Supabase sync schema.
-- Mirrors the on-device SQLite tables (apps/mobile/src/services/database.ts) so the
-- phone can push/pull rows keyed to the signed-in user (owner_id). The set of tables
-- here matches TABLES in apps/mobile/src/services/cloudSync.ts.
-- Column names are kept camelCase (quoted) to match what the app already sends.
--
-- Rows are scoped by owner_id, which holds the auth provider's subject id (the
-- `sub` claim of the JWT the app sends to Supabase). RLS below enforces that a user
-- only sees their own rows.
--
-- Apply with:  node apps/mobile/supabase/apply-schema.mjs
-- (uses the DATABASE_URL in apps/api/.env)

-- Bumps updated_at on every write so the phone can pull incrementally.
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

do $$
declare
  tbl text;
  cols text;
  tables jsonb := jsonb_build_object(
    'cows',
      '"cowId" text, "pashuAadhar" text, name text, breed text, dob text, mother text, father text, status text, photo text, "registrationMethod" text, "insuranceId" text, "pregnancyCount" integer',
    'health_records',
      '"cowId" text, "recordType" text, "vaccinationType" text, date text, "nextDueDate" text, "medicineName" text, "treatmentPeriod" text, "treatmentMode" text, "medicinesGiven" text, notes text',
    'milk_feed',
      '"cowId" text, "milkingDate" text, "dryDate" text, "morningMilk" double precision, "eveningMilk" double precision, "feedGiven" text, notes text',
    'feed_records',
      '"cowId" text, "feedDate" text, "feedType" text, quantity double precision, unit text, notes text',
    'expenses',
      'category text, amount double precision, "expenseDate" text, "paymentMode" text, "cowId" text, notes text',
    'heat_records',
      '"cowId" text, "heatIdentificationDate" text, "conceptionDate" text, "repeatHeatDate" text, notes text',
    'calves',
      '"cowId" text, name text, breed text, mother text, father text, dob text, gender text, photo text',
    'bulls',
      '"cowId" text, "pashuAadhar" text, name text, breed text, mother text, father text, dob text, photo text',
    'custom_vaccines',
      'name text',
    'reminders',
      'title text, details text, date text, time text, done integer'
  );
begin
  for tbl, cols in select * from jsonb_each_text(tables) loop
    execute format(
      'create table if not exists public.%I (
         id text primary key,
         owner_id text not null,
         %s,
         "createdAt" text,
         "updatedAt" text,
         updated_at timestamptz not null default now(),
         "deletedAt" text
       )', tbl, cols);

    -- owner-scoped lookups + incremental pulls
    execute format('create index if not exists %I on public.%I (owner_id)', tbl || '_owner_idx', tbl);
    execute format('create index if not exists %I on public.%I (owner_id, updated_at)', tbl || '_sync_idx', tbl);

    -- keep updated_at fresh
    execute format('drop trigger if exists %I on public.%I', tbl || '_set_updated', tbl);
    execute format(
      'create trigger %I before insert or update on public.%I
         for each row execute function set_updated_at()',
      tbl || '_set_updated', tbl);

    -- row-level security, scoped to the owner's auth subject id
    execute format('alter table public.%I enable row level security', tbl);
    execute format('drop policy if exists owner_all on public.%I', tbl);

    -- SECURE (default): requires the app's auth provider configured as a Supabase
    -- third-party auth provider, with the JWT carrying a `sub` (subject) claim.
    execute format(
      'create policy owner_all on public.%I
         using ( (auth.jwt() ->> ''sub'') = owner_id )
         with check ( (auth.jwt() ->> ''sub'') = owner_id )', tbl);

    -- QUICK/INSECURE alternative (anon key, no JWT). To use this instead,
    -- comment out the policy above and uncomment the one below:
    -- execute format('create policy owner_all on public.%I using (true) with check (true)', tbl);
  end loop;
end $$;
