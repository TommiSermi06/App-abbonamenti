/* =====================================================================
   categorie.js — L'elenco fisso delle categorie.

   È l'UNICO punto in cui sono scritte: il modulo, il filtro, i gruppi
   della lista e la spesa per categoria leggono tutti da qui.

   Come modificarle:
   - per aggiungerne una, aggiungi una riga { id, nome, emoji };
   - puoi cambiare liberamente "nome" ed "emoji";
   - NON cambiare l'"id" di una categoria già usata: è la parola che
     viene salvata nei dati di ogni abbonamento.
   L'ordine dell'elenco è l'ordine in cui compaiono nell'app.
   ===================================================================== */

const CATEGORIE = [
  { id: 'streaming', nome: 'Streaming', emoji: '🎬' },
  { id: 'musica', nome: 'Musica', emoji: '🎵' },
  { id: 'giochi', nome: 'Giochi', emoji: '🎮' },
  { id: 'lavoro', nome: 'Lavoro e studio', emoji: '💼' },
  { id: 'casa', nome: 'Casa', emoji: '🏠' },
  { id: 'sport', nome: 'Sport e salute', emoji: '💪' },
  { id: 'altro', nome: 'Altro', emoji: '📦' },
];

// La categoria usata quando manca (per esempio negli abbonamenti
// salvati con la versione 1, che non aveva le categorie)
const CATEGORIA_PREDEFINITA = 'altro';

// Dice se un id corrisponde a una categoria dell'elenco
function categoriaEsiste(id) {
  return CATEGORIE.some((c) => c.id === id);
}

// Restituisce la categoria con questo id (o "Altro" se non esiste)
function trovaCategoria(id) {
  return CATEGORIE.find((c) => c.id === id)
    || CATEGORIE.find((c) => c.id === CATEGORIA_PREDEFINITA);
}


/* ---------- Categorie delle SPESE (versione 4.20) ----------
   Le spese di tutti i giorni hanno categorie diverse da quelle degli abbonamenti.
   Stesse regole: puoi cambiare "nome" ed "emoji", NON l'"id" (è salvato nei dati). */
const CATEGORIE_SPESE = [
  { id: 'alimentari', nome: 'Spesa e alimentari', emoji: '🛒' },
  { id: 'ristoranti', nome: 'Bar e ristoranti', emoji: '🍕' },
  { id: 'trasporti', nome: 'Trasporti e auto', emoji: '🚗' },
  { id: 'casa', nome: 'Casa e bollette', emoji: '🏠' },
  { id: 'shopping', nome: 'Shopping', emoji: '🛍️' },
  { id: 'svago', nome: 'Svago e uscite', emoji: '🎉' },
  { id: 'salute', nome: 'Salute', emoji: '💊' },
  { id: 'regali', nome: 'Regali', emoji: '🎁' },
  { id: 'altro', nome: 'Altro', emoji: '📦' },
];

function categoriaSpesaEsiste(id) {
  return CATEGORIE_SPESE.some((c) => c.id === id);
}

// La categoria di una spesa con questo id (o "Altro" se non esiste)
function trovaCategoriaSpesa(id) {
  return CATEGORIE_SPESE.find((c) => c.id === id)
    || CATEGORIE_SPESE.find((c) => c.id === 'altro');
}
