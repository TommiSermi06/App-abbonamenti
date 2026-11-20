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
     frequenza: "mensile",   // "settimanale", "mensile", "trimestrale", "semestrale" o "annuale" (frequenze.js)
     giorno: 2,              // giorno del mese (1-31); per i settimanali giorno della settimana (1 = lunedì … 7)
     mese: null,             // trimestrali, semestrali e annuali: un mese in cui si rinnova (1-12)
     categoria: "musica",    // id di una categoria di categorie.js
     stato: "attivo",        // "attivo", "pausa" oppure "disdetto"
     fineProva: null,        // se è in prova gratuita: il giorno in cui finisce, es. "2026-11-25"
     link: "",               // pagina dove gestire o disdire l'abbonamento (https://...)
     pagamento: "",          // come lo paghi, es. "Visa •••• 1234" (MAI il numero intero della carta)
     note: ""                // appunti liberi
   }
   ===================================================================== */

const Archivio = (function () {
  // Il "nome del cassetto" in cui salviamo i dati nel localStorage.
  // Il ":v1" ci permetterà in futuro di cambiare formato senza confusione.
  const CHIAVE = 'abbonamenti:v1';

  // Dati di esempio: li carichiamo SOLO al primo avvio,
  // cioè quando nel localStorage non c'è ancora niente.
  // Il loro id inizia con "esempio-": così, se entri con un account che ha
  // già dei dati online, la sincronizzazione sa che sono solo esempi e non li carica.
  const DATI_INIZIALI = [
    { id: 'esempio-disney', nome: 'Disney+', costo: 15.99, frequenza: 'mensile', giorno: 4, categoria: 'streaming' },
    { id: 'esempio-chatgpt', nome: 'ChatGPT', costo: 23, frequenza: 'mensile', giorno: 20, categoria: 'lavoro' },
    { id: 'esempio-spotify', nome: 'Spotify', costo: 16.99, frequenza: 'mensile', giorno: 2, categoria: 'musica' },
    { id: 'esempio-psplus', nome: 'PlayStation Plus', costo: 8.99, frequenza: 'mensile', giorno: 29, categoria: 'giochi' },
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
    // Solo le frequenze di frequenze.js
    const frequenza = trovaFrequenza(grezzo.frequenza) ? grezzo.frequenza : null;
    const giorno = Number(grezzo.giorno);
    const mese = Number(grezzo.mese);
    // Categoria mancante o sconosciuta (es. dati della versione 1) → "Altro"
    const categoria = categoriaEsiste(grezzo.categoria) ? grezzo.categoria : CATEGORIA_PREDEFINITA;
    // Stato mancante (dati delle versioni precedenti) o sconosciuto → "attivo"
    const stato = ['attivo', 'pausa', 'disdetto'].includes(grezzo.stato) ? grezzo.stato : 'attivo';
    // Fine della prova gratuita: una data "anno-mese-giorno" valida, altrimenti null.
    // (online la colonna si chiama fine_prova)
    const testoProva = grezzo.fineProva ?? grezzo.fine_prova ?? null;
    const fineProva = dataValida(testoProva) ? testoProva : null;
    // Gestione: link (solo se è un indirizzo web valido), pagamento e note (testi brevi)
    const link = controllaLink(grezzo.link) || '';
    const pagamento = String(grezzo.pagamento ?? '').trim().slice(0, 40);
    const note = String(grezzo.note ?? '').trim().slice(0, 500);

    if (!nome) return null;
    if (!(costo > 0)) return null;
    if (!frequenza) return null;
    // Il giorno: della settimana (1-7) per i settimanali, del mese (1-31) per gli altri
    const giornoMassimo = frequenza === 'settimanale' ? 7 : 31;
    if (!Number.isInteger(giorno) || giorno < 1 || giorno > giornoMassimo) return null;
    if (usaMese(frequenza) && (!Number.isInteger(mese) || mese < 1 || mese > 12)) return null;

    return {
      id: typeof grezzo.id === 'string' && grezzo.id ? grezzo.id : nuovoId(),
      nome,
      costo,
      frequenza,
      giorno,
      mese: usaMese(frequenza) ? mese : null,
      categoria,
      stato,
      fineProva,
      link,
      pagamento,
      note,
    };
  }

  // Controlla un link e lo sistema: "netflix.com/account" → "https://netflix.com/account".
  // Restituisce "" se il testo è vuoto, null se non è un indirizzo web valido.
  // Accettiamo solo http e https: altri tipi di link (es. "javascript:") potrebbero essere pericolosi.
  function controllaLink(testo) {
    const pulito = String(testo ?? '').trim();
    if (!pulito) return '';
    const conProtocollo = /^https?:\/\//i.test(pulito) ? pulito : `https://${pulito}`;
    try {
      const indirizzo = new URL(conProtocollo);
      if (indirizzo.protocol !== 'https:' && indirizzo.protocol !== 'http:') return null;
      if (!indirizzo.hostname.includes('.')) return null; // serve almeno "nome.it"
      return indirizzo.href.length <= 300 ? indirizzo.href : null;
    } catch (e) {
      return null;
    }
  }

  // Controlla che un testo sia una data vera nel formato "2026-11-25"
  // (per esempio "2026-02-30" non lo è: febbraio non ha 30 giorni)
  function dataValida(testo) {
    if (typeof testo !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(testo)) return false;
    const [anno, mese, giorno] = testo.split('-').map(Number);
    const data = new Date(anno, mese - 1, giorno);
    return data.getFullYear() === anno && data.getMonth() === mese - 1 && data.getDate() === giorno;
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
    segnaDaInviare([nuovo.id]); // da mandare online alla prossima sincronizzazione
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
    segnaDaInviare([id]);
    return aggiornato;
  }

  // Elimina l'abbonamento con questo id.
  async function elimina(id) {
    const lista = await tutti();
    scriviSulDisco(lista.filter((a) => a.id !== id));
    segnaDaEliminare([id]); // online lo segneremo come "eliminato"
  }

  // Rimette un abbonamento appena eliminato, con lo stesso id ("Annulla" dopo Elimina).
  // Online torna visibile: l'invio manda la riga con eliminato = false.
  async function ripristina(abb) {
    const lista = await tutti();
    const recuperato = normalizza(abb);
    if (!recuperato) throw new Error('I dati dell\'abbonamento non sono validi.');
    if (!lista.some((a) => a.id === recuperato.id)) lista.push(recuperato);
    scriviSulDisco(lista);
    segnaDaInviare([recuperato.id]);
    return recuperato;
  }

  // Prepara il testo del file di backup.
  async function esportaBackup() {
    const backup = {
      app: 'Abbonamenti',
      // versione 2 = categorie, versione 3 = stato (attivo/pausa/disdetto).
      // I backup delle versioni precedenti si importano lo stesso.
      // versione 4 = fine della prova gratuita (fineProva), versione 5 = link, pagamento e note
      versione: 5,
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
    const prima = leggiDalDisco() || [];
    scriviSulDisco(lista);
    // Online: quelli del backup vanno inviati, quelli che non ci sono più vanno eliminati
    const nuoviId = new Set(lista.map((a) => a.id));
    segnaDaEliminare(prima.filter((a) => !nuoviId.has(a.id)).map((a) => a.id));
    segnaDaInviare([...nuoviId]);
  }

  // ---------- Impostazioni dell'app (es. l'ordine scelto per la lista) ----------
  // Stanno in un "cassetto" separato dagli abbonamenti, così non finiscono nel backup.
  const CHIAVE_IMPOSTAZIONI = 'abbonamenti:impostazioni';

  function leggiTutteLeImpostazioni() {
    try {
      const dati = JSON.parse(localStorage.getItem(CHIAVE_IMPOSTAZIONI));
      return dati && typeof dati === 'object' ? dati : {};
    } catch (e) {
      return {}; // impostazioni rovinate o salvataggio bloccato: si riparte da quelle predefinite
    }
  }

  // Restituisce un'impostazione, oppure "predefinito" se non è mai stata salvata
  async function leggiImpostazione(nome, predefinito) {
    const impostazioni = leggiTutteLeImpostazioni();
    return nome in impostazioni ? impostazioni[nome] : predefinito;
  }

  async function salvaImpostazione(nome, valore) {
    const impostazioni = leggiTutteLeImpostazioni();
    impostazioni[nome] = valore;
    try {
      localStorage.setItem(CHIAVE_IMPOSTAZIONI, JSON.stringify(impostazioni));
    } catch (e) {
      /* se non si può salvare, l'app funziona lo stesso: l'impostazione dura fino alla chiusura */
    }
  }

  /* ===================================================================
     SINCRONIZZAZIONE ONLINE (con Supabase, tramite supabase.js)

     Come funziona, in breve:
     - ogni modifica viene salvata SUBITO sul dispositivo (veloce, e
       funziona anche senza internet) e messa in una "coda" di cose da
       mandare online;
     - poco dopo parte la sincronizzazione:
         1. INVIA la coda (abbonamenti nuovi/modificati ed eliminati);
         2. SCARICA quello che è cambiato online dall'ultima volta
            (per esempio una modifica fatta sull'altro dispositivo);
     - se manca internet, la coda aspetta e si riprova più tardi.
     Gli abbonamenti eliminati online non spariscono: vengono segnati
     "eliminato", così anche l'altro dispositivo sa che deve toglierli.
     =================================================================== */

  // Il "cassetto" con lo stato della sincronizzazione
  const CHIAVE_SINCRO = 'abbonamenti:sincronizzazione';

  function leggiSincro() {
    const vuoto = { daInviare: [], daEliminare: [], ultimoServer: null, unito: false, ultimaRiuscita: null };
    try {
      return { ...vuoto, ...JSON.parse(localStorage.getItem(CHIAVE_SINCRO)) };
    } catch (e) {
      return vuoto;
    }
  }

  function salvaSincro(sincro) {
    localStorage.setItem(CHIAVE_SINCRO, JSON.stringify(sincro));
  }

  // Mette degli abbonamenti nella coda "da inviare" (solo se sei entrato)
  function segnaDaInviare(ids) {
    if (!Supabase.utente() || ids.length === 0) return;
    const sincro = leggiSincro();
    sincro.daInviare = [...new Set([...sincro.daInviare, ...ids])];
    sincro.daEliminare = sincro.daEliminare.filter((id) => !ids.includes(id));
    salvaSincro(sincro);
    programmaSincronizzazione();
  }

  // Mette degli abbonamenti nella coda "da eliminare online"
  function segnaDaEliminare(ids) {
    if (!Supabase.utente() || ids.length === 0) return;
    const sincro = leggiSincro();
    sincro.daInviare = sincro.daInviare.filter((id) => !ids.includes(id));
    sincro.daEliminare = [...new Set([...sincro.daEliminare, ...ids])];
    salvaSincro(sincro);
    programmaSincronizzazione();
  }

  // Aspettiamo un attimo prima di sincronizzare: se fai più modifiche
  // di seguito, partono tutte insieme in una volta sola
  let timerSincro = null;
  function programmaSincronizzazione() {
    clearTimeout(timerSincro);
    timerSincro = setTimeout(sincronizza, 800);
  }

  // Avvisa app.js: 'archivio-stato' = è cambiato lo stato della sincronizzazione,
  // 'archivio-aggiornato' = sono arrivati dati nuovi da internet
  let statoAttuale = { stato: 'disconnesso', messaggio: '' };
  function avvisaStato(stato, messaggio = '') {
    statoAttuale = { stato, messaggio };
    window.dispatchEvent(new CustomEvent('archivio-stato', { detail: statoAttuale }));
  }

  // Un abbonamento come lo vuole la tabella online
  function versoServer(abb) {
    return {
      id: abb.id,
      nome: abb.nome,
      costo: abb.costo,
      frequenza: abb.frequenza,
      giorno: abb.giorno,
      mese: abb.mese,
      categoria: abb.categoria,
      stato: abb.stato,
      fine_prova: abb.fineProva,
      link: abb.link || null, // online i campi vuoti si salvano come "niente" (null)
      pagamento: abb.pagamento || null,
      note: abb.note || null,
      eliminato: false,
    };
  }

  // Per confrontare i nomi senza badare a maiuscole, accenti e spazi
  function nomeSemplice(nome) {
    return String(nome).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }

  const COLONNE = 'id,nome,costo,frequenza,giorno,mese,categoria,stato,fine_prova,link,pagamento,note,eliminato,aggiornato_il';

  // La PRIMA volta che entri da questo dispositivo uniamo i dati:
  // - se online non c'è ancora niente, carichiamo tutto quello che c'è qui;
  // - se online ci sono già dei dati (es. dall'altro dispositivo), qui teniamo
  //   solo quelli che online NON ci sono: non i dati di esempio, e non quelli
  //   con lo stesso nome di uno online (vince quello online, così niente doppioni).
  async function unisciLaPrimaVolta() {
    const online = await Supabase.database(`abbonamenti?select=${COLONNE}`);
    const qui = leggiDalDisco() || [];

    let daCaricare = qui;
    if (online.length > 0) {
      const nomiOnline = new Set(online.map((r) => nomeSemplice(r.nome)));
      const idOnline = new Set(online.map((r) => r.id));
      daCaricare = qui.filter((abb) => !abb.id.startsWith('esempio-')
        && !nomiOnline.has(nomeSemplice(abb.nome))
        && !idOnline.has(abb.id));
      // Sul dispositivo restano solo questi: gli altri arrivano da internet tra un attimo
      scriviSulDisco(daCaricare);
    }

    const sincro = leggiSincro();
    sincro.daInviare = daCaricare.map((abb) => abb.id);
    sincro.daEliminare = [];
    sincro.ultimoServer = null; // = scarica tutto
    sincro.unito = true;
    salvaSincro(sincro);
    return online.length > 0;
  }

  // 1. INVIA la coda
  async function inviaModifiche() {
    const sincro = leggiSincro();
    const lista = leggiDalDisco() || [];
    const daInviare = lista.filter((abb) => sincro.daInviare.includes(abb.id));
    const daEliminare = [...sincro.daEliminare];

    if (daInviare.length > 0) {
      // "upsert": aggiunge quelli nuovi e aggiorna quelli che online ci sono già
      await Supabase.database('abbonamenti?on_conflict=user_id,id', {
        metodo: 'POST',
        prefer: 'resolution=merge-duplicates,return=minimal',
        corpo: daInviare.map(versoServer),
      });
    }
    if (daEliminare.length > 0) {
      // Segniamo come "eliminato" tutti quelli con questi id
      const elenco = encodeURIComponent(`(${daEliminare.map((id) => `"${id}"`).join(',')})`);
      await Supabase.database(`abbonamenti?id=in.${elenco}`, {
        metodo: 'PATCH',
        prefer: 'return=minimal',
        corpo: { eliminato: true },
      });
    }

    // Togliamo dalla coda solo quello che abbiamo inviato ED è rimasto uguale:
    // se mentre inviavamo hai aggiunto o modificato qualcosa, resta in coda per la prossima volta
    const comeInviati = new Map(daInviare.map((abb) => [abb.id, JSON.stringify(abb)]));
    const listaOra = leggiDalDisco() || [];
    const dopo = leggiSincro();
    dopo.daInviare = dopo.daInviare.filter((id) => {
      if (!comeInviati.has(id)) return true; // non era tra quelli inviati
      const attuale = listaOra.find((abb) => abb.id === id);
      return Boolean(attuale) && JSON.stringify(attuale) !== comeInviati.get(id);
    });
    dopo.daEliminare = dopo.daEliminare.filter((id) => !daEliminare.includes(id));
    salvaSincro(dopo);
  }

  // 2. SCARICA quello che è cambiato online dall'ultima volta.
  // Restituisce true se sul dispositivo è cambiato qualcosa.
  async function scaricaModifiche() {
    const sincro = leggiSincro();
    let percorso = `abbonamenti?select=${COLONNE}&order=aggiornato_il.asc`;
    if (sincro.ultimoServer) percorso += `&aggiornato_il=gt.${encodeURIComponent(sincro.ultimoServer)}`;
    const righe = await Supabase.database(percorso);
    if (righe.length === 0) return false;

    const lista = leggiDalDisco() || [];
    const inAttesa = new Set(leggiSincro().daInviare); // modifiche nostre non ancora inviate: vincono loro
    let cambiato = false;

    for (const riga of righe) {
      if (inAttesa.has(riga.id)) continue;
      const posizione = lista.findIndex((abb) => abb.id === riga.id);

      if (riga.eliminato) {
        if (posizione !== -1) {
          lista.splice(posizione, 1);
          cambiato = true;
        }
        continue;
      }

      const abb = normalizza(riga);
      if (!abb) continue; // riga online con dati strani: la saltiamo
      if (posizione === -1) {
        lista.push(abb);
        cambiato = true;
      } else if (JSON.stringify(lista[posizione]) !== JSON.stringify(abb)) {
        lista[posizione] = abb;
        cambiato = true;
      }
    }

    if (cambiato) scriviSulDisco(lista);
    const dopo = leggiSincro();
    dopo.ultimoServer = righe[righe.length - 1].aggiornato_il; // la prossima volta, solo le novità
    salvaSincro(dopo);
    return cambiato;
  }

  // La sincronizzazione completa. Se è già in corso, ne facciamo un'altra subito dopo.
  let sincroInCorso = null;
  let ancoraUnaVolta = false;

  async function sincronizza() {
    if (!Supabase.utente()) {
      avvisaStato('disconnesso');
      return false;
    }
    if (sincroInCorso) {
      ancoraUnaVolta = true;
      return sincroInCorso;
    }

    sincroInCorso = (async () => {
      avvisaStato('in-corso');
      try {
        let cambiato = false;
        if (!leggiSincro().unito) cambiato = await unisciLaPrimaVolta();
        await inviaModifiche();
        cambiato = (await scaricaModifiche()) || cambiato;

        const sincro = leggiSincro();
        sincro.ultimaRiuscita = new Date().toISOString();
        salvaSincro(sincro);
        if (cambiato) window.dispatchEvent(new CustomEvent('archivio-aggiornato'));
        avvisaStato('sincronizzato');
        return cambiato;
      } catch (e) {
        if (e.tipo === 'rete') avvisaStato('offline', e.message);
        else if (e.tipo === 'sessione') avvisaStato('disconnesso', e.message);
        else avvisaStato('errore', e.message);
        return false;
      } finally {
        sincroInCorso = null;
        if (ancoraUnaVolta) {
          ancoraUnaVolta = false;
          programmaSincronizzazione();
        }
      }
    })();
    return sincroInCorso;
  }

  // ---------- Account (usate da app.js) ----------

  function account() {
    return Supabase.utente();
  }

  async function accedi(email, password) {
    const utente = await Supabase.entra(email, password);
    salvaSincro({ ...leggiSincro(), unito: false, ultimoServer: null, daInviare: [], daEliminare: [] });
    return utente;
  }

  async function creaAccount(email, password) {
    const utente = await Supabase.creaAccount(email, password);
    salvaSincro({ ...leggiSincro(), unito: false, ultimoServer: null, daInviare: [], daEliminare: [] });
    return utente;
  }

  // ---------- Notifiche dei rinnovi (versione 4.18) ----------
  // Il telefono si "iscrive" agli avvisi: il server (funzione invia-avvisi) userà questi dati
  // per mandargli le notifiche. Serve l'account: il server legge gli abbonamenti online.

  // La chiave PUBBLICA per iscriversi. La crea la funzione la prima volta che parte:
  // se non c'è ancora, la facciamo partire e la rileggiamo.
  async function chiavePubblicaNotifiche() {
    const leggi = async () => {
      const righe = await Supabase.database('configurazione_push?select=valore&nome=eq.vapid_pubblica');
      return righe && righe[0] ? righe[0].valore : null;
    };
    let chiave = await leggi();
    if (!chiave) {
      await Supabase.funzione('invia-avvisi', {});
      chiave = await leggi();
    }
    if (!chiave) throw new Error('Il servizio delle notifiche non è ancora pronto su Supabase.');
    return chiave;
  }

  // Salva (o aggiorna) l'iscrizione di questo telefono con le preferenze
  // iscrizione = quella del browser trasformata in testo (toJSON): { endpoint, keys: { p256dh, auth } }
  async function salvaIscrizioneNotifiche(iscrizione, { giorni, ora, fuso }) {
    await Supabase.database('iscrizioni_push?on_conflict=endpoint', {
      metodo: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
      corpo: {
        endpoint: iscrizione.endpoint,
        p256dh: iscrizione.keys.p256dh,
        auth: iscrizione.keys.auth,
        giorni_preavviso: giorni,
        ora,
        fuso,
      },
    });
  }

  async function eliminaIscrizioneNotifiche(endpoint) {
    await Supabase.database(`iscrizioni_push?endpoint=eq.${encodeURIComponent(endpoint)}`, { metodo: 'DELETE' });
  }

  // Una notifica di prova, subito, a questo telefono
  async function provaNotifica(endpoint) {
    await Supabase.funzione('invia-avvisi', { prova: endpoint });
  }

  // Cancella TUTTO quello che l'app ha salvato su questo telefono (dati, impostazioni, account).
  // Serve solo come ultima spiaggia dalla schermata di blocco, se non si riesce più a sbloccare.
  async function cancellaTutto() {
    await Supabase.esci();
    for (const chiave of [CHIAVE, CHIAVE_IMPOSTAZIONI, CHIAVE_SINCRO]) {
      try {
        localStorage.removeItem(chiave);
      } catch (e) {
        /* niente da fare */
      }
    }
  }

  // La password dell'account con cui sei entrato è giusta? (per sbloccare l'app senza Face ID)
  async function verificaPassword(password) {
    const utente = Supabase.utente();
    if (!utente) throw new Error('Su questo telefono non sei entrato con un account.');
    await Supabase.verificaPassword(utente.email, password);
  }

  // ---------- Password dimenticata (le chiamate vere sono in supabase.js) ----------
  // Il link nell'email riporterà a questa stessa pagina (l'indirizzo dell'app, senza "#…")
  async function recuperaPassword(email) {
    await Supabase.recuperaPassword(email, location.origin + location.pathname);
  }

  function leggiRitornoDaEmail(hash) {
    return Supabase.leggiRitornoDaEmail(hash);
  }

  async function impostaNuovaPassword(token, password) {
    await Supabase.impostaNuovaPassword(token, password);
  }

  // Esci: i dati restano su questo dispositivo, ma non si sincronizzano più
  async function esci() {
    await Supabase.esci();
    try {
      localStorage.removeItem(CHIAVE_SINCRO);
    } catch (e) {
      /* niente da fare */
    }
    avvisaStato('disconnesso');
  }

  // Lo stato attuale e l'ora dell'ultima sincronizzazione riuscita
  function statoSincronizzazione() {
    const sincro = leggiSincro();
    return {
      ...statoAttuale,
      ultimaRiuscita: sincro.ultimaRiuscita,
      inAttesa: sincro.daInviare.length + sincro.daEliminare.length,
    };
  }

  // Queste sono le sole funzioni "visibili" dall'esterno
  return {
    tutti, aggiungi, aggiorna, elimina, ripristina, esportaBackup, leggiBackup, sostituisciTutti,
    leggiImpostazione, salvaImpostazione,
    account, accedi, creaAccount, esci, sincronizza, statoSincronizzazione,
    recuperaPassword, leggiRitornoDaEmail, impostaNuovaPassword, verificaPassword, cancellaTutto,
    chiavePubblicaNotifiche, salvaIscrizioneNotifiche, eliminaIscrizioneNotifiche, provaNotifica,
    controllaLink,
  };
})();
