/* =====================================================================
   app.js — La logica dell'app.

   Cosa fa:
   - chiede i dati ad Archivio (storage.js) e li mostra sullo schermo
   - calcola i totali e i giorni mancanti al rinnovo
   - apre e chiude il modulo che sale dal basso
   - esporta e importa il backup

   Nota: questo file NON tocca mai il localStorage direttamente.
   Passa sempre da Archivio, così in futuro potremo cambiare dove
   stanno i dati senza riscrivere questo file.
   ===================================================================== */

'use strict'; // modalità "rigorosa": segnala più errori, utile mentre si impara


/* ---------- Strumenti per scrivere numeri e date in italiano ---------- */
const formatoEuro = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });
const formatoData = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
const formatoMeseBreve = new Intl.DateTimeFormat('it-IT', { month: 'short' });                 // "dic"
const formatoMeseLungo = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }); // "dicembre 2026"
const formatoGiornoMese = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }); // "4 dic"
const formatoEuroTondo = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }); // "50 €"
const NOMI_MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const MS_AL_GIORNO = 24 * 60 * 60 * 1000; // millisecondi in un giorno


/* ---------- Stato: le informazioni che l'app tiene "in mente" ---------- */
let abbonamenti = [];     // la lista caricata da Archivio
let idInModifica = null;  // id dell'abbonamento aperto nel modulo (null = nuovo)
let idDaAnimare = null;   // la riga appena aggiunta, che compare con dissolvenza
let primoDisegno = true;  // al primo avvio facciamo comparire tutte le righe
let filtro = 'tutte';     // categoria mostrata nella lista: 'tutte' oppure l'id di una categoria
let ordine = 'rinnovo';   // ordine della lista: 'rinnovo', 'prezzo' oppure 'nome'
let meseScelto = 0;       // colonna scelta nel grafico: 0 = questo mese, 11 = tra 11 mesi
let mesiCalcolati = [];   // i 12 mesi del grafico, con i loro pagamenti
let elementoPrimaDelFoglio = null; // dove tornare con il focus dopo aver chiuso


/* ---------- Riferimenti agli elementi della pagina ---------- */
const $ = (id) => document.getElementById(id);
const el = {
  totaleMese: $('totale-mese'),
  totaleAnno: $('totale-anno'),
  prossimo: $('prossimo'),
  bloccoOrdina: $('blocco-ordina'),
  campoOrdine: $('campo-ordine'),
  bloccoRicerca: $('blocco-ricerca'),
  campoRicerca: $('campo-ricerca'),
  btnCancellaRicerca: $('btn-cancella-ricerca'),
  nessunRisultato: $('nessun-risultato'),
  filtri: $('filtri'),
  gruppi: $('gruppi'),
  listaVuota: $('lista-vuota'),
  sezioneCategorie: $('sezione-categorie'),
  perCategoria: $('per-categoria'),
  campoCategoria: $('campo-categoria'),
  campoStato: $('campo-stato'),
  sezioneMesi: $('sezione-mesi'),
  graficoGriglia: $('grafico-griglia'),
  graficoColonne: $('grafico-colonne'),
  dettaglioMese: $('dettaglio-mese'),
  notaMesi: $('nota-mesi'),
  btnCalendario: $('btn-calendario'),
  cardAccount: $('card-account'),
  notaAccount: $('nota-account'),
  foglioAccount: $('foglio-account'),
  btnAnnullaAccount: $('btn-annulla-account'),
  moduloAccount: $('modulo-account'),
  campoEmail: $('campo-email'),
  campoPassword: $('campo-password'),
  erroreAccount: $('errore-account'),
  btnInviaAccount: $('btn-invia-account'),
  notaCalendario: $('nota-calendario'),
  btnAggiungi: $('btn-aggiungi'),
  btnEsporta: $('btn-esporta'),
  btnImporta: $('btn-importa'),
  fileImporta: $('file-importa'),
  velo: $('velo'),
  foglio: $('foglio'),
  foglioTitolo: $('foglio-titolo'),
  btnAnnulla: $('btn-annulla'),
  modulo: $('modulo'),
  campoNome: $('campo-nome'),
  campoCosto: $('campo-costo'),
  campoGiorno: $('campo-giorno'),
  campoMese: $('campo-mese'),
  rigaMese: $('riga-mese'),
  errore: $('errore'),
  bloccoElimina: $('blocco-elimina'),
  btnElimina: $('btn-elimina'),
  tplFreccia: $('tpl-freccia'),
};


/* =====================================================================
   CALCOLI CON LE DATE
   ===================================================================== */

// Oggi alle 00:00, così contiamo i giorni "interi" senza badare all'ora
function oggiAMezzanotte() {
  const adesso = new Date();
  return new Date(adesso.getFullYear(), adesso.getMonth(), adesso.getDate());
}

// Quanti giorni ha un mese (mese da 0 = gennaio a 11 = dicembre).
// Trucco: il "giorno 0" del mese dopo è l'ultimo giorno di questo mese.
function giorniNelMese(anno, mese) {
  return new Date(anno, mese + 1, 0).getDate();
}

// Crea una data, ma se il giorno non esiste in quel mese
// (es. 31 febbraio) usa l'ultimo giorno del mese (28 o 29).
function dataSicura(anno, mese, giorno) {
  const primo = new Date(anno, mese, 1); // sistema anche mese = 12 → gennaio dell'anno dopo
  const ultimo = giorniNelMese(primo.getFullYear(), primo.getMonth());
  return new Date(primo.getFullYear(), primo.getMonth(), Math.min(giorno, ultimo));
}

// La prossima data di rinnovo (oggi compreso)
function prossimaData(abb, oggi) {
  const anno = oggi.getFullYear();
  if (abb.frequenza === 'mensile') {
    // Proviamo questo mese; se il giorno è già passato, il mese dopo
    let data = dataSicura(anno, oggi.getMonth(), abb.giorno);
    if (data < oggi) data = dataSicura(anno, oggi.getMonth() + 1, abb.giorno);
    return data;
  }
  // Annuale: proviamo quest'anno; se è già passato, l'anno prossimo
  let data = dataSicura(anno, abb.mese - 1, abb.giorno);
  if (data < oggi) data = dataSicura(anno + 1, abb.mese - 1, abb.giorno);
  return data;
}

// Quanti giorni mancano. Math.round evita errori dovuti all'ora legale.
function giorniTra(da, a) {
  return Math.round((a - da) / MS_AL_GIORNO);
}

// Il "livello di urgenza", che decide il colore dell'etichetta
function statoDaGiorni(giorni) {
  if (giorni === 0) return 'oggi';
  if (giorni <= 3) return 'urgente';  // rosso che pulsa
  if (giorni <= 7) return 'vicino';   // arancione
  return 'lontano';                   // grigio
}

// Il testo dell'etichetta: "Oggi!", "tra 1 giorno", "tra 5 giorni"...
function testoGiorni(giorni, conPrefisso) {
  if (giorni === 0) return 'Oggi!';
  const frase = `tra ${giorni} ${giorni === 1 ? 'giorno' : 'giorni'}`;
  return conPrefisso ? `Si rinnova ${frase}` : frase;
}

// Tutte le informazioni sul rinnovo di un abbonamento, in un colpo solo
function infoRinnovo(abb, oggi) {
  const data = prossimaData(abb, oggi);
  const giorni = giorniTra(oggi, data);
  return { data, giorni, stato: statoDaGiorni(giorni) };
}

// Quanto pesa ogni mese: gli annuali contano costo / 12
function costoMensile(abb) {
  return abb.frequenza === 'annuale' ? abb.costo / 12 : abb.costo;
}


/* =====================================================================
   DISEGNARE LA PAGINA
   ===================================================================== */

// Piccolo aiuto per creare un elemento HTML.
// Usiamo textContent (e non innerHTML) così un nome strano
// non può mai "rompere" la pagina.
function crea(tag, classe, testo) {
  const elemento = document.createElement(tag);
  if (classe) elemento.className = classe;
  if (testo !== undefined) elemento.textContent = testo;
  return elemento;
}

function creaBadge(giorni, stato, conPrefisso) {
  return crea('span', `badge stato-${stato}`, testoGiorni(giorni, conPrefisso));
}

// Ridisegna tutto: si chiama ogni volta che i dati cambiano
function disegna() {
  const oggi = oggiAMezzanotte();

  // Aggiungiamo a ogni abbonamento le info sul rinnovo,
  // poi ordiniamo: prima quelli che si rinnovano prima
  const conInfo = abbonamenti
    .map((abb) => ({ abb, info: infoRinnovo(abb, oggi) }))
    .sort((a, b) => a.info.giorni - b.info.giorni || a.abb.nome.localeCompare(b.abb.nome, 'it'));

  disegnaTotali();
  // Il prossimo rinnovo è il primo tra quelli ATTIVI
  disegnaProssimo(conInfo.find(({ abb }) => abb.stato === 'attivo'));
  disegnaFiltri();
  disegnaLista();
  disegnaPerCategoria();
  disegnaGraficoMesi();
  primoDisegno = false;
}


/* ---------- Ricerca e ordinamento della lista ---------- */

// Toglie accenti e maiuscole, così "disney" trova "Disney+" e "e" trova "è"
function semplifica(testo) {
  return testo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

// I modi di ordinare: ognuno è una funzione che confronta due righe (a e b).
// Se il primo criterio è pari, si usa il nome per decidere.
const perNome = (a, b) => a.abb.nome.localeCompare(b.abb.nome, 'it');
const ORDINAMENTI = {
  rinnovo: (a, b) => a.info.giorni - b.info.giorni || perNome(a, b),
  prezzo: (a, b) => costoMensile(b.abb) - costoMensile(a.abb) || perNome(a, b), // dal più caro al mese
  nome: perNome,
};

// Disegna solo la lista (ricerca + ordine + gruppi), senza toccare totali e grafico
function disegnaLista() {
  const oggi = oggiAMezzanotte();
  const cercato = semplifica(el.campoRicerca.value);

  // Nascondiamo ricerca e ordine finché non c'è nessun abbonamento
  el.bloccoRicerca.hidden = abbonamenti.length === 0;
  el.bloccoOrdina.hidden = abbonamenti.length === 0;
  el.btnCancellaRicerca.hidden = el.campoRicerca.value === '';

  const conInfo = abbonamenti
    .filter((abb) => semplifica(abb.nome).includes(cercato)) // "" è contenuto in ogni nome
    .map((abb) => ({ abb, info: infoRinnovo(abb, oggi) }))
    .sort(ORDINAMENTI[ordine]);

  disegnaGruppi(conInfo);

  // Nessun risultato: lo diciamo, invece di mostrare una lista vuota senza spiegazioni
  const quantiVisibili = el.gruppi.querySelectorAll('.riga').length;
  const nessunRisultato = abbonamenti.length > 0 && quantiVisibili === 0;
  el.nessunRisultato.hidden = !nessunRisultato;
  if (nessunRisultato) {
    el.nessunRisultato.textContent = cercato
      ? `Nessun abbonamento trovato per "${el.campoRicerca.value.trim()}".`
      : 'Nessun abbonamento in questa categoria.';
  }
}

// Solo gli abbonamenti attivi: sono gli unici che contano in totali, grafico e calendario
function attivi() {
  return abbonamenti.filter((abb) => abb.stato === 'attivo');
}

// Le categorie che hanno almeno un abbonamento della lista, nell'ordine di categorie.js
function categorieUsate(lista = abbonamenti) {
  return CATEGORIE.filter((cat) => lista.some((abb) => abb.categoria === cat.id));
}

// Come scrivere lo stato di un abbonamento non attivo
const NOMI_STATI = { pausa: 'In pausa', disdetto: 'Disdetto' };

// Quanto si spende al mese per un gruppo di abbonamenti
function totaleAlMese(lista) {
  return lista.reduce((somma, abb) => somma + costoMensile(abb), 0);
}

function disegnaTotali() {
  const alMese = totaleAlMese(attivi());
  el.totaleMese.textContent = formatoEuro.format(alMese);
  el.totaleAnno.textContent = formatoEuro.format(alMese * 12);
}

function disegnaProssimo(primo) {
  el.prossimo.replaceChildren(); // svuota la card

  if (!primo) {
    el.prossimo.append(crea('span', 'prossimo-vuoto', 'Nessun rinnovo in arrivo'));
    return;
  }

  const { abb, info } = primo;
  const data = formatoData.format(info.data); // es. "venerdì 20 novembre"
  el.prossimo.append(
    crea('span', 'prossimo-nome', abb.nome),
    crea('span', 'prossimo-data', `${data} · ${formatoEuro.format(abb.costo)}`),
    creaBadge(info.giorni, info.stato, true),
  );
}

// --- Pillole del filtro: "Tutte" + una per ogni categoria usata ---
function disegnaFiltri() {
  const usate = categorieUsate();

  // Se la categoria filtrata non ha più abbonamenti (es. li hai eliminati), torniamo a "Tutte"
  if (filtro !== 'tutte' && !usate.some((cat) => cat.id === filtro)) filtro = 'tutte';

  el.filtri.replaceChildren();
  el.filtri.hidden = abbonamenti.length === 0;

  const voci = [{ id: 'tutte', nome: 'Tutte', emoji: '' }, ...usate];
  for (const voce of voci) {
    const pulsante = crea('button', 'filtro');
    pulsante.type = 'button';
    pulsante.dataset.filtro = voce.id;
    // aria-pressed dice a VoiceOver quale pillola è scelta
    pulsante.setAttribute('aria-pressed', String(voce.id === filtro));
    const testo = voce.emoji ? `${voce.emoji} ${voce.nome}` : voce.nome;
    pulsante.append(crea('span', 'pillola', testo));
    el.filtri.append(pulsante);
  }
}

// --- Lista divisa in gruppi: un titoletto e una card per ogni categoria ---
// (conInfo arriva già filtrato dalla ricerca e ordinato come ha scelto l'utente)
function disegnaGruppi(conInfo) {
  el.gruppi.replaceChildren();
  el.listaVuota.hidden = abbonamenti.length > 0;

  // Con un filtro attivo teniamo solo gli abbonamenti di quella categoria
  const visibili = filtro === 'tutte'
    ? conInfo
    : conInfo.filter(({ abb }) => abb.categoria === filtro);

  // Separiamo gli attivi dagli altri (in pausa o disdetti)
  const visibiliAttivi = visibili.filter(({ abb }) => abb.stato === 'attivo');
  const visibiliNonAttivi = visibili.filter(({ abb }) => abb.stato !== 'attivo');
  // Chi è fermo non ha un "prossimo rinnovo": in quel caso li mettiamo in ordine alfabetico
  if (ordine === 'rinnovo') visibiliNonAttivi.sort(perNome);

  let posizione = 0; // serve per far comparire le righe una dopo l'altra
  for (const cat of CATEGORIE) {
    // conInfo è già nell'ordine scelto, quindi anche ogni gruppo lo è
    const delGruppo = visibiliAttivi.filter(({ abb }) => abb.categoria === cat.id);
    if (delGruppo.length === 0) continue; // niente gruppi vuoti

    const titolo = crea('h3', 'titolo-gruppo', `${cat.emoji} ${cat.nome}`);
    const lista = crea('ul', 'lista card');
    for (const { abb, info } of delGruppo) {
      lista.append(creaRigaAbbonamento(abb, info, posizione));
      posizione += 1;
    }
    el.gruppi.append(titolo, lista);
  }

  // In fondo, un gruppo a parte per quelli in pausa o disdetti
  if (visibiliNonAttivi.length > 0) {
    const titolo = crea('h3', 'titolo-gruppo', '💤 Non attivi');
    const lista = crea('ul', 'lista card');
    for (const { abb, info } of visibiliNonAttivi) {
      lista.append(creaRigaAbbonamento(abb, info, posizione));
      posizione += 1;
    }
    // Quanto risparmi al mese grazie a questi abbonamenti
    const risparmio = totaleAlMese(visibiliNonAttivi.map(({ abb }) => abb));
    const nota = crea('p', 'nota', `Non contano nei totali: risparmi ${formatoEuro.format(risparmio)} al mese.`);
    el.gruppi.append(titolo, lista, nota);
  }

  idDaAnimare = null;
}

// Crea la riga di un abbonamento (un pulsante che apre il modulo di modifica)
function creaRigaAbbonamento(abb, info, posizione) {
  const riga = crea('li');

  // Animazione: tutte le righe al primo avvio, poi solo quella nuova
  if (primoDisegno || abb.id === idDaAnimare) {
    riga.classList.add('compari');
    riga.style.animationDelay = primoDisegno ? `${posizione * 40}ms` : '0ms';
  }

  const pulsante = crea('button', 'riga');
  pulsante.type = 'button';
  pulsante.dataset.id = abb.id;

  const dettaglio = abb.frequenza === 'mensile'
    ? `${formatoEuro.format(abb.costo)} al mese · il ${abb.giorno}`
    : `${formatoEuro.format(abb.costo)} all'anno · ${abb.giorno} ${NOMI_MESI[abb.mese - 1]}`;

  const testi = crea('span', 'abb-testi');
  testi.append(crea('span', 'abb-nome', abb.nome), crea('span', 'abb-dettaglio', dettaglio));

  // Copiamo la freccia ">" dal <template> dell'HTML
  const freccia = el.tplFreccia.content.cloneNode(true);

  // Attivo: etichetta dei giorni mancanti. In pausa o disdetto: etichetta con lo stato
  let etichetta;
  if (abb.stato === 'attivo') {
    etichetta = creaBadge(info.giorni, info.stato, false);
  } else {
    riga.classList.add('inattiva'); // la riga diventa più tenue
    etichetta = crea('span', 'badge stato-inattivo', NOMI_STATI[abb.stato]);
  }

  pulsante.append(testi, etichetta, freccia);
  riga.append(pulsante);
  return riga;
}

// --- Spesa al mese per ogni categoria, con una barra della proporzione ---
function disegnaPerCategoria() {
  const listaAttivi = attivi();
  const totale = totaleAlMese(listaAttivi);
  el.perCategoria.replaceChildren();
  el.sezioneCategorie.hidden = listaAttivi.length === 0;
  if (totale === 0) return;

  // Calcoliamo il totale di ogni categoria e mettiamo prima quelle che costano di più
  const righe = categorieUsate(listaAttivi)
    .map((cat) => ({ cat, alMese: totaleAlMese(listaAttivi.filter((abb) => abb.categoria === cat.id)) }))
    .sort((a, b) => b.alMese - a.alMese);

  for (const { cat, alMese } of righe) {
    const percentuale = Math.round((alMese / totale) * 100);

    const riga = crea('li', 'riga-categoria');
    const alto = crea('div', 'categoria-alto');
    const valore = crea('span', 'categoria-valore', formatoEuro.format(alMese));
    valore.append(crea('span', 'categoria-percentuale', ` · ${percentuale}%`));
    alto.append(crea('span', 'categoria-nome', `${cat.emoji} ${cat.nome}`), valore);

    // La barra: la parte blu è larga quanto la percentuale della categoria
    const barra = crea('div', 'categoria-barra');
    barra.setAttribute('aria-hidden', 'true'); // il numero è già scritto accanto
    const riempimento = crea('span');
    riempimento.style.width = `${(alMese / totale) * 100}%`;
    barra.append(riempimento);

    riga.append(alto, barra);
    el.perCategoria.append(riga);
  }
}


/* =====================================================================
   GRAFICO: SPESE MESE PER MESE
   Qui contiamo quanto si paga DAVVERO ogni mese: i mensili ogni mese,
   gli annuali per intero solo nel mese del rinnovo (non divisi per 12).
   ===================================================================== */

// I pagamenti di un mese (mese da 0 = gennaio a 11 = dicembre), in ordine di giorno
function pagamentiDelMese(anno, mese) {
  const pagamenti = [];
  for (const abb of attivi()) { // chi è in pausa o disdetto non paga
    const pagaQuestoMese = abb.frequenza === 'mensile' || abb.mese - 1 === mese;
    if (pagaQuestoMese) pagamenti.push({ abb, data: dataSicura(anno, mese, abb.giorno) });
  }
  return pagamenti.sort((a, b) => a.data - b.data || a.abb.nome.localeCompare(b.abb.nome, 'it'));
}

// I 12 mesi del grafico, a partire da questo mese
function calcolaProssimi12Mesi() {
  const oggi = oggiAMezzanotte();
  const mesi = [];
  for (let i = 0; i < 12; i++) {
    // new Date sistema da solo i mesi oltre dicembre (es. mese 13 → febbraio dell'anno dopo)
    const inizio = new Date(oggi.getFullYear(), oggi.getMonth() + i, 1);
    const pagamenti = pagamentiDelMese(inizio.getFullYear(), inizio.getMonth());
    const totale = pagamenti.reduce((somma, p) => somma + p.abb.costo, 0);
    mesi.push({ inizio, pagamenti, totale });
  }
  return mesi;
}

// Sceglie un passo "tondo" per le linee della griglia (1, 2, 2,5 o 5 × 10, 100…),
// così da avere circa 3 linee con numeri facili da leggere
function passoGriglia(massimo) {
  const grezzo = massimo / 3;
  const potenza = 10 ** Math.floor(Math.log10(grezzo));
  for (const moltiplicatore of [1, 2, 2.5, 5, 10]) {
    if (moltiplicatore * potenza >= grezzo) return moltiplicatore * potenza;
  }
  return 10 * potenza;
}

function disegnaGraficoMesi() {
  mesiCalcolati = calcolaProssimi12Mesi();
  const massimoMese = Math.max(...mesiCalcolati.map((m) => m.totale));

  el.sezioneMesi.hidden = attivi().length === 0;
  el.graficoGriglia.replaceChildren();
  el.graficoColonne.replaceChildren();
  if (massimoMese === 0) return;

  // L'altezza massima del grafico è un multiplo "tondo" del passo della griglia
  const passo = passoGriglia(massimoMese);
  const cima = Math.ceil(massimoMese / passo) * passo;

  // Linee della griglia: 0, passo, 2×passo... fino alla cima
  for (let valore = 0; valore <= cima + 0.001; valore += passo) {
    const linea = crea('div', 'griglia-linea');
    linea.style.bottom = `${(valore / cima) * 100}%`; // posizione in altezza
    linea.append(crea('span', 'griglia-valore', formatoEuroTondo.format(valore)));
    el.graficoGriglia.append(linea);
  }

  // Le colonne: una per mese
  mesiCalcolati.forEach((mese, indice) => {
    const nomeMese = formatoMeseLungo.format(mese.inizio);
    const colonna = crea('button', 'colonna');
    colonna.type = 'button';
    colonna.dataset.indice = String(indice);
    colonna.setAttribute('aria-label', `${nomeMese}: ${formatoEuro.format(mese.totale)}`);

    const area = crea('span', 'colonna-area');
    if (mese.totale > 0) {
      const barra = crea('span', 'colonna-barra');
      barra.style.height = `${(mese.totale / cima) * 100}%`;
      barra.style.animationDelay = `${indice * 25}ms`; // crescono una dopo l'altra
      area.append(barra);
    }
    // "dic." → "dic": togliamo il punto per avere etichette più pulite
    const etichetta = crea('span', 'colonna-etichetta', formatoMeseBreve.format(mese.inizio).replace('.', ''));

    colonna.append(area, etichetta);
    el.graficoColonne.append(colonna);
  });

  // Nota sotto il grafico: il mese più caro e il totale dei 12 mesi
  const piuCaro = mesiCalcolati.reduce((a, b) => (b.totale > a.totale ? b : a));
  const totale12 = mesiCalcolati.reduce((somma, m) => somma + m.totale, 0);
  el.notaMesi.textContent = `Mese più caro: ${formatoMeseLungo.format(piuCaro.inizio)} (${formatoEuro.format(piuCaro.totale)}). `
    + `Totale dei prossimi 12 mesi: ${formatoEuro.format(totale12)}.`;

  selezionaMese(meseScelto);
}

// Evidenzia una colonna e mostra sotto il dettaglio di quel mese
function selezionaMese(indice) {
  meseScelto = indice;
  for (const colonna of el.graficoColonne.children) {
    colonna.setAttribute('aria-pressed', String(Number(colonna.dataset.indice) === indice));
  }

  const mese = mesiCalcolati[indice];
  const oggi = oggiAMezzanotte();
  el.dettaglioMese.replaceChildren();

  // Intestazione: "Dicembre 2026" ...... "64,97 €"
  const testata = crea('div', 'dettaglio-testata');
  const nomeMese = formatoMeseLungo.format(mese.inizio);
  testata.append(
    crea('span', 'dettaglio-mese-nome', nomeMese.charAt(0).toUpperCase() + nomeMese.slice(1)),
    crea('span', 'dettaglio-totale', formatoEuro.format(mese.totale)),
  );
  el.dettaglioMese.append(testata);

  if (mese.pagamenti.length === 0) {
    el.dettaglioMese.append(crea('p', 'dettaglio-vuoto', 'Nessun pagamento in questo mese.'));
    return;
  }

  // Una riga per pagamento: "4 dic   🎬 Disney+   15,99 €"
  const elenco = crea('ul', 'dettaglio-elenco');
  for (const { abb, data } of mese.pagamenti) {
    const riga = crea('li', 'dettaglio-riga');
    if (data < oggi) riga.classList.add('passato'); // già addebitato questo mese

    const nome = crea('span', 'dettaglio-nome', `${trovaCategoria(abb.categoria).emoji} ${abb.nome}`);
    if (abb.frequenza === 'annuale') nome.append(crea('span', 'dettaglio-nota', ' · annuale'));
    if (data < oggi) nome.append(crea('span', 'dettaglio-nota', ' · già pagato'));

    riga.append(
      crea('span', 'dettaglio-data', formatoGiornoMese.format(data).replace('.', '')),
      nome,
      crea('span', 'dettaglio-importo', formatoEuro.format(abb.costo)),
    );
    elenco.append(riga);
  }
  el.dettaglioMese.append(elenco);
}


/* =====================================================================
   IL FOGLIO CON IL MODULO
   ===================================================================== */

function frequenzaScelta() {
  return el.modulo.querySelector('input[name="frequenza"]:checked').value;
}

function impostaFrequenza(valore) {
  el.modulo.querySelector(`input[name="frequenza"][value="${valore}"]`).checked = true;
  aggiornaRigaMese();
}

// Il campo "mese" si vede solo per gli abbonamenti annuali
function aggiornaRigaMese() {
  el.rigaMese.hidden = frequenzaScelta() !== 'annuale';
}

// --- Aprire e chiudere un foglio (vale per tutti i fogli dell'app) ---
let foglioAperto = null; // il foglio aperto in questo momento, oppure null

function mostraFoglio(foglio) {
  elementoPrimaDelFoglio = document.activeElement;
  foglioAperto = foglio;
  el.velo.classList.add('aperto');
  foglio.classList.add('aperto');
  foglio.scrollTop = 0;
  document.body.classList.add('bloccato');
  foglio.focus({ preventScroll: true });
}

function nascondiFoglio() {
  if (!foglioAperto) return;
  el.velo.classList.remove('aperto');
  foglioAperto.classList.remove('aperto');
  foglioAperto = null;
  document.body.classList.remove('bloccato');
  // Riportiamo il focus dov'era (utile per chi usa la tastiera)
  if (elementoPrimaDelFoglio && document.body.contains(elementoPrimaDelFoglio)) {
    elementoPrimaDelFoglio.focus({ preventScroll: true });
  }
}

// Apre il foglio del modulo. Senza argomento = nuovo abbonamento; con un abbonamento = modifica.
function apriFoglio(abb) {
  idInModifica = abb ? abb.id : null;

  el.foglioTitolo.textContent = abb ? 'Modifica' : 'Nuovo abbonamento';
  el.campoNome.value = abb ? abb.nome : '';
  // Mostriamo la virgola italiana: 15.99 → "15,99"
  el.campoCosto.value = abb ? abb.costo.toFixed(2).replace('.', ',') : '';
  el.campoGiorno.value = abb ? String(abb.giorno) : '';
  el.campoMese.value = String(abb && abb.mese ? abb.mese : new Date().getMonth() + 1);
  // Nuovo abbonamento: se stai guardando una categoria, la proponiamo già scelta
  el.campoCategoria.value = abb ? abb.categoria
    : filtro !== 'tutte' ? filtro
    : CATEGORIA_PREDEFINITA;
  el.campoStato.value = abb ? abb.stato : 'attivo'; // un nuovo abbonamento è attivo
  impostaFrequenza(abb ? abb.frequenza : 'mensile');
  el.bloccoElimina.hidden = !abb;
  el.errore.textContent = '';
  mostraFoglio(el.foglio);
}

function chiudiFoglio() {
  nascondiFoglio();
}

// Legge e controlla i campi del modulo.
// Restituisce { dati } se va tutto bene, oppure { errore, campo }.
function leggiModulo() {
  const nome = el.campoNome.value.trim();
  // Accettiamo sia "15,99" sia "15.99", ed eventuali spazi o "€"
  const costo = Number(el.campoCosto.value.replace(/[€\s]/g, '').replace(',', '.'));
  const giorno = Number(el.campoGiorno.value.trim());
  const frequenza = frequenzaScelta();
  const mese = Number(el.campoMese.value);
  const categoria = el.campoCategoria.value;
  const stato = el.campoStato.value;

  if (!nome) return { errore: 'Scrivi il nome dell\'abbonamento.', campo: el.campoNome };
  if (!Number.isFinite(costo) || costo <= 0) {
    return { errore: 'Scrivi un costo valido, per esempio 9,99.', campo: el.campoCosto };
  }
  if (!Number.isInteger(giorno) || giorno < 1 || giorno > 31) {
    return { errore: 'Il giorno del rinnovo va da 1 a 31.', campo: el.campoGiorno };
  }

  return { dati: { nome, costo, frequenza, giorno, mese: frequenza === 'annuale' ? mese : null, categoria, stato } };
}

async function salva(evento) {
  evento.preventDefault(); // non ricaricare la pagina (comportamento normale dei moduli)

  const { dati, errore, campo } = leggiModulo();
  if (errore) {
    el.errore.textContent = errore;
    campo.focus();
    return;
  }

  try {
    if (idInModifica) {
      await Archivio.aggiorna(idInModifica, dati);
    } else {
      const nuovo = await Archivio.aggiungi(dati);
      idDaAnimare = nuovo.id;
    }
    // Se l'abbonamento salvato non è nella categoria filtrata, sparirebbe dalla vista:
    // meglio tornare a "Tutte" così lo vedi subito
    if (filtro !== 'tutte' && dati.categoria !== filtro) filtro = 'tutte';
    abbonamenti = await Archivio.tutti();
    chiudiFoglio();
    disegna();
  } catch (e) {
    el.errore.textContent = `Non sono riuscito a salvare: ${e.message}`;
  }
}

async function eliminaAbbonamento() {
  const abb = abbonamenti.find((a) => a.id === idInModifica);
  if (!abb) return;
  if (!confirm(`Vuoi eliminare "${abb.nome}"?`)) return;

  try {
    await Archivio.elimina(abb.id);
    abbonamenti = await Archivio.tutti();
    chiudiFoglio();
    disegna();
  } catch (e) {
    el.errore.textContent = `Non sono riuscito a eliminare: ${e.message}`;
  }
}


/* =====================================================================
   BACKUP
   ===================================================================== */

async function esportaBackup() {
  try {
    const testo = await Archivio.esportaBackup();
    // Creiamo un file "al volo" e simuliamo il clic su un link di download
    const file = new Blob([testo], { type: 'application/json' });
    const indirizzo = URL.createObjectURL(file);
    const oggi = new Date();
    const dataFile = `${oggi.getFullYear()}-${String(oggi.getMonth() + 1).padStart(2, '0')}-${String(oggi.getDate()).padStart(2, '0')}`;

    const link = crea('a');
    link.href = indirizzo;
    link.download = `abbonamenti-backup-${dataFile}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    // Liberiamo la memoria un attimo dopo
    setTimeout(() => URL.revokeObjectURL(indirizzo), 1000);
  } catch (e) {
    alert(`Esportazione non riuscita: ${e.message}`);
  }
}

async function importaBackup() {
  const file = el.fileImporta.files[0];
  el.fileImporta.value = ''; // così si può scegliere di nuovo lo stesso file
  if (!file) return;

  try {
    const testo = await file.text();
    const lista = Archivio.leggiBackup(testo);
    const quanti = lista.length === 1 ? '1 abbonamento' : `${lista.length} abbonamenti`;
    if (!confirm(`Il backup contiene ${quanti}. Vuoi sostituire i dati attuali?`)) return;

    await Archivio.sostituisciTutti(lista);
    abbonamenti = await Archivio.tutti();
    primoDisegno = true; // facciamo ricomparire tutte le righe
    disegna();
  } catch (e) {
    alert(`Importazione non riuscita: ${e.message}`);
  }
}


/* =====================================================================
   PROMEMORIA NEL CALENDARIO
   ===================================================================== */

// iPhone o iPad? (gli iPad recenti si presentano come "Mac" con lo schermo touch)
function suDispositivoApple() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function aggiungiAlCalendario() {
  // Gli stessi pagamenti del grafico, tenendo solo quelli da oggi in poi
  const oggi = oggiAMezzanotte();
  const pagamenti = calcolaProssimi12Mesi()
    .flatMap((mese) => mese.pagamenti)
    .filter(({ data }) => data >= oggi);

  if (pagamenti.length === 0) {
    alert('Non ci sono rinnovi da aggiungere al calendario.');
    return;
  }

  const testo = creaFileCalendario(pagamenti);
  const file = new Blob([testo], { type: 'text/calendar;charset=utf-8' });
  const indirizzo = URL.createObjectURL(file);

  if (suDispositivoApple()) {
    // Sull'iPhone apriamo il file: Safari riconosce il calendario
    // e propone di aggiungere gli eventi all'app Calendario
    window.location.href = indirizzo;
  } else {
    // Sul computer lo scarichiamo, come il backup
    const link = crea('a');
    link.href = indirizzo;
    link.download = 'rinnovi-abbonamenti.ics';
    document.body.append(link);
    link.click();
    link.remove();
  }
  // Liberiamo la memoria dopo un po' (lasciamo il tempo all'iPhone di leggerlo)
  setTimeout(() => URL.revokeObjectURL(indirizzo), 60000);
}

// Il testo sotto il pulsante usa le impostazioni di calendario.js
function scriviNotaCalendario() {
  const prima = GIORNI_PREAVVISO === 1 ? '1 giorno prima' : `${GIORNI_PREAVVISO} giorni prima`;
  el.notaCalendario.textContent = 'Crea un evento per ogni rinnovo dei prossimi 12 mesi, '
    + `con un avviso ${prima} e uno il giorno stesso alle ${ORA_AVVISO}:00. `
    + 'Se aggiungi o modifichi abbonamenti, ripeti l\'operazione.';
}


/* =====================================================================
   SINCRONIZZAZIONE ONLINE: la sezione e il foglio dell'account
   ===================================================================== */

const formatoOra = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' });
const formatoGiornoOra = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// "alle 12:49" se è oggi, altrimenti "il 18 nov, 12:49"
function quando(iso) {
  const data = new Date(iso);
  const oggi = new Date();
  return data.toDateString() === oggi.toDateString()
    ? `alle ${formatoOra.format(data)}`
    : `il ${formatoGiornoOra.format(data)}`;
}

// Una riga con un'etichetta a sinistra e un valore grigio a destra (non si tocca)
function rigaInformazione(etichetta, valore) {
  const riga = crea('div', 'riga riga-info');
  riga.append(crea('span', '', etichetta), crea('span', 'valore-info', valore));
  return riga;
}

// Disegna la card "Sincronizzazione" in base a chi è entrato e allo stato
function disegnaAccount() {
  const utente = Archivio.account();
  const { stato, messaggio, ultimaRiuscita, inAttesa } = Archivio.statoSincronizzazione();
  el.cardAccount.replaceChildren();

  // Nessuno è entrato: un solo pulsante
  if (!utente) {
    const accedi = crea('button', 'riga riga-azione', 'Accedi o crea un account');
    accedi.type = 'button';
    accedi.addEventListener('click', apriFoglioAccount);
    el.cardAccount.append(accedi);
    el.notaAccount.textContent = messaggio
      || 'Entra con un account per avere gli stessi abbonamenti su telefono, iPad e computer. '
      + 'Senza account i dati restano solo su questo dispositivo.';
    return;
  }

  // Che cosa scrivere accanto a "Stato"
  const attesa = inAttesa === 1 ? '1 modifica da inviare' : `${inAttesa} modifiche da inviare`;
  const testi = {
    'in-corso': 'Sincronizzazione…',
    sincronizzato: ultimaRiuscita ? `Sincronizzato ${quando(ultimaRiuscita)}` : 'Sincronizzato',
    offline: inAttesa > 0 ? `Offline · ${attesa}` : 'Offline',
    errore: 'Non riuscita',
    disconnesso: ultimaRiuscita ? `Ultima volta ${quando(ultimaRiuscita)}` : 'In attesa…',
  };
  const note = {
    offline: 'Senza internet l\'app funziona lo stesso: le modifiche partono appena torni online.',
    errore: messaggio ? `${messaggio} Riproverò in automatico.` : 'Riproverò in automatico.',
  };

  const sincronizzaOra = crea('button', 'riga riga-azione', 'Sincronizza ora');
  sincronizzaOra.type = 'button';
  sincronizzaOra.disabled = stato === 'in-corso';
  sincronizzaOra.addEventListener('click', () => Archivio.sincronizza());

  const esci = crea('button', 'riga riga-azione rosso', 'Esci');
  esci.type = 'button';
  esci.addEventListener('click', async () => {
    if (!confirm('Vuoi uscire dall\'account? I dati restano su questo dispositivo, ma non verranno più sincronizzati.')) return;
    await Archivio.esci();
    disegnaAccount();
  });

  el.cardAccount.append(
    rigaInformazione('Account', utente.email),
    rigaInformazione('Stato', testi[stato] || ''),
    sincronizzaOra,
    esci,
  );
  el.notaAccount.textContent = note[stato] || 'Le modifiche si sincronizzano da sole. Sull\'altro dispositivo compaiono quando apri l\'app.';
}

// --- Il foglio dell'account ---

function modoAccount() {
  return el.moduloAccount.querySelector('input[name="modo-account"]:checked').value;
}

// "Accedi" o "Crea account": cambiano il pulsante e il tipo di password
// (così il Portachiavi dell'iPhone propone la password salvata o ne suggerisce una nuova)
function aggiornaModoAccount() {
  const nuovo = modoAccount() === 'crea';
  el.btnInviaAccount.textContent = nuovo ? 'Crea account' : 'Accedi';
  el.campoPassword.autocomplete = nuovo ? 'new-password' : 'current-password';
  el.erroreAccount.textContent = '';
}

function apriFoglioAccount() {
  el.campoPassword.value = '';
  aggiornaModoAccount();
  mostraFoglio(el.foglioAccount);
}

async function inviaAccount(evento) {
  evento.preventDefault();
  const email = el.campoEmail.value.trim();
  const password = el.campoPassword.value;

  if (!email.includes('@')) {
    el.erroreAccount.textContent = 'Scrivi il tuo indirizzo email.';
    el.campoEmail.focus();
    return;
  }
  if (password.length < 6) {
    el.erroreAccount.textContent = 'La password deve avere almeno 6 caratteri.';
    el.campoPassword.focus();
    return;
  }

  // Mentre aspettiamo la risposta, il pulsante non si può premere due volte
  const nuovo = modoAccount() === 'crea';
  el.btnInviaAccount.disabled = true;
  el.btnInviaAccount.textContent = 'Attendere…';
  try {
    if (nuovo) await Archivio.creaAccount(email, password);
    else await Archivio.accedi(email, password);
    el.campoPassword.value = '';
    nascondiFoglio();
    disegnaAccount();
    await Archivio.sincronizza(); // la prima sincronizzazione unisce i dati
  } catch (e) {
    el.erroreAccount.textContent = e.message;
  } finally {
    el.btnInviaAccount.disabled = false;
    el.btnInviaAccount.textContent = nuovo ? 'Crea account' : 'Accedi';
  }
}


/* =====================================================================
   COLLEGARE I PULSANTI ALLE FUNZIONI
   ===================================================================== */

el.btnAggiungi.addEventListener('click', () => apriFoglio());
el.btnAnnulla.addEventListener('click', chiudiFoglio);
el.velo.addEventListener('click', nascondiFoglio); // toccare fuori dal foglio lo chiude
el.modulo.addEventListener('submit', salva);
el.btnElimina.addEventListener('click', eliminaAbbonamento);
el.modulo.addEventListener('change', (e) => {
  if (e.target.name === 'frequenza') aggiornaRigaMese();
});
// Appena l'utente ricomincia a scrivere, togliamo il messaggio di errore
el.modulo.addEventListener('input', () => {
  el.errore.textContent = '';
});

// Un solo "ascoltatore" per tutti i gruppi: capiamo quale riga è stata toccata
el.gruppi.addEventListener('click', (e) => {
  const pulsante = e.target.closest('button[data-id]');
  if (!pulsante) return;
  const abb = abbonamenti.find((a) => a.id === pulsante.dataset.id);
  if (abb) apriFoglio(abb);
});

// Tocco su una pillola del filtro: cambiamo categoria e ridisegniamo
el.filtri.addEventListener('click', (e) => {
  const pulsante = e.target.closest('button[data-filtro]');
  if (!pulsante || pulsante.dataset.filtro === filtro) return;
  filtro = pulsante.dataset.filtro;
  primoDisegno = true; // le righe ricompaiono con la dissolvenza
  disegna();
});

// Ricerca: a ogni lettera ridisegniamo solo la lista (niente animazioni)
el.campoRicerca.addEventListener('input', () => disegnaLista());

// Tasto "Cerca" della tastiera: chiudiamo la tastiera per vedere i risultati
el.campoRicerca.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') el.campoRicerca.blur();
  if (e.key === 'Escape') { el.campoRicerca.value = ''; disegnaLista(); }
});

// Pulsante × : svuota la ricerca e rimette il cursore nel campo
el.btnCancellaRicerca.addEventListener('click', () => {
  el.campoRicerca.value = '';
  disegnaLista();
  el.campoRicerca.focus();
});

// Nuovo ordine scelto: lo applichiamo e lo ricordiamo per la prossima volta
el.campoOrdine.addEventListener('change', () => {
  ordine = el.campoOrdine.value;
  Archivio.salvaImpostazione('ordine', ordine);
  primoDisegno = true; // le righe ricompaiono con la dissolvenza
  disegnaLista();
  primoDisegno = false;
});

// Tocco su una colonna del grafico: mostriamo il dettaglio di quel mese
el.graficoColonne.addEventListener('click', (e) => {
  const colonna = e.target.closest('button[data-indice]');
  if (colonna) selezionaMese(Number(colonna.dataset.indice));
});

el.btnCalendario.addEventListener('click', aggiungiAlCalendario);
el.btnEsporta.addEventListener('click', esportaBackup);
el.btnImporta.addEventListener('click', () => el.fileImporta.click());
el.fileImporta.addEventListener('change', importaBackup);

// Tasto Esc (sul computer) per chiudere il foglio aperto
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && foglioAperto) nascondiFoglio();
});

// Quando torni sull'app (magari il giorno dopo) ricalcoliamo i giorni mancanti
// e chiediamo a internet se sull'altro dispositivo è cambiato qualcosa
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    disegna();
    Archivio.sincronizza();
  }
});

// --- Sincronizzazione: collegamenti ---
el.btnAnnullaAccount.addEventListener('click', nascondiFoglio);
el.moduloAccount.addEventListener('submit', inviaAccount);
el.moduloAccount.addEventListener('change', (e) => {
  if (e.target.name === 'modo-account') aggiornaModoAccount();
});
el.moduloAccount.addEventListener('input', () => { el.erroreAccount.textContent = ''; });

// storage.js ci avvisa quando cambia lo stato e quando arrivano dati nuovi
window.addEventListener('archivio-stato', disegnaAccount);
window.addEventListener('archivio-aggiornato', async () => {
  abbonamenti = await Archivio.tutti();
  disegna();
});
// Torna internet: inviamo subito le modifiche rimaste in attesa
window.addEventListener('online', () => Archivio.sincronizza());


/* =====================================================================
   AVVIO
   ===================================================================== */
// Riempie il menu "Categoria" del modulo con l'elenco di categorie.js
function preparaMenuCategorie() {
  for (const cat of CATEGORIE) {
    const opzione = crea('option', '', `${cat.emoji} ${cat.nome}`);
    opzione.value = cat.id;
    el.campoCategoria.append(opzione);
  }
}

async function avvia() {
  preparaMenuCategorie();
  scriviNotaCalendario();

  // Recuperiamo l'ordine scelto l'ultima volta (se è uno di quelli validi)
  const ordineSalvato = await Archivio.leggiImpostazione('ordine', 'rinnovo');
  ordine = Object.keys(ORDINAMENTI).includes(ordineSalvato) ? ordineSalvato : 'rinnovo';
  el.campoOrdine.value = ordine;

  try {
    abbonamenti = await Archivio.tutti();
  } catch (e) {
    // Succede se il browser blocca il salvataggio dei dati (es. navigazione privata)
    alert('Non riesco a leggere i dati salvati. Controlla che il browser permetta di salvare i dati dei siti.');
    abbonamenti = [];
  }
  disegna();         // prima mostriamo subito i dati del dispositivo...
  disegnaAccount();
  Archivio.sincronizza(); // ...poi, se sei entrato, controlliamo le novità online
}

avvia();
