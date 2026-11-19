# Abbonamenti

Una piccola app web in stile iPhone per tenere sotto controllo i propri abbonamenti:
quanto spendi al mese e all'anno, e quale rinnovo sta per arrivare.

## Cosa fa
- Lista degli abbonamenti con nome, costo, frequenza (mensile o annuale) e giorno del rinnovo
- Aggiungi, modifica ed elimina con un modulo che sale dal basso
- Totale al mese e all'anno (gli annuali contano costo / 12 al mese)
- Prossimo rinnovo in evidenza, con i giorni mancanti colorati (grigio, arancione, rosso, "Oggi!")
- Categorie (Streaming, Musica, Giochi, …): lista divisa in gruppi, filtro e spesa al mese per categoria
- Grafico delle spese dei prossimi 12 mesi, con il dettaglio dei pagamenti di ogni mese
- Promemoria dei rinnovi nel Calendario dell'iPhone (file .ics con avvisi)
- Abbonamenti in pausa o disdetti: restano nella lista ma non contano nei totali
- Ricerca per nome e ordinamento della lista (rinnovo, prezzo, nome)
- Sincronizzazione online con account (Supabase): stessi dati su telefono, iPad e computer, anche offline
- Esporta e importa un backup in formato JSON
- Modalità scura automatica, installabile nella schermata Home dell'iPhone

## Come provarla
Apri `index.html` con un doppio clic, oppure dalla cartella del progetto:

```bash
python3 -m http.server 8000
```

e vai su http://localhost:8000.

Fatta con solo HTML, CSS e JavaScript, senza librerie. I dati stanno nel browser (localStorage) e, se entri con un account, anche online su Supabase.
