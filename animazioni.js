/* =====================================================================
   animazioni.js — Le animazioni che hanno bisogno di JavaScript.

   (Quelle semplici, come le entrate e i rimbalzi, stanno in vetro.css.)
   Qui ci sono:
   1. conta()                 — i numeri dei totali "contano" fino al valore nuovo
   2. posizionaIndicatore()   — la goccia di vetro che scivola sotto il filtro scelto
   3. barraCompatta()         — la barra in alto diventa di vetro poco a poco, mentre scorri
   4. trascinaPerChiudere()   — il foglio si chiude tirandolo giù con il dito
   5. avviso()                — la capsula "Salvato ✓" che scende dall'alto (anche con "Annulla")
   6. scorriRighe()           — fai scorrere una riga verso sinistra: compaiono le azioni

   Tutte rispettano "Riduci movimento": se è attivo, niente animazioni.
   ===================================================================== */

const Animazioni = (function () {
  // L'utente ha chiesto di ridurre il movimento? (Impostazioni → Accessibilità)
  function movimentoRidotto() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // ---------- 1. Numeri che contano ----------
  // Da quanto valeva prima al valore nuovo, in 0,7 secondi, rallentando alla fine.
  // "formatta" trasforma il numero in testo (es. 64.97 → "64,97 €").
  function conta(elemento, valore, formatta) {
    // La prima volta partiamo da 0: all'avvio i totali "salgono"
    const partenza = elemento.dataset.valore === undefined ? 0 : Number(elemento.dataset.valore);
    elemento.dataset.valore = String(valore);
    cancelAnimationFrame(Number(elemento.dataset.fotogramma) || 0);

    if (movimentoRidotto() || partenza === valore) {
      elemento.textContent = formatta(valore);
      return;
    }

    const durata = 700;
    const inizio = performance.now();
    const passo = (adesso) => {
      const t = Math.min(1, (adesso - inizio) / durata); // da 0 a 1
      const morbido = 1 - (1 - t) ** 3;                  // veloce all'inizio, lento alla fine
      elemento.textContent = formatta(partenza + (valore - partenza) * morbido);
      if (t < 1) elemento.dataset.fotogramma = String(requestAnimationFrame(passo));
    };
    elemento.dataset.fotogramma = String(requestAnimationFrame(passo));
  }

  // ---------- 2. La goccia che scivola sotto il filtro scelto ----------
  // app.js ridisegna i filtri da zero ogni volta: la goccia invece è sempre la stessa
  // e ricordiamo dov'era, così può scivolare dalla posizione vecchia a quella nuova.
  const gocce = new WeakMap();
  const posizioniPrecedenti = new WeakMap();

  function posizionaIndicatore(contenitore, bersaglio) {
    let goccia = gocce.get(contenitore);
    if (!goccia) {
      goccia = document.createElement('span');
      goccia.className = 'indicatore';
      goccia.setAttribute('aria-hidden', 'true');
      gocce.set(contenitore, goccia);
    }
    contenitore.prepend(goccia); // la rimettiamo nel contenitore, sotto le pillole

    if (!bersaglio || !bersaglio.offsetWidth) {
      goccia.hidden = true;
      return;
    }
    goccia.hidden = false;

    // Misuriamo dove sta la pillola rispetto alla fila (contando anche lo scorrimento laterale)
    const fila = contenitore.getBoundingClientRect();
    const pillola = bersaglio.getBoundingClientRect();
    const nuova = {
      x: pillola.left - fila.left + contenitore.scrollLeft,
      y: pillola.top - fila.top + contenitore.scrollTop,
      larghezza: pillola.width,
      altezza: pillola.height,
    };
    const applica = (p) => {
      goccia.style.width = `${p.larghezza}px`;
      goccia.style.height = `${p.altezza}px`;
      goccia.style.transform = `translate(${p.x}px, ${p.y}px)`;
    };

    const vecchia = posizioniPrecedenti.get(contenitore);
    goccia.style.transition = 'none';
    applica(vecchia && !movimentoRidotto() ? vecchia : nuova);
    goccia.getBoundingClientRect(); // "fotografa" la posizione di partenza
    goccia.style.transition = '';   // riaccende l'animazione del CSS...
    applica(nuova);                 // ...e la manda alla posizione nuova
    posizioniPrecedenti.set(contenitore, nuova);
  }

  // ---------- 3. Barra in alto compatta ----------
  // Mentre scorri calcoliamo "quanto" il titolo grande è finito dietro la barra:
  // 0 = ancora tutto visibile, 1 = tutto nascosto. Il numero va nella variabile CSS
  // --avanzamento-barra e il CSS lo usa per far comparire il vetro, il titolo piccolo
  // e sfumare il titolo grande POCO A POCO, seguendo il dito (non più di colpo).
  //
  // "daSfumare" (facoltativo): elementi che svaniscono mentre passano sotto la barra.
  // Serve per la fila dei filtri: è una fila che scorre di lato, e il browser la disegna
  // come un "livello" a parte che il vetro della barra non riesce a sfocare
  // (si vedrebbe una pillola nitida accanto al "+").
  function barraCompatta(barra, titoloGrande, daSfumare = []) {
    let inAttesa = false;

    const aggiorna = () => {
      inAttesa = false;
      const fondoBarra = barra.getBoundingClientRect().bottom;
      const titolo = titoloGrande.getBoundingClientRect();
      const avanzamento = Math.min(1, Math.max(0, (fondoBarra - titolo.top) / (titolo.height || 1)));
      document.documentElement.style.setProperty('--avanzamento-barra', avanzamento.toFixed(3));
      // Oltre metà: il "+" perde la bolla (questo cambio invece è un passaggio animato)
      barra.classList.toggle('compatta', avanzamento > 0.6);

      // Quanta parte dell'elemento è ancora SOTTO la barra (visibile): 1 = tutto, 0 = niente
      for (const elemento of daSfumare) {
        const riquadro = elemento.getBoundingClientRect();
        const visibile = Math.min(1, Math.max(0, (riquadro.bottom - fondoBarra) / (riquadro.height || 1)));
        elemento.style.opacity = visibile < 1 ? visibile.toFixed(3) : '';
      }
    };

    // Lo scorrimento manda tantissimi eventi: ricalcoliamo al massimo una volta per fotogramma
    const chiedi = () => {
      if (inAttesa) return;
      inAttesa = true;
      requestAnimationFrame(aggiorna);
    };
    window.addEventListener('scroll', chiedi, { passive: true });
    window.addEventListener('resize', chiedi);
    aggiorna();
  }

  // ---------- 4. Tirare giù il foglio per chiuderlo ----------
  // Si trascina dalla maniglia o dalla barra con "Annulla"/"Salva".
  // Se lo tiri giù abbastanza (o con un gesto veloce) si chiude, altrimenti torna su.
  function trascinaPerChiudere(foglio, chiudi) {
    let inizioY = null;
    let ultimaY = 0;
    let ultimoTempo = 0;
    let velocita = 0;
    let spostamento = 0;

    const zone = foglio.querySelectorAll('.maniglia, .foglio-barra');
    zone.forEach((zona) => {
      zona.addEventListener('touchstart', (e) => {
        if (e.target.closest('button')) return; // i pulsanti funzionano come sempre
        inizioY = e.touches[0].clientY;
        ultimaY = inizioY;
        ultimoTempo = performance.now();
        velocita = 0;
        spostamento = 0;
        foglio.classList.add('trascinando');
      }, { passive: true });
    });

    foglio.addEventListener('touchmove', (e) => {
      if (inizioY === null) return;
      const y = e.touches[0].clientY;
      const adesso = performance.now();
      velocita = (y - ultimaY) / Math.max(1, adesso - ultimoTempo); // pixel al millisecondo
      ultimaY = y;
      ultimoTempo = adesso;
      const giu = y - inizioY;
      // Verso il basso segue il dito; verso l'alto fa un po' di "resistenza"
      spostamento = giu > 0 ? giu : giu / 6;
      foglio.style.transform = `translateY(${spostamento}px)`;
    }, { passive: true });

    const lascia = () => {
      if (inizioY === null) return;
      inizioY = null;
      // Togliamo insieme il "trascinamento" e la posizione del dito:
      // il CSS anima da dove si trova adesso fino a chiuso (o di nuovo aperto)
      foglio.classList.remove('trascinando');
      foglio.style.transform = '';
      if (spostamento > 120 || velocita > 0.6) chiudi();
    };
    foglio.addEventListener('touchend', lascia);
    foglio.addEventListener('touchcancel', lascia);
  }

  // ---------- 5. Capsula di avviso ----------
  // avviso('Salvato')  → capsula con la spunta, per meno di 2 secondi.
  // avviso('Spotify eliminato', { azione: 'Annulla', suAzione: funzione })
  //   → capsula con un pulsante, che resta 5 secondi per darti il tempo di toccarlo.
  let capsula = null;
  let timer = null;

  function avviso(testo, opzioni = {}) {
    if (!capsula) {
      capsula = document.createElement('div');
      capsula.className = 'capsula-avviso';
      capsula.setAttribute('role', 'status'); // VoiceOver lo legge ad alta voce
      document.body.append(capsula);
    }
    const spunta = document.createElement('span');
    spunta.className = 'spunta';
    spunta.setAttribute('aria-hidden', 'true');
    spunta.textContent = '✓';
    capsula.replaceChildren(spunta, document.createTextNode(testo));

    const nascondi = () => capsula.classList.remove('visibile', 'con-azione');

    if (opzioni.azione) {
      const pulsante = document.createElement('button');
      pulsante.type = 'button';
      pulsante.className = 'capsula-azione';
      pulsante.textContent = opzioni.azione;
      pulsante.addEventListener('click', () => {
        clearTimeout(timer);
        nascondi();
        opzioni.suAzione();
      }, { once: true });
      capsula.append(pulsante);
    }

    clearTimeout(timer);
    capsula.classList.remove('visibile');
    capsula.getBoundingClientRect(); // riparte da capo anche se era già visibile
    capsula.classList.add('visibile');
    capsula.classList.toggle('con-azione', Boolean(opzioni.azione)); // con un pulsante si può toccare
    timer = setTimeout(nascondi, opzioni.azione ? 5000 : 1900);
  }

  // ---------- 6. Righe che scorrono verso sinistra ----------
  // Ogni riga (<li class="riga-scorrevole">) ha dietro le sue azioni (.azioni-riga).
  // Trascinandola a sinistra le azioni compaiono e si allargano con il dito:
  //   - la lasci a metà strada o più → resta aperta, con le azioni da toccare;
  //   - la tiri fino in fondo (oltre il 55% della larghezza) → azione completa ("Elimina");
  //   - altrimenti torna al suo posto.
  // Se il dito si muove prima in verticale, è uno scorrimento della pagina: non facciamo niente.
  // opzioni: { larghezzaAzioni: 160, suCompleta: (li) => ... }
  let rigaAperta = null;

  function chiudiRighe() {
    if (!rigaAperta) return;
    rigaAperta.style.setProperty('--dx', '0px');
    rigaAperta.classList.remove('aperta', 'oltre');
    rigaAperta = null;
  }

  function scorriRighe(contenitore, opzioni) {
    const larghezza = opzioni.larghezzaAzioni;
    let gesto = null; // il trascinamento in corso: { li, inizioX, inizioY, base, direzione, ... }
    let ultimoTrascinamento = 0;

    const sposta = (li, dx) => li.style.setProperty('--dx', `${dx}px`);

    contenitore.addEventListener('pointerdown', (e) => {
      const li = e.target.closest('.riga-scorrevole');
      if (!li || e.button !== 0 || e.target.closest('.azioni-riga')) return;
      // Tocchi un'altra riga mentre una è aperta: la chiudiamo
      if (rigaAperta && rigaAperta !== li) chiudiRighe();
      gesto = {
        li,
        id: e.pointerId,
        inizioX: e.clientX,
        inizioY: e.clientY,
        base: li.classList.contains('aperta') ? -larghezza : 0, // da dove parte la riga
        direzione: null,  // ancora da capire: 'orizzontale' o 'verticale'
        dx: 0,
        velocita: 0,
        ultimaX: e.clientX,
        ultimoTempo: performance.now(),
      };
    });

    contenitore.addEventListener('pointermove', (e) => {
      if (!gesto || e.pointerId !== gesto.id) return;
      const mossoX = e.clientX - gesto.inizioX;
      const mossoY = e.clientY - gesto.inizioY;

      // Nei primi 8 pixel capiamo se il dito va di lato o in su/giù
      if (!gesto.direzione) {
        if (Math.abs(mossoX) < 8 && Math.abs(mossoY) < 8) return;
        gesto.direzione = Math.abs(mossoX) > Math.abs(mossoY) ? 'orizzontale' : 'verticale';
        if (gesto.direzione === 'verticale') { gesto = null; return; }
        gesto.li.classList.add('trascinando'); // niente transizioni: segue il dito
        try { gesto.li.setPointerCapture(e.pointerId); } catch (errore) { /* non indispensabile */ }
      }

      const adesso = performance.now();
      gesto.velocita = (e.clientX - gesto.ultimaX) / Math.max(1, adesso - gesto.ultimoTempo);
      gesto.ultimaX = e.clientX;
      gesto.ultimoTempo = adesso;

      let dx = gesto.base + mossoX;
      if (dx > 0) dx /= 5; // verso destra non c'è niente: un po' di "resistenza"
      gesto.dx = dx;
      sposta(gesto.li, dx);
      // Oltre il 55%: l'azione rossa si allarga a tutta la riga (lasciando si elimina)
      gesto.li.classList.toggle('oltre', -dx > gesto.li.offsetWidth * 0.55);
    });

    const lascia = (e) => {
      if (!gesto || e.pointerId !== gesto.id) return;
      const { li, direzione, dx, velocita } = gesto;
      gesto = null;
      if (direzione !== 'orizzontale') return; // era solo un tocco
      ultimoTrascinamento = performance.now();
      li.classList.remove('trascinando'); // da qui in poi il CSS anima fino alla posizione finale

      if (e.type !== 'pointercancel' && li.classList.contains('oltre')) {
        sposta(li, -li.offsetWidth); // la riga esce tutta a sinistra...
        rigaAperta = null;
        opzioni.suCompleta(li);      // ...e app.js fa l'azione
      } else if (e.type !== 'pointercancel' && (dx < -larghezza / 2 || velocita < -0.5)) {
        sposta(li, -larghezza);      // resta aperta
        li.classList.add('aperta');
        rigaAperta = li;
      } else {
        sposta(li, 0);               // torna al suo posto
        li.classList.remove('aperta', 'oltre');
        if (rigaAperta === li) rigaAperta = null;
      }
    };
    contenitore.addEventListener('pointerup', lascia);
    contenitore.addEventListener('pointercancel', lascia);

    // Dopo un trascinamento il browser manda comunque un "click": lo ignoriamo,
    // così non si apre il modulo. Anche toccare una riga aperta la chiude e basta.
    contenitore.addEventListener('click', (e) => {
      const appenaTrascinato = performance.now() - ultimoTrascinamento < 400;
      const suRigaAperta = rigaAperta && e.target.closest('.riga-scorrevole') === rigaAperta
        && !e.target.closest('.azioni-riga');
      if (appenaTrascinato || suRigaAperta) {
        e.stopPropagation();
        e.preventDefault();
        if (suRigaAperta && !appenaTrascinato) chiudiRighe();
      }
    }, true); // "true": questo controllo arriva prima degli altri

    // Scorrendo la pagina la riga aperta si richiude
    window.addEventListener('scroll', () => {
      if (rigaAperta && !gesto) chiudiRighe();
    }, { passive: true });
  }

  return { conta, posizionaIndicatore, barraCompatta, trascinaPerChiudere, avviso, scorriRighe, chiudiRighe };
})();
