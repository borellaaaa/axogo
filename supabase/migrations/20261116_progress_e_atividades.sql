-- Aplicada no projeto Supabase "axogo" (wrvcyfuatpabzgmcjzul) em 16/11/2026.
-- Progresso de cada usuário (um registro por pessoa) e histórico de atividades, com RLS por usuário.

create table public.progress (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  state      jsonb not null default '{}'::jsonb,
  xp         integer not null default 0,
  streak     integer not null default 0,
  name       text,
  partner    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint progress_state_size check (pg_column_size(state) < 1000000),
  constraint progress_name_len check (name is null or char_length(name) <= 60)
);

create table public.activities (
  user_id    uuid not null references auth.users(id) on delete cascade,
  id         text not null,
  ts         timestamptz not null,
  day        date not null,
  kind       text not null check (kind in ('treino', 'livre')),
  title      text not null default '' check (char_length(title) <= 80),
  secs       integer not null default 0 check (secs >= 0 and secs < 86400),
  km         numeric(8,3) not null default 0 check (km >= 0 and km < 1000),
  kcal       integer not null default 0,
  xp         integer not null default 0,
  path       jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint activities_id_len check (char_length(id) <= 40),
  constraint activities_path_size check (path is null or pg_column_size(path) < 300000)
);
create index activities_user_ts_idx on public.activities (user_id, ts desc);

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end; $$;
create trigger progress_touch before insert or update on public.progress for each row execute function public.touch_updated_at();

alter table public.progress   enable row level security;
alter table public.activities enable row level security;
create policy "progress: ver o meu"      on public.progress for select to authenticated using ((select auth.uid()) = user_id);
create policy "progress: criar o meu"    on public.progress for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "progress: alterar o meu"  on public.progress for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "progress: apagar o meu"   on public.progress for delete to authenticated using ((select auth.uid()) = user_id);
create policy "atividades: ver as minhas"     on public.activities for select to authenticated using ((select auth.uid()) = user_id);
create policy "atividades: criar as minhas"   on public.activities for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "atividades: alterar as minhas" on public.activities for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "atividades: apagar as minhas"  on public.activities for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.progress, public.activities from anon;
grant select, insert, update, delete on public.progress, public.activities to authenticated;
