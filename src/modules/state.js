/**
 * State Management Module
 * Simple reactive state for Heizöl-Optimizer
 */

class StateManager {
    constructor(initialState = {}) {
        this.state = initialState;
        this.listeners = new Map();
        this.history = [];
    }
    
    /**
     * Get current state
     */
    get(key = null) {
        if (key === null) return { ...this.state };
        return this.state[key];
    }
    
    /**
     * Set state and notify listeners
     */
    set(key, value) {
        const oldValue = this.state[key];
        this.state[key] = value;
        
        // Track history
        this.history.push({
            timestamp: Date.now(),
            key,
            oldValue,
            newValue: value
        });
        
        // Notify listeners
        this.notify(key, value, oldValue);
    }
    
    /**
     * Update multiple keys at once
     */
    update(updates) {
        Object.entries(updates).forEach(([key, value]) => {
            this.set(key, value);
        });
    }
    
    /**
     * Subscribe to state changes
     */
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);
        
        // Return unsubscribe function
        return () => {
            this.listeners.get(key).delete(callback);
        };
    }
    
    /**
     * Notify all listeners for a key
     */
    notify(key, newValue, oldValue) {
        if (this.listeners.has(key)) {
            this.listeners.get(key).forEach(callback => {
                try {
                    callback(newValue, oldValue, key);
                } catch (error) {
                    console.error(`State listener error for ${key}:`, error);
                }
            });
        }
    }
    
    /**
     * Reset state
     */
    reset(initialState = {}) {
        this.state = initialState;
        this.history = [];
        this.listeners.forEach((listeners, key) => {
            this.notify(key, this.state[key], undefined);
        });
    }
}

// Create global state instance
export const state = new StateManager({
    // Price data
    priceData: null,
    currentPrice: null,
    
    // Forecast
    forecast: null,
    
    // Tank data
    tankVolume: null,
    tankLevel: null,
    
    // UI state
    isLoading: false,
    error: null,
    lastUpdate: null
});

export default StateManager;