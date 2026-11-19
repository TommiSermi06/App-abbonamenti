/* =====================================================================
   animazioni.js — Le animazioni che hanno bisogno di JavaScript.

   (Quelle semplici, come le entrate e i rimbalzi, stanno in vetro.css.)
   Qui ci sono:
   1. conta()                 — i numeri dei totali "contano" fino al valore nuovo
   2. posizionaIndicatore()   — la goccia di vetro che scivola sotto il filtro scelto
   3. barraCompatta()         — la barra in alto diventa di vetro quando scorri
   4. trascinaPerChiudere()   — il foglio si chiude tirandolo giù con il dito
   5. avviso()                — la capsula "Salvato ✓" che scende dall'alto

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
  // Un "osservatore" ci avvisa quando il titolo grande esce dallo schermo
  // (finisce sotto la barra): allora la barra diventa di vetro con il titolo piccolo.
  function barraCompatta(barra, titoloGrande) {
    if (!('IntersectionObserver' in window)) return;
    const osservatore = new IntersectionObserver(([voce]) => {
      barra.classList.toggle('compatta', !voce.isIntersecting);
    }, { rootMargin: `-${barra.offsetHeight || 52}px 0px 0px 0px` });
    osservatore.observe(titoloGrande);
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
  let capsula = null;
  let timer = null;

  function avviso(testo) {
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

    clearTimeout(timer);
    capsula.classList.remove('visibile');
    capsula.getBoundingClientRect(); // riparte da capo anche se era già visibile
    capsula.classList.add('visibile');
    timer = setTimeout(() => capsula.classList.remove('visibile'), 1900);
  }

  return { conta, posizionaIndicatore, barraCompatta, trascinaPerChiudere, avviso };
})();
