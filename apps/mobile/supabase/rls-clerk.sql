-- Switch ownership from owner_email to owner_id = Clerk user id (the `sub` claim),
-- which is always present in a Clerk session token (email is not, by default).
do $$
declare tbl text;
begin
  foreach tbl in array array['cows','health_records','milk_feed','heat_records','calves','custom_vaccines']
  loop
    if exists (select 1 from information_schema.columns
               where table_schema='public' and table_name=tbl and column_name='owner_email') then
      execute format('alter table public.%I rename column owner_email to owner_id', tbl);
    end if;

    execute format('drop index if exists %I', tbl || '_owner_idx');
    execute format('drop index if exists %I', tbl || '_sync_idx');
    execute format('create index if not exists %I on public.%I (owner_id)', tbl || '_owner_idx', tbl);
    execute format('create index if not exists %I on public.%I (owner_id, updated_at)', tbl || '_sync_idx', tbl);

    execute format('drop policy if exists owner_all on public.%I', tbl);
    execute format(
      'create policy owner_all on public.%I
         using ( (auth.jwt() ->> ''sub'') = owner_id )
         with check ( (auth.jwt() ->> ''sub'') = owner_id )', tbl);
  end loop;
end $$;
