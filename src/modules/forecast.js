/**
 * Forecast Module
 * Enhanced forecast engine with trend analysis and confidence intervals
 */

import { CONFIG } from './config.js';
import { state } from './state.js';

class ForecastEngine {
    constructor() {
        this.forecast = null;
    }
    
    /**
     * Generate price forecast using Holt-Winters-like approach
     */
    generateForecast(months = CONFIG.forecast.months) {
        const priceData = state.get('priceData');
        if (!priceData?.historical || priceData.historical.length < 12) {
            console.warn('Not enough historical data for forecast');
            return null;
        }
        
        const historical = priceData.historical;
        const lastPrice = historical[historical.length - 1].price;
        const lastDate = new Date(historical[historical.length - 1].date);
        
        // Calculate trend from last 12 months
        const trend = this.calculateTrend(historical);
        
        // Generate forecast
        const forecast = {
            expected: [],
            bestCase: [],
            worstCase: [],
            metadata: {
                basePrice: lastPrice,
                trend: trend,
                generatedAt: new Date().toISOString()
            }
        };
        
        for (let i = 1; i <= months; i++) {
            const date = new Date(lastDate);
            date.setMonth(date.getMonth() + i);
            
            const month = date.getMonth();
            
            // Get seasonal factor
            const seasonalFactor = CONFIG.forecast.seasonalFactors[month];
            
            // Calculate expected price with trend
            const trendComponent = trend * i;
            const expectedPrice = lastPrice * seasonalFactor + trendComponent;
            
            // Calculate uncertainty (grows with time)
            const uncertainty = this.calculateUncertainty(i);
            
            // Best and worst case
            const bestPrice = expectedPrice * (1 - uncertainty);
            const worstPrice = expectedPrice * (1 + uncertainty);
            
            const dateStr = date.toISOString().split('T')[0];
            
            forecast.expected.push({ date: dateStr, price: Math.max(0.50, expectedPrice) });
            forecast.bestCase.push({ date: dateStr, price: Math.max(0.50, bestPrice) });
            forecast.worstCase.push({ date: dateStr, price: worstPrice });
        }
        
        this.forecast = forecast;
        state.set('forecast', forecast);
        
        return forecast;
    }
    
    /**
     * Calculate trend from historical data
     * Uses linear regression on last 12 months
     */
    calculateTrend(historical) {
        const recent = historical.slice(-12);
        if (recent.length < 2) return 0;
        
        // Simple linear regression
        const n = recent.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        
        recent.forEach((item, i) => {
            sumX += i;
            sumY += item.price;
            sumXY += i * item.price;
            sumX2 += i * i;
        });
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        
        // Return monthly price change (€/Liter per month)
        return slope || 0;
    }
    
    /**
     * Calculate uncertainty for a given month ahead
     * Conical uncertainty that grows with time
     */
    calculateUncertainty(monthsAhead) {
        return CONFIG.forecast.baseUncertainty + 
               (monthsAhead * CONFIG.forecast.uncertaintyGrowthPerMonth);
    }
    
    /**
     * Find the best buying time in forecast
     */
    findBestBuyingTime() {
        if (!this.forecast?.expected) return null;
        
        let best = this.forecast.expected[0];
        
        this.forecast.expected.forEach(item => {
            if (item.price < best.price) {
                best = item;
            }
        });
        
        return {
            date: best.date,
            price: best.price,
            month: new Date(best.date).toLocaleDateString('de-AT', { month: 'long' }),
            year: new Date(best.date).getFullYear()
        };
    }
    
    /**
     * Check if current price is high relative to forecast
     */
    isPriceHigh(currentPrice) {
        const bestTime = this.findBestBuyingTime();
        if (!bestTime) return false;
        
        return currentPrice > (bestTime.price * CONFIG.thresholds.highPriceMultiplier);
    }
    
    /**
     * Get price recommendation
     */
    getPriceRecommendation(currentPrice) {
        const bestTime = this.findBestBuyingTime();
        const isHigh = this.isPriceHigh(currentPrice);
        
        return {
            currentPrice,
            bestTime,
            isPriceHigh: isHigh,
            potentialSaving: currentPrice - (bestTime?.price || currentPrice),
            recommendation: this.generateRecommendationText(currentPrice, bestTime, isHigh)
        };
    }
    
    /**
     * Generate human-readable recommendation
     */
    generateRecommendationText(currentPrice, bestTime, isHigh) {
        if (!bestTime) return 'Keine Prognose verfügbar';
        
        if (isHigh) {
            return `Preis ist hoch. Bester Zeitpunkt: ${bestTime.month} ${bestTime.year} (${bestTime.price.toFixed(2)} €/L)`;
        }
        
        if (currentPrice <= bestTime.price * 1.02) {
            return `Guter Preis! Jetzt kaufen.`;
        }
        
        return `Warten bis ${bestTime.month} ${bestTime.year}`;
    }
    
    /**
     * Get chart-ready data
     */
    getChartData() {
        const priceData = state.get('priceData');
        const forecast = this.forecast;
        
        if (!priceData || !forecast) return null;
        
        return {
            historical: priceData.historical.map(d => ({ x: d.date, y: d.price })),
            expected: forecast.expected.map(d => ({ x: d.date, y: d.price })),
            bestCase: forecast.bestCase.map(d => ({ x: d.date, y: d.price })),
            worstCase: forecast.worstCase.map(d => ({ x: d.date, y: d.price }))
        };
    }
}

export const forecastEngine = new ForecastEngine();
export default ForecastEngine;