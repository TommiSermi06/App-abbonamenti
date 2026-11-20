// =====================================================================
// supabase/functions/invia-avvisi/index.ts — La funzione che manda le notifiche dei rinnovi.
//
// È una "Edge Function" di Supabase: un piccolo programma che gira sui server di Supabase
// (non sul telefono). La chiama l'orologio del database (pg_cron) OGNI ORA.
// Ogni volta:
//   1. prende le chiavi per firmare le notifiche (VAPID); la prima volta le crea e le salva;
//   2. guarda i telefoni iscritti agli avvisi e tiene quelli per cui, nel loro fuso orario,
//      è proprio l'ora scelta (es. le 9);
//   3. per ognuno calcola i rinnovi dei SUOI abbonamenti attivi: se uno si rinnova oggi, o tra
//      il numero di giorni scelto, manda la notifica (una volta sola: vedi avvisi_inviati).
// Chiamata con { "prova": "<endpoint>" } manda subito una notifica di prova a quel telefono
// (serve al pulsante "Manda una notifica di prova" delle Impostazioni).
//
// Scritta in JavaScript semplice (Supabase la legge come TypeScript, che è JavaScript + qualcosa).
// L'unica libreria è web-push: cifra e firma le notifiche come vogliono Apple e Google
// (farlo a mano sarebbe lungo e facile da sbagliare). L'app invece resta senza librerie.
//
// Chiavi: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY le dà Supabase da sola alla funzione:
// non sono scritte qui e non vanno MAI scritte nel codice.
// =====================================================================

import webpush from 'npm:web-push@3.6.7';

const URL_PROGETTO = Deno.env.get('SUPABASE_URL');
const CHIAVE_SERVER = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const INDIRIZZO_APP = 'https://tommisermi06.github.io/App-abbonamenti/';

// Per le chiamate dall'app (pulsante "notifica di prova"): il browser vuole questi permessi
const INTESTAZIONI_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ---------- Il database (REST, come fa l'app) ----------
async function database(percorso, opzioni = {}) {
  const risposta = await fetch(`${URL_PROGETTO}/rest/v1/${percorso}`, {
    method: opzioni.metodo || 'GET',
    headers: {
      apikey: CHIAVE_SERVER,
      Authorization: `Bearer ${CHIAVE_SERVER}`,
      'Content-Type': 'application/json',
      ...(opzioni.prefer ? { Prefer: opzioni.prefer } : {}),
    },
    body: opzioni.corpo === undefined ? undefined : JSON.stringify(opzioni.corpo),
  });
  const testo = await risposta.text();
  if (!risposta.ok) throw new Error(`Database ${risposta.status}: ${testo}`);
  return testo ? JSON.parse(testo) : null;
}

// Le chiavi VAPID: se non ci sono ancora, le creiamo e le salviamo (la segreta resta qui sul server)
async function prendiChiavi() {
  let righe = await database('configurazione_push?select=nome,valore');
  if (righe.length < 2) {
    const nuove = webpush.generateVAPIDKeys();
    await database('configurazione_push', {
      metodo: 'POST',
      prefer: 'resolution=ignore-duplicates,return=minimal',
      corpo: [
        { nome: 'vapid_pubblica', valore: nuove.publicKey },
        { nome: 'vapid_segreta', valore: nuove.privateKey },
      ],
    });
    righe = await database('configurazione_push?select=nome,valore');
  }
  const valore = (nome) => righe.find((r) => r.nome === nome).valore;
  return { pubblica: valore('vapid_pubblica'), segreta: valore('vapid_segreta') };
}

// === INIZIO CALCOLI (le stesse regole di frequenze.js e app.js; le date sono a mezzanotte UTC) ===
const UN_GIORNO = 24 * 60 * 60 * 1000;
const MESI_FREQUENZA = { mensile: 1, trimestrale: 3, semestrale: 6, annuale: 12 };
const PERIODI = {
  settimanale: 'a settimana', mensile: 'al mese', trimestrale: 'ogni 3 mesi', semestrale: 'ogni 6 mesi', annuale: 'all\'anno',
};

function giorniNelMese(anno, mese) {
  return new Date(Date.UTC(anno, mese + 1, 0)).getUTCDate();
}

// Una data, ma se il giorno non esiste nel mese (31 febbraio) si usa l'ultimo giorno
function dataSicura(anno, mese, giorno) {
  const primo = new Date(Date.UTC(anno, mese, 1));
  const ultimo = giorniNelMese(primo.getUTCFullYear(), primo.getUTCMonth());
  return new Date(Date.UTC(primo.getUTCFullYear(), primo.getUTCMonth(), Math.min(giorno, ultimo)));
}

function pagaNelMese(abb, mese) {
  const mesi = MESI_FREQUENZA[abb.frequenza];
  if (!mesi) return false;
  if (mesi === 1) return true;
  return (((mese - (abb.mese - 1)) % mesi) + mesi) % mesi === 0;
}

// Il prossimo rinnovo, oggi compreso (settimanale: giorno 1 = lunedì … 7 = domenica)
function prossimaData(abb, oggi) {
  if (abb.frequenza === 'settimanale') {
    const mancano = ((abb.giorno % 7) - oggi.getUTCDay() + 7) % 7;
    return new Date(oggi.getTime() + mancano * UN_GIORNO);
  }
  for (let i = 0; i <= 12; i++) {
    const primo = new Date(Date.UTC(oggi.getUTCFullYear(), oggi.getUTCMonth() + i, 1));
    if (!pagaNelMese(abb, primo.getUTCMonth())) continue;
    const data = dataSicura(primo.getUTCFullYear(), primo.getUTCMonth(), abb.giorno);
    if (data >= oggi) return data;
  }
  return null;
}

// Il prossimo "evento": la fine della prova gratuita (se non è passata) oppure il rinnovo
function eventoDi(abb, oggi) {
  if (abb.fine_prova) {
    const [a, m, g] = abb.fine_prova.split('-').map(Number);
    const fine = new Date(Date.UTC(a, m - 1, g));
    if (fine >= oggi) return { data: fine, prova: true };
  }
  const data = prossimaData(abb, oggi);
  return data ? { data, prova: false } : null;
}

// Che giorno e che ora sono adesso nel fuso orario del telefono (es. "Europe/Rome")
function adessoNelFuso(fuso, adesso) {
  let parti;
  try {
    parti = new Intl.DateTimeFormat('en-GB', {
      timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
    }).formatToParts(adesso);
  } catch (e) {
    return adessoNelFuso('Europe/Rome', adesso); // fuso sconosciuto: usiamo quello italiano
  }
  const valore = (tipo) => Number(parti.find((p) => p.type === tipo).value);
  return { oggi: new Date(Date.UTC(valore('year'), valore('month') - 1, valore('day'))), ora: valore('hour') };
}

// Il testo della notifica: "Netflix si rinnova domani" · "Addebito di 13,99 € su Visa •••• 1234"
function testoAvviso(abb, evento, giorni) {
  const costo = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(abb.costo);
  const quando = giorni === 0 ? 'oggi' : giorni === 1 ? 'domani' : `tra ${giorni} giorni`;
  if (evento.prova) {
    return {
      titolo: `🎁 ${abb.nome}: la prova finisce ${quando}`,
      corpo: `Poi costa ${costo} ${PERIODI[abb.frequenza] || ''}. Se non ti serve, disdici prima.`,
    };
  }
  return {
    titolo: `${abb.nome} si rinnova ${quando}`,
    corpo: `Addebito di ${costo}${abb.pagamento ? ` su ${abb.pagamento}` : ''}.`,
  };
}

// Quali avvisi spettano a un telefono oggi: [{ abb, evento, giorni, tipo }]
function avvisiDelGiorno(abbonamenti, oggi, giorniPreavviso) {
  const avvisi = [];
  for (const abb of abbonamenti) {
    const evento = eventoDi(abb, oggi);
    if (!evento) continue;
    const giorni = Math.round((evento.data - oggi) / UN_GIORNO);
    const tipo = giorni === 0 ? 'oggi' : giorni === giorniPreavviso ? 'prima' : null;
    if (tipo) avvisi.push({ abb, evento, giorni, tipo });
  }
  return avvisi;
}
// === FINE CALCOLI ===

async function manda(iscrizione, messaggio) {
  try {
    await webpush.sendNotification(
      { endpoint: iscrizione.endpoint, keys: { p256dh: iscrizione.p256dh, auth: iscrizione.auth } },
      JSON.stringify({ ...messaggio, url: INDIRIZZO_APP }),
      { TTL: 6 * 60 * 60 }, // se il telefono è spento, l'avviso aspetta al massimo 6 ore
    );
    return true;
  } catch (e) {
    // 404 / 410 = quel telefono non esiste più (app tolta, notifiche spente): lo togliamo
    if (e.statusCode === 404 || e.statusCode === 410) {
      await database(`iscrizioni_push?id=eq.${iscrizione.id}`, { metodo: 'DELETE' });
    } else {
      console.error('Notifica non partita', e.statusCode, e.body);
    }
    return false;
  }
}

function risposta(dati, stato = 200) {
  return new Response(JSON.stringify(dati), { status: stato, headers: { 'Content-Type': 'application/json', ...INTESTAZIONI_CORS } });
}

Deno.serve(async (richiesta) => {
  if (richiesta.method === 'OPTIONS') return new Response('ok', { headers: INTESTAZIONI_CORS });
  try {
    const chiavi = await prendiChiavi();
    webpush.setVapidDetails(INDIRIZZO_APP, chiavi.pubblica, chiavi.segreta);
    const corpo = await richiesta.json().catch(() => ({}));

    // Notifica di prova: solo verso un telefono già iscritto (chi non conosce l'endpoint non può usarla)
    if (corpo.prova) {
      const [iscrizione] = await database(`iscrizioni_push?select=*&endpoint=eq.${encodeURIComponent(corpo.prova)}`);
      if (!iscrizione) return risposta({ errore: 'Telefono non iscritto' }, 404);
      const ok = await manda(iscrizione, { titolo: 'Le notifiche funzionano ✓', corpo: 'Ti avviserò prima di ogni rinnovo.' });
      return risposta({ inviata: ok });
    }

    // Il giro di ogni ora: i telefoni per cui, nel loro fuso, è l'ora scelta
    const adesso = new Date();
    const iscrizioni = await database('iscrizioni_push?select=*');
    const daControllare = iscrizioni.filter((i) => adessoNelFuso(i.fuso, adesso).ora === i.ora);
    if (daControllare.length === 0) return risposta({ controllate: 0, inviati: 0 });

    // Gli abbonamenti attivi di quegli utenti, in una richiesta sola
    const utenti = [...new Set(daControllare.map((i) => i.user_id))];
    const abbonamenti = await database(
      `abbonamenti?select=id,user_id,nome,costo,frequenza,giorno,mese,fine_prova,pagamento`
      + `&eliminato=eq.false&stato=eq.attivo&user_id=in.(${utenti.join(',')})`,
    );

    let inviati = 0;
    for (const iscrizione of daControllare) {
      const { oggi } = adessoNelFuso(iscrizione.fuso, adesso);
      const suoi = abbonamenti.filter((a) => a.user_id === iscrizione.user_id);
      for (const { abb, evento, giorni, tipo } of avvisiDelGiorno(suoi, oggi, iscrizione.giorni_preavviso)) {
        // Segniamo l'avviso come mandato: se c'era già (l'orologio è partito due volte), saltiamo
        const segnato = await database('avvisi_inviati', {
          metodo: 'POST',
          prefer: 'resolution=ignore-duplicates,return=representation',
          corpo: {
            iscrizione_id: iscrizione.id,
            abbonamento_id: abb.id,
            giorno_evento: evento.data.toISOString().slice(0, 10),
            tipo,
          },
        });
        if (!segnato || segnato.length === 0) continue;
        if (await manda(iscrizione, testoAvviso(abb, evento, giorni))) inviati += 1;
      }
    }
    return risposta({ controllate: daControllare.length, inviati });
  } catch (e) {
    console.error(e);
    return risposta({ errore: String(e.message || e) }, 500);
  }
});
