/**
 * Storage Module
 * LocalStorage wrapper with validation and error handling
 */

import { CONFIG } from './config.js';

class StorageService {
    constructor() {
        this.prefix = 'heizoel_';
    }
    
    /**
     * Save tank data to LocalStorage
     */
    saveTankData(volume, currentLevel) {
        try {
            localStorage.setItem(CONFIG.storage.tankVolume, volume.toString());
            localStorage.setItem(CONFIG.storage.currentLevel, currentLevel.toString());
            localStorage.setItem(CONFIG.storage.lastUpdate, new Date().toISOString());
            return { success: true };
        } catch (error) {
            console.error('Failed to save tank data:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Load tank data from LocalStorage
     */
    loadTankData() {
        const volume = localStorage.getItem(CONFIG.storage.tankVolume);
        const level = localStorage.getItem(CONFIG.storage.currentLevel);
        
        return {
            volume: volume ? parseInt(volume) : null,
            currentLevel: level ? parseInt(level) : null,
            lastUpdate: localStorage.getItem(CONFIG.storage.lastUpdate)
        };
    }
    
    /**
     * Clear all tank data
     */
    clearTankData() {
        localStorage.removeItem(CONFIG.storage.tankVolume);
        localStorage.removeItem(CONFIG.storage.currentLevel);
        localStorage.removeItem(CONFIG.storage.lastUpdate);
    }
    
    /**
     * Save settings
     */
    saveSettings(settings) {
        try {
            localStorage.setItem(CONFIG.storage.settings, JSON.stringify(settings));
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Load settings
     */
    loadSettings() {
        const data = localStorage.getItem(CONFIG.storage.settings);
        return data ? JSON.parse(data) : {};
    }
    
    /**
     * Check if tank data exists
     */
    hasTankData() {
        const data = this.loadTankData();
        return data.volume !== null && data.currentLevel !== null;
    }
    
    /**
     * Validate tank data
     */
    validateTankData(volume, level) {
        const errors = [];
        
        if (!volume || volume < 100) {
            errors.push('Tank-Volumen muss mindestens 100 Liter sein');
        }
        
        if (!Number.isFinite(level) || level < 0) {
            errors.push('Füllstand muss eine positive Zahl sein');
        }
        
        if (level > volume) {
            errors.push('Füllstand kann nicht größer als Tank-Volumen sein');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
}

export const storage = new StorageService();
export default StorageService;