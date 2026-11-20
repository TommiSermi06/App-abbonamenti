# Abbonamenti — note per Claude

App web per tenere sotto controllo gli abbonamenti (costi e prossimi rinnovi),
pensata per l'iPhone e installabile nella schermata Home.

## Idee da fare più avanti (scelte dal proprietario, da proporre quando chiede cosa fare)
- **Storico dei prezzi**: quando cambia il costo, ricordare il prezzo vecchio e la data ("+2,00 € da marzo").
- **Nuova icona**: la disegna la sua ragazza (PNG 1024×1024, angoli dritti, sfondo pieno); poi rigenerare
  `icon-180.png`, `icon-512.png` e `icon.svg`.
- **"Lo uso davvero?"**: segnare quanto si usa ogni abbonamento e suggerire dove risparmiare.
- **Idee "fondamentali" scelte il 20/11/2026**: tutte fatte (1 e 3 nella 4.10, 2 nella 4.11, 4 nella 4.12,
  5 nella 4.13, 6 nella 4.15).
- Altre idee già proposte: abbonamenti condivisi (quota), budget mensile, valute diverse, riepilogo annuale.
- Progetto più grande (pagina Notion "App di organizzazione e risparmio"): Risparmio (spese, budget, obiettivi),
  Organizzazione (cose da fare, appuntamenti, note, liste), Sezione per lei, e più avanti l'App Store.

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
- Versione attuale: **4.18**. In `index.html` i file hanno il numero di versione (`style.css?v=4.18`, `app.js?v=4.18`…)
  e c'è la scritta "Abbonamenti · versione 4.18" in fondo alla pagina.
- A ogni modifica di CSS, JavaScript o manifest **aumenta il numero in tutti i punti di `index.html`**
  (cerca la versione attuale), così l'iPhone scarica i file nuovi invece di usare la copia in memoria.
  Piccole modifiche: 3.0 → 3.1; una nuova versione grande dell'app: 3.x → 4.0.
- Dalla 4.10 il service worker chiede `index.html` a internet a ogni apertura "da chiusa" (`cache: 'no-cache'`):
  la versione nuova arriva alla prima riapertura. Il numero `?v=` resta FONDAMENTALE: è così che il service
  worker capisce quali file sono nuovi (quelli con `?v=` li prende dal magazzino senza chiedere). Il primo
  aggiornamento verso la 4.10 può ancora richiedere qualche minuto (GitHub Pages tiene i file ~10 minuti).

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
- Liste raggruppate: card di vetro con angoli 20px (`--raggio-card`), margini laterali 16px, righe alte almeno 44px.
- Animazioni morbide 0.25–0.35s; rispettare sempre `prefers-reduced-motion`.
- Aree sicure dell'iPhone con `env(safe-area-inset-*)`.
- **La pagina non si ingrandisce mai** (versione 4.17, scelta del proprietario), né con il doppio tocco né pizzicando:
  meta viewport con `maximum-scale=1, user-scalable=no`, `touch-action: pan-x pan-y` su `html` (con le dita si può
  solo scorrere) e `gesturestart`/`gesturechange` fermati in `app.js` (il pizzico di Safari). Lo Zoom di
  Accessibilità dell'iPhone (tre dita) funziona lo stesso. Non togliere queste regole.
- Moduli: foglio che sale dal basso con "Annulla" a sinistra e "Salva" a destra.
  La prima card del modulo sta a 20px dalla barra "Annulla / Salva" (`.foglio form > .lista:first-child`):
  mai attaccata alla barra (scelta del proprietario).
- Riga in cui stai scrivendo (`.campo:focus-within`, anche menu e note; non l'interruttore): sfondo azzurrino
  (`--azzurro-tenue`) e nome blu (style.css); in `vetro.css` goccia blu che cresce a sinistra con la molla,
  nome che scivola di 4px e alone azzurrino intorno alla card del foglio.
- Vedi anche la skill `stile-ios` se disponibile.

## Stile "Liquid Glass" futuristico (versione 4.0)
- Tutto lo stile vetro sta in **`vetro.css`**, caricato DOPO `style.css` (che resta la base e non va riscritta
  per il vetro). Le animazioni che richiedono JS stanno in **`animazioni.js`** (oggetto `Animazioni`).
  Togliendo questi due file da `index.html` si torna all'aspetto precedente.
- Vetro: sfondo semitrasparente (`--vetro`, `--vetro-forte`, `--vetro-barra`) + `backdrop-filter`
  (`--vetro-sfocatura`), bordo e riflesso chiari, ombra morbida, lampo diagonale (`.card::after`).
  Dietro c'è lo **sfondo vivo** (`.sfondo-vivo`: 3 macchie di luce `--luce-1/2/3` che si muovono lentissime).
  Dentro al foglio le card NON hanno `backdrop-filter` (troppo pesante per il telefono).
- Totali "eroe": bordo sfumato blu → azzurrino e numeri con sfumatura `--blu` → `--blu-chiaro`
  (stessa tinta); `adattaLarghezza()` rimpicciolisce i numeri lunghi perché stiano interi.
- Movimento: curve `--molla` (rimbalzo), `--molla-foglio`, `--uscita`. Animazioni solo con uno scopo:
  totali che contano (`Animazioni.conta`), goccia che scivola nel segmentato (CSS `:has`) e nei filtri
  (`Animazioni.posizionaIndicatore`), barra in alto che diventa compatta seguendo lo scorrimento (`Animazioni.barraCompatta` scrive
  `--avanzamento-barra` da 0 a 1: vetro `--vetro-alto` che sfuma in basso con una maschera, titolo piccolo che
  sale, titolo grande che sbiadisce; niente cambio netto né riga di separazione; la fila dei filtri, passata come
  terzo argomento, svanisce mentre va sotto la barra: è una fila che scorre di lato e il browser la disegna come
  un livello a parte che il vetro NON sfoca, quindi senza questo si vedrebbe una pillola nitida accanto al "+"),
  foglio con molla + pagina dietro che si allontana + chiusura trascinando la maniglia
  (`Animazioni.trascinaPerChiudere`), righe che entrano "mettendosi a fuoco", capsula "✓" dopo le azioni
  (`Animazioni.avviso`). Niente animazioni decorative continue tranne lo sfondo lentissimo.
- Nel foglio maniglia e barra "Annulla / Salva" sono `sticky` in cima: restano visibili scorrendo.
- Accessibilità: con **Riduci movimento** niente animazioni (anche i numeri compaiono subito); con
  **Riduci trasparenza** (o browser senza `backdrop-filter`) superfici piene e niente macchie.
  I colori dei giorni mancanti restano quelli di sempre.

## Benvenuto "Orbita" e saluto (versione 4.1)
- `benvenuto.js` (oggetto `Benvenuto`) + `benvenuto.css`. Markup in `index.html` (`#benvenuto`, `#saluto-avvio`).
- **Primo avvio** (impostazione `benvenutoVisto` assente): scena "Orbita" con il totale al mese al centro e
  le iniziali degli abbonamenti su due anelli che girano (`Benvenuto.mostra`), poi "Come ti chiami?",
  poi "atterraggio" e l'app entra. "Ho già un account" → alla fine apre l'accesso.
  Gli anelli girano **piano** (interno 70 s per giro, esterno 84 s: le lune esterne sembrano solo un po' più
  veloci): scelta del proprietario, le lune veloci disturbano. L'**accelerazione** c'è solo nell'atterraggio
  (gli anelli prendono velocità mentre vengono risucchiati verso il pianeta, curva ease-in, ~1 s).
- **Ogni apertura "da chiusa"** (la pagina si carica da zero; versione 4.9, scelta del proprietario):
  orbita automatica, `Benvenuto.mostra({ …, automatico: true, saluto, sottotitolo })`: niente pulsanti
  (classe `.automatico`), titolo "Buongiorno/Buon pomeriggio/Buonasera, Nome", sottotitolo
  `testoProssimoRinnovo()` ("Prossimo rinnovo: Spotify, tra 3 giorni."), dopo 1,7 s parte da solo il risucchio
  (un tocco lo fa partire subito). Nome e accesso si chiedono SOLO alla primissima apertura.
- **Ritorno dal background** (`visibilitychange`, assenza di almeno `PAUSA_BENTORNATO` = 30 s (scelta del proprietario), così aprire un
  link o il calendario e tornare subito non conta; anche `pageshow` con `persisted`): saluto lampo con la goccia e
  "Bentornato, Nome" (`Benvenuto.salutoLampo`, < 1 s, un tocco lo salta). Solo dopo che l'app è entrata (`appPronta`).
  Nella Home il saluto "Buongiorno, Nome" sta sopra il titolo (`#saluto`).
- Il nome (impostazione `nome`) si cambia dalla sezione "Profilo"; resta SOLO sul dispositivo (non va online).
- L'entrata a cascata della Home parte quando `app.js` aggiunge la classe `entra` a `.app` (`entraNellApp()`).
- Il **pianeta** (`pianeta.webp`, 520×520 con trasparenza, ~59 KB) è un'immagine generata con Higgsfield
  (modello Z Image) e scontornata tenendo l'alone dell'atmosfera; sta al centro dell'orbita (le iniziali
  girano intorno come lune) e nel saluto lampo. Il totale è nella capsula di vetro sotto l'orbita.
- Iniziale e colore di un abbonamento: `Benvenuto.iniziale(nome)` e `Benvenuto.tinta(nome)` (`mono-1…5`,
  sempre nella tinta blu/azzurrino; riutilizzabili per le icone della lista).
- **Prove automatiche**: con `abbonamenti:impostazioni` = `{"benvenutoVisto": true}` prima di aprire la pagina si salta
  il benvenuto completo, ma l'orbita automatica dura ~2,5 s: aspettare ~3 s (o toccare `#benvenuto`) prima di provare.

## Barra delle schede in basso (versione 4.2)
- Tre schede (`.scheda` con `data-scheda` dentro a `<main>`): **Abbonamenti** (totali, prossimo rinnovo, lista),
  **Statistiche** (spesa per categoria, grafico; messaggio `#statistiche-vuote` se non c'è niente da mostrare),
  **Impostazioni** (Profilo, Sincronizzazione, Promemoria, Backup, versione). Si vede solo quella scelta (`hidden`).
- Barra `#barra-schede` (`nav`, capsula di vetro che galleggia in basso) FUORI da `<main>`: con il foglio aperto
  `.app` ha un `transform` e un elemento `fixed` dentro si sposterebbe. Scheda scelta = `aria-current="page"`,
  goccia con `Animazioni.posizionaIndicatore`.
- `mostraScheda(nome)` in `app.js`: cambia titolo grande e compatto, saluto solo nella prima scheda, "+" nascosto
  nelle Impostazioni, ricorda lo scorrimento di ogni scheda; toccando la scheda in cui sei torni in cima.
  All'avvio si apre sempre Abbonamenti (la scelta non si salva).
- Entrata a cascata solo la prima volta (classe `entra` → `entrata` dopo 1 s); cambiando scheda il contenuto
  compare con `.appena-scelta` (0,32 s). Le colonne del grafico ricrescono aprendo Statistiche.
- Mentre scrivi in un campo della pagina la barra scende fuori dalla vista (`body:has(.app input:focus)`).

## Gesti sulle righe (versione 4.3)
- Nella lista ogni riga è un `<li class="riga-scorrevole">` con dietro `.azioni-riga`: **Pausa** (o **Riattiva**
  per chi non è attivo, blu) ed **Elimina** (rosso). `Animazioni.scorriRighe(el.gruppi, …)` gestisce il dito con i
  pointer event (`touch-action: pan-y`: lo scorrimento verticale resta al browser) e scrive `--dx` sul `<li>`.
  Lasciata oltre metà resta aperta; tirata oltre il 55% "Elimina" copre tutto ed elimina subito; un tocco su una
  riga aperta o lo scorrimento della pagina la richiudono; il click dopo un trascinamento non apre il modulo.
- `azioneRiga(azione, id)` in `app.js`: la riga si richiude in altezza, poi capsula con **Annulla** per 5 s
  (`Animazioni.avviso(testo, { azione, suAzione })`). Annullare l'eliminazione usa `Archivio.ripristina(abb)`
  (stesso id; online torna con `eliminato: false`). Dal modulo "Elimina" chiede ancora conferma.
- Le azioni hanno `aria-hidden` e `tabindex -1`: con VoiceOver si usa il modulo (stato ed Elimina).

## Pianetini con il logo (versione 4.4)
- A sinistra di ogni riga della lista c'è un "pianetino" (`.pianetino`, 36px, sfumatura `--mono-1…5` scelta da
  `Benvenuto.tinta(nome)`): dentro il **logo del servizio** in bianco (`currentColor` = `--lettera-pianeta`),
  oppure l'**iniziale** se il servizio non è conosciuto. Anche le lune del benvenuto mostrano il logo.
- I loghi stanno in **`loghi.js`** (`LOGHI`: nome, alias, `disegno` = il `d` del path SVG 24×24; `logoPer(nome)`,
  `creaSvgLogo(logo)`), presi da **Simple Icons** (raccolta di loghi ufficiali dei marchi in forma monocromatica,
  pensata per indicare i servizi). Scritti nel codice: niente richieste online, funzionano offline e per tutti.
- **Non ridisegnare loghi "simili"** a quelli che mancano (Disney+, ChatGPT/OpenAI, Amazon Prime, Microsoft, Xbox,
  Adobe: tolti da Simple Icons su richiesta delle aziende): sarebbero imitazioni di un marchio. Per loro c'è l'iniziale.
- Niente colori dei marchi: il logo è sempre bianco sul pianetino blu/azzurrino (palette dell'app).
- Alias come in `servizi.js` (`chiaveNome`, basta l'inizio del nome); gli alias di 3 lettere o meno valgono solo
  per il nome esatto ("sky" sì, "Skype" no). Nomi più specifici prima ("applemusic" prima di "apple").
- I colori `--mono-1…5`, `--lettera-pianeta`, `--ombra-pianeta` stanno in `style.css` (servono a lista e benvenuto).
- **Catalogo completo (versione 4.5)**: cartella `loghi/` con TUTTI i loghi di Simple Icons utilizzabili (~3400).
  `loghi/elenco.js` (~80 KB: nome semplificato → file) e un file piccolo per logo, `loghi/s/<file>.js`
  (`Loghi.riceviDisegno('netflix', '…')`), che si scarica **solo se serve**. Si caricano come `<script>` aggiunti
  dal codice (funziona anche con il doppio clic su `index.html`); `?v=VERSIONE_CATALOGO` (in `loghi.js`) per la cache.
- `Loghi.riempi(elemento, nome, riserva)`: 1) `LOGHI` di `loghi.js` (subito, alias con l'inizio del nome);
  2) catalogo già scaricato (subito); 3) intanto l'iniziale, poi il logo con una dissolvenza (`.logo-arrivato`).
  Nel catalogo il nome deve corrispondere intero, oppure togliendo parole dalla fine con almeno 4 lettere
  ("Revolut Premium" → revolut; "Sky Go" non diventa "sky").
- Esclusi dal catalogo: licenze `custom` e CC-BY-SA, e le parole generiche (`PAROLE_GENERICHE`: "metro", "box"…).
  Crediti delle licenze che lo chiedono in `loghi/CREDITI.md`.
- **Aggiornare il catalogo**: `strumenti/aggiorna-loghi.py` (istruzioni in cima al file; NON è un passaggio di build:
  l'app usa i file già pronti), poi aggiornare `VERSIONE_CATALOGO` in `loghi.js`.

## Struttura dei file
| File | Cosa contiene |
| --- | --- |
| `index.html` | Struttura della pagina, foglio del modulo, meta tag per iPhone |
| `style.css` | Tutto l'aspetto: variabili colore, liste, foglio, etichette, animazioni |
| `frequenze.js` | Le frequenze (`FREQUENZE`) e i calcoli che ne dipendono: volte all'anno, mesi in cui si paga, giorni della settimana |
| `categorie.js` | Elenco fisso delle categorie (`CATEGORIE`), unico punto dove modificarle |
| `calendario.js` | Crea il file .ics dei promemoria (`creaFileCalendario`); impostazioni `GIORNI_PREAVVISO` e `ORA_AVVISO` |
| `vetro.css` | Stile "Liquid Glass": vetro, sfondo vivo, molle e animazioni CSS (riveste `style.css`) |
| `animazioni.js` | `Animazioni`: numeri che contano, goccia dei filtri, barra compatta, foglio da trascinare, capsula di avviso |
| `blocco.js` | `Blocco`: blocco dell'app con codice PIN (tastierina, impronta SHA-256) o Face ID (WebAuthn), schermata di blocco, copri/scopri in background |
| `benvenuto.js`, `benvenuto.css` | Benvenuto "Orbita" al primo avvio, saluto lampo a ogni apertura, iniziali e colori dei "pianeti" |
| `loghi.js` | I loghi dei servizi (da Simple Icons) per i pianetini: `LOGHI`, `logoPer(nome)`, `creaSvgLogo(logo)`, `Loghi.riempi` (catalogo) |
| `loghi/` | Catalogo completo dei loghi: `elenco.js`, `s/<file>.js` (uno per logo), `CREDITI.md` |
| `strumenti/aggiorna-loghi.py` | Rigenera `loghi/` da una nuova versione di Simple Icons (solo manutenzione) |
| `servizi.js` | Come disdire i servizi più diffusi (`SERVIZI`: alias, link ufficiale, passi, nota) e `guidaDisdetta(nome, pagamento)` |
| `supabase.js` | `Supabase`: collegamento con il database online (account, sessione, richieste con `fetch`). Lo usa solo `storage.js` |
| `storage.js` | `Archivio`: lettura/scrittura dati, dati iniziali, controllo e backup, impostazioni, account e sincronizzazione online |
| `supabase/notifiche.sql` | Tabelle e orologio (pg_cron) delle notifiche. Da eseguire una volta nel SQL Editor |
| `supabase/functions/invia-avvisi/index.ts` | Edge Function che ogni ora manda le notifiche dei rinnovi (Web Push) |
| `supabase/schema.sql` | Com'è fatto il database online (tabella, regole di protezione, permessi). Già eseguito: è documentazione |
| `app.js` | Logica: calcolo date e totali, filtro, lista divisa in gruppi, spesa per categoria, grafico mese per mese, promemoria nel calendario, modulo, backup |
| `sw.js` | Service worker: mette da parte i file dell'app perché si apra anche senza internet |
| `manifest.json` | Informazioni per installare l'app |
| `icon.svg`, `icon-180.png`, `icon-512.png` | Icone |

## Modello dei dati
```js
{ id: "…", nome: "Spotify", costo: 16.99,
  frequenza: "settimanale" | "mensile" | "trimestrale" | "semestrale" | "annuale",   // frequenze.js
  giorno: 1-31 (settimanale: 1-7 = lunedì…domenica),
  mese: 1-12 (trimestrale, semestrale, annuale: UN mese in cui si paga; altrimenti null),
  categoria: "streaming" | "musica" | … (id di categorie.js),
  stato: "attivo" | "pausa" | "disdetto",
  fineProva: "2026-11-25" | null,    // online: colonna fine_prova (date)
  link: "https://…" | "", pagamento: "Visa •••• 1234" | "", note: "…" | "" }  // online: null se vuoti
```
Chiave nel localStorage: `abbonamenti:v1` (invariata: i dati della versione 1 restano compatibili).
Backup: file JSON `{ app, versione: 5, esportatoIl, abbonamenti: [...] }`.
I backup delle versioni precedenti si importano ancora (stato mancante → `attivo`, categoria mancante → `altro`).

## Più frequenze (versione 4.6)
- Tutto quello che dipende dalla frequenza sta in **`frequenze.js`** (caricato subito dopo `categorie.js`):
  `FREQUENZE` (id, nome "Ogni 3 mesi", aggettivo "trimestrale", periodo "ogni 3 mesi", `mesi`), `GIORNI_SETTIMANA`,
  `trovaFrequenza`, `usaMese`, `volteAllAnno` (52, 12, 4, 2, 1), `pagaNelMese(abb, mese)`, `mesiDiPagamento`,
  `giornoJS` / `giornoSettimanaDi` (il nostro 1 = lunedì … 7 = domenica ↔ `getDay()` di JavaScript).
- Trimestrale e semestrale: `mese` è UNO dei mesi in cui si paga; si paga quando la distanza da quel mese è
  multipla di 3 (o 6). Nel modulo la riga si chiama "A partire da" e sotto c'è la nota "Si rinnova a gennaio, aprile…".
- Settimanale: `giorno` = giorno della settimana; nel modulo un menu "Giorno" al posto di "Giorno del rinnovo".
  Nel grafico ogni settimana è un pagamento (4 o 5 al mese); nel calendario un evento per settimana.
- Costo al mese = costo × `volteAllAnno` / 12 (settimanale: × 52 / 12). La somma dei 12 mesi del grafico è uguale
  al totale all'anno, salvo gli anni con 53 volte lo stesso giorno della settimana (differenza di una settimana).
- Nel modulo la frequenza è un menu "Si rinnova" (`#campo-frequenza`, voci da `FREQUENZE`): il controllo
  segmentato con 5 voci non ci stava sull'iPhone. Il segmentato resta per "Accedi / Crea account".
- Online: la colonna `frequenza` accetta le 5 frequenze (comando in fondo a `supabase/schema.sql`, versione 4.6).

## Funziona senza internet: service worker (versione 4.10)
- **`sw.js`** (nella cartella principale, così vale per tutto il sito), registrato in fondo ad `app.js` solo su
  `http(s)` (non con `file://`). Magazzino (Cache) unico: `abbonamenti`.
- Regole: pagina (`mode: navigate`) → prima internet, se non risponde entro `ATTESA_RETE` (3 s) la copia;
  file con `?v=` (anche i loghi) → prima il magazzino; altri file del sito → copia subito e intanto si aggiorna;
  tutto ciò che non è del nostro sito (Supabase, link) NON viene toccato.
- All'installazione legge `index.html` e mette da parte tutti i file che nomina (`src`/`href`); a ogni pagina nuova
  toglie i file con un `?v=` vecchio (non i loghi). `sw.js` NON ha numero di versione: va cambiato solo se cambiano
  le regole (il browser se ne accorge da solo e lo sostituisce, `skipWaiting` + `clients.claim`).
- Prove automatiche: con Playwright `context.setOffline(true)` dopo una prima visita (aspettare
  `navigator.serviceWorker.ready` e ricaricare una volta).

## "Ancora da pagare" questo mese (versione 4.10)
- Nella card dei totali, riga `#da-pagare` larga quanto la card: "Ancora da pagare a novembre · 2 rinnovi entro il
  30 novembre · 31,99 €" (numero che conta). Sono i pagamenti VERI da oggi (compreso) a fine mese, gli stessi del
  grafico (`pagamentiDelMese`): niente medie, niente prove gratuite in corso. Se non ne restano: "Per novembre hai
  già pagato tutto ✓". Nascosta senza abbonamenti attivi. `disegnaDaPagare()` la chiama `disegnaTotali()`.
- Un tocco (`apriMeseInCorso`) apre Statistiche con il mese in corso scelto nel grafico.

## Nascondere gli importi: l'occhio (versione 4.14)
- Pulsante `#btn-occhio` nell'angolo in alto a destra della card dei totali (come nelle app delle banche).
  Nasconde gli importi "in alto": al mese, all'anno, "Ancora da pagare" e il totale nell'orbita dell'apertura.
  I prezzi dei singoli abbonamenti (lista, Statistiche) restano visibili (scelta da confermare col proprietario).
- Ogni importo nascondibile è `<span class="nascondibile">` con dentro il numero e `<span class="trattini">`
  (4 linette `<i style="--i:…">` create da `preparaTrattini()`). Stato = classe `importi-nascosti` sull'`<html>`
  (`applicaImportiNascosti(nascosti, animato)`), salvato con `Archivio.salvaImpostazione('nascondiImporti', …)` e
  applicato all'avvio SENZA animazione (classe temporanea `senza-transizioni`).
- Animazione (`vetro.css`, 10c): il numero si schiaccia (`scaleY`) e si sfoca mentre le linette crescono una dopo
  l'altra con la molla; al contrario le linette si ritirano dall'ultima e poi il numero si gonfia (i ritardi stanno
  nella regola dello stato di ARRIVO). L'occhio "sbatte la palpebra" (classe `.sbatte`) e la barra obliqua si
  disegna con `stroke-dashoffset`. Con Riduci movimento: cambio immediato.
- VoiceOver: numeri nascosti con `aria-hidden`, linette lette come "Importo nascosto".

## Blocco dell'app: codice PIN o Face ID (versioni 4.15 e 4.16)
- Impostazioni → **Privacy**: menu "Blocco dell'app" (`#campo-blocco`: Nessuno / Codice PIN / Face ID) e, col PIN,
  "Cambia il codice PIN" (`#btn-cambia-pin`). Per cambiare o togliere il blocco serve PRIMA il metodo attuale
  (`controllaMetodoAttuale()`); annullando, il menu torna al metodo attivo.
- **Codice PIN** (versione 4.16, scelta del proprietario: il Face ID delle app web passa dal foglio "passkey" di iOS,
  che da un'app web non si può togliere): 6 cifre, tastierina nostra in `#blocco` (classe `modo-pin`: pallini
  `#pin-pallini` che "scuotono la testa" se sbagli, tasti rotondi di vetro in `#tastierino` creati da blocco.js; anche
  i tasti del computer funzionano). Tasto toccato: piccolo zoom e lampo blu con numero bianco e alone (classe
  `premuto` messa da `illumina()` al `pointerdown`, perché su iPhone `:active` spesso non si vede; animazione
  `tasto-premuto` in `benvenuto.css`). Salvato SOLO come impronta: `bloccoPin = { sale, impronta }` con
  `impronta = SHA-256(sale + ":" + codice)` (`Blocco.creaImpronta`, `Blocco.pinGiusto`; `crypto.subtle`, quindi
  solo https/localhost). Dopo 5 codici sbagliati di fila la tastierina si ferma 30 s (classe `fermo`).
  `Blocco.chiediPin({ titolo, testo, controlla })` = tastierina dalle Impostazioni con "Annulla" (classe `configura`):
  nuovo codice scritto due volte uguale (`scegliNuovoPin()`).
- Al massimo un metodo attivo: `bloccoPin` oppure `bloccoFaceId` (`salvaBlocco(pin, faceId)`, `metodoBlocco()`).
  Mentre si sceglie il codice (`inConfigurazione`) il passaggio in background non copre/blocca.
- Con la password dell'account ("Non riesci a sbloccare?") si spegne qualsiasi blocco.

### Il Face ID (versione 4.15)
- **`blocco.js`** (oggetto `Blocco`): WebAuthn, lo standard delle passkey. `registra(nome)` crea una chiave della
  piattaforma (`authenticatorAttachment: 'platform'`, `userVerification: 'required'`) → id in base64url;
  `verifica(id)` chiede il Face ID (`navigator.credentials.get`) e controlla il bit "UV" (user verified, byte 32
  di `authenticatorData`). Nessun server: è un controllo locale, protegge la SCHERMATA, i dati non sono cifrati.
- iOS mostra il Face ID delle app web come **passkey** ("Salvare/Usare la passkey per tommisermi06.github.io?"):
  non si può togliere da un'app web; solo un'app vera dell'App Store avrebbe il Face ID "pulito".
- **Il Face ID parte da solo** (scelta del proprietario): appena si apre la schermata di blocco, `chiudi()` chiama
  `verifica()` senza aspettare un tocco; intanto classe `.in-attesa` (pulsanti nascosti con `visibility`, testo
  "Sblocco con Face ID…", pianeta che respira). Se fallisce (annullato, non riconosciuto, o Safari che vuole un
  tocco) ricompaiono pulsante "Sblocca con Face ID" e aiuto, senza errore rosso. Poi parte l'orbita come sempre.
- L'id della chiave sta nell'impostazione `bloccoFaceId` (solo sul dispositivo; `null` = spento). Non disponibile
  (`Blocco.faceIdDisponibile()` falso, o `file://`) → la voce "Face ID" del menu è disattivata.
- Schermata `#blocco` (stile in `benvenuto.css`, sezione 8): sfondo PIENO, z-index 50, sopra a benvenuto e saluto.
  Stati (`Blocco.stato()`): `aperto`, `coperto` (coperta senza bisogno di Face ID), `bloccato` (serve il Face ID).
  - Apertura "da chiusa": in `avvia()` `sbloccaApp()` PRIMA dell'orbita (non dal link dell'email di recupero).
  - In background: `Blocco.copri()` subito (l'anteprima delle app non mostra niente). Al ritorno: dopo almeno
    `PAUSA_BENTORNATO` (30 s) serve il Face ID (al posto del "Bentornato"), se prima si scopre e basta.
    Se la schermata è già `bloccato` (aspetta il Face ID) un ritorno breve NON la scopre (niente scorciatoie).
- "Non riesci a sbloccare?": con un account → password dell'account (`Archivio.verificaPassword`, controlla senza
  aprire una sessione nuova), poi il blocco si spegne; senza account → "Cancella i dati e ricomincia"
  (`Archivio.cancellaTutto()`, con conferma). Se il Face ID non riconosce il viso, iOS propone da solo il codice.
- Prove automatiche: autenticatore virtuale di Chromium via CDP (`WebAuthn.enable`, `WebAuthn.addVirtualAuthenticator`
  con `transport: 'internal'`, `hasUserVerification: true`; `WebAuthn.setUserVerified` per simulare il Face ID fallito).
  Sul vero iPhone (app sulla schermata Home) va provato a mano.

## Categorie (versione 2)
- Elenco **fisso** in `categorie.js` (scelta del proprietario): non c'è una schermata per crearle.
  Gli `id` non vanno mai cambiati (sono salvati nei dati); `nome` ed `emoji` sì.
- Categoria mancante o sconosciuta (dati della versione 1) → `altro`, gestito in `normalizza()` di `storage.js`.
- Lista divisa in gruppi nell'ordine di `CATEGORIE`; dentro ogni gruppo, ordine per prossimo rinnovo.
- Filtro a pillole ("Tutte" + categorie usate). Se la categoria filtrata resta vuota, o salvi
  un abbonamento di un'altra categoria, il filtro torna a "Tutte".
- "Spesa per categoria": importo al mese (annuali / 12), percentuale e barra, dalla più costosa.
- **"Spesa per metodo di pagamento"** (versione 4.13, in Statistiche sotto le categorie, `disegnaPerPagamento()`):
  stessi abbonamenti (`paganti()`) raggruppati per il campo `pagamento` (uniti con `semplifica()`: "Visa •••• 1234"
  = "visa •••• 1234"), dal più costoso, con "Non indicato" (pianetino "?") sempre in fondo e una nota per compilarli.
  Pianetino con il logo del circuito tramite `Loghi.riempi` sul testo del pagamento ("Visa •••• 1234" → Visa).
  Un tocco su un metodo (`mostraAbbonamentiDi`) torna alla lista con quel metodo nella ricerca (compresi i non attivi).

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

## Notifiche dei rinnovi (versione 4.18)
- Web Push: funzionano solo con l'app **aggiunta alla schermata Home** (iOS 16.4+) e con un **account** (il server legge
  gli abbonamenti online). Impostazioni → **Notifiche**: "Avvisi dei rinnovi" (`#campo-notifiche`), "Avvisami"
  (`#campo-preavviso`: 1, 2, 3, 7 giorni prima o solo il giorno stesso), "All'ora" (`#campo-ora-avviso`), "Manda una
  notifica di prova". Sempre anche l'avviso del giorno stesso. Impostazione locale `notifiche` = `{ attive, giorni, ora,
  endpoint }`. Uscendo dall'account le notifiche si spengono.
- Accendere (`attivaNotifiche()`): `Notification.requestPermission()` SUBITO nel tocco → `pushManager.subscribe` con la
  chiave pubblica VAPID (`Archivio.chiavePubblicaNotifiche()`, tabella `configurazione_push`) →
  `Archivio.salvaIscrizioneNotifiche()` (upsert `iscrizioni_push?on_conflict=endpoint`, con giorni, ora e fuso).
- **Server**: `supabase/functions/invia-avvisi/index.ts` (Edge Function, Deno, unica libreria `npm:web-push`), chiamata
  OGNI ORA da pg_cron (`supabase/notifiche.sql`). Tiene i telefoni per cui nel loro fuso è l'ora scelta, calcola per i
  loro abbonamenti attivi il prossimo evento (fine prova o rinnovo) e manda l'avviso se mancano 0 giorni o i giorni
  scelti; `avvisi_inviati` evita i doppioni; 404/410 → iscrizione tolta. Con `{ "prova": endpoint }` manda subito una
  notifica di prova. **Deve essere pubblicata con "Verify JWT" SPENTO** (la chiamano l'orologio e l'app senza chiavi).
- Le chiavi VAPID le crea la funzione la prima volta e le salva in `configurazione_push`: la segreta la legge solo il
  server (nessuna regola RLS per gli utenti), la pubblica tutti. Nessuna chiave segreta nel codice o in chat.
  `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` le dà Supabase alla funzione.
- **I calcoli delle date sono copiati** nella funzione (blocco "INIZIO/FINE CALCOLI", in UTC): se cambiano le regole di
  `frequenze.js` / `prossimaData` in `app.js`, aggiornare anche lì (prova: confronto su migliaia di date, tutte uguali).
- `sw.js`: `push` → `showNotification(titolo, { body, icon, data.url })`; `notificationclick` → porta davanti l'app o la apre.
- Il promemoria con il file .ics del Calendario resta, per chi non usa le notifiche.

## Password dimenticata (versione 4.11)
- Nel foglio dell'accesso, solo in "Accedi": "Password dimenticata?" → `Archivio.recuperaPassword(email)` →
  `POST /auth/v1/recover?redirect_to=<indirizzo dell'app>`. Messaggio uguale che l'account esista o no.
- Il link dell'email apre **Safari** (non l'app sulla Home) con `#access_token=…&type=recovery`: in `avvia()`
  `Archivio.leggiRitornoDaEmail(location.hash)` lo riconosce, toglie il "#…" dall'indirizzo, salta il benvenuto e
  apre il foglio `#foglio-password` ("Nuova password" + "Ripetila"). `PUT /auth/v1/user { password }` con quel
  biglietto; la sessione NON viene salvata (si entra poi dall'app). Dopo il salvataggio il foglio diventa la
  conferma con le istruzioni. Link scaduto (`#error_code=otp_expired`) → si riapre l'accesso con la spiegazione.
- Su Supabase: Authentication → URL Configuration, l'indirizzo dell'app deve essere il Site URL o tra i
  Redirect URLs. Il servizio email di base di Supabase manda poche email all'ora e solo agli indirizzi dei membri
  del progetto: per altri utenti serve un SMTP proprio (Authentication → Emails → SMTP Settings).
- Prove automatiche: intercettare `https://rjsdckmaadbevnadgrkb.supabase.co/**` con `context.route` (niente email vere).

## Prova gratuita (versione 3.1)
- Nel modulo: interruttore "Prova gratuita" + data "Finisce il" (`fineProva`). Accendendolo propone oggi + 7 giorni;
  il "giorno del rinnovo" segue quella data finché l'utente non lo scrive a mano.
- `inProva(abb, oggi)` = la fine è DOPO oggi. Il giorno in cui finisce si paga già.
- Durante la prova l'abbonamento **non conta** in totali, spesa per categoria e grafico (funzione `paganti()` =
  attivi e non in prova); nel grafico i pagamenti iniziano dal giorno di fine prova.
  Sotto i totali la nota "🎁 In prova gratuita: …, +X € al mese quando finisce".
- `infoRinnovo` restituisce `prova: true` finché la fine non è passata: l'evento è la fine della prova
  (etichetta "Prova: tra X giorni", con gli stessi colori dei giorni mancanti; riga "Gratis fino al …, poi …").
- Calendario: evento "🎁 Fine prova: Nome · poi costo" con gli stessi avvisi dei rinnovi.

## Gestione: link per disdire, pagamento e note (versione 3.2)
- Nel modulo, riquadro "Gestione": `link` (controllato da `Archivio.controllaLink`: aggiunge `https://`,
  accetta solo http/https, max 300 caratteri), `pagamento` (max 40, con suggerimenti dei metodi già usati
  tramite `<datalist>`), `note` (max 500, campo su più righe).
- **Sicurezza**: il campo Pagamento rifiuta 12 o più cifre (numero intero della carta): solo circuito + ultime 4.
- Il link si apre con `target="_blank"` e `rel="noopener noreferrer"`: nel modulo ("Apri la pagina per disdire ↗"),
  nel prossimo rinnovo ("Gestisci l'abbonamento ↗") e nel calendario (`URL:` e nella descrizione).
- La ricerca cerca anche in pagamento e note (es. "1234" = tutti gli abbonamenti su quella carta).

## Guida per disdire (versione 3.3)
- `servizi.js` contiene i servizi conosciuti con il **link alla pagina ufficiale di aiuto** sulla disdetta
  (verificati sui siti ufficiali il 19/11/2026: aggiungere solo link ufficiali), i passi in breve e una nota.
  Il nome si riconosce con `chiaveNome()` (minuscole, senza accenti/spazi, "+" → "plus") e alias iniziali:
  evitare alias troppo corti o generici (es. "ps", "amazon").
- **Chi incassa decide dove si disdice** (`chiIncassa(pagamento)`): "App Store/iTunes/Apple" → impostazioni Apple,
  "Google Play" → Play Store, "PayPal" → nota aggiuntiva. "Apple Pay" NON è l'App Store (è solo la carta).
- Nel modulo: pulsante "Come disdire … ›" che apre la guida (passi, nota, "Apri la guida ufficiale ↗").
  Il campo Link si riempie da solo con il link della guida finché è vuoto o l'aveva riempito l'app
  (`dataset.automatico`); se l'utente lo scrive, non si tocca più. Servizio sconosciuto → guida generale, nessun link.
- `linkPer(abb)`: link salvato oppure quello della guida; usato in "Gestisci l'abbonamento ↗" e nel calendario.
- Nessuna colonna nuova nel database: le guide stanno nel codice.

## Aggiunta rapida (versione 4.12)
- In cima al modulo "Nuovo abbonamento" (mai in modifica) la fila `#aggiunta-rapida`: pianetini con il logo dei
  servizi di `SERVIZI_POPOLARI` (in fondo a `servizi.js`: `nome`, `categoria`, `breve` facoltativo per l'etichetta,
  `frequenza` solo dove di solito si paga all'anno). Non mostra quelli già nella lista (stesso `chiaveNome` iniziale).
- Tocco (`scegliServizioRapido`): nome, categoria, frequenza (quella del servizio o "Ogni mese"), link per disdire
  (`suggerisciLink`) e guida; le righe cambiate si illuminano (`.appena-riempito`); il cursore va sul Costo.
  **Il prezzo NON si riempie** (cambia spesso). Pianetino scelto = `aria-pressed="true"` con anello blu.
- Il nome di un servizio deve somigliare agli alias di `SERVIZI` (link) e di `loghi.js` (logo).

## Ricerca e ordinamento
- Barra di ricerca sopra la lista: filtra per nome, metodo di pagamento e note, senza badare a maiuscole e accenti (`semplifica()`),
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
- Totale al mese = somma di costo × volte all'anno / 12 (mensili interi, annuali / 12, trimestrali / 3,
  semestrali / 6, settimanali × 52 / 12). Totale all'anno = totale al mese × 12.
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
