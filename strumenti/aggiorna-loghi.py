#!/usr/bin/env python3
"""
aggiorna-loghi.py — Ricrea il catalogo dei loghi (cartella loghi/) da Simple Icons.

NON serve per far funzionare l'app: l'app usa i file già pronti in loghi/.
Serve solo quando vuoi aggiornare il catalogo con i loghi nuovi di Simple Icons.

Come si usa (dalla cartella del progetto):
    npm pack simple-icons          # scarica il pacchetto simple-icons-X.Y.Z.tgz
    mkdir -p /tmp/si && tar -xzf simple-icons-*.tgz -C /tmp/si
    python3 strumenti/aggiorna-loghi.py /tmp/si/package
    rm simple-icons-*.tgz
Poi aggiorna VERSIONE_CATALOGO in loghi.js con il numero stampato alla fine.

Cosa crea:
    loghi/elenco.js     — nome semplificato → nome del file del logo (es. "netflix" → "netflix")
    loghi/s/<nome>.js   — un file per ogni logo, con il suo disegno (si scarica solo se serve)
    loghi/CREDITI.md    — i loghi che chiedono di citare la loro licenza
"""
import json, os, re, sys, shutil, unicodedata

if len(sys.argv) != 2:
    sys.exit(__doc__)
sorgente = sys.argv[1]
progetto = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cartella = os.path.join(progetto, 'loghi')

# Licenze che NON usiamo: "custom" (condizioni particolari) e CC-BY-SA (obbliga a condividere con la stessa licenza)
ESCLUSE = re.compile(r'^(custom|CC-BY-SA)', re.I)

# Parole comuni che nel catalogo sono il nome di un marchio, ma che chi scrive il nome di un
# abbonamento usa con un altro significato (es. "Metro" = abbonamento della metropolitana,
# non il programma Metro). Con queste parole non prendiamo nessun logo.
PAROLE_GENERICHE = {'go', 'black', 'metro', 'box', 'line', 'square', 'circle', 'planet', 'rocket'}

def chiave_nome(testo):
    """Uguale a chiaveNome() di servizi.js: minuscole, senza accenti, "+" → "plus", solo lettere e cifre."""
    testo = unicodedata.normalize('NFD', str(testo))
    testo = ''.join(c for c in testo if not unicodedata.combining(c)).lower().replace('+', 'plus')
    return re.sub(r'[^a-z0-9]', '', testo)

dati = json.load(open(os.path.join(sorgente, 'data', 'simple-icons.json')))
dati = dati if isinstance(dati, list) else dati['icons']
versione = json.load(open(os.path.join(sorgente, 'package.json')))['version']

shutil.rmtree(cartella, ignore_errors=True)
os.makedirs(os.path.join(cartella, 's'))

elenco, crediti, saltati = {}, [], 0
for icona in dati:
    slug = icona.get('slug') or chiave_nome(icona['title'])
    licenza = (icona.get('license') or {}).get('type', '')
    if ESCLUSE.match(licenza) or not re.fullmatch(r'[a-z0-9_]+', slug):
        saltati += 1
        continue
    svg = open(os.path.join(sorgente, 'icons', slug + '.svg')).read()
    disegni = re.findall(r'<path d="([^"]+)"', svg)
    if len(disegni) != 1 or 'viewBox="0 0 24 24"' not in svg:
        saltati += 1
        continue
    with open(os.path.join(cartella, 's', slug + '.js'), 'w') as f:
        f.write(f"Loghi.riceviDisegno('{slug}', '{disegni[0]}');\n")

    # Tutti i modi in cui si può chiamare: titolo, "conosciuto anche come", nomi in altre lingue
    alias = icona.get('aliases') or {}
    nomi = [icona['title'], *alias.get('aka', []), *[d['title'] for d in alias.get('dup', [])],
            *alias.get('loc', {}).values()]
    for nome in nomi:
        chiave = chiave_nome(nome)
        if chiave and chiave not in elenco and chiave not in PAROLE_GENERICHE:  # a parità di nome vince il primo (il titolo principale)
            elenco[chiave] = slug
    if licenza:
        crediti.append(f"- {icona['title']} — licenza {licenza} — {icona.get('source', '')}")

with open(os.path.join(cartella, 'elenco.js'), 'w') as f:
    f.write(f'// Catalogo dei loghi da Simple Icons {versione}: nome semplificato → file in loghi/s/.\n'
            '// Creato da strumenti/aggiorna-loghi.py: non modificarlo a mano.\n'
            'Loghi.riceviElenco(' + json.dumps(elenco, separators=(',', ':'), sort_keys=True) + ');\n')

with open(os.path.join(cartella, 'CREDITI.md'), 'w') as f:
    f.write(f'# Crediti dei loghi\n\nI loghi vengono da [Simple Icons](https://simpleicons.org) {versione}. '
            'Sono marchi delle rispettive aziende e nell\'app servono solo a riconoscere il servizio.\n\n'
            'Questi loghi hanno una licenza che chiede di essere citata:\n\n' + '\n'.join(sorted(crediti)) + '\n')

print(f'Simple Icons {versione}: {len(os.listdir(os.path.join(cartella, "s")))} loghi, '
      f'{len(elenco)} nomi nell\'elenco, {saltati} saltati.')
