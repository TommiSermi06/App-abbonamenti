-- =====================================================================
-- supabase/spese.sql — La tabella delle spese (versione 4.20).
-- Va eseguito UNA volta nel SQL Editor di Supabase (dopo schema.sql).
--
-- Funziona come la tabella degli abbonamenti: una riga per spesa, legata al
-- proprio utente; le spese eliminate restano con eliminato = true, così anche
-- l'altro dispositivo sa che deve toglierle; l'ora dell'ultima modifica la
-- scrive il server (stessa funzione imposta_aggiornato_il di schema.sql).
-- =====================================================================

create table public.spese (
  id text not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  descrizione text not null check (char_length(descrizione) between 1 and 40),
  importo numeric(10, 2) not null check (importo > 0),
  data date not null,                       -- il giorno della spesa
  categoria text not null default 'altro',  -- id di CATEGORIE_SPESE (categorie.js)
  note text check (char_length(note) <= 200),
  eliminato boolean not null default false,
  aggiornato_il timestamptz not null default now(),
  primary key (user_id, id)
);

-- Protezione: ognuno vede e modifica SOLO le proprie spese
alter table public.spese enable row level security;

create policy "Leggo le mie spese" on public.spese
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Aggiungo le mie spese" on public.spese
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Modifico le mie spese" on public.spese
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- L'ora dell'ultima modifica la mette il server
create trigger spese_aggiornato_il
  before insert or update on public.spese
  for each row execute function public.imposta_aggiornato_il();

-- Chi è entrato con il suo account può usare la tabella (le regole qui sopra restano valide)
grant select, insert, update on public.spese to authenticated;
