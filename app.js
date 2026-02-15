/**
 * Heizöl-Optimizer MVP
 * Region: Tirol, Österreich
 * 
 * Features:
 * - Historische Heizölpreise (3 Jahre)
 * - Prognose mit Unsicherheitsbereichen
 * - Kaufempfehlung basierend auf Tank-Füllstand
 * - Events aus RSS-Feeds
 */

// ==================== Konfiguration ====================
const CONFIG = {
    // RSS-Feed CORS Proxy (für lokale Entwicklung)
    corsProxy: 'https://api.allorigins.win/get?url=',
    
    // RSS-Feeds für Events
    rssFeeds: [
        {
            name: 'ORF Tirol',
            url: 'https://rss.orf.at/news/Tirol.xml',
            type: 'regional'
        },
        {
            name: 'ORF Wirtschaft',
            url: 'https://rss.orf.at/wirtschaft.xml',
            type: 'global'
        }
    ],
    
    // Prognose-Einstellungen
    forecast: {
        months: 12, // 12 Monate Prognose
        uncertaintyGrowth: 0.03, // Unsicherheit wächst pro Monat um 3%
        baseUncertainty: 0.05 // Basis-Unsicherheit 5%
    },
    
    // LocalStorage Keys
    storage: {
        tankVolume: 'heizoel_tankVolume',
        currentLevel: 'heizoel_currentLevel'
    },
    
    // Kaufempfehlung Schwellenwerte
    thresholds: {
        lowLevel: 20, // Bei <20% Füllstand dringend nachfüllen
        optimalFill: 80, // Optimaler Füllstand
        goodPriceThreshold: 1.10 // €/L - guter Preis
    }
};

// ==================== Globale Variablen ====================
let priceData = null;
let chart = null;
let tankData = {
    volume: null,
    currentLevel: null
};

// ==================== Initialisierung ====================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🛢️ Heizöl-Optimizer wird initialisiert...');
    
    // Tank-Daten aus LocalStorage laden
    loadTankData();
    
    // Preisdaten laden
    await loadPriceData();
    
    // Chart erstellen
    createChart();
    
    // Events laden
    loadEvents();
    
    // Event-Listener
    setupEventListeners();
    
    // Kaufempfehlung berechnen
    updateRecommendation();
    
    console.log('✅ Heizöl-Optimizer bereit!');
});

// ==================== Tank-Daten Management ====================
function loadTankData() {
    const volume = localStorage.getItem(CONFIG.storage.tankVolume);
    const level = localStorage.getItem(CONFIG.storage.currentLevel);
    
    if (volume) {
        tankData.volume = parseInt(volume);
        document.getElementById('tankVolume').value = volume;
    }
    
    if (level) {
        tankData.currentLevel = parseInt(level);
        document.getElementById('currentLevel').value = level;
    }
    
    updateTankVisual();
}

function saveTankData() {
    const volumeInput = document.getElementById('tankVolume');
    const levelInput = document.getElementById('currentLevel');
    const statusDiv = document.getElementById('tankStatus');
    
    const volume = parseInt(volumeInput.value);
    const level = parseInt(levelInput.value);
    
    // Validierung
    if (!volume || volume < 100) {
        showStatus(statusDiv, 'Bitte gültiges Tank-Volumen eingeben (min. 100L)', 'error');
        return;
    }
    
    if (!level || level < 0) {
        showStatus(statusDiv, 'Bitte gültigen Füllstand eingeben', 'error');
        return;
    }
    
    if (level > volume) {
        showStatus(statusDiv, 'Füllstand kann nicht größer als Tank-Volumen sein', 'error');
        return;
    }
    
    // Speichern
    localStorage.setItem(CONFIG.storage.tankVolume, volume);
    localStorage.setItem(CONFIG.storage.currentLevel, level);
    
    tankData.volume = volume;
    tankData.currentLevel = level;
    
    showStatus(statusDiv, '✓ Tank-Daten gespeichert!', 'success');
    
    updateTankVisual();
    updateRecommendation();
}

function updateTankVisual() {
    const tankFill = document.getElementById('tankFill');
    const tankPercent = document.getElementById('tankPercent');
    
    if (!tankData.volume || !tankData.currentLevel) {
        tankFill.style.height = '0%';
        tankPercent.textContent = '--% gefüllt';
        return;
    }
    
    const percent = Math.round((tankData.currentLevel / tankData.volume) * 100);
    
    tankFill.style.height = percent + '%';
    tankPercent.textContent = percent + '% gefüllt';
    
    // Farbe je nach Füllstand
    tankFill.classList.remove('low', 'medium');
    if (percent < 20) {
        tankFill.classList.add('low');
    } else if (percent < 40) {
        tankFill.classList.add('medium');
    }
}

function showStatus(element, message, type) {
    element.textContent = message;
    element.className = 'status-message ' + type;
    
    setTimeout(() => {
        element.textContent = '';
        element.className = 'status-message';
    }, 3000);
}

// ==================== Preisdaten ====================
async function loadPriceData() {
    try {
        // Lokale Beispieldaten laden
        const response = await fetch('data/sample_prices.json');
        priceData = await response.json();
        console.log('📊 Preisdaten geladen:', priceData.historical.length, 'Monate');
    } catch (error) {
        console.error('Fehler beim Laden der Preisdaten:', error);
        // Fallback mit Dummy-Daten
        priceData = generateFallbackData();
    }
}

function generateFallbackData() {
    // Generiert Dummy-Daten falls JSON nicht geladen werden kann
    const historical = [];
    const baseDate = new Date('2023-02-01');
    
    for (let i = 0; i < 26; i++) {
        const date = new Date(baseDate);
        date.setMonth(date.getMonth() + i);
        
        // Saisonalen Preis simulieren
        const month = date.getMonth();
        let price = 1.10;
        
        // Winter: höhere Preise
        if (month >= 10 || month <= 2) price += 0.08;
        // Frühling/Sommer: niedrigere Preise
        else if (month >= 4 && month <= 8) price -= 0.05;
        
        // Zufällige Schwankung
        price += (Math.random() - 0.5) * 0.08;
        
        historical.push({
            date: date.toISOString().split('T')[0],
            price: Math.round(price * 100) / 100
        });
    }
    
    return {
        metadata: { region: 'Tirol, Österreich' },
        historical: historical,
        currentPrice: 1.12,
        lastUpdated: new Date().toISOString().split('T')[0]
    };
}

// ==================== Prognose-Berechnung ====================
function generateForecast() {
    if (!priceData || !priceData.historical) return null;
    
    const lastPrice = priceData.historical[priceData.historical.length - 1].price;
    const lastDate = new Date(priceData.historical[priceData.historical.length - 1].date);
    
    const forecast = {
        expected: [],
        bestCase: [],
        worstCase: []
    };
    
    for (let i = 1; i <= CONFIG.forecast.months; i++) {
        const date = new Date(lastDate);
        date.setMonth(date.getMonth() + i);
        
        // Saisonalen Faktor berechnen
        const month = date.getMonth();
        let seasonalFactor = 1.0;
        
        if (month >= 10 || month <= 2) seasonalFactor = 1.06; // Winter
        else if (month >= 4 && month <= 8) seasonalFactor = 0.96; // Sommer
        
        // Expected Value
        const expectedPrice = lastPrice * seasonalFactor * (1 + (i * 0.002));
        
        // Unsicherheit wächst mit der Zeit (konisch)
        const uncertainty = CONFIG.forecast.baseUncertainty + 
                           (i * CONFIG.forecast.uncertaintyGrowth);
        
        // Best-Case (preiswerter) und Worst-Case (teurer)
        const bestPrice = expectedPrice * (1 - uncertainty);
        const worstPrice = expectedPrice * (1 + uncertainty);
        
        const dateStr = date.toISOString().split('T')[0];
        
        forecast.expected.push({ date: dateStr, price: expectedPrice });
        forecast.bestCase.push({ date: dateStr, price: bestPrice });
        forecast.worstCase.push({ date: dateStr, price: worstPrice });
    }
    
    return forecast;
}

// ==================== Chart ====================
function createChart() {
    const ctx = document.getElementById('priceChart').getContext('2d');
    const forecast = generateForecast();
    
    // Daten für Chart.js vorbereiten
    const historicalData = priceData.historical.map(d => ({
        x: d.date,
        y: d.price
    }));
    
    const forecastData = forecast.expected.map(d => ({
        x: d.date,
        y: d.price
    }));
    
    const bestCaseData = forecast.bestCase.map(d => ({
        x: d.date,
        y: d.price
    }));
    
    const worstCaseData = forecast.worstCase.map(d => ({
        x: d.date,
        y: d.price
    }));
    
    // "Jetzt kaufen" Zone - niedrigste erwartete Preise
    const buyZoneData = findBuyZones(forecast);
    
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                // Historische Daten
                {
                    label: 'Historische Preise',
                    data: historicalData,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: false,
                    pointRadius: 3,
                    pointHoverRadius: 6
                },
                // Prognose Expected
                {
                    label: 'Erwarteter Preis',
                    data: forecastData,
                    borderColor: '#8b5cf6',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.3,
                    fill: false,
                    pointRadius: 0
                },
                // Best Case
                {
                    label: 'Best-Case',
                    data: bestCaseData,
                    borderColor: '#10b981',
                    borderWidth: 1,
                    borderDash: [3, 3],
                    tension: 0.3,
                    fill: false,
                    pointRadius: 0
                },
                // Worst Case
                {
                    label: 'Worst-Case',
                    data: worstCaseData,
                    borderColor: '#ef4444',
                    borderWidth: 1,
                    borderDash: [3, 3],
                    tension: 0.3,
                    fill: {
                        target: 'origin',
                        above: 'rgba(16, 185, 129, 0.1)', // Grün bis Best-Case
                        below: 'rgba(239, 68, 68, 0.1)'  // Rot bis Worst-Case
                    },
                    pointRadius: 0
                },
                // Buy Zone
                {
                    label: 'Jetzt kaufen-Zone',
                    data: buyZoneData,
                    borderColor: '#fbbf24',
                    backgroundColor: 'rgba(251, 191, 36, 0.3)',
                    borderWidth: 0,
                    fill: true,
                    pointRadius: 0,
                    showLine: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Heizölpreis-Entwicklung (Österreich) mit 12-Monats-Prognose',
                    font: { size: 16 }
                },
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: function(context) {
                            // Titel mit Datum
                            if (context.length > 0) {
                                const date = new Date(context[0].parsed.x);
                                return date.toLocaleDateString('de-AT', { month: 'long', year: 'numeric' });
                            }
                            return '';
                        },
                        label: function(context) {
                            const datasetLabel = context.dataset.label;
                            // Für historische Daten bei zukünftigen Zeitpunkten: nichts anzeigen
                            if (datasetLabel === 'Historische Preise') {
                                const date = new Date(context.parsed.x);
                                const now = new Date();
                                now.setDate(1); // Auf Monatsanfang setzen
                                if (date > now) {
                                    return null; // Nicht anzeigen
                                }
                            }
                            
                            let label = datasetLabel || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toFixed(2) + ' €/L';
                            }
                            return label;
                        },
                        footer: function(tooltipItems) {
                            // Zeige Vorjahresvergleich
                            if (tooltipItems.length === 0) return '';
                            
                            const date = new Date(tooltipItems[0].parsed.x);
                            const month = date.getMonth();
                            const year = date.getFullYear();
                            
                            // Prüfe ob es ein Zukunfts-Datum ist
                            const now = new Date();
                            now.setDate(1);
                            if (date <= now) return '';
                            
                            // Finde Vorjahrespreise
                            const historical = priceData ? priceData.historical : [];
                            const prevYear = year - 1;
                            const prev2Year = year - 2;
                            
                            const prevYearPrice = historical.find(h => {
                                const hDate = new Date(h.date);
                                return hDate.getMonth() === month && hDate.getFullYear() === prevYear;
                            });
                            
                            const prev2YearPrice = historical.find(h => {
                                const hDate = new Date(h.date);
                                return hDate.getMonth() === month && hDate.getFullYear() === prev2Year;
                            });
                            
                            let lines = [];
                            lines.push('─────────────');
                            lines.push('📊 Vorjahresvergleich:');
                            if (prev2YearPrice) {
                                lines.push(`  ${prev2Year}: ${prev2YearPrice.price.toFixed(2)} €/L`);
                            }
                            if (prevYearPrice) {
                                lines.push(`  ${prevYear}: ${prevYearPrice.price.toFixed(2)} €/L`);
                            }
                            
                            return lines.join('\n');
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'month',
                        displayFormats: {
                            month: 'MMM yyyy'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Datum'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Preis (€/Liter)'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(value) {
                                return value.toFixed(2) + ' €/L';
                            }
                        }
                    }
                }
            }
        }
    });
}

function findBuyZones(forecast) {
    const zones = [];
    
    // Finde die 3 niedrigsten erwarteten Preise
    const sortedByPrice = [...forecast.expected]
        .map(d => ({ ...d }))
        .sort((a, b) => a.price - b.price);
    
    const lowPriceMonths = sortedByPrice.slice(0, 3);
    
    // Erstelle Zone-Punkte (Box um die niedrigen Preise)
    lowPriceMonths.forEach(item => {
        zones.push({
            x: item.date,
            y: item.price - 0.05
        });
    });
    
    return zones;
}

// ==================== Kaufempfehlung ====================
function updateRecommendation() {
    const container = document.getElementById('recommendationContent');
    
    if (!tankData.volume || !tankData.currentLevel) {
        container.innerHTML = '<p class="no-data">Bitte Tank-Daten eingeben für personalisierte Empfehlung.</p>';
        return;
    }
    
    if (!priceData || !chart) {
        container.innerHTML = '<p class="no-data">Daten werden geladen...</p>';
        return;
    }
    
    const forecast = generateForecast();
    const currentPrice = priceData.currentPrice || priceData.historical[priceData.historical.length - 1].price;
    
    // Berechnungen
    const fillPercent = Math.round((tankData.currentLevel / tankData.volume) * 100);
    
    // Beste Kaufzeit finden
    const bestTime = findBestBuyingTime(forecast);
    const bestPrice = bestTime ? bestTime.price : currentPrice;
    
    // Preis ist "hoch" wenn aktueller Preis > 10% über bester Prognose-Preis
    const priceIsHigh = currentPrice > (bestPrice * 1.10);
    
    // Bestellmenge berechnen
    let litersNeeded;
    let orderStrategy = '';
    
    if (fillPercent < CONFIG.thresholds.lowLevel && priceIsHigh) {
        // Kritisch + hoher Preis = nur 30% nachkaufen
        litersNeeded = Math.round(tankData.volume * 0.30);
        orderStrategy = ' (30%-Strategie: kritisch + hoher Preis)';
    } else {
        litersNeeded = tankData.volume - tankData.currentLevel;
    }
    
    // Empfehlung generieren
    let html = '';
    
    // 1. Füllstand-Bewertung
    if (fillPercent < CONFIG.thresholds.lowLevel) {
        html += createRecommendationItem(
            '🚨 Dringende Nachfüllung notwendig',
            `${fillPercent}% Füllstand - Kritisch!`,
            'urgent'
        );
    } else if (fillPercent < 40) {
        html += createRecommendationItem(
            '⚠️ Nachfüllung empfohlen',
            `${fillPercent}% Füllstand - Planen Sie Nachfüllung`,
            'wait'
        );
    } else {
        html += createRecommendationItem(
            '✅ Füllstand OK',
            `${fillPercent}% - Keine dringende Nachfüllung nötig`,
            ''
        );
    }
    
    // 2. Bestellmenge
    html += createRecommendationItem(
        '📦 Empfohlene Bestellmenge',
        `${litersNeeded.toLocaleString()} Liter${orderStrategy}`,
        ''
    );
    
    // 3. Optimaler Zeitpunkt
    if (bestTime) {
        const dateStr = new Date(bestTime.date).toLocaleDateString('de-AT', { 
            month: 'long', 
            year: 'numeric' 
        });
        html += createRecommendationItem(
            '📅 Optimaler Kaufzeitpunkt',
            `${dateStr} (~${bestTime.price.toFixed(2)} €/L)`,
            fillPercent < CONFIG.thresholds.lowLevel && !priceIsHigh ? 'urgent' : ''
        );
    }
    
    // 4. Geschätzte Kosten
    const estimatedCost = litersNeeded * (bestTime ? bestTime.price : currentPrice);
    html += createRecommendationItem(
        '💰 Geschätzte Kosten',
        `${estimatedCost.toFixed(0)} € (bei ${bestTime ? bestTime.price.toFixed(2) : currentPrice.toFixed(2)} €/L)`,
        ''
    );
    
    // 5. Jetzt-Kaufen-Empfehlung
    if (fillPercent < CONFIG.thresholds.lowLevel && priceIsHigh) {
        html += createRecommendationItem(
            '🛒 Jetzt kaufen?',
            `<strong style="color: #d97706;">NUR ${Math.round(litersNeeded/1000*10)/10}k Liter - Preis hoch, tank kritisch!</strong>`,
            'wait'
        );
    } else if (fillPercent < CONFIG.thresholds.lowLevel) {
        html += createRecommendationItem(
            '🛒 Jetzt kaufen?',
            '<strong style="color: #dc2626;">JA - Tank fast leer!</strong>',
            'urgent'
        );
    } else if (currentPrice <= CONFIG.thresholds.goodPriceThreshold && fillPercent < 60) {
        html += createRecommendationItem(
            '🛒 Jetzt kaufen?',
            '<strong style="color: #059669;">JA - Guter Preis!</strong>',
            ''
        );
    } else {
        html += createRecommendationItem(
            '🛒 Jetzt kaufen?',
            `<span style="color: #d97706;">Warten bis ${bestTime ? new Date(bestTime.date).toLocaleDateString('de-AT', { month: 'long' }) : 'Sommer'}</span>`,
            'wait'
        );
    }
    
    container.innerHTML = html;
}

function createRecommendationItem(label, value, urgency) {
    return `
        <div class="recommendation-item ${urgency}">
            <span class="recommendation-label">${label}</span>
            <span class="recommendation-value">${value}</span>
        </div>
    `;
}

function findBestBuyingTime(forecast) {
    if (!forecast || !forecast.expected) return null;
    
    // Niedrigsten erwarteten Preis finden
    let best = forecast.expected[0];
    
    forecast.expected.forEach(item => {
        if (item.price < best.price) {
            best = item;
        }
    });
    
    return best;
}

// ==================== Events / RSS ====================
async function loadEvents() {
    const container = document.getElementById('eventsContainer');
    
    // Da RSS-Feeds CORS-Probleme haben, zeigen wir Demo-Events
    // In Produktion würde ein Backend oder Proxy dies lösen
    
    const demoEvents = [
        {
            title: 'Heizölpreise: Wann ist der beste Zeitpunkt zum Tanken?',
            description: 'Experten raten zum richtigen Einkaufszeitpunkt.',
            link: 'https://orf.at/stories/energie',
            date: '2025-02-10',
            source: 'ORF Wirtschaft',
            type: 'global'
        },
        {
            title: 'Energiepreise 2025: Was Hausbesitzer erwartet',
            description: 'Ausblick für Heizkosten und Strompreise.',
            link: 'https://orf.at/stories/energiepreise',
            date: '2025-02-08',
            source: 'ORF Wirtschaft',
            type: 'global'
        },
        {
            title: 'Tirol: Energie-Tipps für Hausbesitzer',
            description: 'Regionale Informationen zur Heizperiode.',
            link: 'https://tirol.orf.at/stories/energie',
            date: '2025-02-05',
            source: 'ORF Tirol',
            type: 'regional'
        },
        {
            title: 'Heizung warten: Das sollten Sie beachten',
            description: 'Tipps zur Senkung der Heizkosten.',
            link: 'https://help.orf.at/stories/heizkosten-senken',
            date: '2025-02-01',
            source: 'ORF Help',
            type: 'global'
        }
    ];
    
    // Versuche echte RSS-Feeds (falls CORS-Proxy funktioniert)
    try {
        const realEvents = await fetchRSSFeeds();
        if (realEvents && realEvents.length > 0) {
            renderEvents([...realEvents, ...demoEvents].slice(0, 8));
            return;
        }
    } catch (error) {
        console.log('RSS-Feeds nicht verfügbar, zeige Demo-Events');
    }
    
    renderEvents(demoEvents);
}

async function fetchRSSFeeds() {
    const events = [];
    
    for (const feed of CONFIG.rssFeeds) {
        try {
            const response = await fetch(
                CONFIG.corsProxy + encodeURIComponent(feed.url)
            );
            const data = await response.json();
            
            // RSS parsen (vereinfacht)
            const parser = new DOMParser();
            const xml = parser.parseFromString(data.contents, 'text/xml');
            const items = xml.querySelectorAll('item');
            
            items.forEach(item => {
                const title = item.querySelector('title')?.textContent;
                const link = item.querySelector('link')?.textContent;
                const pubDate = item.querySelector('pubDate')?.textContent;
                
                if (title) {
                    events.push({
                        title: title,
                        description: '',
                        link: link || '#',
                        date: pubDate ? new Date(pubDate).toISOString().split('T')[0] : '',
                        source: feed.name,
                        type: feed.type
                    });
                }
            });
        } catch (e) {
            console.warn(`Feed ${feed.name} konnte nicht geladen werden`);
        }
    }
    
    return events;
}

function renderEvents(events) {
    const container = document.getElementById('eventsContainer');
    
    if (!events || events.length === 0) {
        container.innerHTML = '<p class="no-data">Keine Events verfügbar</p>';
        return;
    }
    
    let html = '';
    
    events.forEach(event => {
        const icon = event.type === 'global' ? '🌍' : '🏔️';
        
        html += `
            <div class="event-item">
                <span class="event-icon">${icon}</span>
                <div class="event-content">
                    <h4><a href="${event.link}" target="_blank">${event.title}</a></h4>
                    ${event.description ? `<p>${event.description}</p>` : ''}
                    <div class="event-meta">
                        <span>${event.date}</span>
                        <span>${event.source}</span>
                        <span class="event-tag ${event.type}">${event.type === 'global' ? 'Global' : 'Regional'}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ==================== Event Listeners ====================
function setupEventListeners() {
    // Tank speichern
    document.getElementById('saveTank').addEventListener('click', saveTankData);
    
    // Enter-Taste zum Speichern
    ['tankVolume', 'currentLevel'].forEach(id => {
        document.getElementById(id).addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveTankData();
            }
        });
    });
}

// ==================== Utility ====================
function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('de-AT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}