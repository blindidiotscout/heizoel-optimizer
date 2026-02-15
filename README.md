# 🛢️ Heizöl-Optimizer MVP

Ein webbasiertes Tool zur Optimierung von Heizölkäufen für die Region Tirol, Österreich.

![Version](https://img.shields.io/badge/version-1.0--MVP-green)
![Region](https://img.shields.io/badge/region-Tirol%2C%20AT-blue)
![License](https://img.shields.io/badge/license-MIT-orange)

## ✨ Features

- **📈 Preis-Chart**: Historische Heizölpreise (3 Jahre) + 12-Monats-Prognose
- **🔮 Prognose mit Unsicherheit**: Best-Case, Expected, Worst-Case (konisch auseinanderlaufend)
- **💡 Kaufempfehlung**: Personalisierte Empfehlung basierend auf Tank-Füllstand
- **📊 Tank-Visualisierung**: Grafische Darstellung des Füllstands
- **📰 Events**: Aktuelle News aus ORF Tirol und Wirtschafts-Nachrichten
- **📱 Responsive Design**: Optimiert für Desktop und Mobile
- **💾 LocalStorage**: Tank-Daten werden lokal gespeichert

## 🚀 Quick Start

### Lokale Ausführung

1. Repository klonen oder Dateien herunterladen:
   ```bash
   git clone <repository-url>
   cd heizoel-optimizer
   ```

2. Lokalen Server starten (CORS wird für lokale JSON-Dateien benötigt):
   ```bash
   # Mit Python 3
   python -m http.server 8000
   
   # Oder mit Node.js (npx)
   npx serve .
   
   # Oder mit PHP
   php -S localhost:8000
   ```

3. Browser öffnen: `http://localhost:8000`

### Direct Öffnen

Die App kann auch direkt per Doppelklick auf `index.html` geöffnet werden, 
allerdings funktionieren dann die JSON-Daten nicht (CORS).

## 🌐 Deployment

### GitHub Pages (Empfohlen)

1. Repository auf GitHub erstellen
2. Dateien hochladen:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/USERNAME/heizoel-optimizer.git
   git push -u origin main
   ```

3. GitHub Pages aktivieren:
   - Settings → Pages
   - Source: `main` branch
   - URL: `https://USERNAME.github.io/heizoel-optimizer/`

### Vercel

```bash
# Vercel CLI installieren
npm i -g vercel

# Deploy
vercel
```

### Netlify

1. Auf [netlify.com](https://netlify.com) anmelden
2. "Add new site" → "Deploy manually"
3. Projekt-Ordner hochladen

## 📁 Projektstruktur

```
heizoel-optimizer/
├── index.html          # Hauptseite
├── style.css           # Styling (responsive)
├── app.js              # JavaScript-Logik
├── data/
│   └── sample_prices.json  # Historische Preisdaten
└── README.md           # Diese Datei
```

## 🛠️ Technologie-Stack

- **HTML5** - Semantische Struktur
- **CSS3** - Responsive Design, CSS Variables
- **JavaScript (ES6+)** - Keine Frameworks
- **Chart.js 4** - Visualisierung
- **LocalStorage** - Persistente Tank-Daten

## 📊 Datenquellen

| Quelle | Beschreibung |
|--------|--------------|
| WKO Preisstatistiken | Offizielle Heizölpreise Österreich |
| heizoel24.at | Historische Preisverläufe |
| fastenergy.at | Preis-Charts |
| ORF Tirol RSS | Regionale Events |
| Wirtschaftsnews RSS | Globale Events |

### Hinweis zu den Beispieldaten

Die `sample_prices.json` enthält historische Beispieldaten basierend auf 
veröffentlichten Durchschnittspreisen. Für echte Produktionsdaten sollte 
eine automatisierte Datenquelle integriert werden.

## 🎯 Kaufempfehlungs-Logik

Die Empfehlung basiert auf:

1. **Füllstand-Analyse**:
   - < 20%: Dringend nachfüllen (kritisch)
   - 20-40%: Nachfüllung empfohlen
   - > 40%: Keine Eile

2. **Preis-Prognose**:
   - Best-Case, Expected, Worst-Case
   - Saisonalität (Sommer günstiger, Winter teurer)

3. **Optimaler Zeitpunkt**:
   - Niedpreis in Prognose identifizieren
   - Abwägung: Preis vs. Füllstand

## ⚙️ Konfiguration

In `app.js` können folgende Parameter angepasst werden:

```javascript
const CONFIG = {
    forecast: {
        months: 12,              // Prognose-Zeitraum
        uncertaintyGrowth: 0.03, // Unsicherheits-Wachstum
        baseUncertainty: 0.05    // Basis-Unsicherheit
    },
    thresholds: {
        lowLevel: 20,           // Kritischer Füllstand
        optimalFill: 80,        // Optimaler Füllstand
        goodPriceThreshold: 1.10 // €/L
    }
};
```

## 🔮 Roadmap / Verbesserungsmöglichkeiten

- [ ] Echte RSS-Feed-Integration (Backend/Proxy)
- [ ] Live-Preise via API (esyoil, heizoel24)
- [ ] Mehrere Regionen wählbar
- [ ] Benachrichtigungen bei guten Preisen
- [ ] Kostenrechner mit individuellem Verbrauch
- [ ] PWA (Progressive Web App)
- [ ] Export/Import der Tank-Daten

## ⚠️ Haftungsausschluss

**WICHTIG**: Alle Prognosen basieren auf historischen Daten und mathematischen Modellen. 
Es besteht **keine Garantie** für zukünftige Preisentwicklungen. 

Dies ist ein **Beratungstool**, keine Finanzberatung. 
Entscheidungen sollten immer unter Berücksichtigung der aktuellen Marktlage 
und persönlicher Umstände getroffen werden.

## 📄 Lizenz

MIT License - Frei zur Nutzung und Modifikation.

---

**Entwickelt mit ❤️ für Tirol**