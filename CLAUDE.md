# Abbonamenti — note per Claude

App web per tenere sotto controllo gli abbonamenti (costi e prossimi rinnovi),
pensata per l'iPhone e installabile nella schermata Home.

## Idee da fare più avanti (scelte dal proprietario, da proporre quando chiede cosa fare)
- **Storico dei prezzi**: quando cambia il costo, ricordare il prezzo vecchio e la data ("+2,00 € da marzo").
- **Nuova icona**: la disegna la sua ragazza (PNG 1024×1024, angoli dritti, sfondo pieno); poi rigenerare
  `icon-180.png`, `icon-512.png` e `icon.svg`.
- **"Lo uso davvero?"**: segnare quanto si usa ogni abbonamento e suggerire dove risparmiare.
- Altre idee già proposte: più frequenze (settimanale, trimestrale, semestrale), abbonamenti condivisi (quota),
  notifiche vere sul telefono (serve una parte su Supabase), budget mensile, valute diverse, riepilogo annuale.

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
- Versione attuale: **4.5**. In `index.html` i file hanno il numero di versione (`style.css?v=4.5`, `app.js?v=4.5`…)
  e c'è la scritta "Abbonamenti · versione 4.5" in fondo alla pagina.
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
- Liste raggruppate: card di vetro con angoli 20px (`--raggio-card`), margini laterali 16px, righe alte almeno 44px.
- Animazioni morbide 0.25–0.35s; rispettare sempre `prefers-reduced-motion`.
- Aree sicure dell'iPhone con `env(safe-area-inset-*)`.
- Moduli: foglio che sale dal basso con "Annulla" a sinistra e "Salva" a destra.
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
  sale, titolo grande che sbiadisce; niente cambio netto né riga di separazione),
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
- **Ogni apertura dopo**: saluto lampo con la goccia e "Buongiorno/Buon pomeriggio/Buonasera, Nome"
  (`Benvenuto.salutoLampo`, < 1 s, un tocco lo salta). Nella Home il saluto sta sopra il titolo (`#saluto`).
- Il nome (impostazione `nome`) si cambia dalla sezione "Profilo"; resta SOLO sul dispositivo (non va online).
- L'entrata a cascata della Home parte quando `app.js` aggiunge la classe `entra` a `.app` (`entraNellApp()`).
- Il **pianeta** (`pianeta.webp`, 520×520 con trasparenza, ~59 KB) è un'immagine generata con Higgsfield
  (modello Z Image) e scontornata tenendo l'alone dell'atmosfera; sta al centro dell'orbita (le iniziali
  girano intorno come lune) e nel saluto lampo. Il totale è nella capsula di vetro sotto l'orbita.
- Iniziale e colore di un abbonamento: `Benvenuto.iniziale(nome)` e `Benvenuto.tinta(nome)` (`mono-1…5`,
  sempre nella tinta blu/azzurrino; riutilizzabili per le icone della lista).
- **Prove automatiche**: per saltare benvenuto e saluto impostare `abbonamenti:impostazioni` =
  `{"benvenutoVisto": true}` prima di aprire la pagina (il saluto lampo dura comunque < 1 s).

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
| `categorie.js` | Elenco fisso delle categorie (`CATEGORIE`), unico punto dove modificarle |
| `calendario.js` | Crea il file .ics dei promemoria (`creaFileCalendario`); impostazioni `GIORNI_PREAVVISO` e `ORA_AVVISO` |
| `vetro.css` | Stile "Liquid Glass": vetro, sfondo vivo, molle e animazioni CSS (riveste `style.css`) |
| `animazioni.js` | `Animazioni`: numeri che contano, goccia dei filtri, barra compatta, foglio da trascinare, capsula di avviso |
| `benvenuto.js`, `benvenuto.css` | Benvenuto "Orbita" al primo avvio, saluto lampo a ogni apertura, iniziali e colori dei "pianeti" |
| `loghi.js` | I loghi dei servizi (da Simple Icons) per i pianetini: `LOGHI`, `logoPer(nome)`, `creaSvgLogo(logo)`, `Loghi.riempi` (catalogo) |
| `loghi/` | Catalogo completo dei loghi: `elenco.js`, `s/<file>.js` (uno per logo), `CREDITI.md` |
| `strumenti/aggiorna-loghi.py` | Rigenera `loghi/` da una nuova versione di Simple Icons (solo manutenzione) |
| `servizi.js` | Come disdire i servizi più diffusi (`SERVIZI`: alias, link ufficiale, passi, nota) e `guidaDisdetta(nome, pagamento)` |
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
  stato: "attivo" | "pausa" | "disdetto",
  fineProva: "2026-11-25" | null,    // online: colonna fine_prova (date)
  link: "https://…" | "", pagamento: "Visa •••• 1234" | "", note: "…" | "" }  // online: null se vuoti
```
Chiave nel localStorage: `abbonamenti:v1` (invariata: i dati della versione 1 restano compatibili).
Backup: file JSON `{ app, versione: 5, esportatoIl, abbonamenti: [...] }`.
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
