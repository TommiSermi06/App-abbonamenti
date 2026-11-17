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
const NOMI_MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const MS_AL_GIORNO = 24 * 60 * 60 * 1000; // millisecondi in un giorno


/* ---------- Stato: le informazioni che l'app tiene "in mente" ---------- */
let abbonamenti = [];     // la lista caricata da Archivio
let idInModifica = null;  // id dell'abbonamento aperto nel modulo (null = nuovo)
let idDaAnimare = null;   // la riga appena aggiunta, che compare con dissolvenza
let primoDisegno = true;  // al primo avvio facciamo comparire tutte le righe
let elementoPrimaDelFoglio = null; // dove tornare con il focus dopo aver chiuso


/* ---------- Riferimenti agli elementi della pagina ---------- */
const $ = (id) => document.getElementById(id);
const el = {
  totaleMese: $('totale-mese'),
  totaleAnno: $('totale-anno'),
  prossimo: $('prossimo'),
  lista: $('lista'),
  listaVuota: $('lista-vuota'),
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
  disegnaProssimo(conInfo[0]);
  disegnaLista(conInfo);
  primoDisegno = false;
}

function disegnaTotali() {
  const alMese = abbonamenti.reduce((somma, abb) => somma + costoMensile(abb), 0);
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

function disegnaLista(conInfo) {
  el.lista.replaceChildren();
  el.lista.hidden = conInfo.length === 0;
  el.listaVuota.hidden = conInfo.length > 0;

  conInfo.forEach(({ abb, info }, posizione) => {
    const riga = crea('li');

    // Animazione: tutte le righe al primo avvio, poi solo quella nuova
    if (primoDisegno || abb.id === idDaAnimare) {
      riga.classList.add('compari');
      riga.style.animationDelay = primoDisegno ? `${posizione * 40}ms` : '0ms';
    }

    // Ogni riga è un pulsante: toccandola si apre il modulo di modifica
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

    pulsante.append(testi, creaBadge(info.giorni, info.stato, false), freccia);
    riga.append(pulsante);
    el.lista.append(riga);
  });

  idDaAnimare = null;
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

// Apre il foglio. Senza argomento = nuovo abbonamento; con un abbonamento = modifica.
function apriFoglio(abb) {
  idInModifica = abb ? abb.id : null;
  elementoPrimaDelFoglio = document.activeElement;

  el.foglioTitolo.textContent = abb ? 'Modifica' : 'Nuovo abbonamento';
  el.campoNome.value = abb ? abb.nome : '';
  // Mostriamo la virgola italiana: 15.99 → "15,99"
  el.campoCosto.value = abb ? abb.costo.toFixed(2).replace('.', ',') : '';
  el.campoGiorno.value = abb ? String(abb.giorno) : '';
  el.campoMese.value = String(abb && abb.mese ? abb.mese : new Date().getMonth() + 1);
  impostaFrequenza(abb ? abb.frequenza : 'mensile');
  el.bloccoElimina.hidden = !abb;
  el.errore.textContent = '';

  el.velo.classList.add('aperto');
  el.foglio.classList.add('aperto');
  el.foglio.scrollTop = 0;
  document.body.classList.add('bloccato');
  el.foglio.focus({ preventScroll: true });
}

function chiudiFoglio() {
  el.velo.classList.remove('aperto');
  el.foglio.classList.remove('aperto');
  document.body.classList.remove('bloccato');
  // Riportiamo il focus dov'era (utile per chi usa la tastiera)
  if (elementoPrimaDelFoglio && document.body.contains(elementoPrimaDelFoglio)) {
    elementoPrimaDelFoglio.focus({ preventScroll: true });
  }
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

  if (!nome) return { errore: 'Scrivi il nome dell\'abbonamento.', campo: el.campoNome };
  if (!Number.isFinite(costo) || costo <= 0) {
    return { errore: 'Scrivi un costo valido, per esempio 9,99.', campo: el.campoCosto };
  }
  if (!Number.isInteger(giorno) || giorno < 1 || giorno > 31) {
    return { errore: 'Il giorno del rinnovo va da 1 a 31.', campo: el.campoGiorno };
  }

  return { dati: { nome, costo, frequenza, giorno, mese: frequenza === 'annuale' ? mese : null } };
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
   COLLEGARE I PULSANTI ALLE FUNZIONI
   ===================================================================== */

el.btnAggiungi.addEventListener('click', () => apriFoglio());
el.btnAnnulla.addEventListener('click', chiudiFoglio);
el.velo.addEventListener('click', chiudiFoglio); // toccare fuori dal foglio lo chiude
el.modulo.addEventListener('submit', salva);
el.btnElimina.addEventListener('click', eliminaAbbonamento);
el.modulo.addEventListener('change', (e) => {
  if (e.target.name === 'frequenza') aggiornaRigaMese();
});
// Appena l'utente ricomincia a scrivere, togliamo il messaggio di errore
el.modulo.addEventListener('input', () => {
  el.errore.textContent = '';
});

// Un solo "ascoltatore" per tutta la lista: capiamo quale riga è stata toccata
el.lista.addEventListener('click', (e) => {
  const pulsante = e.target.closest('button[data-id]');
  if (!pulsante) return;
  const abb = abbonamenti.find((a) => a.id === pulsante.dataset.id);
  if (abb) apriFoglio(abb);
});

el.btnEsporta.addEventListener('click', esportaBackup);
el.btnImporta.addEventListener('click', () => el.fileImporta.click());
el.fileImporta.addEventListener('change', importaBackup);

// Tasto Esc (sul computer) per chiudere il foglio
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && el.foglio.classList.contains('aperto')) chiudiFoglio();
});

// Quando torni sull'app (magari il giorno dopo) ricalcoliamo i giorni mancanti
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') disegna();
});


/* =====================================================================
   AVVIO
   ===================================================================== */
async function avvia() {
  try {
    abbonamenti = await Archivio.tutti();
  } catch (e) {
    // Succede se il browser blocca il salvataggio dei dati (es. navigazione privata)
    alert('Non riesco a leggere i dati salvati. Controlla che il browser permetta di salvare i dati dei siti.');
    abbonamenti = [];
  }
  disegna();
}

avvia();
