/* =====================================================================
   frequenze.js — Ogni quanto si rinnova un abbonamento.

   Qui c'è TUTTO quello che dipende dalla frequenza, in un posto solo:
   i nomi da mostrare, quante volte si paga in un anno e in quali giorni.
   Lo usano storage.js (per controllare i dati), app.js e calendario.js.

   Come si salvano giorno e mese (campi "giorno" e "mese" dell'abbonamento):
   - settimanale → giorno = giorno della SETTIMANA: 1 = lunedì … 7 = domenica; mese = null
   - mensile     → giorno = giorno del mese (1-31);                            mese = null
   - trimestrale → giorno = giorno del mese; mese = UNO dei mesi in cui si paga
                   (es. mese 1 = gennaio → si paga a gennaio, aprile, luglio e ottobre)
   - semestrale  → come trimestrale, ma ogni 6 mesi (es. gennaio e luglio)
   - annuale     → giorno = giorno del mese; mese = il mese del rinnovo
   ===================================================================== */

const FREQUENZE = [
  // mesi = ogni quanti mesi si paga (null per la settimanale, che va a settimane)
  { id: 'settimanale', nome: 'Ogni settimana', aggettivo: 'settimanale', periodo: 'a settimana', mesi: null },
  { id: 'mensile', nome: 'Ogni mese', aggettivo: 'mensile', periodo: 'al mese', mesi: 1 },
  { id: 'trimestrale', nome: 'Ogni 3 mesi', aggettivo: 'trimestrale', periodo: 'ogni 3 mesi', mesi: 3 },
  { id: 'semestrale', nome: 'Ogni 6 mesi', aggettivo: 'semestrale', periodo: 'ogni 6 mesi', mesi: 6 },
  { id: 'annuale', nome: 'Ogni anno', aggettivo: 'annuale', periodo: 'all\'anno', mesi: 12 },
];

// Il giorno della settimana: la posizione 1 è lunedì, la 7 domenica (la 0 non si usa)
const GIORNI_SETTIMANA = ['', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];

function trovaFrequenza(id) {
  return FREQUENZE.find((f) => f.id === id) || null;
}

// Servono il mese? (trimestrale, semestrale e annuale sì; settimanale e mensile no)
function usaMese(frequenza) {
  const f = trovaFrequenza(frequenza);
  return Boolean(f && f.mesi > 1);
}

// Quante volte si paga in un anno: 52 settimane, 12 mesi, 4 trimestri, 2 semestri, 1 anno
function volteAllAnno(frequenza) {
  const f = trovaFrequenza(frequenza);
  if (!f) return 12;
  return f.mesi ? 12 / f.mesi : 52;
}

// Si paga in questo mese? (mese da 0 = gennaio a 11 = dicembre; solo frequenze "a mesi")
// Esempio trimestrale con mese 1 (gennaio): si paga quando la distanza da gennaio è 0, 3, 6 o 9 mesi.
function pagaNelMese(abb, mese) {
  const f = trovaFrequenza(abb.frequenza);
  if (!f || !f.mesi) return false;
  if (f.mesi === 1) return true;
  const distanza = (((mese - (abb.mese - 1)) % f.mesi) + f.mesi) % f.mesi; // sempre da 0 a mesi-1
  return distanza === 0;
}

// I mesi (da 0 a 11) in cui si paga, in ordine: trimestrale da febbraio → [1, 4, 7, 10]
function mesiDiPagamento(abb) {
  return [...Array(12).keys()].filter((mese) => pagaNelMese(abb, mese));
}

// Il giorno della settimana di JavaScript (0 = domenica … 6 = sabato) per il nostro 1-7
function giornoJS(giornoSettimana) {
  return giornoSettimana % 7; // 7 (domenica) → 0; da 1 a 6 restano uguali
}

// Il contrario: da una data al nostro giorno della settimana (1 = lunedì … 7 = domenica)
function giornoSettimanaDi(data) {
  return data.getDay() === 0 ? 7 : data.getDay();
}
