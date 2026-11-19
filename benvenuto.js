/* =====================================================================
   benvenuto.js — La schermata di benvenuto "Orbita" e il saluto lampo.

   - mostra(...)       → la scena "Orbita" (solo al primo avvio): i pianeti con
                         le iniziali girano intorno al totale; poi chiede il nome.
                         Restituisce una "promessa" che si risolve quando hai finito,
                         con { nome, account } (account = hai toccato "Ho già un account").
   - salutoLampo(...)  → a ogni apertura, per meno di un secondo, la goccia con
                         "Buonasera, Tommaso". Si salta toccando.
   - testoSaluto(nome) → "Buongiorno", "Buon pomeriggio" o "Buonasera" (+ nome).
   - iniziale / tinta  → l'iniziale e il colore del "pianeta" di un abbonamento.

   Il salvataggio (nome, benvenuto già visto) lo fa app.js tramite Archivio.
   ===================================================================== */

const Benvenuto = (function () {
  const $ = (id) => document.getElementById(id);
  const aspetta = (ms) => new Promise((fatto) => setTimeout(fatto, ms));
  const movimentoRidotto = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // "Buonasera, Tommaso" (o solo "Buonasera" se il nome non c'è)
  function testoSaluto(nome) {
    const ora = new Date().getHours();
    const parola = ora >= 5 && ora < 12 ? 'Buongiorno'
      : ora >= 12 && ora < 18 ? 'Buon pomeriggio'
      : 'Buonasera';
    return nome ? `${parola}, ${nome}` : parola;
  }

  // La prima lettera o cifra del nome, maiuscola: "Disney+" → "D", "iCloud+" → "I"
  function iniziale(nome) {
    const carattere = [...String(nome).trim()].find((c) => /[\p{L}\p{N}]/u.test(c));
    return (carattere || '•').toUpperCase();
  }

  // Uno dei 5 colori, scelto dal nome: lo stesso nome ha sempre lo stesso colore
  function tinta(nome) {
    let numero = 0;
    for (const c of String(nome)) numero = (numero * 31 + c.codePointAt(0)) >>> 0;
    return `mono-${(numero % 5) + 1}`;
  }

  function creaPianeta(nome, angolo, ritardo, vuoto = false) {
    const pianeta = document.createElement('span');
    pianeta.className = `pianeta ${vuoto ? 'vuoto' : tinta(nome)}`;
    pianeta.style.setProperty('--angolo', `${angolo}deg`);
    pianeta.style.setProperty('--ritardo', `${ritardo}ms`);
    const corpo = document.createElement('span');
    corpo.className = 'pianeta-corpo';
    // Dentro la luna: il logo del servizio (da loghi.js) oppure l'iniziale
    if (vuoto) corpo.textContent = '+';
    else Loghi.riempi(corpo, nome, iniziale(nome));
    pianeta.append(corpo);
    return pianeta;
  }

  // Mette i pianeti sui due anelli: fino a 4 su quello interno, fino a 6 su quello esterno
  function preparaOrbita(nomi) {
    const interno = $('anello-interno');
    const esterno = $('anello-esterno');
    interno.replaceChildren();
    esterno.replaceChildren();

    const elenco = nomi.slice(0, 10);
    const vuoto = elenco.length === 0;
    if (vuoto) elenco.push('', '', ''); // nessun abbonamento: tre pianeti "+"

    const quantiDentro = Math.min(4, Math.ceil(elenco.length / 2));
    const dentro = elenco.slice(0, quantiDentro);
    const fuori = elenco.slice(quantiDentro);

    // Distribuiamo gli angoli in modo uniforme; l'anello esterno parte sfasato
    dentro.forEach((nome, i) => {
      interno.append(creaPianeta(nome, (360 / dentro.length) * i - 90, 250 + i * 90, vuoto));
    });
    fuori.forEach((nome, i) => {
      esterno.append(creaPianeta(nome, (360 / fuori.length) * i - 60, 450 + i * 90, vuoto));
    });
  }

  // ---------- La scena "Orbita" ----------
  function mostra({ nomi, totale, formatta }) {
    return new Promise((risolvi) => {
      const schermata = $('benvenuto');
      const passo1 = $('benvenuto-passo-1');
      const passo2 = $('benvenuto-passo-2');
      const campoNome = $('benvenuto-nome');
      let account = false;

      preparaOrbita(nomi);
      schermata.hidden = false;
      schermata.getBoundingClientRect(); // "fotografa" lo stato iniziale, poi parte la dissolvenza
      schermata.classList.add('visibile');
      document.body.classList.add('bloccato');

      // Il totale al centro conta da 0, quando i pianeti stanno spuntando
      setTimeout(() => Animazioni.conta($('benvenuto-totale'), totale, formatta), 300);
      // Il focus va sulla schermata (utile per VoiceOver), senza disegnare bordi sul pulsante
      schermata.focus({ preventScroll: true });

      // Passo 2: chiediamo il nome. Il campo va attivato SUBITO dentro al tocco,
      // altrimenti l'iPhone non apre la tastiera.
      const vaiAlNome = (conAccount) => {
        account = conAccount;
        passo1.hidden = true;
        passo2.hidden = false;
        schermata.classList.add('passo-nome');
        campoNome.focus();
      };
      $('benvenuto-inizia').onclick = () => vaiAlNome(false);
      $('benvenuto-account').onclick = () => vaiAlNome(true);

      // Fine: gli anelli si raccolgono al centro e la schermata svanisce
      const finisci = async (nome) => {
        campoNome.blur();
        schermata.classList.add('atterra');
        // Avvisiamo app.js quando le lune stanno per raggiungere il pianeta:
        // l'app comincia a entrare mentre la scena svanisce
        await aspetta(movimentoRidotto() ? 0 : 750);
        risolvi({ nome: nome.trim().slice(0, 30), account });
        await aspetta(movimentoRidotto() ? 150 : 650);
        schermata.hidden = true;
        schermata.classList.remove('visibile', 'passo-nome', 'atterra');
        passo1.hidden = false;
        passo2.hidden = true;
        document.body.classList.remove('bloccato');
      };
      passo2.onsubmit = (e) => {
        e.preventDefault(); // non ricaricare la pagina
        finisci(campoNome.value);
      };
      $('benvenuto-salta').onclick = () => finisci('');
    });
  }

  // ---------- Il saluto lampo a ogni apertura ----------
  // Si risolve quando inizia a svanire: è il momento in cui app.js disegna la Home.
  function salutoLampo(testo) {
    return new Promise((risolvi) => {
      const lampo = $('saluto-avvio');
      $('saluto-avvio-testo').textContent = testo;
      lampo.hidden = false;
      lampo.getBoundingClientRect();
      lampo.classList.add('visibile');

      let finito = false;
      const chiudi = async () => {
        if (finito) return;
        finito = true;
        lampo.classList.remove('visibile');
        risolvi();
        await aspetta(380); // il tempo della dissolvenza
        lampo.hidden = true;
      };
      lampo.addEventListener('click', chiudi, { once: true }); // un tocco lo salta
      setTimeout(chiudi, movimentoRidotto() ? 500 : 850);
    });
  }

  return { mostra, salutoLampo, testoSaluto, iniziale, tinta };
})();
