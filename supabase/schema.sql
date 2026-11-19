-- =====================================================================
-- supabase/schema.sql — Com'è fatto il database online dell'app.
-- Questo testo è già stato eseguito nel progetto Supabase (SQL Editor):
-- è salvato qui per documentazione, NON va rieseguito.
-- =====================================================================

-- Tabella degli abbonamenti: una riga per abbonamento, legata al proprio utente
create table public.abbonamenti (
  id text not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 40),
  costo numeric(10, 2) not null check (costo > 0),
  frequenza text not null check (frequenza in ('mensile', 'annuale')),
  giorno smallint not null check (giorno between 1 and 31),
  mese smallint check (mese between 1 and 12),
  categoria text not null default 'altro',
  stato text not null default 'attivo' check (stato in ('attivo', 'pausa', 'disdetto')),
  eliminato boolean not null default false,
  aggiornato_il timestamptz not null default now(),
  primary key (user_id, id)
);

-- Protezione: ognuno vede e modifica SOLO i propri abbonamenti
alter table public.abbonamenti enable row level security;

create policy "Leggo i miei abbonamenti" on public.abbonamenti
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Aggiungo i miei abbonamenti" on public.abbonamenti
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Modifico i miei abbonamenti" on public.abbonamenti
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- L'ora dell'ultima modifica la scrive il server, così è uguale per tutti i dispositivi
create function public.imposta_aggiornato_il() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.aggiornato_il := now();
  return new;
end;
$$;

create trigger abbonamenti_aggiornato_il
  before insert or update on public.abbonamenti
  for each row execute function public.imposta_aggiornato_il();

-- Chi è entrato con il suo account può usare la tabella (le regole qui sopra restano valide).
-- Chi non è entrato (ruolo "anon") non ha nessun permesso.
grant select, insert, update on public.abbonamenti to authenticated;

-- Versione 3.1: fine della prova gratuita (null = nessuna prova)
alter table public.abbonamenti add column fine_prova date;

-- Versione 3.2: link per disdire, metodo di pagamento e note (null = vuoto)
alter table public.abbonamenti
  add column link text check (char_length(link) <= 300),
  add column pagamento text check (char_length(pagamento) <= 40),
  add column note text check (char_length(note) <= 500);

-- Impostazioni fatte dal sito di Supabase (non con SQL):
-- - Authentication → URL Configuration → Site URL: https://tommisermi06.github.io/App-abbonamenti/
-- - Authentication → Sign In / Providers → Email → "Confirm email": spento
