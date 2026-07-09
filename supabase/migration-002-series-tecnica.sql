-- ============================================================
-- Migração 002 — séries por exercício + técnica de treino
-- Rode no SQL Editor (depois da migration.sql inicial).
-- ============================================================

-- Nº de séries configurável por exercício da ficha (padrão 3)
-- e técnica de treino (Cluster Set, Myo Reps, ...).
alter table public.ficha_exercises
  add column sets_count int not null default 3 check (sets_count between 1 and 10),
  add column technique text not null default '';

-- Snapshot da técnica na sessão (histórico sobrevive à edição da ficha).
alter table public.session_exercises
  add column technique text not null default '';

-- Notação crua de reps quando há técnica (ex. "6+2/2/2");
-- a coluna reps passa a guardar o TOTAL de repetições.
alter table public.session_sets
  add column reps_detail text not null default '';
