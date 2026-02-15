/**
 * Recommendation Module
 * Purchase recommendation logic based on tank level and price forecast
 */

import { CONFIG } from './config.js';
import { state } from './state.js';
import { forecastEngine } from './forecast.js';
import { dataService } from './data-service.js';

class RecommendationEngine {
    constructor() {
        this.recommendation = null;
    }
    
    /**
     * Calculate and return purchase recommendation
     */
    calculate() {
        const tankVolume = state.get('tankVolume');
        const tankLevel = state.get('tankLevel');
        const priceData = state.get('priceData');
        const forecast = state.get('forecast');
        
        // Missing data check
        if (!tankVolume || tankLevel === null) {
            return this.getEmptyRecommendation('Bitte Tank-Daten eingeben');
        }
        
        if (!priceData || !forecast) {
            return this.getEmptyRecommendation('Daten werden geladen...');
        }
        
        // Calculate metrics
        const fillPercent = Math.round((tankLevel / tankVolume) * 100);
        const currentPrice = state.get('currentPrice');
        const bestTime = forecastEngine.findBestBuyingTime();
        const isPriceHigh = forecastEngine.isPriceHigh(currentPrice);
        
        // Determine urgency and strategy
        const urgency = this.calculateUrgency(fillPercent);
        const strategy = this.calculateStrategy(fillPercent, isPriceHigh);
        
        // Calculate order quantity
        const orderQuantity = this.calculateOrderQuantity(tankVolume, tankLevel, strategy);
        
        // Calculate estimated cost
        const estimatedCost = orderQuantity * (bestTime?.price || currentPrice);
        
        this.recommendation = {
            fillPercent,
            urgency,
            strategy,
            orderQuantity,
            estimatedCost,
            bestTime,
            currentPrice,
            isPriceHigh,
            items: this.generateRecommendationItems(fillPercent, strategy, orderQuantity, estimatedCost, bestTime, currentPrice, isPriceHigh)
        };
        
        return this.recommendation;
    }
    
    /**
     * Calculate urgency level
     */
    calculateUrgency(fillPercent) {
        if (fillPercent < CONFIG.thresholds.criticalLevel) return 'critical';
        if (fillPercent < CONFIG.thresholds.lowLevel) return 'urgent';
        if (fillPercent < 40) return 'warning';
        return 'normal';
    }
    
    /**
     * Determine purchase strategy
     */
    calculateStrategy(fillPercent, isPriceHigh) {
        if (fillPercent < CONFIG.thresholds.criticalLevel) {
            if (isPriceHigh) return 'emergency-limited'; // 30% rule
            return 'emergency-full'; // Fill up completely
        }
        
        if (fillPercent < CONFIG.thresholds.lowLevel) {
            if (isPriceHigh) return 'limited'; // 30% rule
            return 'full';
        }
        
        return 'wait';
    }
    
    /**
     * Calculate order quantity based on strategy
     */
    calculateOrderQuantity(tankVolume, tankLevel, strategy) {
        switch (strategy) {
            case 'emergency-limited':
            case 'limited':
                // 30% rule: only order 30% of tank capacity
                return Math.round(tankVolume * CONFIG.strategy.emergencyFillPercent / 100 * 10) / 10;
            
            case 'emergency-full':
            case 'full':
                // Fill to optimal level
                return tankVolume - tankLevel;
            
            case 'wait':
            default:
                return 0;
        }
    }
    
    /**
     * Generate recommendation items for UI
     */
    generateRecommendationItems(fillPercent, strategy, orderQuantity, estimatedCost, bestTime, currentPrice, isPriceHigh) {
        const items = [];
        
        // 1. Fill level status
        items.push({
            icon: this.getUrgencyIcon(fillPercent),
            label: this.getFillStatusLabel(fillPercent),
            value: `${fillPercent}% Füllstand`,
            urgency: fillPercent < CONFIG.thresholds.lowLevel ? 'urgent' : (fillPercent < 40 ? 'warning' : '')
        });
        
        // 2. Order quantity
        if (orderQuantity > 0) {
            const strategyText = (strategy === 'limited' || strategy === 'emergency-limited') 
                ? ' (30%-Strategie)' 
                : '';
            items.push({
                icon: '📦',
                label: 'Empfohlene Bestellmenge',
                value: `${orderQuantity.toLocaleString()} Liter${strategyText}`,
                urgency: ''
            });
        }
        
        // 3. Best buying time
        if (bestTime) {
            items.push({
                icon: '📅',
                label: 'Optimaler Kaufzeitpunkt',
                value: `${bestTime.month} ${bestTime.year} (~${bestTime.price.toFixed(2)} €/L)`,
                urgency: fillPercent < CONFIG.thresholds.lowLevel && !isPriceHigh ? 'urgent' : ''
            });
        }
        
        // 4. Estimated cost
        if (orderQuantity > 0) {
            items.push({
                icon: '💰',
                label: 'Geschätzte Kosten',
                value: `${estimatedCost.toFixed(0)} €`,
                urgency: ''
            });
        }
        
        // 5. Action recommendation
        items.push({
            icon: '🛒',
            label: 'Jetzt kaufen?',
            value: this.getActionText(fillPercent, isPriceHigh, strategy),
            urgency: this.getActionUrgency(fillPercent, isPriceHigh)
        });
        
        return items;
    }
    
    /**
     * Get icon for fill level urgency
     */
    getUrgencyIcon(fillPercent) {
        if (fillPercent < CONFIG.thresholds.criticalLevel) return '🚨';
        if (fillPercent < CONFIG.thresholds.lowLevel) return '⚠️';
        if (fillPercent < 40) return '📉';
        return '✅';
    }
    
    /**
     * Get fill level status label
     */
    getFillStatusLabel(fillPercent) {
        if (fillPercent < CONFIG.thresholds.criticalLevel) return 'Kritisch!';
        if (fillPercent < CONFIG.thresholds.lowLevel) return 'Niedrig';
        if (fillPercent < 40) return 'Planen';
        return 'Füllstand OK';
    }
    
    /**
     * Get action text
     */
    getActionText(fillPercent, isPriceHigh, strategy) {
        if (fillPercent >= 60) {
            return `<span style="color: #059669;">Nein - noch genug Öl</span>`;
        }
        
        if (strategy === 'emergency-limited' || strategy === 'limited') {
            return `<strong style="color: #d97706;">NUR Teilmenge - Preis hoch!</strong>`;
        }
        
        if (fillPercent < CONFIG.thresholds.lowLevel) {
            return `<strong style="color: #dc2626;">JA - Tank fast leer!</strong>`;
        }
        
        return `<span style="color: #059669;">Guter Zeitpunkt</span>`;
    }
    
    /**
     * Get action urgency for styling
     */
    getActionUrgency(fillPercent, isPriceHigh) {
        if (fillPercent < CONFIG.thresholds.lowLevel && !isPriceHigh) return 'urgent';
        if (fillPercent < CONFIG.thresholds.lowLevel) return 'warning';
        return '';
    }
    
    /**
     * Return empty recommendation state
     */
    getEmptyRecommendation(message) {
        return {
            items: [],
            empty: true,
            message
        };
    }
}

export const recommendationEngine = new RecommendationEngine();
export default RecommendationEngine;