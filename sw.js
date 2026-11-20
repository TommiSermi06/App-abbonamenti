/* =====================================================================
   sw.js — Il "service worker": un piccolo programma che il browser tiene
   accanto all'app e che sta in mezzo tra l'app e internet.

   A cosa serve: a far aprire l'app SEMPRE, anche senza internet (in metro,
   in aereo…). Mette da parte una copia dei file dell'app in un "magazzino"
   (la Cache del browser) e la usa quando la rete non risponde.

   Le regole:
   1. La pagina (index.html): prima internet, così hai sempre l'ultima versione
      (anche subito dopo un aggiornamento). Se la rete non risponde entro
      ATTESA_RETE millisecondi, usiamo la copia messa da parte.
   2. I file con il numero di versione nel nome (app.js?v=4.10, i loghi…):
      non cambiano MAI (quando li aggiorniamo cambia il numero), quindi prima
      il magazzino; se non ci sono, si scaricano e si mettono da parte.
   3. Gli altri file del sito (icone, manifest): si usa la copia e intanto
      se ne scarica una nuova per la volta dopo.
   4. Tutto quello che non è del nostro sito (Supabase, i link esterni)
      NON lo tocchiamo: passa come prima.

   Questo file NON ha bisogno del numero di versione: si accorge da solo dei
   file nuovi leggendo index.html. Va cambiato solo se cambiano queste regole.
   ===================================================================== */

const MAGAZZINO = 'abbonamenti';  // nome della cache
const ATTESA_RETE = 3000;         // dopo 3 secondi senza risposta usiamo la copia

// I file nominati da index.html (src="…" e href="…" del nostro sito)
function fileNominati(html) {
  const trovati = [...html.matchAll(/(?:src|href)="([^"#:]+)"/g)].map((r) => r[1]);
  return [...new Set(trovati)].map((percorso) => new URL(percorso, self.registration.scope).href);
}

// Mette in magazzino la pagina e tutti i file che nomina
async function preparaMagazzino() {
  const magazzino = await caches.open(MAGAZZINO);
  const risposta = await fetch('./', { cache: 'no-cache' });
  if (!risposta.ok) return;
  const html = await risposta.clone().text();
  await magazzino.put('./', risposta);
  // Un file che non si scarica non deve bloccare tutto: li proviamo uno per uno
  await Promise.all(fileNominati(html).map((indirizzo) => magazzino.add(indirizzo).catch(() => {})));
  await ripulisci(html);
}

// Toglie dal magazzino i file con un numero di versione vecchio (es. app.js?v=4.8 quando c'è la 4.9).
// I loghi (cartella loghi/) restano: hanno il loro numero e servono finché hai quell'abbonamento.
async function ripulisci(html) {
  const magazzino = await caches.open(MAGAZZINO);
  const attuali = new Set(fileNominati(html));
  for (const richiesta of await magazzino.keys()) {
    const indirizzo = new URL(richiesta.url);
    if (indirizzo.search.startsWith('?v=') && !indirizzo.pathname.includes('/loghi/') && !attuali.has(richiesta.url)) {
      await magazzino.delete(richiesta);
    }
  }
}

// Installazione: prepariamo il magazzino e prendiamo subito il posto della versione vecchia
self.addEventListener('install', (evento) => {
  evento.waitUntil(preparaMagazzino().catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(self.clients.claim()); // controlla subito anche la pagina già aperta
});

// La pagina: prima internet (con un tempo massimo), poi la copia
async function pagina(richiesta) {
  const magazzino = await caches.open(MAGAZZINO);
  const daInternet = fetch(richiesta, { cache: 'no-cache' }).then(async (risposta) => {
    if (risposta.ok) {
      const html = await risposta.clone().text();
      await magazzino.put('./', risposta.clone());
      ripulisci(html); // in sottofondo
      // I file nuovi nominati dalla pagina li scarica il browser subito dopo: li mettiamo da parte allora
    }
    return risposta;
  });
  const copia = await magazzino.match('./');
  if (!copia) return daInternet; // prima volta in assoluto: per forza da internet

  // Gara: vince internet se risponde entro ATTESA_RETE, altrimenti la copia
  const tempoScaduto = new Promise((fatto) => setTimeout(() => fatto(copia), ATTESA_RETE));
  return Promise.race([daInternet.catch(() => copia), tempoScaduto]);
}

// I file con il numero di versione: prima il magazzino, se non c'è da internet (e lo teniamo)
async function fileVersionato(richiesta) {
  const magazzino = await caches.open(MAGAZZINO);
  const copia = await magazzino.match(richiesta);
  if (copia) return copia;
  const risposta = await fetch(richiesta);
  if (risposta.ok) magazzino.put(richiesta, risposta.clone());
  return risposta;
}

// Gli altri file del sito: subito la copia (se c'è) e intanto aggiorniamo il magazzino
async function altroFile(richiesta) {
  const magazzino = await caches.open(MAGAZZINO);
  const copia = await magazzino.match(richiesta);
  const daInternet = fetch(richiesta).then((risposta) => {
    if (risposta.ok) magazzino.put(richiesta, risposta.clone());
    return risposta;
  });
  return copia || daInternet;
}

self.addEventListener('fetch', (evento) => {
  const richiesta = evento.request;
  const indirizzo = new URL(richiesta.url);
  // Solo le letture (GET) del nostro sito: Supabase e i siti esterni passano senza toccarli
  if (richiesta.method !== 'GET' || indirizzo.origin !== self.location.origin) return;

  if (richiesta.mode === 'navigate') {
    evento.respondWith(pagina(richiesta));
  } else if (indirizzo.search.startsWith('?v=')) {
    evento.respondWith(fileVersionato(richiesta));
  } else {
    evento.respondWith(altroFile(richiesta));
  }
});
