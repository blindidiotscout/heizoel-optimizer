/**
 * Heizöl-Optimizer Configuration
 * Centralized config for all modules
 */

export const CONFIG = {
    // App metadata
    app: {
        name: 'Heizöl-Optimizer',
        version: '2.0.0',
        region: 'Österreich'
    },
    
    // Data sources
    data: {
        priceUrl: 'data/sample_prices.json',
        refreshIntervalMs: 60 * 60 * 1000, // 1 hour
    },
    
    // RSS-Feeds für Events (via CORS Proxy)
    corsProxy: 'https://api.allorigins.win/get?url=',
    rssFeeds: [
        { name: 'ORF Wirtschaft', url: 'https://rss.orf.at/wirtschaft.xml', type: 'global' },
        { name: 'ORF Tirol', url: 'https://rss.orf.at/news/Tirol.xml', type: 'regional' }
    ],
    
    // Prognose-Einstellungen
    forecast: {
        months: 12,
        baseUncertainty: 0.05,
        uncertaintyGrowthPerMonth: 0.03,
        // Monatliche Saisonalitätsfaktoren (basierend auf 4 Jahren Daten)
        seasonalFactors: {
            0: 1.06,  // Jänner - Winter
            1: 1.04,  // Februar - Winter
            2: 1.00,  // März - Frühling
            3: 0.98,  // April
            4: 0.94,  // Mai - Sommer-Tiefpunkt
            5: 0.93,  // Juni
            6: 0.95,  // Juli
            7: 0.97,  // August
            8: 1.00,  // September
            9: 1.02,  // Oktober
            10: 1.05, // November - Winter
            11: 1.07  // Dezember - Winter-Hochpunkt
        }
    },
    
    // LocalStorage Keys
    storage: {
        tankVolume: 'heizoel_tankVolume',
        currentLevel: 'heizoel_currentLevel',
        lastUpdate: 'heizoel_lastUpdate',
        settings: 'heizoel_settings'
    },
    
    // Kaufempfehlung Schwellenwerte
    thresholds: {
        criticalLevel: 15,     // Kritisch - sofort handeln
        lowLevel: 20,          // Niedrig - planen
        optimalFill: 80,       // Zielfüllstand
        goodPriceThreshold: 1.10,  // €/L - guter Preis
        highPriceMultiplier: 1.10,  // >10% über beste Prognose = hoch
    },
    
    // 30%-Regel
    strategy: {
        emergencyFillPercent: 30,  // Bei kritischem Füllstand + hohem Preis
    }
};

export default CONFIG;