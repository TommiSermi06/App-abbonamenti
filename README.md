# Abbonamenti

Una piccola app web in stile iPhone per tenere sotto controllo i propri abbonamenti:
quanto spendi al mese e all'anno, e quale rinnovo sta per arrivare.

## Cosa fa (versione 1)
- Lista degli abbonamenti con nome, costo, frequenza (mensile o annuale) e giorno del rinnovo
- Aggiungi, modifica ed elimina con un modulo che sale dal basso
- Totale al mese e all'anno (gli annuali contano costo / 12 al mese)
- Prossimo rinnovo in evidenza, con i giorni mancanti colorati (grigio, arancione, rosso, "Oggi!")
- Esporta e importa un backup in formato JSON
- Modalità scura automatica, installabile nella schermata Home dell'iPhone

## Come provarla
Apri `index.html` con un doppio clic, oppure dalla cartella del progetto:

```bash
python3 -m http.server 8000
```

e vai su http://localhost:8000.

Fatta con solo HTML, CSS e JavaScript, senza librerie. I dati restano nel browser (localStorage).
