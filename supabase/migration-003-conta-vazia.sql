-- ============================================================
-- Migração 003 — contas novas começam vazias
-- Rode no SQL Editor. O trigger de signup passa a criar apenas
-- o profile; as fichas o usuário cria no app (ou carrega os
-- dados de exemplo). Contas existentes não são alteradas.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;
