/* =====================================================================
   blocco.js — Il blocco dell'app (oggetto Blocco): codice PIN o Face ID.

   Cosa protegge: la SCHERMATA dell'app (chi prende in mano il telefono non vede
   abbonamenti e carte). I dati sul telefono non vengono cifrati.

   Due modi, li sceglie l'utente in Impostazioni → Privacy:
   1. CODICE PIN (6 cifre) — tastierina tutta nostra, veloce, senza finestre di iOS.
      Il codice NON viene salvato: salviamo la sua "impronta" (SHA-256 del codice
      unito a un "sale" casuale). Da un'impronta non si risale al codice: per
      controllarlo si ricalcola l'impronta di quello scritto e si confrontano.
   2. FACE ID — con WebAuthn, lo standard dei browser per le "passkey": l'iPhone crea
      una chiave protetta da Face ID (nel Portachiavi con il nome "Abbonamenti") e la
      usa solo dopo il Face ID. iOS mostra il suo foglio "Usare la passkey?": da un'app
      web non si può togliere.

   Qui dentro:
   - faceIdDisponibile(), registra(nome), verifica(id)   → Face ID (WebAuthn)
   - pinDisponibile(), creaImpronta(pin), pinGiusto(pin, impronta) → codice PIN
   - chiediPin({ titolo, testo, controlla })  → la tastierina dalle Impostazioni (con "Annulla")
   - chiudi(opzioni)      → la schermata di blocco: aspetta lo sblocco
   - copri() / scopri()   → copre l'app di colpo (quando va in background) e la scopre
   - stato()              → 'aperto', 'coperto' (solo coperta) o 'bloccato' (serve sbloccare)

   Questo file non salva niente: impronta e id li salva app.js tramite Archivio.
   ===================================================================== */

const Blocco = (function () {
  const $ = (id) => document.getElementById(id);
  const LUNGHEZZA_PIN = 6;
  const TENTATIVI_PRIMA_DELLA_PAUSA = 5;
  const PAUSA_SECONDI = 30;

  let stato = 'aperto';
  let sbagliati = 0;        // codici sbagliati di fila
  let fermoFinoA = 0;       // fino a quando la tastierina è ferma (dopo troppi errori)

  // ---------- Piccoli aiuti per i byte ----------
  function casuali(quanti) {
    return crypto.getRandomValues(new Uint8Array(quanti));
  }

  // Byte → testo "base64url" (per salvarli), e al contrario
  function inTesto(byte) {
    let binario = '';
    for (const b of new Uint8Array(byte)) binario += String.fromCharCode(b);
    return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function daTesto(testo) {
    const base64 = testo.replace(/-/g, '+').replace(/_/g, '/');
    return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  }

  // Un errore del Face ID in italiano
  function messaggio(errore) {
    if (errore && errore.name === 'NotAllowedError') return 'Sblocco annullato o non riuscito. Riprova.';
    if (errore && errore.name === 'SecurityError') return 'Il blocco funziona solo dall\'app installata (indirizzo https).';
    return 'Face ID non disponibile in questo momento. Riprova.';
  }

  // ---------- Face ID (WebAuthn) ----------
  async function faceIdDisponibile() {
    try {
      return Boolean(window.PublicKeyCredential)
        && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (e) {
      return false;
    }
  }

  // Crea la chiave protetta da Face ID. "userVerification: required" = serve il Face ID (o il codice del telefono)
  async function registra(nome) {
    const credenziale = await navigator.credentials.create({
      publicKey: {
        challenge: casuali(32),
        rp: { name: 'Abbonamenti' },
        user: { id: casuali(16), name: 'Abbonamenti', displayName: nome || 'Blocco dell\'app' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // quella del telefono (Face ID), non una chiavetta esterna
          userVerification: 'required',
          residentKey: 'preferred',
        },
        attestation: 'none',
        timeout: 60000,
      },
    });
    return inTesto(credenziale.rawId);
  }

  // Chiede il Face ID con la chiave salvata. Controlliamo anche che l'iPhone dica
  // "l'utente è stato verificato" (il bit "UV" nei dati della risposta), non solo "presente".
  async function verifica(id) {
    const risposta = await navigator.credentials.get({
      publicKey: {
        challenge: casuali(32),
        allowCredentials: [{ type: 'public-key', id: daTesto(id) }],
        userVerification: 'required',
        timeout: 60000,
      },
    });
    const datiAutenticatore = new Uint8Array(risposta.response.authenticatorData);
    const verificato = (datiAutenticatore[32] & 0x04) !== 0;
    if (!verificato) throw Object.assign(new Error('non verificato'), { name: 'NotAllowedError' });
  }

  // ---------- Codice PIN ----------
  // crypto.subtle (per calcolare SHA-256) c'è solo su https o localhost
  function pinDisponibile() {
    return Boolean(window.crypto && crypto.subtle);
  }

  async function sha256(testo) {
    const byte = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(testo));
    return inTesto(byte);
  }

  // L'impronta da salvare: { sale, impronta }. Il "sale" casuale fa sì che due persone
  // con lo stesso codice abbiano impronte diverse.
  async function creaImpronta(pin) {
    const sale = inTesto(casuali(16));
    return { sale, impronta: await sha256(`${sale}:${pin}`) };
  }

  async function pinGiusto(pin, salvato) {
    return Boolean(salvato) && await sha256(`${salvato.sale}:${pin}`) === salvato.impronta;
  }

  // ---------- La tastierina ----------
  // Un solo "lettore" alla volta: la funzione che riceve il codice quando ha 6 cifre
  let quandoCompleto = null;
  let cifre = '';

  function disegnaPallini() {
    [...$('pin-pallini').children].forEach((pallino, i) => pallino.classList.toggle('pieno', i < cifre.length));
  }

  function svuota() {
    cifre = '';
    disegnaPallini();
  }

  // Codice sbagliato: i pallini "scuotono la testa" e si svuotano
  function scuoti() {
    const pallini = $('pin-pallini');
    pallini.classList.remove('scuoti');
    pallini.getBoundingClientRect(); // fa ripartire l'animazione
    pallini.classList.add('scuoti');
    setTimeout(svuota, 350);
  }

  // L'animazione del tasto toccato: piccolo zoom e lampo blu (vedi benvenuto.css, "tasto-premuto").
  // La facciamo partire dal codice perché sull'iPhone lo stato ":active" del CSS spesso non si vede.
  function illumina(tasto) {
    const pulsante = $('tastierino').querySelector(`[data-tasto="${tasto}"]`);
    if (!pulsante) return;
    pulsante.classList.remove('premuto');
    pulsante.getBoundingClientRect(); // fa ripartire l'animazione anche se tocchi due volte lo stesso tasto
    pulsante.classList.add('premuto');
  }

  function premi(tasto) {
    if (!quandoCompleto) return;
    if (Date.now() < fermoFinoA) return;
    $('blocco-errore').textContent = '';
    if (tasto === 'cancella') {
      cifre = cifre.slice(0, -1);
    } else if (cifre.length < LUNGHEZZA_PIN) {
      cifre += tasto;
    }
    disegnaPallini();
    if (cifre.length === LUNGHEZZA_PIN) {
      const scritto = cifre;
      setTimeout(() => quandoCompleto && quandoCompleto(scritto), 120); // si vede l'ultimo pallino pieno
    }
  }

  // I tasti 1-9, uno spazio vuoto, 0 e "cancella"
  function preparaTastierino() {
    const tastierino = $('tastierino');
    if (tastierino.children.length) return;
    for (const tasto of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'cancella']) {
      if (!tasto) {
        tastierino.append(document.createElement('span'));
        continue;
      }
      const pulsante = document.createElement('button');
      pulsante.type = 'button';
      pulsante.className = tasto === 'cancella' ? 'tasto tasto-cancella' : 'tasto';
      pulsante.dataset.tasto = tasto;
      if (tasto === 'cancella') {
        pulsante.setAttribute('aria-label', 'Cancella l\'ultima cifra');
        pulsante.innerHTML = '<svg viewBox="0 0 28 20" width="28" height="20" aria-hidden="true"><path d="M9 2h15a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9l-7-8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="m13 7 6 6m0-6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
      } else {
        pulsante.textContent = tasto;
      }
      tastierino.append(pulsante);
    }
    // Appena il dito tocca il tasto parte l'animazione; la cifra si scrive al "click"
    tastierino.addEventListener('pointerdown', (e) => {
      const pulsante = e.target.closest('.tasto');
      if (pulsante && Date.now() >= fermoFinoA) illumina(pulsante.dataset.tasto);
    });
    tastierino.addEventListener('animationend', (e) => e.target.classList.remove('premuto'));
    tastierino.addEventListener('click', (e) => {
      const pulsante = e.target.closest('.tasto');
      if (pulsante) premi(pulsante.dataset.tasto);
    });
    // Sul computer si può scrivere anche con la tastiera
    document.addEventListener('keydown', (e) => {
      if ($('blocco').hidden || !$('blocco').classList.contains('modo-pin')) return;
      if (e.target.closest && e.target.closest('input')) return;
      if (/^[0-9]$/.test(e.key)) { illumina(e.key); premi(e.key); }
      if (e.key === 'Backspace') { illumina('cancella'); premi('cancella'); }
    });
  }

  // Dopo troppi codici sbagliati la tastierina si ferma per un po'
  function controllaPausa() {
    sbagliati += 1;
    if (sbagliati < TENTATIVI_PRIMA_DELLA_PAUSA) return 'Codice sbagliato. Riprova.';
    sbagliati = 0;
    fermoFinoA = Date.now() + PAUSA_SECONDI * 1000;
    $('blocco').classList.add('fermo');
    setTimeout(() => {
      $('blocco').classList.remove('fermo');
      $('blocco-errore').textContent = '';
    }, PAUSA_SECONDI * 1000);
    return `Troppi tentativi: riprova tra ${PAUSA_SECONDI} secondi.`;
  }

  // ---------- La schermata ----------
  function mostra(modo) {
    const schermata = $('blocco');
    preparaTastierino();
    schermata.hidden = false;
    schermata.classList.remove('istantaneo', 'aiuto', 'in-attesa', 'modo-pin', 'modo-faceid', 'configura');
    schermata.classList.add(`modo-${modo}`);
    schermata.getBoundingClientRect();
    schermata.classList.add('visibile');
    $('blocco-errore').textContent = '';
    $('blocco-password').value = '';
    svuota();
    schermata.focus({ preventScroll: true }); // per VoiceOver, senza disegnare bordi sui pulsanti
  }

  function copri() {
    const schermata = $('blocco');
    if (stato === 'aperto') stato = 'coperto';
    schermata.hidden = false;
    schermata.classList.add('visibile', 'istantaneo'); // di colpo: l'anteprima delle app non deve vedere niente
  }

  function scopri() {
    const schermata = $('blocco');
    stato = 'aperto';
    quandoCompleto = null;
    schermata.classList.remove('istantaneo', 'visibile', 'aiuto', 'in-attesa', 'configura');
    setTimeout(() => { if (stato === 'aperto') schermata.hidden = true; }, 400); // dopo la dissolvenza
  }

  // Dalle Impostazioni: la tastierina per SCEGLIERE o CONTROLLARE il codice, con "Annulla".
  // controlla(pin) facoltativo: se c'è, ripete finché il codice non è giusto.
  // Si risolve con il codice scritto, oppure con null se hai toccato "Annulla".
  function chiediPin({ titolo, testo, controlla }) {
    return new Promise((risolvi) => {
      mostra('pin');
      stato = 'configura';
      $('blocco').classList.add('configura');
      $('blocco-titolo').textContent = titolo;
      $('blocco-testo').textContent = testo;
      const fine = (risultato) => {
        $('btn-blocco-annulla').onclick = null;
        scopri();
        risolvi(risultato);
      };
      $('btn-blocco-annulla').onclick = () => fine(null);
      quandoCompleto = async (pin) => {
        if (!controlla || await controlla(pin)) {
          fine(pin);
          return;
        }
        $('blocco-errore').textContent = controllaPausa();
        scuoti();
      };
    });
  }

  // La schermata di blocco vera e propria.
  // opzioni: { modo: 'pin' | 'faceid', id, impronta, conAccount,
  //            verificaPassword(password) → Promise, cancellaTutto() → Promise }
  // Si risolve con 'sbloccato' oppure 'password' (sbloccata con la password dell'account).
  function chiudi({ modo, id, impronta, conAccount, verificaPassword, cancellaTutto }) {
    return new Promise((risolvi) => {
      mostra(modo);
      stato = 'bloccato';
      const schermata = $('blocco');
      const errore = $('blocco-errore');
      const testo = $('blocco-testo');
      const pulsante = $('btn-sblocca');
      $('blocco-titolo').textContent = 'Abbonamenti è bloccato';
      // Aiuto: con un account si sblocca con la password, senza account si spiega cosa fare
      $('blocco-aiuto-account').hidden = !conAccount;
      $('blocco-aiuto-senza').hidden = conAccount;

      const fatto = (come) => {
        pulsante.onclick = null;
        $('btn-blocco-aiuto').onclick = null;
        $('btn-blocco-cancella').onclick = null;
        $('modulo-blocco').onsubmit = null;
        sbagliati = 0;
        scopri();
        risolvi(come);
      };

      if (modo === 'pin') {
        testo.textContent = 'Inserisci il codice per vedere i tuoi abbonamenti.';
        quandoCompleto = async (pin) => {
          if (await pinGiusto(pin, impronta)) {
            fatto('sbloccato');
            return;
          }
          errore.textContent = controllaPausa();
          scuoti();
        };
      } else {
        const testoNormale = 'Usa Face ID per vedere i tuoi abbonamenti.';
        // Il tocco sul pulsante "Sblocca con Face ID" (la rete di sicurezza)
        pulsante.onclick = async () => {
          errore.textContent = '';
          pulsante.disabled = true;
          try {
            await verifica(id);
            fatto('sbloccato');
          } catch (e) {
            errore.textContent = messaggio(e);
          } finally {
            pulsante.disabled = false;
          }
        };
        // Appena si apre, il Face ID parte DA SOLO. Se l'iPhone vuole un tocco, o se annulli,
        // ricompaiono pulsante e aiuto (senza errori rossi: non hai sbagliato niente).
        schermata.classList.add('in-attesa');
        testo.textContent = 'Sblocco con Face ID…';
        verifica(id)
          .then(() => fatto('sbloccato'))
          .catch(() => {
            schermata.classList.remove('in-attesa');
            testo.textContent = testoNormale;
          });
      }

      $('btn-blocco-aiuto').onclick = () => {
        schermata.classList.toggle('aiuto');
        if (schermata.classList.contains('aiuto') && conAccount) $('blocco-password').focus();
      };

      // Ultima spiaggia senza account: si cancella tutto su questo telefono (con conferma)
      $('btn-blocco-cancella').onclick = async () => {
        if (!confirm('Cancellare tutti i dati di Abbonamenti su questo telefono? Gli abbonamenti salvati qui andranno persi.')) return;
        await cancellaTutto();
      };

      $('modulo-blocco').onsubmit = async (evento) => {
        evento.preventDefault();
        errore.textContent = '';
        try {
          await verificaPassword($('blocco-password').value);
          fatto('password');
        } catch (e) {
          errore.textContent = e.message;
        }
      };
    });
  }

  return {
    faceIdDisponibile, registra, verifica,
    pinDisponibile, creaImpronta, pinGiusto,
    chiediPin, chiudi, copri, scopri,
    stato: () => stato,
    messaggio,
  };
})();
