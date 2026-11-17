/* =====================================================================
   storage.js — L'UNICO punto dell'app che legge e scrive i dati.

   Oggi i dati stanno nel localStorage del browser (una piccola memoria
   che resta salvata anche chiudendo la pagina).
   Domani potremo spostarli su un database online cambiando SOLO questo
   file: app.js usa sempre e soltanto le funzioni di "Archivio".

   Per questo le funzioni sono "async" (asincrone): un database online
   risponde dopo un po' di tempo, e app.js è già pronto ad aspettare
   la risposta con "await".

   Com'è fatto un abbonamento:
   {
     id: "k3x9...",          // codice unico, creato in automatico
     nome: "Spotify",
     costo: 16.99,           // numero con il punto, in euro
     frequenza: "mensile",   // "mensile" oppure "annuale"
     giorno: 2,              // giorno del mese in cui si rinnova (1-31)
     mese: null              // solo per gli annuali: mese del rinnovo (1-12)
   }
   ===================================================================== */

const Archivio = (function () {
  // Il "nome del cassetto" in cui salviamo i dati nel localStorage.
  // Il ":v1" ci permetterà in futuro di cambiare formato senza confusione.
  const CHIAVE = 'abbonamenti:v1';

  // Dati di esempio: li carichiamo SOLO al primo avvio,
  // cioè quando nel localStorage non c'è ancora niente.
  const DATI_INIZIALI = [
    { nome: 'Disney+', costo: 15.99, frequenza: 'mensile', giorno: 4 },
    { nome: 'ChatGPT', costo: 23, frequenza: 'mensile', giorno: 20 },
    { nome: 'Spotify', costo: 16.99, frequenza: 'mensile', giorno: 2 },
    { nome: 'PlayStation Plus', costo: 8.99, frequenza: 'mensile', giorno: 29 },
  ];

  // Crea un codice unico per ogni abbonamento.
  // crypto.randomUUID() non funziona ovunque (per esempio aprendo il file
  // con un doppio clic), quindi teniamo un piano B fatto in casa.
  function nuovoId() {
    if (window.crypto && typeof crypto.randomUUID === 'function') {
      try {
        return crypto.randomUUID();
      } catch (e) {
        /* andiamo al piano B */
      }
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  // Controlla e "ripulisce" un abbonamento che arriva da fuori
  // (dal modulo, dal localStorage o da un file di backup).
  // Restituisce l'abbonamento pulito, oppure null se i dati non vanno bene.
  function normalizza(grezzo) {
    if (!grezzo || typeof grezzo !== 'object') return null;

    const nome = String(grezzo.nome ?? '').trim().slice(0, 40);
    // Arrotondiamo ai centesimi (es. 15.999 → 16.00)
    const costo = Math.round(Number(grezzo.costo) * 100) / 100;
    const frequenza = grezzo.frequenza === 'annuale' || grezzo.frequenza === 'mensile'
      ? grezzo.frequenza
      : null;
    const giorno = Number(grezzo.giorno);
    const mese = Number(grezzo.mese);

    if (!nome) return null;
    if (!(costo > 0)) return null;
    if (!frequenza) return null;
    if (!Number.isInteger(giorno) || giorno < 1 || giorno > 31) return null;
    if (frequenza === 'annuale' && (!Number.isInteger(mese) || mese < 1 || mese > 12)) return null;

    return {
      id: typeof grezzo.id === 'string' && grezzo.id ? grezzo.id : nuovoId(),
      nome,
      costo,
      frequenza,
      giorno,
      mese: frequenza === 'annuale' ? mese : null,
    };
  }

  // Legge la lista dal localStorage.
  // Restituisce null se il cassetto è vuoto (= primo avvio).
  function leggiDalDisco() {
    const testo = localStorage.getItem(CHIAVE);
    if (testo === null) return null;
    try {
      const dati = JSON.parse(testo);
      return Array.isArray(dati) ? dati.map(normalizza).filter(Boolean) : [];
    } catch (e) {
      // Dati rovinati: meglio una lista vuota che un'app bloccata
      return [];
    }
  }

  // Scrive la lista nel localStorage (come testo JSON).
  function scriviSulDisco(lista) {
    localStorage.setItem(CHIAVE, JSON.stringify(lista));
  }

  // ---------- Funzioni usate da app.js ----------

  // Restituisce tutti gli abbonamenti.
  async function tutti() {
    let lista = leggiDalDisco();
    if (lista === null) {
      // Primo avvio: carichiamo i dati di esempio e li salviamo
      lista = DATI_INIZIALI.map(normalizza);
      scriviSulDisco(lista);
    }
    return lista;
  }

  // Aggiunge un nuovo abbonamento e lo restituisce (con il suo id).
  async function aggiungi(dati) {
    const lista = await tutti();
    const nuovo = normalizza({ ...dati, id: nuovoId() });
    if (!nuovo) throw new Error('I dati dell\'abbonamento non sono validi.');
    lista.push(nuovo);
    scriviSulDisco(lista);
    return nuovo;
  }

  // Modifica l'abbonamento con questo id.
  async function aggiorna(id, dati) {
    const lista = await tutti();
    const posizione = lista.findIndex((a) => a.id === id);
    if (posizione === -1) throw new Error('Abbonamento non trovato.');
    const aggiornato = normalizza({ ...dati, id });
    if (!aggiornato) throw new Error('I dati dell\'abbonamento non sono validi.');
    lista[posizione] = aggiornato;
    scriviSulDisco(lista);
    return aggiornato;
  }

  // Elimina l'abbonamento con questo id.
  async function elimina(id) {
    const lista = await tutti();
    scriviSulDisco(lista.filter((a) => a.id !== id));
  }

  // Prepara il testo del file di backup.
  async function esportaBackup() {
    const backup = {
      app: 'Abbonamenti',
      versione: 1,
      esportatoIl: new Date().toISOString(),
      abbonamenti: await tutti(),
    };
    // null, 2 = testo "a capo e rientrato", leggibile anche a occhio
    return JSON.stringify(backup, null, 2);
  }

  // Legge il testo di un file di backup e restituisce la lista,
  // oppure lancia un errore con un messaggio comprensibile.
  // (Non salva niente: prima app.js chiede conferma all'utente.)
  function leggiBackup(testo) {
    let dati;
    try {
      dati = JSON.parse(testo);
    } catch (e) {
      throw new Error('Il file non è un backup valido (JSON non leggibile).');
    }

    // Accettiamo sia il nostro formato { abbonamenti: [...] } sia una lista semplice
    const grezzi = Array.isArray(dati) ? dati
      : dati && Array.isArray(dati.abbonamenti) ? dati.abbonamenti
      : null;
    if (!grezzi) throw new Error('Il file non sembra un backup di Abbonamenti.');

    const lista = grezzi.map(normalizza);
    if (lista.some((a) => a === null)) {
      throw new Error('Alcuni abbonamenti nel file hanno dati mancanti o sbagliati.');
    }

    // Se due abbonamenti hanno lo stesso id, al secondo ne diamo uno nuovo
    const visti = new Set();
    for (const a of lista) {
      if (visti.has(a.id)) a.id = nuovoId();
      visti.add(a.id);
    }
    return lista;
  }

  // Sostituisce tutti i dati (usato dall'importazione del backup).
  async function sostituisciTutti(lista) {
    scriviSulDisco(lista);
  }

  // Queste sono le sole funzioni "visibili" dall'esterno
  return { tutti, aggiungi, aggiorna, elimina, esportaBackup, leggiBackup, sostituisciTutti };
})();
