# Abbonamenti — note per Claude

App web per tenere sotto controllo gli abbonamenti (costi e prossimi rinnovi),
pensata per l'iPhone e installabile nella schermata Home.

## Chi ci lavora
Il proprietario del progetto **sta imparando a programmare**:
- spiega sempre in italiano e in modo semplice cosa fai e perché;
- commenta il codice in italiano (le parti principali di HTML, CSS e JS);
- preferisci soluzioni chiare a soluzioni "furbe".

## Scelte tecniche (da rispettare)
- Solo **HTML, CSS e JavaScript semplici**: niente framework, librerie esterne o passaggi di build.
- Gli script sono normali `<script>` (non moduli ES), così l'app si apre anche con un doppio clic su `index.html`.
- **Dati**: si leggono e si scrivono SOLO tramite `storage.js` (l'oggetto `Archivio`).
  `app.js` non deve mai usare `localStorage` né `Supabase` direttamente. Le funzioni di `Archivio` sono `async`.
  `storage.js` è l'unico che usa `supabase.js`.
- I dati iniziali di esempio si caricano solo al primo avvio (localStorage vuoto).
- PWA: `manifest.json` + meta tag Apple in `index.html`, icone `icon-180.png` e `icon-512.png`
  (generate da `icon.svg`, con sfondo quadrato: gli angoli li arrotonda iOS).

## Numero di versione (da aggiornare a OGNI rilascio)
- Versione attuale: **3.0**. In `index.html` i file hanno il numero di versione (`style.css?v=3.0`, `app.js?v=3.0`…)
  e c'è la scritta "Abbonamenti · versione 3.0" in fondo alla pagina.
- A ogni modifica di CSS, JavaScript o manifest **aumenta il numero in tutti i punti di `index.html`**
  (cerca la versione attuale), così l'iPhone scarica i file nuovi invece di usare la copia in memoria.
  Piccole modifiche: 3.0 → 3.1; una nuova versione grande dell'app: 3.x → 4.0.
- GitHub Pages fa tenere in memoria i file fino a ~10 minuti: dopo un merge, l'iPhone può
  vedere la versione nuova con qualche minuto di ritardo (la scritta in fondo lo conferma).

## Design in stile iOS (da rispettare)
- Font di sistema `-apple-system`; titolo grande 34px, testo 17px.
- Colori SOLO tramite le variabili CSS in cima a `style.css`, con modalità scura automatica
  (`prefers-color-scheme`). Non scrivere colori sparsi.
- **Palette** (scelta dal proprietario):
  - colore principale **avorio** → sfondi di pagina e card (in modalità scura l'avorio diventa il colore del testo);
  - colore secondario **blu** → pulsanti, link, totali, titoletti delle sezioni, opzione scelta;
  - particolari **azzurrino** → linee di separazione, bordi delle card, frecce, sfondo del controllo segmentato.
  - **NON cambiare** i colori dei giorni mancanti (grigio, arancione e rosso di sistema iOS):
    variabili `--grigio-badge*`, `--arancione*`, `--rosso*`.
- Liste raggruppate: card con angoli 12px, margini laterali 16px, righe alte almeno 44px.
- Animazioni morbide 0.25–0.35s; rispettare sempre `prefers-reduced-motion`.
- Aree sicure dell'iPhone con `env(safe-area-inset-*)`.
- Moduli: foglio che sale dal basso con "Annulla" a sinistra e "Salva" a destra.
- Vedi anche la skill `stile-ios` se disponibile.

## Struttura dei file
| File | Cosa contiene |
| --- | --- |
| `index.html` | Struttura della pagina, foglio del modulo, meta tag per iPhone |
| `style.css` | Tutto l'aspetto: variabili colore, liste, foglio, etichette, animazioni |
| `categorie.js` | Elenco fisso delle categorie (`CATEGORIE`), unico punto dove modificarle |
| `calendario.js` | Crea il file .ics dei promemoria (`creaFileCalendario`); impostazioni `GIORNI_PREAVVISO` e `ORA_AVVISO` |
| `supabase.js` | `Supabase`: collegamento con il database online (account, sessione, richieste con `fetch`). Lo usa solo `storage.js` |
| `storage.js` | `Archivio`: lettura/scrittura dati, dati iniziali, controllo e backup, impostazioni, account e sincronizzazione online |
| `supabase/schema.sql` | Com'è fatto il database online (tabella, regole di protezione, permessi). Già eseguito: è documentazione |
| `app.js` | Logica: calcolo date e totali, filtro, lista divisa in gruppi, spesa per categoria, grafico mese per mese, promemoria nel calendario, modulo, backup |
| `manifest.json` | Informazioni per installare l'app |
| `icon.svg`, `icon-180.png`, `icon-512.png` | Icone |

## Modello dei dati
```js
{ id: "…", nome: "Spotify", costo: 16.99, frequenza: "mensile" | "annuale",
  giorno: 1-31, mese: 1-12 (solo annuali, altrimenti null),
  categoria: "streaming" | "musica" | … (id di categorie.js),
  stato: "attivo" | "pausa" | "disdetto" }
```
Chiave nel localStorage: `abbonamenti:v1` (invariata: i dati della versione 1 restano compatibili).
Backup: file JSON `{ app, versione: 3, esportatoIl, abbonamenti: [...] }`.
I backup delle versioni precedenti si importano ancora (stato mancante → `attivo`, categoria mancante → `altro`).

## Categorie (versione 2)
- Elenco **fisso** in `categorie.js` (scelta del proprietario): non c'è una schermata per crearle.
  Gli `id` non vanno mai cambiati (sono salvati nei dati); `nome` ed `emoji` sì.
- Categoria mancante o sconosciuta (dati della versione 1) → `altro`, gestito in `normalizza()` di `storage.js`.
- Lista divisa in gruppi nell'ordine di `CATEGORIE`; dentro ogni gruppo, ordine per prossimo rinnovo.
- Filtro a pillole ("Tutte" + categorie usate). Se la categoria filtrata resta vuota, o salvi
  un abbonamento di un'altra categoria, il filtro torna a "Tutte".
- "Spesa per categoria": importo al mese (annuali / 12), percentuale e barra, dalla più costosa.

## Sincronizzazione online (versione 3.0)
- Servizio: **Supabase**, progetto `https://rjsdckmaadbevnadgrkb.supabase.co`, tabella `public.abbonamenti`
  (vedi `supabase/schema.sql`). In `supabase.js` c'è la chiave **publishable** (pubblica per natura);
  la chiave **secret/service_role non va MAI** nel codice. I dati sono protetti dalle regole RLS:
  ognuno legge/scrive solo le righe con il suo `user_id`; senza account nessun permesso.
- Niente librerie: chiamate REST con `fetch` (`/auth/v1/...` per l'account, `/rest/v1/...` per i dati).
  Sessione in localStorage (`abbonamenti:sessione`): access_token rinnovato in automatico con il refresh_token.
- Account con **email e password** ("Confirm email" spento in Supabase: con il link via email l'iPhone
  aprirebbe Safari invece dell'app sulla schermata Home).
- Funziona **offline-first**: ogni modifica si salva subito sul dispositivo e va in una coda
  (`abbonamenti:sincronizzazione`: `daInviare`, `daEliminare`, `ultimoServer`, `unito`).
  `sincronizza()`: 1) invia la coda (upsert `on_conflict=user_id,id`; eliminati = `eliminato: true`),
  2) scarica le righe con `aggiornato_il` più recente di `ultimoServer` (l'ora la mette il server con un trigger).
  Parte da sola dopo ogni modifica (~0,8 s), all'avvio, quando l'app torna in primo piano e quando torna internet.
- Prima volta su un dispositivo (`unito: false`): se online non c'è niente si carica tutto; se online ci sono
  già dati, del dispositivo si tengono solo quelli che online non ci sono (esclusi i dati di esempio con id
  `esempio-…` e quelli con lo stesso nome di uno online: vince quello online).
- `storage.js` avvisa `app.js` con gli eventi `archivio-stato` (stato: `in-corso`, `sincronizzato`, `offline`,
  `errore`, `disconnesso`) e `archivio-aggiornato` (sono arrivati dati nuovi: ridisegnare).
- Uscendo dall'account i dati restano sul dispositivo, ma non si sincronizzano più.

## Ricerca e ordinamento
- Barra di ricerca sopra la lista: filtra per nome, senza badare a maiuscole e accenti (`semplifica()`),
  insieme al filtro per categoria. Scrivendo si ridisegna solo la lista (`disegnaLista()`), non totali e grafico.
- "Ordina" accanto al titolo: `rinnovo` (predefinito), `prezzo` (costo al mese, dal più caro), `nome` (A-Z).
  I gruppi per categoria restano; cambia l'ordine dentro ogni gruppo (i non attivi in ordine "rinnovo" vanno per nome).
- L'ordine scelto si salva con `Archivio.salvaImpostazione('ordine', …)` nella chiave `abbonamenti:impostazioni`
  (separata dai dati: non finisce nel backup).

## Abbonamenti in pausa o disdetti
- Campo `stato` nel modulo. Solo gli abbonamenti **attivi** (funzione `attivi()` in `app.js`) contano in:
  totali, prossimo rinnovo, spesa per categoria, grafico mese per mese e file del calendario.
- Quelli in pausa o disdetti restano nella lista in un gruppo "💤 Non attivi" in fondo (rispettando il filtro),
  in ordine alfabetico, con riga tenue, etichetta con bordo ("In pausa"/"Disdetto") e nota del risparmio al mese.
  Non usare grigio pieno, arancione o rosso per loro: sono riservati ai giorni mancanti.

## Regole di calcolo
- Totale al mese = somma dei mensili + (annuali / 12). Totale all'anno = totale al mese × 12.
- Prossimo rinnovo: la prima data uguale o successiva a oggi; se il giorno non esiste
  nel mese (es. 31 in febbraio) si usa l'ultimo giorno del mese.
- Grafico "Spese mese per mese": i 12 mesi a partire da quello attuale; ogni colonna è
  quanto si paga DAVVERO quel mese (mensili ogni mese, annuali per intero nel loro mese,
  NON divisi per 12). La somma dei 12 mesi è uguale al totale all'anno.
  Fatto con div e CSS, senza librerie: colonne blu, mese scelto con fascia azzurrina,
  griglia leggera (`--griglia`) con circa 3 linee a valori tondi; un tocco su una colonna
  mostra sotto il dettaglio dei pagamenti di quel mese.
- Promemoria: un evento .ics di tutto il giorno per ogni rinnovo da oggi ai prossimi 12 mesi
  (stessi pagamenti del grafico), con due avvisi: `GIORNI_PREAVVISO` giorni prima e il giorno
  stesso, alle `ORA_AVVISO`. Righe del file ≤ 75 byte, separate da CRLF, testo protetto con `testoICS`.
  Su iPhone/iPad il file si apre (Safari propone "Aggiungi tutti"); sul computer si scarica.
  Ogni esportazione crea nuovi eventi: per aggiornare conviene un calendario dedicato da svuotare.
- Colori dell'etichetta dei giorni mancanti: più di 7 grigio; da 7 a 4 arancione;
  3 o meno rosso con bagliore che pulsa; il giorno stesso "Oggi!" (rosso pieno).

## Come provare
- Veloce: doppio clic su `index.html`.
- Come sull'iPhone: `python3 -m http.server 8000` nella cartella, poi apri `http://localhost:8000`.
  Per installarla sull'iPhone serve pubblicarla online in HTTPS (es. GitHub Pages),
  aprirla in Safari → Condividi → "Aggiungi alla schermata Home".
