-- =====================================================================
-- supabase/notifiche.sql — Il database per le notifiche dei rinnovi (versione 4.18).
-- Va eseguito UNA volta nel SQL Editor di Supabase (dopo schema.sql).
--
-- Tre tabelle:
-- 1. iscrizioni_push   → i telefoni che vogliono gli avvisi (uno per riga), con le preferenze
-- 2. avvisi_inviati    → gli avvisi già mandati, così lo stesso avviso non parte due volte
-- 3. configurazione_push → le chiavi per firmare le notifiche (VAPID): le crea da sola la
--                          funzione invia-avvisi. La chiave SEGRETA non la può leggere nessuno
--                          tranne il server; la chiave PUBBLICA la legge l'app.
-- Poi un orologio (pg_cron) che ogni ora chiama la funzione invia-avvisi.
-- =====================================================================

-- 1. I telefoni iscritti agli avvisi
create table public.iscrizioni_push (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique,          -- l'"indirizzo" del telefono per le notifiche (lo dà Apple)
  p256dh text not null,                   -- le due chiavi del telefono per cifrare il messaggio
  auth text not null,
  giorni_preavviso smallint not null default 2 check (giorni_preavviso between 0 and 30),
  ora smallint not null default 9 check (ora between 0 and 23),   -- a che ora mandare gli avvisi
  fuso text not null default 'Europe/Rome',                         -- il fuso orario del telefono
  creata_il timestamptz not null default now()
);

alter table public.iscrizioni_push enable row level security;

-- Ognuno vede, aggiunge, cambia e toglie SOLO i propri telefoni
create policy "Le mie iscrizioni" on public.iscrizioni_push
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.iscrizioni_push to authenticated;

-- 2. Gli avvisi già mandati (nessuna regola per gli utenti: la usa solo il server)
create table public.avvisi_inviati (
  iscrizione_id uuid not null references public.iscrizioni_push (id) on delete cascade,
  abbonamento_id text not null,
  giorno_evento date not null,            -- il giorno del rinnovo (o della fine della prova)
  tipo text not null,                     -- 'prima' (qualche giorno prima) oppure 'oggi'
  inviato_il timestamptz not null default now(),
  primary key (iscrizione_id, abbonamento_id, giorno_evento, tipo)
);

alter table public.avvisi_inviati enable row level security;

-- 3. Le chiavi VAPID (le scrive la funzione invia-avvisi la prima volta che parte)
create table public.configurazione_push (
  nome text primary key,                  -- 'vapid_pubblica' oppure 'vapid_segreta'
  valore text not null
);

alter table public.configurazione_push enable row level security;

-- L'app può leggere SOLO la chiave pubblica (la segreta resta al server)
create policy "Chiave pubblica leggibile" on public.configurazione_push
  for select to anon, authenticated
  using (nome = 'vapid_pubblica');

grant select on public.configurazione_push to anon, authenticated;

-- 4. L'orologio: ogni ora, al minuto 0, chiama la funzione invia-avvisi.
--    (pg_cron = "orologio" del database; pg_net = fa la chiamata via internet)
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'avvisi-rinnovi',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://rjsdckmaadbevnadgrkb.supabase.co/functions/v1/invia-avvisi',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
