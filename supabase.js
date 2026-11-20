/* =====================================================================
   supabase.js — Il collegamento con Supabase (il database online).

   Questo file sa fare solo due cose:
   1. gestire l'ACCOUNT: creare l'account, entrare, uscire, e tenere
      "aperta" la sessione (cioè ricordarsi che sei entrato);
   2. mandare RICHIESTE al database a nome dell'utente entrato.

   Non usiamo librerie: parliamo con Supabase con fetch(), il comando
   standard di JavaScript per chiamare un servizio su internet.
   Lo usa SOLO storage.js: app.js non lo chiama mai direttamente.

   Nota sulla chiave: la chiave "publishable" è fatta apposta per stare
   dentro un'app pubblica. I dati sono protetti dalle regole del database
   (ognuno vede solo i propri abbonamenti), non dal segreto della chiave.
   La chiave "secret" NON va mai scritta qui.
   ===================================================================== */

const Supabase = (function () {
  const URL_PROGETTO = 'https://rjsdckmaadbevnadgrkb.supabase.co';
  const CHIAVE_PUBBLICA = 'sb_publishable_byWkMwDeLKaXG3aGKJ-KXw_Nel12jxz';

  // Il "cassetto" del localStorage in cui teniamo la sessione aperta
  const CHIAVE_SESSIONE = 'abbonamenti:sessione';

  // Un errore con un "tipo", così chi lo riceve capisce cosa è successo:
  // 'rete' = niente internet, 'sessione' = bisogna rientrare, 'server' = altro problema
  class ErroreOnline extends Error {
    constructor(messaggio, tipo, codiceHttp) {
      super(messaggio);
      this.tipo = tipo;
      this.codiceHttp = codiceHttp;
    }
  }

  // ---------- La sessione: chi è entrato e con quali "biglietti" ----------
  // Supabase, quando entri, dà due biglietti:
  // - access_token: dura circa un'ora, va mostrato a ogni richiesta;
  // - refresh_token: serve a farsi dare un nuovo access_token quando scade.

  function leggiSessione() {
    try {
      return JSON.parse(localStorage.getItem(CHIAVE_SESSIONE));
    } catch (e) {
      return null;
    }
  }

  function salvaSessione(sessione) {
    localStorage.setItem(CHIAVE_SESSIONE, JSON.stringify(sessione));
  }

  function cancellaSessione() {
    try {
      localStorage.removeItem(CHIAVE_SESSIONE);
    } catch (e) {
      /* niente da fare */
    }
  }

  // Trasforma la risposta di Supabase nella nostra sessione
  function sessioneDaRisposta(dati) {
    return {
      access_token: dati.access_token,
      refresh_token: dati.refresh_token,
      scadeIl: Date.now() + dati.expires_in * 1000, // quando scade l'access_token
      email: dati.user.email,
      idUtente: dati.user.id,
    };
  }

  // ---------- Messaggi d'errore in italiano ----------
  function messaggioErrore(dati, codiceHttp) {
    const codice = (dati && (dati.error_code || dati.code)) || '';
    const messaggi = {
      invalid_credentials: 'Email o password non corretti.',
      user_already_exists: 'Esiste già un account con questa email: usa "Accedi".',
      email_exists: 'Esiste già un account con questa email: usa "Accedi".',
      weak_password: 'La password è troppo debole: usa almeno 6 caratteri.',
      email_address_invalid: 'Controlla l\'indirizzo email.',
      validation_failed: 'Controlla l\'indirizzo email e la password.',
      signup_disabled: 'La creazione di nuovi account è chiusa.',
      email_not_confirmed: 'Prima devi confermare l\'email (controlla la posta).',
      over_request_rate_limit: 'Troppi tentativi: riprova tra qualche minuto.',
      over_email_send_rate_limit: 'Troppe email in poco tempo: riprova tra qualche minuto.',
      same_password: 'La nuova password è uguale a quella di prima: scegline una diversa.',
      otp_expired: 'Il link dell\'email è scaduto o è già stato usato: chiedine uno nuovo.',
      session_not_found: 'Il link dell\'email non è più valido: chiedine uno nuovo.',
    };
    if (messaggi[codice]) return messaggi[codice];
    if (codiceHttp === 429) return messaggi.over_request_rate_limit;
    if (codiceHttp >= 500) return 'Il servizio online non risponde: riprova tra poco.';
    const testo = dati && (dati.msg || dati.message || dati.error_description);
    return `Errore del servizio online (${codiceHttp})${testo ? `: ${testo}` : ''}.`;
  }

  // ---------- La chiamata di base a Supabase ----------
  // opzioni: { metodo, corpo, token, prefer }
  async function chiama(percorso, opzioni = {}) {
    const intestazioni = {
      apikey: CHIAVE_PUBBLICA,
      'Content-Type': 'application/json',
    };
    if (opzioni.token) intestazioni.Authorization = `Bearer ${opzioni.token}`;
    if (opzioni.prefer) intestazioni.Prefer = opzioni.prefer;

    let risposta;
    try {
      risposta = await fetch(URL_PROGETTO + percorso, {
        method: opzioni.metodo || 'GET',
        headers: intestazioni,
        body: opzioni.corpo === undefined ? undefined : JSON.stringify(opzioni.corpo),
      });
    } catch (e) {
      // fetch fallisce così quando non c'è connessione
      throw new ErroreOnline('Nessuna connessione a internet.', 'rete');
    }

    // Alcune risposte sono vuote (es. dopo un salvataggio): leggiamo il testo prima
    const testo = await risposta.text();
    let dati = null;
    try {
      dati = testo ? JSON.parse(testo) : null;
    } catch (e) {
      dati = null;
    }

    if (!risposta.ok) {
      const tipo = risposta.status === 401 ? 'sessione' : 'server';
      throw new ErroreOnline(messaggioErrore(dati, risposta.status), tipo, risposta.status);
    }
    return dati;
  }

  // ---------- Account ----------

  async function creaAccount(email, password) {
    const dati = await chiama('/auth/v1/signup', { metodo: 'POST', corpo: { email, password } });
    if (!dati || !dati.access_token) {
      // Succede se nel progetto è attiva la conferma via email
      throw new ErroreOnline('Account creato: conferma l\'email che ti è arrivata, poi accedi.', 'server');
    }
    salvaSessione(sessioneDaRisposta(dati));
    return utente();
  }

  async function entra(email, password) {
    const dati = await chiama('/auth/v1/token?grant_type=password', {
      metodo: 'POST',
      corpo: { email, password },
    });
    salvaSessione(sessioneDaRisposta(dati));
    return utente();
  }

  async function esci() {
    const sessione = leggiSessione();
    cancellaSessione(); // sul dispositivo usciamo subito, anche senza internet
    if (!sessione) return;
    try {
      await chiama('/auth/v1/logout', { metodo: 'POST', token: sessione.access_token });
    } catch (e) {
      /* se non c'è internet, pazienza: la sessione online scadrà da sola */
    }
  }

  // Controlla che la password dell'account sia giusta, SENZA aprire una nuova sessione
  // (serve per "Non riesci a sbloccare?" della schermata di blocco)
  async function verificaPassword(email, password) {
    await chiama('/auth/v1/token?grant_type=password', { metodo: 'POST', corpo: { email, password } });
  }

  // ---------- Password dimenticata ----------
  // 1. Supabase manda all'indirizzo un'email con un link. Il link riporta a "indirizzoRitorno"
  //    (la nostra app) con, dopo il "#", un biglietto temporaneo e "type=recovery".
  //    Per sicurezza Supabase risponde "ok" anche se l'email non ha un account.
  async function recuperaPassword(email, indirizzoRitorno) {
    await chiama(`/auth/v1/recover?redirect_to=${encodeURIComponent(indirizzoRitorno)}`, {
      metodo: 'POST',
      corpo: { email },
    });
  }

  // 2. Legge quello che c'è dopo il "#" nell'indirizzo della pagina.
  //    Restituisce { tipo: 'recovery', token } se è il link dell'email,
  //    { errore: 'messaggio' } se il link è scaduto o sbagliato, null se non c'è niente.
  function leggiRitornoDaEmail(hash) {
    const parti = new URLSearchParams(String(hash || '').replace(/^#/, ''));
    if (parti.get('error') || parti.get('error_code')) {
      return { errore: messaggioErrore({ error_code: parti.get('error_code') || parti.get('error') }, 400) };
    }
    if (parti.get('access_token') && parti.get('type')) {
      return { tipo: parti.get('type'), token: parti.get('access_token') };
    }
    return null;
  }

  // 3. Salva la nuova password usando il biglietto temporaneo arrivato con il link.
  //    Non entriamo nell'account qui (siamo in Safari): poi si entra dall'app con la password nuova.
  async function impostaNuovaPassword(token, password) {
    await chiama('/auth/v1/user', { metodo: 'PUT', token, corpo: { password } });
  }

  // Chi è entrato? { email, id } oppure null
  function utente() {
    const sessione = leggiSessione();
    return sessione ? { email: sessione.email, id: sessione.idUtente } : null;
  }

  // Restituisce un access_token valido, rinnovandolo se sta per scadere
  async function tokenValido(forzaRinnovo = false) {
    const sessione = leggiSessione();
    if (!sessione) throw new ErroreOnline('Non hai effettuato l\'accesso.', 'sessione');

    const scadeTraPoco = Date.now() > sessione.scadeIl - 60 * 1000; // meno di un minuto
    if (!forzaRinnovo && !scadeTraPoco) return sessione.access_token;

    try {
      const dati = await chiama('/auth/v1/token?grant_type=refresh_token', {
        metodo: 'POST',
        corpo: { refresh_token: sessione.refresh_token },
      });
      salvaSessione(sessioneDaRisposta(dati));
      return dati.access_token;
    } catch (e) {
      // Niente internet o server in difficoltà: riproveremo più tardi
      if (e.tipo === 'rete' || e.codiceHttp >= 500 || e.codiceHttp === 429) throw e;
      // Il biglietto di rinnovo non vale più: bisogna rientrare
      cancellaSessione();
      throw new ErroreOnline('La sessione è scaduta: accedi di nuovo.', 'sessione');
    }
  }

  // ---------- Richieste al database, a nome dell'utente entrato ----------
  // percorso: es. 'abbonamenti?select=*'
  async function database(percorso, opzioni = {}) {
    const token = await tokenValido();
    try {
      return await chiama(`/rest/v1/${percorso}`, { ...opzioni, token });
    } catch (e) {
      if (e.codiceHttp !== 401) throw e;
      // Il token è stato rifiutato: ne chiediamo uno nuovo e riproviamo una volta
      const nuovoToken = await tokenValido(true);
      return chiama(`/rest/v1/${percorso}`, { ...opzioni, token: nuovoToken });
    }
  }

  // Chiama una "Edge Function" di Supabase (es. invia-avvisi per la notifica di prova).
  // La funzione delle notifiche non chiede chiavi: nel corpo va solo l'indirizzo del telefono.
  async function funzione(nome, corpo) {
    let risposta;
    try {
      risposta = await fetch(`${URL_PROGETTO}/functions/v1/${nome}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo || {}),
      });
    } catch (e) {
      throw new ErroreOnline('Nessuna connessione a internet.', 'rete');
    }
    const dati = await risposta.json().catch(() => null);
    if (!risposta.ok) throw new ErroreOnline((dati && dati.errore) || `Errore del servizio online (${risposta.status}).`, 'server', risposta.status);
    return dati;
  }

  return {
    creaAccount, entra, esci, utente, database, funzione, ErroreOnline,
    recuperaPassword, leggiRitornoDaEmail, impostaNuovaPassword, verificaPassword,
  };
})();
