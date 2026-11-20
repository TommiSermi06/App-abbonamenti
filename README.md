# Abbonamenti

Una piccola app web in stile iPhone per tenere sotto controllo i propri abbonamenti:
quanto spendi al mese e all'anno, e quale rinnovo sta per arrivare.

## Cosa fa
- Lista degli abbonamenti con nome, costo, frequenza (settimanale, mensile, ogni 3 mesi, ogni 6 mesi o annuale) e giorno del rinnovo
- Aggiungi, modifica ed elimina con un modulo che sale dal basso
- Aggiunta rapida dei servizi più diffusi: tocchi il logo, scrivi solo prezzo e giorno
- Totale al mese e all'anno (gli annuali contano costo / 12 al mese)
- Occhio per nascondere gli importi in alto (come nelle app delle banche), con l'animazione numeri ↔ linette
- Blocco dell'app con codice PIN o Face ID (Impostazioni → Privacy): all'apertura e al ritorno dopo 30 secondi
- Prossimo rinnovo in evidenza, con i giorni mancanti colorati (grigio, arancione, rosso, "Oggi!")
- "Ancora da pagare" questo mese: quanto uscirà davvero dal conto da oggi a fine mese
- Si apre anche senza internet (service worker)
- Categorie (Streaming, Musica, Giochi, …): lista divisa in gruppi, filtro e spesa al mese per categoria
- Spesa al mese per metodo di pagamento (Visa, PayPal…): tocchi una carta e vedi i suoi abbonamenti
- Grafico delle spese dei prossimi 12 mesi, con il dettaglio dei pagamenti di ogni mese
- Promemoria dei rinnovi nel Calendario dell'iPhone (file .ics con avvisi)
- Abbonamenti in pausa o disdetti: restano nella lista ma non contano nei totali
- Ricerca per nome e ordinamento della lista (rinnovo, prezzo, nome)
- Sincronizzazione online con account (Supabase): stessi dati su telefono, iPad e computer, anche offline
- "Password dimenticata?": email con il link per sceglierne una nuova
- Prove gratuite: non contano nei totali finché durano, con avviso prima che diventino a pagamento
- Per ogni abbonamento: link per disdire, metodo di pagamento e note
- Guida "Come disdire" per i servizi più diffusi, con il link alla pagina ufficiale inserito in automatico
- Esporta e importa un backup in formato JSON
- Ogni abbonamento ha il suo "pianetino" con il logo del servizio (oltre 3400 loghi da [Simple Icons](https://simpleicons.org), crediti in `loghi/CREDITI.md`) o l'iniziale
- Gesti: fai scorrere un abbonamento verso sinistra per metterlo in pausa o eliminarlo, con "Annulla"
- Barra di vetro in basso con tre schede: Abbonamenti, Statistiche, Impostazioni
- Benvenuto "Orbita" al primo avvio e saluto personale a ogni apertura
- Stile "Liquid Glass" con animazioni morbide (rispetta Riduci movimento e Riduci trasparenza)
- Modalità scura automatica, installabile nella schermata Home dell'iPhone

## Come provarla
Apri `index.html` con un doppio clic, oppure dalla cartella del progetto:

```bash
python3 -m http.server 8000
```

e vai su http://localhost:8000.

Fatta con solo HTML, CSS e JavaScript, senza librerie. I dati stanno nel browser (localStorage) e, se entri con un account, anche online su Supabase.
