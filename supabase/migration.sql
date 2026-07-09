-- ============================================================
-- Backlog de Treino — migração inicial
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Cria: profiles, fichas, ficha_exercises, sessions,
--       session_exercises, session_sets — todas com RLS.
-- Trigger de signup: cria profile + 4 fichas padrão (A–D).
-- ============================================================

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  descanso_segundos int not null default 90 check (descanso_segundos between 30 and 300),
  descanso_automatico boolean not null default true,
  meta_semanal int not null default 4 check (meta_semanal between 1 and 7),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles select own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles insert own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ---------- fichas ----------
create table public.fichas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  letter text not null,
  grupo text not null,
  position int not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create index fichas_user_idx on public.fichas (user_id);

alter table public.fichas enable row level security;

create policy "fichas select own" on public.fichas
  for select using (auth.uid() = user_id);
create policy "fichas insert own" on public.fichas
  for insert with check (auth.uid() = user_id);
create policy "fichas update own" on public.fichas
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "fichas delete own" on public.fichas
  for delete using (auth.uid() = user_id);

-- ---------- ficha_exercises ----------
create table public.ficha_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ficha_id uuid not null references public.fichas (id) on delete cascade,
  name text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index ficha_exercises_user_idx on public.ficha_exercises (user_id);
create index ficha_exercises_ficha_idx on public.ficha_exercises (ficha_id);

alter table public.ficha_exercises enable row level security;

create policy "ficha_exercises select own" on public.ficha_exercises
  for select using (auth.uid() = user_id);
create policy "ficha_exercises insert own" on public.ficha_exercises
  for insert with check (auth.uid() = user_id);
create policy "ficha_exercises update own" on public.ficha_exercises
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ficha_exercises delete own" on public.ficha_exercises
  for delete using (auth.uid() = user_id);

-- ---------- sessions ----------
-- ficha_letter/grupo são snapshots: o histórico sobrevive à edição/remoção da ficha.
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  ficha_id uuid references public.fichas (id) on delete set null,
  ficha_letter text not null,
  grupo text not null,
  volume numeric not null default 0,
  duration_min int not null default 0,
  started_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index sessions_user_date_idx on public.sessions (user_id, date);

alter table public.sessions enable row level security;

create policy "sessions select own" on public.sessions
  for select using (auth.uid() = user_id);
create policy "sessions insert own" on public.sessions
  for insert with check (auth.uid() = user_id);
create policy "sessions update own" on public.sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sessions delete own" on public.sessions
  for delete using (auth.uid() = user_id);

-- ---------- session_exercises ----------
create table public.session_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete cascade,
  name text not null,
  note text not null default '',
  position int not null default 0
);

create index session_exercises_user_idx on public.session_exercises (user_id);
create index session_exercises_session_idx on public.session_exercises (session_id);

alter table public.session_exercises enable row level security;

create policy "session_exercises select own" on public.session_exercises
  for select using (auth.uid() = user_id);
create policy "session_exercises insert own" on public.session_exercises
  for insert with check (auth.uid() = user_id);
create policy "session_exercises update own" on public.session_exercises
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "session_exercises delete own" on public.session_exercises
  for delete using (auth.uid() = user_id);

-- ---------- session_sets ----------
create table public.session_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_exercise_id uuid not null references public.session_exercises (id) on delete cascade,
  set_number int not null,
  kg numeric not null default 0,
  reps int not null default 0,
  done boolean not null default false
);

create index session_sets_user_idx on public.session_sets (user_id);
create index session_sets_exercise_idx on public.session_sets (session_exercise_id);

alter table public.session_sets enable row level security;

create policy "session_sets select own" on public.session_sets
  for select using (auth.uid() = user_id);
create policy "session_sets insert own" on public.session_sets
  for insert with check (auth.uid() = user_id);
create policy "session_sets update own" on public.session_sets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "session_sets delete own" on public.session_sets
  for delete using (auth.uid() = user_id);

-- ---------- trigger de signup ----------
-- Cria o profile e as 4 fichas padrão (estrutura de template, sem histórico falso).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ficha jsonb;
  ex text;
  new_ficha_id uuid;
  f_pos int := 0;
  e_pos int;
  defaults jsonb := '[
    {"letter":"A","grupo":"Peito e Tríceps","ex":["Supino Reto","Supino Inclinado Halteres","Crucifixo na Polia","Tríceps Corda","Tríceps Francês"]},
    {"letter":"B","grupo":"Costas e Bíceps","ex":["Barra Fixa","Remada Curvada","Puxada Alta","Rosca Direta","Rosca Martelo"]},
    {"letter":"C","grupo":"Pernas","ex":["Agachamento Livre","Leg Press","Cadeira Extensora","Mesa Flexora","Panturrilha em Pé"]},
    {"letter":"D","grupo":"Ombros e Core","ex":["Desenvolvimento Halteres","Elevação Lateral","Elevação Frontal","Encolhimento","Abdominal Cabo"]}
  ]'::jsonb;
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));

  for ficha in select * from jsonb_array_elements(defaults) loop
    insert into public.fichas (user_id, letter, grupo, position)
    values (new.id, ficha ->> 'letter', ficha ->> 'grupo', f_pos)
    returning id into new_ficha_id;

    e_pos := 0;
    for ex in select * from jsonb_array_elements_text(ficha -> 'ex') loop
      insert into public.ficha_exercises (user_id, ficha_id, name, position)
      values (new.id, new_ficha_id, ex, e_pos);
      e_pos := e_pos + 1;
    end loop;

    f_pos := f_pos + 1;
  end loop;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
