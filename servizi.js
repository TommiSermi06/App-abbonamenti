/* =====================================================================
   servizi.js — Come si disdicono gli abbonamenti più diffusi.

   Per ogni servizio conosciuto ci sono:
   - alias:  i modi in cui può essere scritto il nome (es. "ps plus");
   - link:   la pagina UFFICIALE di aiuto del servizio che spiega la disdetta
             (controllata sul sito del servizio il 19 novembre 2026);
   - passi:  i passaggi in breve;
   - nota:   un avvertimento utile (facoltativo).

   Per aggiungere un servizio basta aggiungere un blocco all'elenco.
   Usa SOLO link delle pagine ufficiali: un link sbagliato è peggio di niente.

   Regola importante: chi ti ADDEBITA l'abbonamento decide dove si disdice.
   Se lo paghi tramite l'App Store di Apple o Google Play, si disdice da lì,
   non dal sito del servizio. (Apple Pay invece è solo un modo di pagare con
   la carta: in quel caso si disdice dal sito del servizio.)
   ===================================================================== */

const SERVIZI = [
  {
    nome: 'Netflix',
    alias: ['netflix'],
    link: 'https://help.netflix.com/it/node/407',
    passi: [
      'Entra su netflix.com dal browser',
      'Apri Account → Gestisci abbonamento',
      'Tocca Annulla e poi Completa annullamento',
    ],
    nota: 'Se non vedi "Annulla", ti addebita un\'altra azienda (es. Apple o la compagnia telefonica): disdici da lì.',
  },
  {
    nome: 'Disney+',
    alias: ['disneyplus', 'disney'],
    link: 'https://help.disneyplus.com/en-GB/article/disneyplus-cancel',
    passi: [
      'Entra su disneyplus.com',
      'Tocca il tuo profilo → Account',
      'In Abbonamento scegli il tuo piano → Annulla abbonamento',
    ],
    nota: 'Resta attivo fino alla fine del periodo già pagato.',
  },
  {
    nome: 'Spotify',
    alias: ['spotify'],
    link: 'https://support.spotify.com/article/cancel-premium/',
    passi: [
      'Entra su spotify.com e apri la pagina Account',
      'Gestisci il tuo piano → Annulla abbonamento',
    ],
    nota: 'Con il piano Famiglia può disdire solo chi gestisce il piano.',
  },
  {
    nome: 'PlayStation Plus',
    alias: ['playstation', 'psplus'],
    link: 'https://www.playstation.com/support/subscriptions/cancel-playstation-plus/',
    passi: [
      'Dal sito playstation.com o dalla console apri Account → Pagamenti e abbonamenti → Abbonamenti',
      'Scegli PlayStation Plus → Annulla abbonamento',
    ],
  },
  {
    nome: 'ChatGPT',
    alias: ['chatgpt', 'openai'],
    link: 'https://help.openai.com/en/articles/7232927',
    passi: [
      'Su chatgpt.com tocca il tuo nome → Impostazioni',
      'Apri Account (o Abbonamento) → Gestisci → Annulla abbonamento',
    ],
    nota: 'Se l\'hai attivato dall\'app per iPhone, si disdice dalle impostazioni Apple.',
  },
  {
    nome: 'Claude',
    alias: ['claude', 'anthropic'],
    link: 'https://support.claude.com/en/articles/8325617',
    passi: [
      'Su claude.ai tocca le tue iniziali in basso a sinistra → Impostazioni',
      'Apri Fatturazione → Annulla',
    ],
    nota: 'Disdici almeno 24 ore prima del rinnovo. Se l\'hai attivato dall\'app per iPhone, si disdice dalle impostazioni Apple.',
  },
  {
    nome: 'iCloud+',
    alias: ['icloud'],
    link: 'https://support.apple.com/it-it/118428',
    passi: [
      'Sull\'iPhone apri Impostazioni → il tuo nome → iCloud',
      'Apri Gestisci spazio (o iCloud+) → Cambia piano di archiviazione',
      'Scegli Opzioni di downgrade e il piano gratuito',
    ],
    nota: 'Prima controlla di avere meno di 5 GB di dati in iCloud, altrimenti il backup si ferma.',
  },
  {
    nome: 'Apple',
    alias: ['applemusic', 'appletv', 'appleone', 'applearcade', 'applenews', 'applefitness'],
    link: 'https://support.apple.com/it-it/118428',
    passi: [
      'Sull\'iPhone apri Impostazioni → il tuo nome → Abbonamenti',
      'Tocca l\'abbonamento → Annulla abbonamento',
    ],
  },
  {
    nome: 'Amazon Prime',
    alias: ['amazonprime', 'primevideo', 'prime'],
    link: 'https://www.amazon.it/gp/help/customer/display.html?nodeId=GTJQ7QZY7QL2HK4Y',
    passi: [
      'Su amazon.it apri Account → La tua iscrizione Prime',
      'Gestisci iscrizione → Aggiorna, annulla e altro → Termina iscrizione',
    ],
    nota: 'Se non hai usato i vantaggi Prime, Amazon può rimborsarti l\'ultimo addebito.',
  },
  {
    nome: 'YouTube Premium',
    alias: ['youtube'],
    link: 'https://www.youtube.com/paid_memberships',
    passi: [
      'Apri youtube.com/paid_memberships (il link qui sotto)',
      'Gestisci abbonamento → Disattiva',
    ],
    nota: 'Invece di disdire puoi anche metterlo in pausa da 1 a 6 mesi (non per i piani annuali).',
  },
  {
    nome: 'Microsoft',
    alias: ['microsoft', 'office', 'xbox', 'gamepass', 'copilot'],
    link: 'https://support.microsoft.com/it-it/accounts-billing/subscriptions/cancel-your-microsoft-subscription',
    passi: [
      'Entra su account.microsoft.com → Abbonamenti',
      'Accanto all\'abbonamento tocca Gestisci → Annulla abbonamento',
    ],
  },
  {
    nome: 'DAZN',
    alias: ['dazn'],
    link: 'https://help.dazn.com/hc/it-it/sections/15957375055133-Disdetta',
    passi: [
      'Su dazn.com apri Il mio account',
      'In fondo alla pagina tocca Annulla abbonamento',
    ],
    nota: 'Serve un preavviso di 30 giorni prima del rinnovo.',
  },
  {
    nome: 'Adobe',
    alias: ['adobe', 'creativecloud', 'photoshop', 'lightroom', 'acrobat'],
    link: 'https://helpx.adobe.com/account/individual/subscriptions-and-plans/renewals-and-cancellations/cancel-adobe-subscription.html',
    passi: [
      'Entra su account.adobe.com → Piani',
      'Gestisci piano → Annulla il piano',
    ],
    nota: 'Attenzione: per i piani annuali pagati ogni mese può esserci una penale.',
  },
];

// Quando l'abbonamento lo addebita l'App Store o Google Play, si disdice da lì
const DISDETTA_TRAMITE = {
  apple: {
    chi: 'Apple',
    link: 'https://support.apple.com/it-it/118428',
    passi: [
      'Sull\'iPhone apri Impostazioni → il tuo nome → Abbonamenti',
      'Tocca l\'abbonamento → Annulla abbonamento',
    ],
  },
  googleplay: {
    chi: 'Google Play',
    link: 'https://support.google.com/googleplay/answer/7018481?hl=it',
    passi: [
      'Apri il Play Store → la tua icona del profilo → Pagamenti e abbonamenti → Abbonamenti',
      'Scegli l\'abbonamento → Annulla abbonamento',
    ],
  },
};

// Per un servizio che l'app non conosce
const GUIDA_GENERALE = {
  passi: [
    'Controlla chi ti addebita: guarda l\'estratto conto o la ricevuta (Apple, Google Play, PayPal o il servizio stesso)',
    'Se è Apple: Impostazioni → il tuo nome → Abbonamenti',
    'Se è Google Play: Play Store → profilo → Pagamenti e abbonamenti → Abbonamenti',
    'Altrimenti, sul sito del servizio: Account → Abbonamento (o Piano, o Fatturazione) → Annulla',
    'Cerca nell\'email di benvenuto o nelle ricevute: spesso c\'è il link "Gestisci abbonamento"',
  ],
  nota: 'Disinstallare l\'app non disdice l\'abbonamento. Meglio disdire almeno 24 ore prima del rinnovo.',
};

const NOTA_PAYPAL = 'Paghi con PayPal: puoi anche togliere il pagamento automatico da PayPal → Impostazioni → Pagamenti, '
  + 'ma questo ferma solo gli addebiti e non sempre chiude l\'abbonamento. Disdici anche dal servizio.';

// "Disney+" → "disneyplus", "PS Plus" → "psplus": lettere e numeri, senza spazi né accenti
function chiaveNome(testo) {
  return String(testo ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\+/g, 'plus')
    .replace(/[^a-z0-9]/g, '');
}

// Il servizio conosciuto che corrisponde al nome, oppure null.
// Basta che il nome INIZI con uno degli alias: "iCloud+ 2TB" → iCloud+.
function trovaServizio(nome) {
  const chiave = chiaveNome(nome);
  if (!chiave) return null;
  return SERVIZI.find((servizio) => servizio.alias.some((alias) => chiave.startsWith(alias))) || null;
}

// Chi incassa, dal campo Pagamento: 'apple', 'googleplay', 'paypal' oppure null.
// "Apple Pay" NON conta come Apple: è solo la carta nel telefono.
function chiIncassa(pagamento) {
  const testo = String(pagamento ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (/app ?store|itunes/.test(testo)) return 'apple';
  if (/^apple\b/.test(testo.trim()) && !/apple ?pay/.test(testo)) return 'apple';
  if (/google ?play|play store/.test(testo)) return 'googleplay';
  if (/paypal/.test(testo)) return 'paypal';
  return null;
}

// La guida per un abbonamento: { titolo, passi, nota, link, conosciuto }
function guidaDisdetta(nome, pagamento) {
  const servizio = trovaServizio(nome);
  const incassa = chiIncassa(pagamento);
  const chiamato = String(nome ?? '').trim() || 'l\'abbonamento';

  // 1. Addebitato da Apple o Google Play: si disdice da lì
  if (incassa === 'apple' || incassa === 'googleplay') {
    const tramite = DISDETTA_TRAMITE[incassa];
    return {
      titolo: `Come disdire ${chiamato} (tramite ${tramite.chi})`,
      passi: tramite.passi,
      nota: `Lo paghi tramite ${tramite.chi}: si disdice da lì, non dal sito${servizio ? ` di ${servizio.nome}` : ' del servizio'}.`,
      link: tramite.link,
      conosciuto: true,
    };
  }

  const notaPaypal = incassa === 'paypal' ? NOTA_PAYPAL : '';

  // 2. Servizio conosciuto
  if (servizio) {
    return {
      // Per i servizi Apple usiamo il nome scritto da te (es. "Apple TV+")
      titolo: `Come disdire ${servizio.nome === 'Apple' ? chiamato : servizio.nome}`,
      passi: servizio.passi,
      nota: [servizio.nota, notaPaypal].filter(Boolean).join(' '),
      link: servizio.link,
      conosciuto: true,
    };
  }

  // 3. Servizio sconosciuto: guida generale, senza link
  return {
    titolo: `Come disdire ${chiamato}`,
    passi: GUIDA_GENERALE.passi,
    nota: [GUIDA_GENERALE.nota, notaPaypal].filter(Boolean).join(' '),
    link: '',
    conosciuto: false,
  };
}
