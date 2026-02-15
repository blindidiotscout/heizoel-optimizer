/**
 * Data Service Module
 * Handles price data loading and RSS feeds
 */

import { CONFIG } from './config.js';
import { state } from './state.js';

class DataService {
    constructor() {
        this.cache = {
            priceData: null,
            lastFetch: null,
            cacheTimeout: CONFIG.data.refreshIntervalMs
        };
    }
    
    /**
     * Load price data from JSON file
     */
    async loadPriceData() {
        try {
            state.set('isLoading', true);
            state.set('error', null);
            
            const response = await fetch(CONFIG.data.priceUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Validate data structure
            if (!data.historical || !Array.isArray(data.historical)) {
                throw new Error('Invalid data format: missing historical array');
            }
            
            // Update state
            state.set('priceData', data);
            state.set('currentPrice', data.currentPrice || data.historical[data.historical.length - 1].price);
            state.set('lastUpdate', new Date().toISOString());
            
            this.cache.priceData = data;
            this.cache.lastFetch = Date.now();
            
            state.set('isLoading', false);
            
            console.log(`📊 Daten geladen: ${data.historical.length} Monate`);
            return data;
            
        } catch (error) {
            console.error('Failed to load price data:', error);
            state.set('error', error.message);
            state.set('isLoading', false);
            
            // Return fallback data
            return this.generateFallbackData();
        }
    }
    
    /**
     * Generate fallback data if API fails
     */
    generateFallbackData() {
        const historical = [];
        const baseDate = new Date();
        baseDate.setFullYear(baseDate.getFullYear() - 4);
        
        for (let i = 0; i < 48; i++) {
            const date = new Date(baseDate);
            date.setMonth(date.getMonth() + i);
            
            const month = date.getMonth();
            const seasonalFactor = CONFIG.forecast.seasonalFactors[month];
            const base = 1.10;
            const yearlyTrend = (date.getFullYear() - 2022) * 0.02;
            
            const price = base * seasonalFactor * (1 + yearlyTrend);
            
            historical.push({
                date: date.toISOString().split('T')[0],
                price: Math.round(price * 100) / 100
            });
        }
        
        return {
            metadata: {
                region: CONFIG.app.region,
                source: 'Fallback (offline)'
            },
            historical,
            currentPrice: historical[historical.length - 1]?.price || 1.10,
            lastUpdated: new Date().toISOString().split('T')[0]
        };
    }
    
    /**
     * Find historical price for specific month/year
     */
    findHistoricalPrice(month, year) {
        const priceData = state.get('priceData');
        if (!priceData?.historical) return null;
        
        return priceData.historical.find(h => {
            const date = new Date(h.date);
            return date.getMonth() === month && date.getFullYear() === year;
        });
    }
    
    /**
     * Get previous year prices for a month
     */
    getPreviousYearPrices(month, years = 2) {
        const currentYear = new Date().getFullYear();
        const result = [];
        
        for (let i = 1; i <= years; i++) {
            const year = currentYear - i;
            const price = this.findHistoricalPrice(month, year);
            if (price) {
                result.push({ year, price: price.price });
            }
        }
        
        return result;
    }
    
    /**
     * Fetch RSS feed events
     */
    async fetchEvents() {
        const events = [];
        
        for (const feed of CONFIG.rssFeeds) {
            try {
                const response = await fetch(CONFIG.corsProxy + encodeURIComponent(feed.url));
                const data = await response.json();
                
                const parser = new DOMParser();
                const xml = parser.parseFromString(data.contents, 'text/xml');
                const items = xml.querySelectorAll('item');
                
                items.forEach((item, index) => {
                    if (index >= 5) return; // Limit to 5 per feed
                    
                    const title = item.querySelector('title')?.textContent;
                    const link = item.querySelector('link')?.textContent;
                    const pubDate = item.querySelector('pubDate')?.textContent;
                    
                    if (title) {
                        events.push({
                            title,
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
    
    /**
     * Check if cache is valid
     */
    isCacheValid() {
        return this.cache.priceData && 
               this.cache.lastFetch && 
               (Date.now() - this.cache.lastFetch) < this.cache.cacheTimeout;
    }
    
    /**
     * Force refresh data
     */
    async refresh() {
        this.cache.lastFetch = null;
        return this.loadPriceData();
    }
}

export const dataService = new DataService();
export default DataService;