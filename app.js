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
let nomeUtente = '';      // il nome con cui l'app ti saluta (resta sul dispositivo)
let guidaAperta = false; // la guida "Come disdire" nel modulo è aperta?
let meseScelto = 0;       // colonna scelta nel grafico: 0 = questo mese, 11 = tra 11 mesi
let mesiCalcolati = [];   // i 12 mesi del grafico, con i loro pagamenti
let elementoPrimaDelFoglio = null; // dove tornare con il focus dopo aver chiuso
let schedaAttiva = 'abbonamenti';  // la scheda mostrata: 'abbonamenti', 'statistiche' o 'impostazioni'
const scorrimentoSchede = {};      // per ogni scheda, fin dove l'avevi fatta scorrere


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
  campoLink: $('campo-link'),
  campoPagamento: $('campo-pagamento'),
  campoNote: $('campo-note'),
  linkDisdici: $('link-disdici'),
  btnGuida: $('btn-guida'),
  saluto: $('saluto'),
  campoNomeUtente: $('campo-nome-utente'),
  guidaDisdetta: $('guida-disdetta'),
  notaLink: $('nota-link'),
  metodiPagamento: $('metodi-pagamento'),
  campoProva: $('campo-prova'),
  rigaFineProva: $('riga-fine-prova'),
  campoFineProva: $('campo-fine-prova'),
  notaProva: $('nota-prova'),
  notaProve: $('nota-prove'),
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
  titoloGrande: $('titolo-grande'),
  titoloCompatto: document.querySelector('.titolo-compatto'),
  barraSchede: $('barra-schede'),
  statisticheVuote: $('statistiche-vuote'),
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

// --- Prova gratuita ---
// "2026-11-25" → la data a mezzanotte (o null se non c'è)
function dataDaTesto(testo) {
  if (!testo) return null;
  const [anno, mese, giorno] = testo.split('-').map(Number);
  return new Date(anno, mese - 1, giorno);
}

// Al contrario: una data → "2026-11-25" (il formato dei campi data)
function testoDaData(data) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

function fineProvaDi(abb) {
  return dataDaTesto(abb.fineProva);
}

// È ancora in prova gratuita? (il giorno in cui finisce, invece, si paga già)
function inProva(abb, oggi) {
  const fine = fineProvaDi(abb);
  return Boolean(fine) && fine > oggi;
}

function stessoGiorno(a, b) {
  return Boolean(a && b) && a.getTime() === b.getTime();
}

// Tutte le informazioni sul prossimo evento di un abbonamento, in un colpo solo.
// Se la prova gratuita non è ancora finita, l'evento è la FINE DELLA PROVA.
function infoRinnovo(abb, oggi) {
  const fine = fineProvaDi(abb);
  if (fine && fine >= oggi) {
    const giorni = giorniTra(oggi, fine);
    return { data: fine, giorni, stato: statoDaGiorni(giorni), prova: true };
  }
  const data = prossimaData(abb, oggi);
  const giorni = giorniTra(oggi, data);
  return { data, giorni, stato: statoDaGiorni(giorni), prova: false };
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

// L'etichetta con i giorni mancanti. Per una prova gratuita il testo cambia:
// "Prova: tra 5 giorni" nella lista, "La prova gratuita finisce tra 5 giorni" in evidenza
function creaBadge(info, conPrefisso) {
  let testo = testoGiorni(info.giorni, conPrefisso);
  if (info.prova) {
    const frase = `tra ${info.giorni} ${info.giorni === 1 ? 'giorno' : 'giorni'}`;
    if (info.giorni === 0) testo = conPrefisso ? 'La prova gratuita finisce oggi!' : 'Fine prova oggi!';
    else testo = conPrefisso ? `La prova gratuita finisce ${frase}` : `Prova: ${frase}`;
  }
  return crea('span', `badge stato-${info.stato}`, testo);
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
  // Scheda Statistiche vuota? Mostriamo un messaggio al posto delle due sezioni
  el.statisticheVuote.hidden = !(el.sezioneCategorie.hidden && el.sezioneMesi.hidden);
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
    // Cerchiamo nel nome, nel metodo di pagamento e nelle note ("" è contenuto in tutto)
    .filter((abb) => semplifica(`${abb.nome} ${abb.pagamento} ${abb.note}`).includes(cercato))
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

// Quelli che paghi ADESSO: attivi e non più in prova gratuita (contano nei totali)
function paganti() {
  const oggi = oggiAMezzanotte();
  return attivi().filter((abb) => !inProva(abb, oggi));
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

// Se un testo non ci sta nel suo spazio, rimpicciolisce il carattere quanto basta
function adattaLarghezza(elemento, testoFinale) {
  const testoPrima = elemento.textContent;
  elemento.style.fontSize = ''; // si riparte dalla grandezza normale
  elemento.textContent = testoFinale;
  if (elemento.scrollWidth > elemento.clientWidth) {
    const grandezza = parseFloat(getComputedStyle(elemento).fontSize);
    elemento.style.fontSize = `${Math.floor(grandezza * (elemento.clientWidth / elemento.scrollWidth) * 0.98)}px`;
  }
  elemento.textContent = testoPrima; // il testo vero lo scrive poi l'animazione
}

function disegnaTotali() {
  const alMese = totaleAlMese(paganti());
  // Prima adattiamo la grandezza al numero finale (es. "1161,84 €" deve starci tutto)...
  adattaLarghezza(el.totaleMese, formatoEuro.format(alMese));
  adattaLarghezza(el.totaleAnno, formatoEuro.format(alMese * 12));
  // ...poi i numeri "contano" fino al valore nuovo (vedi animazioni.js)
  Animazioni.conta(el.totaleMese, alMese, (v) => formatoEuro.format(v));
  Animazioni.conta(el.totaleAnno, alMese * 12, (v) => formatoEuro.format(v));

  // Nota sotto i totali: quanto si aggiungerà quando finiscono le prove gratuite
  const oggi = oggiAMezzanotte();
  const inProvaOra = attivi().filter((abb) => inProva(abb, oggi));
  el.notaProve.hidden = inProvaOra.length === 0;
  if (inProvaOra.length > 0) {
    const quanti = inProvaOra.length === 1 ? '1 abbonamento' : `${inProvaOra.length} abbonamenti`;
    const finisce = inProvaOra.length === 1 ? 'quando finisce' : 'quando finiscono';
    el.notaProve.textContent = `🎁 In prova gratuita: ${quanti}, +${formatoEuro.format(totaleAlMese(inProvaOra))} al mese ${finisce}.`;
  }
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
    // In prova: "poi 13,99 €", perché fino a quel giorno è gratis
    crea('span', 'prossimo-data', `${data} · ${info.prova ? 'poi ' : ''}${formatoEuro.format(abb.costo)}`),
    creaBadge(info, true),
  );
  // Se c'è il link per disdire, lo mettiamo a portata di tocco
  const link = linkPer(abb);
  if (link) {
    const gestisci = crea('a', 'prossimo-link', 'Gestisci l\'abbonamento ↗');
    gestisci.href = link;
    gestisci.target = '_blank';
    gestisci.rel = 'noopener noreferrer'; // la pagina aperta non può "controllare" la nostra
    el.prossimo.append(gestisci);
  }
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
  // La goccia di vetro scivola sotto la pillola scelta
  Animazioni.posizionaIndicatore(el.filtri, el.filtri.querySelector('[aria-pressed="true"] .pillola'));
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

// Le icone delle azioni che compaiono facendo scorrere una riga (disegnate con SVG)
const ICONE_AZIONI = {
  pausa: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
  riattiva: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  elimina: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5M10.2 10.5v6M13.8 10.5v6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

// Un pulsante d'azione dietro la riga: "Pausa", "Riattiva" o "Elimina"
function creaAzioneRiga(azione, testo, id) {
  const pulsante = crea('button', `azione-riga azione-${azione}`);
  pulsante.type = 'button';
  pulsante.dataset.azione = azione;
  pulsante.dataset.per = id;     // l'id dell'abbonamento su cui agire
  pulsante.tabIndex = -1;        // nascosto finché la riga non è aperta
  pulsante.innerHTML = ICONE_AZIONI[azione];
  pulsante.append(crea('span', '', testo));
  return pulsante;
}

// Il pianetino a sinistra della riga: il logo del servizio (loghi.js) se lo conosciamo,
// altrimenti l'iniziale del nome. Il colore lo sceglie Benvenuto.tinta, sempre uguale per lo stesso nome.
function creaPianetino(nome) {
  const pianetino = crea('span', `pianetino ${Benvenuto.tinta(nome)}`);
  pianetino.setAttribute('aria-hidden', 'true'); // è solo decorazione: il nome c'è già accanto
  Loghi.riempi(pianetino, nome, Benvenuto.iniziale(nome)); // logo (anche dal catalogo) o iniziale
  return pianetino;
}

// Crea la riga di un abbonamento (un pulsante che apre il modulo di modifica).
// Dietro la riga ci sono le azioni che compaiono facendola scorrere a sinistra.
function creaRigaAbbonamento(abb, info, posizione) {
  const riga = crea('li', 'riga-scorrevole');

  // Animazione: tutte le righe al primo avvio, poi solo quella nuova
  if (primoDisegno || abb.id === idDaAnimare) {
    riga.classList.add('compari');
    riga.style.animationDelay = primoDisegno ? `${posizione * 40}ms` : '0ms';
  }

  const pulsante = crea('button', 'riga');
  pulsante.type = 'button';
  pulsante.dataset.id = abb.id;

  // "\u00a0" è uno spazio che non va a capo: se la riga è stretta, "il 20" scende intero
  let dettaglio = abb.frequenza === 'mensile'
    ? `${formatoEuro.format(abb.costo)} al\u00a0mese · il\u00a0${abb.giorno}`
    : `${formatoEuro.format(abb.costo)} all'anno · ${abb.giorno}\u00a0${NOMI_MESI[abb.mese - 1]}`;
  // Ancora in prova: "Gratis fino al 25 nov, poi 13,99 € al mese"
  if (info.prova) {
    const periodo = abb.frequenza === 'mensile' ? 'al mese' : 'all\'anno';
    const fino = formatoGiornoMese.format(info.data).replace('.', '');
    dettaglio = `Gratis fino al ${fino}, poi ${formatoEuro.format(abb.costo)} ${periodo}`;
  }

  const testi = crea('span', 'abb-testi');
  testi.append(crea('span', 'abb-nome', abb.nome), crea('span', 'abb-dettaglio', dettaglio));

  // Copiamo la freccia ">" dal <template> dell'HTML
  const freccia = el.tplFreccia.content.cloneNode(true);

  // Attivo: etichetta dei giorni mancanti. In pausa o disdetto: etichetta con lo stato
  let etichetta;
  if (abb.stato === 'attivo') {
    etichetta = creaBadge(info, false);
  } else {
    riga.classList.add('inattiva'); // la riga diventa più tenue
    etichetta = crea('span', 'badge stato-inattivo', NOMI_STATI[abb.stato]);
  }

  pulsante.append(creaPianetino(abb.nome), testi, etichetta, freccia);

  // Le azioni dietro la riga: chi è attivo si mette in pausa, gli altri si riattivano
  const azioni = crea('div', 'azioni-riga');
  azioni.setAttribute('aria-hidden', 'true'); // con VoiceOver si usa il modulo
  azioni.append(
    abb.stato === 'attivo' ? creaAzioneRiga('pausa', 'Pausa', abb.id) : creaAzioneRiga('riattiva', 'Riattiva', abb.id),
    creaAzioneRiga('elimina', 'Elimina', abb.id),
  );

  riga.append(azioni, pulsante);
  return riga;
}

// Fa l'azione scelta facendo scorrere la riga, poi mostra la capsula con "Annulla".
// Pausa/Riattiva cambia solo lo stato; Elimina toglie l'abbonamento (senza chiedere conferma:
// se hai sbagliato, "Annulla" lo rimette com'era).
async function azioneRiga(azione, id) {
  const abb = abbonamenti.find((a) => a.id === id);
  if (!abb) return;
  const prima = { ...abb }; // la copia per poter annullare

  // La riga si richiude in altezza (gli altri scivolano su), poi ridisegniamo
  const riga = el.gruppi.querySelector(`button.riga[data-id="${CSS.escape(id)}"]`)?.closest('li');
  if (riga) {
    riga.style.height = `${riga.offsetHeight}px`;
    riga.getBoundingClientRect(); // "fotografa" l'altezza di partenza
    riga.classList.add('via');
    riga.style.height = '0px';
    const movimentoRidotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    await new Promise((fatto) => setTimeout(fatto, movimentoRidotto ? 0 : 300));
  }

  let testo;
  let annulla;
  try {
    if (azione === 'elimina') {
      await Archivio.elimina(id);
      testo = `${abb.nome} eliminato`;
      annulla = () => Archivio.ripristina(prima);
    } else {
      const stato = azione === 'pausa' ? 'pausa' : 'attivo';
      await Archivio.aggiorna(id, { ...abb, stato });
      testo = stato === 'pausa' ? `${abb.nome} in pausa` : `${abb.nome} riattivato`;
      annulla = () => Archivio.aggiorna(id, prima);
    }
  } catch (e) {
    alert(`Non sono riuscito a farlo: ${e.message}`);
  }
  abbonamenti = await Archivio.tutti();
  disegna();
  if (!annulla) return;

  Animazioni.avviso(testo, {
    azione: 'Annulla',
    suAzione: async () => {
      await annulla();
      idDaAnimare = id; // la riga ricompare con la sua dissolvenza
      abbonamenti = await Archivio.tutti();
      disegna();
      Animazioni.avviso('Annullato');
    },
  });
}

// --- Spesa al mese per ogni categoria, con una barra della proporzione ---
function disegnaPerCategoria() {
  const listaAttivi = paganti(); // attivi e non in prova gratuita
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
    if (!pagaQuestoMese) continue;
    const data = dataSicura(anno, mese, abb.giorno);
    const fine = fineProvaDi(abb);
    if (fine && data < fine) continue; // durante la prova gratuita non si paga
    pagamenti.push({ abb, data });
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
    if (stessoGiorno(data, fineProvaDi(abb))) nome.append(crea('span', 'dettaglio-nota', ' · fine prova'));
    if (data < oggi) nome.append(crea('span', 'dettaglio-nota', ' · già pagato'));
    if (abb.pagamento) nome.append(crea('span', 'dettaglio-nota', ` · ${abb.pagamento}`));

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
  // La pagina dietro "si allontana" verso il punto che stai guardando (vedi vetro.css)
  document.documentElement.style.setProperty('--centro-vista', `${window.scrollY + window.innerHeight / 2}px`);
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

// "Apri la pagina per disdire": compare solo se nel campo c'è un link valido
function aggiornaLinkDisdici() {
  const link = Archivio.controllaLink(el.campoLink.value);
  el.linkDisdici.hidden = !link;
  if (link) el.linkDisdici.href = link;
}

// Il link di un abbonamento: quello salvato oppure, se manca, quello della guida per disdire
function linkPer(abb) {
  return abb.link || guidaDisdetta(abb.nome, abb.pagamento).link || '';
}

// Riempie da solo il campo del link con la pagina ufficiale per disdire,
// ma solo se è vuoto o se l'avevamo riempito noi (quello scritto da te non si tocca)
function suggerisciLink() {
  const vuoto = !el.campoLink.value.trim();
  const nostro = el.campoLink.dataset.automatico === 'si';
  if (!vuoto && !nostro) return;

  const guida = guidaDisdetta(el.campoNome.value, el.campoPagamento.value);
  el.campoLink.value = guida.link;
  el.campoLink.dataset.automatico = guida.link ? 'si' : 'no';
  el.notaLink.hidden = !guida.link;
  if (guida.link) el.notaLink.textContent = 'Link suggerito dall\'app: la pagina ufficiale che spiega come disdire. Puoi cambiarlo.';
  aggiornaLinkDisdici();
}

// Disegna la guida "Come disdire" (passi, avvertenza e link alla pagina ufficiale)
function disegnaGuida() {
  const guida = guidaDisdetta(el.campoNome.value, el.campoPagamento.value);
  el.btnGuida.textContent = guidaAperta ? 'Nascondi la guida' : `${guida.titolo} ›`;
  el.btnGuida.setAttribute('aria-expanded', String(guidaAperta));
  el.guidaDisdetta.hidden = !guidaAperta;
  if (!guidaAperta) return;

  const passi = crea('ol', 'guida-passi');
  for (const passo of guida.passi) passi.append(crea('li', '', passo));
  el.guidaDisdetta.replaceChildren(crea('h4', 'guida-titolo', guida.titolo), passi);
  if (guida.nota) el.guidaDisdetta.append(crea('p', 'guida-nota', guida.nota));
  if (guida.link) {
    const ufficiale = crea('a', 'guida-link', 'Apri la guida ufficiale ↗');
    ufficiale.href = guida.link;
    ufficiale.target = '_blank';
    ufficiale.rel = 'noopener noreferrer';
    el.guidaDisdetta.append(ufficiale);
  }
}

// Suggerimenti per il campo Pagamento: i metodi già usati negli altri abbonamenti
// (così scrivi sempre "Visa •••• 1234" allo stesso modo e la ricerca li trova tutti)
function preparaSuggerimentiPagamento() {
  const usati = [...new Set(abbonamenti.map((abb) => abb.pagamento).filter(Boolean))].sort();
  // In più proponiamo sempre chi incassa più spesso: aiuta la guida per disdire
  const metodi = [...usati, ...['Apple (App Store)', 'Google Play', 'PayPal'].filter((m) => !usati.includes(m))];
  el.metodiPagamento.replaceChildren(...metodi.map((metodo) => {
    const opzione = crea('option');
    opzione.value = metodo;
    return opzione;
  }));
}

// Il giorno di fine prova e la sua spiegazione si vedono solo con l'interruttore acceso
function aggiornaRigaProva() {
  el.rigaFineProva.hidden = !el.campoProva.checked;
  el.notaProva.hidden = !el.campoProva.checked;
}

// Apre il foglio del modulo. Senza argomento = nuovo abbonamento; con un abbonamento = modifica.
function apriFoglio(abb) {
  idInModifica = abb ? abb.id : null;

  el.foglioTitolo.textContent = abb ? 'Modifica' : 'Nuovo abbonamento';
  el.campoNome.value = abb ? abb.nome : '';
  // Mostriamo la virgola italiana: 15.99 → "15,99"
  el.campoCosto.value = abb ? abb.costo.toFixed(2).replace('.', ',') : '';
  el.campoGiorno.value = abb ? String(abb.giorno) : '';
  el.campoGiorno.dataset.automatico = 'no';
  el.campoMese.value = String(abb && abb.mese ? abb.mese : new Date().getMonth() + 1);
  // Nuovo abbonamento: se stai guardando una categoria, la proponiamo già scelta
  el.campoCategoria.value = abb ? abb.categoria
    : filtro !== 'tutte' ? filtro
    : CATEGORIA_PREDEFINITA;
  el.campoStato.value = abb ? abb.stato : 'attivo'; // un nuovo abbonamento è attivo
  el.campoLink.value = abb ? abb.link : '';
  el.campoPagamento.value = abb ? abb.pagamento : '';
  el.campoNote.value = abb ? abb.note : '';
  el.campoLink.dataset.automatico = 'no';
  guidaAperta = false;
  suggerisciLink();   // se il link è vuoto e il servizio è conosciuto, lo riempiamo noi
  disegnaGuida();
  preparaSuggerimentiPagamento();
  // Prova gratuita: l'interruttore è acceso solo se la prova non è ancora finita
  const fine = abb ? fineProvaDi(abb) : null;
  el.campoProva.checked = Boolean(fine) && fine >= oggiAMezzanotte();
  el.campoFineProva.value = el.campoProva.checked ? abb.fineProva : '';
  aggiornaRigaProva();
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
  const fineProva = el.campoProva.checked ? el.campoFineProva.value : null;
  const link = Archivio.controllaLink(el.campoLink.value); // "" se vuoto, null se non valido
  const pagamento = el.campoPagamento.value.trim();
  const note = el.campoNote.value.trim();

  if (!nome) return { errore: 'Scrivi il nome dell\'abbonamento.', campo: el.campoNome };
  if (!Number.isFinite(costo) || costo <= 0) {
    return { errore: 'Scrivi un costo valido, per esempio 9,99.', campo: el.campoCosto };
  }
  if (!Number.isInteger(giorno) || giorno < 1 || giorno > 31) {
    return { errore: 'Il giorno del rinnovo va da 1 a 31.', campo: el.campoGiorno };
  }

  if (el.campoProva.checked && !/^\d{4}-\d{2}-\d{2}$/.test(fineProva)) {
    return { errore: 'Scegli il giorno in cui finisce la prova gratuita.', campo: el.campoFineProva };
  }
  if (link === null) {
    return { errore: 'Il link non sembra valido: scrivi un indirizzo come netflix.com/account.', campo: el.campoLink };
  }
  // Sicurezza: 12 o più cifre nel campo Pagamento = probabilmente il numero intero della carta
  if ((pagamento.match(/\d/g) || []).length >= 12) {
    return {
      errore: 'Non scrivere il numero intero della carta: bastano il circuito e le ultime 4 cifre (es. Visa •••• 1234).',
      campo: el.campoPagamento,
    };
  }

  return { dati: { nome, costo, frequenza, giorno, mese: frequenza === 'annuale' ? mese : null, categoria, stato, fineProva, link, pagamento, note } };
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
    const eraNuovo = !idInModifica;
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
    Animazioni.avviso(eraNuovo ? 'Abbonamento aggiunto' : 'Modifiche salvate');
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
    Animazioni.avviso(`${abb.nome} eliminato`);
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
    Animazioni.avviso('Backup esportato');
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
    Animazioni.avviso(`Importati ${quanti}`);
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
    .filter(({ data }) => data >= oggi)
    // Il pagamento nel giorno in cui finisce la prova diventa l'evento "Fine prova"
    .map((p) => ({ ...p, fineProva: stessoGiorno(p.data, fineProvaDi(p.abb)) }));

  // Se la prova finisce in un giorno senza pagamento, aggiungiamo un evento apposta
  for (const abb of attivi()) {
    const fine = fineProvaDi(abb);
    const giaPresente = pagamenti.some((p) => p.abb.id === abb.id && p.fineProva);
    if (fine && fine >= oggi && !giaPresente) pagamenti.push({ abb, data: fine, fineProva: true });
  }

  if (pagamenti.length === 0) {
    alert('Non ci sono rinnovi da aggiungere al calendario.');
    return;
  }

  // Nel calendario mettiamo il link salvato oppure quello della guida per disdire
  const testo = creaFileCalendario(pagamenti.map((p) => ({ ...p, abb: { ...p.abb, link: linkPer(p.abb) } })));
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
    Animazioni.avviso(nuovo ? 'Account creato' : 'Accesso eseguito');
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
// Tocco su "Come disdire": apre o chiude la guida
el.btnGuida.addEventListener('click', () => {
  guidaAperta = !guidaAperta;
  disegnaGuida();
});
el.modulo.addEventListener('change', (e) => {
  if (e.target.name === 'frequenza') aggiornaRigaMese();
  if (e.target === el.campoProva) {
    // Appena accendi la prova, proponiamo una settimana da oggi (si può cambiare)
    if (el.campoProva.checked && !el.campoFineProva.value) {
      const traUnaSettimana = oggiAMezzanotte();
      traUnaSettimana.setDate(traUnaSettimana.getDate() + 7);
      el.campoFineProva.value = testoDaData(traUnaSettimana);
    }
    aggiornaRigaProva();
  }
  // Di solito si paga per la prima volta proprio il giorno in cui finisce la prova:
  // se il giorno del rinnovo è vuoto (o l'avevamo riempito noi), lo facciamo seguire la data
  const giornoNostro = !el.campoGiorno.value || el.campoGiorno.dataset.automatico === 'si';
  if ((e.target === el.campoProva || e.target === el.campoFineProva)
      && el.campoProva.checked && el.campoFineProva.value && giornoNostro) {
    el.campoGiorno.value = String(Number(el.campoFineProva.value.slice(8, 10)));
    el.campoGiorno.dataset.automatico = 'si';
  }
});
// Appena l'utente ricomincia a scrivere, togliamo il messaggio di errore
el.modulo.addEventListener('input', (e) => {
  el.errore.textContent = '';
  // Se scrivi tu il giorno del rinnovo, non lo cambiamo più in automatico
  if (e.target === el.campoGiorno) el.campoGiorno.dataset.automatico = 'no';
  if (e.target === el.campoLink) {
    el.campoLink.dataset.automatico = 'no'; // l'hai scritto tu: non lo tocchiamo più
    el.notaLink.hidden = true;
    aggiornaLinkDisdici();
  }
  // Nome o pagamento cambiati: aggiorniamo link suggerito e guida
  if (e.target === el.campoNome || e.target === el.campoPagamento) {
    suggerisciLink();
    disegnaGuida();
  }
});

// Un solo "ascoltatore" per tutti i gruppi: capiamo quale riga è stata toccata
el.gruppi.addEventListener('click', (e) => {
  // Un'azione dietro la riga ("Pausa", "Riattiva", "Elimina")
  const azione = e.target.closest('[data-azione]');
  if (azione) {
    azioneRiga(azione.dataset.azione, azione.dataset.per);
    return;
  }
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

// Profilo: il saluto si aggiorna mentre scrivi, il nome si salva quando hai finito
el.campoNomeUtente.addEventListener('input', () => {
  nomeUtente = el.campoNomeUtente.value.trim().slice(0, 30);
  disegnaSaluto();
});
el.campoNomeUtente.addEventListener('change', async () => {
  await Archivio.salvaImpostazione('nome', nomeUtente);
  Animazioni.avviso(nomeUtente ? `Ciao, ${nomeUtente}!` : 'Nome tolto');
});
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

// --- Barra delle schede in basso ---
el.barraSchede.addEventListener('click', (e) => {
  const pulsante = e.target.closest('.scheda-btn');
  if (pulsante) mostraScheda(pulsante.dataset.scheda);
});
// Se lo schermo cambia larghezza (iPad girato), la goccia va rimessa sotto la scheda giusta
window.addEventListener('resize', posizionaGocciaSchede);

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
   LE SCHEDE: Abbonamenti, Statistiche, Impostazioni
   La barra in basso mostra una scheda alla volta (le altre sono "hidden").
   Come sull'iPhone: ogni scheda ricorda fin dove l'avevi fatta scorrere,
   e toccando di nuovo la scheda in cui sei torni in cima.
   ===================================================================== */
const TITOLI_SCHEDE = {
  abbonamenti: 'Abbonamenti',
  statistiche: 'Statistiche',
  impostazioni: 'Impostazioni',
};

function mostraScheda(nome) {
  if (!TITOLI_SCHEDE[nome]) return;
  const movimentoRidotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Tocchi la scheda in cui sei già: torniamo in cima
  if (nome === schedaAttiva) {
    window.scrollTo({ top: 0, behavior: movimentoRidotto ? 'auto' : 'smooth' });
    return;
  }

  scorrimentoSchede[schedaAttiva] = window.scrollY; // ricordiamo dove eravamo
  schedaAttiva = nome;

  // Si vede solo la scheda scelta; quella nuova compare con un breve passaggio
  document.querySelectorAll('.scheda').forEach((scheda) => {
    const scelta = scheda.dataset.scheda === nome;
    scheda.hidden = !scelta;
    scheda.classList.toggle('appena-scelta', scelta);
  });

  // Titolo grande e titolo piccolo della barra in alto
  el.titoloGrande.textContent = TITOLI_SCHEDE[nome];
  el.titoloCompatto.textContent = TITOLI_SCHEDE[nome];
  // Il saluto sta solo nella prima scheda; il "+" non serve nelle Impostazioni
  el.saluto.hidden = nome !== 'abbonamenti' || !nomeUtente;
  el.btnAggiungi.hidden = nome === 'impostazioni';

  // Nella barra: aria-current dice (anche a VoiceOver) qual è la scheda scelta
  el.barraSchede.querySelectorAll('.scheda-btn').forEach((btn) => {
    if (btn.dataset.scheda === nome) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  });
  posizionaGocciaSchede();

  // Mentre una scheda è nascosta non si può misurare niente:
  // tornando sugli abbonamenti rimettiamo a posto i totali e la goccia dei filtri
  if (nome === 'abbonamenti') {
    disegnaTotali();
    Animazioni.posizionaIndicatore(el.filtri, el.filtri.querySelector('[aria-pressed="true"] .pillola'));
  }

  window.scrollTo(0, scorrimentoSchede[nome] || 0);
}

// La goccia di vetro scivola sotto la scheda scelta
function posizionaGocciaSchede() {
  Animazioni.posizionaIndicatore(el.barraSchede, el.barraSchede.querySelector('[aria-current="page"]'));
}

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
  // Il nome con cui salutarti e se hai già visto il benvenuto
  nomeUtente = await Archivio.leggiImpostazione('nome', '');
  const benvenutoVisto = await Archivio.leggiImpostazione('benvenutoVisto', false);
  el.campoNomeUtente.value = nomeUtente;

  Archivio.sincronizza(); // intanto, se sei entrato, controlliamo le novità online

  let apriAccesso = false;
  try {
    if (!benvenutoVisto) {
      // Primo avvio: la scena "Orbita" con le iniziali dei tuoi abbonamenti
      const scelta = await Benvenuto.mostra({
        nomi: abbonamenti.map((abb) => abb.nome),
        totale: totaleAlMese(paganti()),
        formatta: (v) => formatoEuro.format(v),
      });
      nomeUtente = scelta.nome;
      el.campoNomeUtente.value = nomeUtente;
      await Archivio.salvaImpostazione('nome', nomeUtente);
      await Archivio.salvaImpostazione('benvenutoVisto', true);
      apriAccesso = scelta.account && !Archivio.account();
    } else {
      // Le altre volte: il saluto lampo ("Buonasera, Tommaso")
      await Benvenuto.salutoLampo(Benvenuto.testoSaluto(nomeUtente));
    }
  } finally {
    // Qualunque cosa succeda, l'app deve comparire
    entraNellApp();
  }
  if (apriAccesso) setTimeout(apriFoglioAccount, 500); // "Ho già un account": apriamo l'accesso
}

// Mostra la Home con l'entrata a cascata e i totali che contano
function entraNellApp() {
  disegnaSaluto();
  const app = document.querySelector('.app');
  app.classList.add('entra');
  // Finita l'entrata a cascata la spegniamo, così non riparte cambiando scheda
  setTimeout(() => app.classList.replace('entra', 'entrata'), 1000);
  el.barraSchede.classList.add('entra'); // la barra delle schede sale dal basso
  disegna();
  disegnaAccount();
  posizionaGocciaSchede();

  // Animazioni: barra in alto che diventa compatta, fogli che si chiudono tirandoli giù
  Animazioni.barraCompatta($('barra-fissa'), $('titolo-grande'));
  Animazioni.trascinaPerChiudere(el.foglio, nascondiFoglio);
  Animazioni.trascinaPerChiudere(el.foglioAccount, nascondiFoglio);
  // Righe della lista: scorrendo a sinistra compaiono "Pausa" ed "Elimina"
  Animazioni.scorriRighe(el.gruppi, {
    larghezzaAzioni: 156, // due pulsanti da 78px
    suCompleta: (riga) => azioneRiga('elimina', riga.querySelector('button.riga').dataset.id),
  });
}

// "Buonasera, Tommaso" sopra il titolo (nascosto se non conosciamo il nome)
function disegnaSaluto() {
  el.saluto.hidden = !nomeUtente || schedaAttiva !== 'abbonamenti';
  el.saluto.textContent = Benvenuto.testoSaluto(nomeUtente);
}

avvia();
