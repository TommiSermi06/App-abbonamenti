/* =====================================================================
   blocco.js — Il blocco con Face ID (oggetto Blocco).

   Come funziona il Face ID in un'app web: si usa WebAuthn, lo standard dei
   browser per le "passkey". Quando attivi il blocco, l'iPhone crea una chiave
   protetta da Face ID (la trovi nel Portachiavi con il nome "Abbonamenti").
   Per sbloccare chiediamo all'iPhone di usarla: lo fa SOLO dopo il Face ID
   (o il codice del telefono, se il Face ID non riconosce il viso).

   Cosa protegge: la SCHERMATA dell'app (chi prende in mano il telefono non vede
   abbonamenti e carte). I dati sul telefono non vengono cifrati.

   Qui dentro:
   - disponibile()        → il dispositivo ha Face ID / Touch ID utilizzabili?
   - registra(nome)       → crea la chiave; restituisce il suo "id" (da salvare)
   - verifica(id)         → chiede il Face ID; va a buon fine solo se è riuscito
   - chiudi(opzioni)      → mostra la schermata di blocco e aspetta lo sblocco
   - copri() / scopri()   → copre l'app di colpo (quando va in background) e la ricopre
   - stato()              → 'aperto', 'coperto' (solo coperto) o 'bloccato' (serve il Face ID)

   Questo file non salva niente: l'id della chiave lo salva app.js tramite Archivio.
   ===================================================================== */

const Blocco = (function () {
  const $ = (id) => document.getElementById(id);
  let stato = 'aperto';

  // ---------- Piccoli aiuti per i byte ----------
  // WebAuthn lavora con byte grezzi; noi li salviamo come testo "base64url"
  function casuali(quanti) {
    return crypto.getRandomValues(new Uint8Array(quanti));
  }

  function inTesto(byte) {
    let binario = '';
    for (const b of new Uint8Array(byte)) binario += String.fromCharCode(b);
    return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function daTesto(testo) {
    const base64 = testo.replace(/-/g, '+').replace(/_/g, '/');
    return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  }

  // Un errore di WebAuthn in italiano
  function messaggio(errore) {
    if (errore && errore.name === 'NotAllowedError') return 'Sblocco annullato o non riuscito. Riprova.';
    if (errore && errore.name === 'SecurityError') return 'Il blocco funziona solo dall\'app installata (indirizzo https).';
    return 'Face ID non disponibile in questo momento. Riprova.';
  }

  // ---------- Face ID ----------
  async function disponibile() {
    try {
      return Boolean(window.PublicKeyCredential)
        && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (e) {
      return false;
    }
  }

  // Crea la chiave protetta da Face ID. "userVerification: required" = serve il Face ID (o il codice)
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
  // "l'utente è stato verificato" (un bit nei dati della risposta), non solo "presente".
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
    const verificato = (datiAutenticatore[32] & 0x04) !== 0; // il bit "UV" (user verified)
    if (!verificato) throw Object.assign(new Error('non verificato'), { name: 'NotAllowedError' });
  }

  // ---------- La schermata di blocco ----------
  function copri() {
    const schermata = $('blocco');
    if (stato === 'aperto') stato = 'coperto';
    schermata.hidden = false;
    schermata.classList.add('visibile', 'istantaneo'); // di colpo: l'anteprima delle app non deve vedere niente
  }

  function scopri() {
    const schermata = $('blocco');
    stato = 'aperto';
    schermata.classList.remove('istantaneo', 'visibile', 'aiuto');
    setTimeout(() => { if (stato === 'aperto') schermata.hidden = true; }, 400); // dopo la dissolvenza
  }

  // Mostra la schermata e aspetta lo sblocco.
  // opzioni: { id, conAccount, verificaPassword(password) → Promise, cancellaTutto() → Promise }
  // Si risolve con 'faceid' (sbloccato con Face ID) oppure 'password' (sbloccato con la password dell'account).
  function chiudi({ id, conAccount, verificaPassword, cancellaTutto }) {
    return new Promise((risolvi) => {
      const schermata = $('blocco');
      const errore = $('blocco-errore');
      const pulsante = $('btn-sblocca');
      stato = 'bloccato';
      schermata.hidden = false;
      schermata.classList.remove('istantaneo', 'aiuto');
      schermata.getBoundingClientRect();
      schermata.classList.add('visibile');
      errore.textContent = '';
      $('blocco-password').value = '';
      // Aiuto: con un account si sblocca con la password, senza account si spiega cosa fare
      $('blocco-aiuto-account').hidden = !conAccount;
      $('blocco-aiuto-senza').hidden = conAccount;
      schermata.focus({ preventScroll: true }); // per VoiceOver, senza disegnare bordi sul pulsante

      const fatto = (come) => {
        pulsante.onclick = null;
        $('btn-blocco-aiuto').onclick = null;
        $('btn-blocco-cancella').onclick = null;
        $('modulo-blocco').onsubmit = null;
        scopri();
        risolvi(come);
      };

      // Il Face ID parte solo da un tocco: Safari lo vuole (così nessun sito lo può chiedere a sorpresa)
      pulsante.onclick = async () => {
        errore.textContent = '';
        pulsante.disabled = true;
        try {
          await verifica(id);
          fatto('faceid');
        } catch (e) {
          errore.textContent = messaggio(e);
        } finally {
          pulsante.disabled = false;
        }
      };

      $('btn-blocco-aiuto').onclick = () => {
        schermata.classList.toggle('aiuto');
        if (schermata.classList.contains('aiuto') && conAccount) $('blocco-password').focus();
      };

      // Ultima spiaggia senza account: si cancella tutto su questo telefono (con doppia conferma)
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
    disponibile, registra, verifica, chiudi, copri, scopri,
    stato: () => stato,
    messaggio,
  };
})();
