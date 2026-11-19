/* =====================================================================
   calendario.js — Crea il file calendario (.ics) con i rinnovi.

   Il formato .ics (si chiama "iCalendar") è un semplice file di testo
   che tutte le app calendario capiscono: Calendario dell'iPhone,
   Google Calendar, Outlook...
   È fatto di blocchi BEGIN:... / END:... con una riga per ogni
   informazione, per esempio:

     BEGIN:VEVENT                       ← inizio di un evento
     DTSTART;VALUE=DATE:20261120        ← giorno (20 novembre 2026)
     SUMMARY:🎵 Spotify · 16\,99 €       ← titolo
     BEGIN:VALARM ... END:VALARM        ← un avviso
     END:VEVENT                         ← fine dell'evento

   Questo file NON calcola le date: riceve da app.js la lista dei
   pagamenti (abbonamento + data) e la scrive in questo formato.
   ===================================================================== */

// Quando arrivano gli avvisi: modifica questi due numeri se vuoi cambiarli
const GIORNI_PREAVVISO = 2; // primo avviso: quanti giorni prima del rinnovo
const ORA_AVVISO = 9;       // a che ora arrivano gli avvisi (9 = alle 9:00)

const euroCalendario = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

// Nel formato .ics alcuni caratteri hanno un significato speciale:
// virgola, punto e virgola e barra rovesciata vanno "protetti" con una \ davanti,
// e gli "a capo" si scrivono \n
function testoICS(testo) {
  return String(testo)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

// Una data come "20261120" (anno, mese, giorno), usata per gli eventi di tutto il giorno
function dataICS(data) {
  const mese = String(data.getMonth() + 1).padStart(2, '0');
  const giorno = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}${mese}${giorno}`;
}

// Un istante preciso in ora universale, es. "20261118T101500Z"
function istanteICS(data) {
  return data.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Regola del formato: ogni riga può essere lunga al massimo 75 byte.
// Le righe più lunghe si "piegano": si va a capo e la riga dopo inizia con uno spazio.
// Contiamo i byte e non le lettere perché emoji e "€" occupano più byte.
function piegaRiga(riga) {
  const codificatore = new TextEncoder();
  let risultato = '';
  let pezzo = '';
  let byte = 0;
  for (const carattere of riga) {
    const lunghezza = codificatore.encode(carattere).length;
    if (byte + lunghezza > 74) {
      risultato += `${pezzo}\r\n `;
      pezzo = '';
      byte = 1; // lo spazio iniziale conta
    }
    pezzo += carattere;
    byte += lunghezza;
  }
  return risultato + pezzo;
}

// Crea il testo del file .ics.
// "pagamenti" è una lista di { abb, data, fineProva } preparata da app.js
// (fineProva = true se quel giorno finisce la prova gratuita).
function creaFileCalendario(pagamenti) {
  const adesso = istanteICS(new Date());
  const righe = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Abbonamenti//App web//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Abbonamenti',
  ];

  for (const { abb, data, fineProva } of pagamenti) {
    const categoria = trovaCategoria(abb.categoria);
    const costo = euroCalendario.format(abb.costo);
    const frequenza = abb.frequenza === 'annuale' ? 'annuale' : 'mensile';
    // L'evento dura tutto il giorno: finisce all'inizio del giorno dopo
    const giornoDopo = new Date(data.getFullYear(), data.getMonth(), data.getDate() + 1);
    const preavviso = GIORNI_PREAVVISO === 1 ? 'domani' : `tra ${GIORNI_PREAVVISO} giorni`;

    // Testi dell'evento: un rinnovo normale oppure la fine di una prova gratuita
    const titolo = fineProva
      ? `🎁 Fine prova: ${abb.nome} · poi ${costo}`
      : `${categoria.emoji} ${abb.nome} · ${costo}`;
    const descrizione = fineProva
      ? `Finisce la prova gratuita di ${abb.nome}: da oggi costa ${costo} (${frequenza}). Se non ti serve, disdici prima.\nCreato dall'app Abbonamenti.`
      : `Rinnovo ${frequenza} di ${abb.nome}: ${costo}.\nCreato dall'app Abbonamenti.`;
    const avvisoPrima = fineProva
      ? `La prova gratuita di ${abb.nome} finisce ${preavviso}: poi costa ${costo}`
      : `${abb.nome} si rinnova ${preavviso} (${costo})`;
    const avvisoOggi = fineProva
      ? `Oggi finisce la prova gratuita di ${abb.nome}: da oggi costa ${costo}`
      : `${abb.nome} si rinnova oggi (${costo})`;

    righe.push(
      'BEGIN:VEVENT',
      // UID: codice unico dell'evento (id abbonamento + data)
      `UID:${abb.id}-${dataICS(data)}${fineProva ? '-prova' : ''}@abbonamenti`,
      `DTSTAMP:${adesso}`,
      `DTSTART;VALUE=DATE:${dataICS(data)}`,
      `DTEND;VALUE=DATE:${dataICS(giornoDopo)}`,
      `SUMMARY:${testoICS(titolo)}`,
      `DESCRIPTION:${testoICS(descrizione)}`,
      'TRANSP:TRANSPARENT', // l'evento non ti segna come "occupato"

      // Primo avviso: X giorni prima alle ORA_AVVISO.
      // Il conto parte dalla mezzanotte del giorno del rinnovo: per 2 giorni prima
      // alle 9:00 si torna indietro di 2×24 − 9 = 39 ore.
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${testoICS(avvisoPrima)}`,
      `TRIGGER:-PT${GIORNI_PREAVVISO * 24 - ORA_AVVISO}H`,
      'END:VALARM',

      // Secondo avviso: il giorno stesso alle ORA_AVVISO (9 ore dopo la mezzanotte)
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${testoICS(avvisoOggi)}`,
      `TRIGGER:PT${ORA_AVVISO}H`,
      'END:VALARM',

      'END:VEVENT',
    );
  }

  righe.push('END:VCALENDAR');
  // Il formato vuole le righe separate da \r\n (a capo "alla Windows")
  return `${righe.map(piegaRiga).join('\r\n')}\r\n`;
}
