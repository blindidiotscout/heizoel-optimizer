/**
 * Heizöl-Optimizer v2.0
 * Modular architecture with state management
 */

import { CONFIG } from './modules/config.js';
import { state } from './modules/state.js';
import { storage } from './modules/storage.js';
import { dataService } from './modules/data-service.js';
import { forecastEngine } from './modules/forecast.js';
import { recommendationEngine } from './modules/recommendation.js';

class HeizolOptimizer {
    constructor() {
        this.chart = null;
        console.log(`🛢️ ${CONFIG.app.name} v${CONFIG.app.version} wird initialisiert...`);
    }
    
    /**
     * Initialize the application
     */
    async init() {
        // Load persisted tank data
        this.loadTankData();
        
        // Setup state subscriptions
        this.setupSubscriptions();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load price data
        await dataService.loadPriceData();
        
        // Generate forecast
        forecastEngine.generateForecast();
        
        // Create chart
        this.createChart();
        
        // Load events
        this.loadEvents();
        
        // Update recommendation
        this.updateRecommendation();
        
        console.log('✅ Heizöl-Optimizer bereit!');
    }
    
    /**
     * Load tank data from storage
     */
    loadTankData() {
        const data = storage.loadTankData();
        if (data.volume && data.currentLevel) {
            state.set('tankVolume', data.volume);
            state.set('tankLevel', data.currentLevel);
            
            // Update inputs
            document.getElementById('tankVolume').value = data.volume;
            document.getElementById('currentLevel').value = data.currentLevel;
        }
        this.updateTankVisual();
    }
    
    /**
     * Setup state subscriptions for reactive updates
     */
    setupSubscriptions() {
        // Update recommendation when tank data changes
        state.subscribe('tankVolume', () => this.updateRecommendation());
        state.subscribe('tankLevel', () => {
            this.updateRecommendation();
            this.updateTankVisual();
        });
        
        // Update chart when price data or forecast changes
        state.subscribe('priceData', () => this.updateChart());
        state.subscribe('forecast', () => this.updateChart());
        
        // Handle loading state
        state.subscribe('isLoading', (loading) => {
            // Could show spinner here
        });
        
        // Handle errors
        state.subscribe('error', (error) => {
            if (error) {
                console.error('App error:', error);
            }
        });
    }
    
    /**
     * Setup DOM event listeners
     */
    setupEventListeners() {
        // Save tank button
        document.getElementById('saveTank').addEventListener('click', () => this.saveTankData());
        
        // Enter key to save
        ['tankVolume', 'currentLevel'].forEach(id => {
            document.getElementById(id).addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.saveTankData();
            });
        });
        
        // Refresh button (if exists)
        const refreshBtn = document.getElementById('refreshData');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshData());
        }
    }
    
    /**
     * Save tank data
     */
    saveTankData() {
        const volume = parseInt(document.getElementById('tankVolume').value);
        const level = parseInt(document.getElementById('currentLevel').value);
        const statusDiv = document.getElementById('tankStatus');
        
        // Validate
        const validation = storage.validateTankData(volume, level);
        if (!validation.valid) {
            this.showStatus(statusDiv, validation.errors[0], 'error');
            return;
        }
        
        // Save
        const result = storage.saveTankData(volume, level);
        if (result.success) {
            state.set('tankVolume', volume);
            state.set('tankLevel', level);
            this.showStatus(statusDiv, '✓ Tank-Daten gespeichert!', 'success');
        } else {
            this.showStatus(statusDiv, result.error, 'error');
        }
    }
    
    /**
     * Update tank visual display
     */
    updateTankVisual() {
        const tankFill = document.getElementById('tankFill');
        const tankPercent = document.getElementById('tankPercent');
        
        const volume = state.get('tankVolume');
        const level = state.get('tankLevel');
        
        if (!volume || level === null) {
            tankFill.style.height = '0%';
            tankPercent.textContent = '--% gefüllt';
            return;
        }
        
        const percent = Math.round((level / volume) * 100);
        
        tankFill.style.height = percent + '%';
        tankPercent.textContent = percent + '% gefüllt';
        
        // Color based on level
        tankFill.classList.remove('low', 'medium');
        if (percent < 20) tankFill.classList.add('low');
        else if (percent < 40) tankFill.classList.add('medium');
    }
    
    /**
     * Show status message
     */
    showStatus(element, message, type) {
        element.textContent = message;
        element.className = 'status-message ' + type;
        setTimeout(() => {
            element.textContent = '';
            element.className = 'status-message';
        }, 3000);
    }
    
    /**
     * Create price chart
     */
    createChart() {
        const ctx = document.getElementById('priceChart').getContext('2d');
        const chartData = forecastEngine.getChartData();
        
        if (!chartData) return;
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: 'Historische Preise',
                        data: chartData.historical,
                        borderColor: '#3b82f6',
                        borderWidth: 2,
                        tension: 0.3,
                        fill: false,
                        pointRadius: 3,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Erwarteter Preis',
                        data: chartData.expected,
                        borderColor: '#8b5cf6',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        tension: 0.3,
                        fill: false,
                        pointRadius: 0
                    },
                    {
                        label: 'Best-Case',
                        data: chartData.bestCase,
                        borderColor: '#10b981',
                        borderWidth: 1,
                        borderDash: [3, 3],
                        tension: 0.3,
                        fill: false,
                        pointRadius: 0
                    },
                    {
                        label: 'Worst-Case',
                        data: chartData.worstCase,
                        borderColor: '#ef4444',
                        borderWidth: 1,
                        borderDash: [3, 3],
                        tension: 0.3,
                        fill: {
                            target: 'origin',
                            above: 'rgba(16, 185, 129, 0.1)',
                            below: 'rgba(239, 68, 68, 0.1)'
                        },
                        pointRadius: 0
                    }
                ]
            },
            options: this.getChartOptions()
        });
    }
    
    /**
     * Get chart options with improved tooltip
     */
    getChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: {
                title: {
                    display: true,
                    text: 'Heizölpreis-Entwicklung mit 12-Monats-Prognose',
                    font: { size: 16 }
                },
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: (context) => {
                            if (context.length > 0) {
                                const date = new Date(context[0].parsed.x);
                                return date.toLocaleDateString('de-AT', { month: 'long', year: 'numeric' });
                            }
                            return '';
                        },
                        label: (context) => {
                            if (context.dataset.label === 'Historische Preise') {
                                const date = new Date(context.parsed.x);
                                const now = new Date();
                                now.setDate(1);
                                if (date > now) return null;
                            }
                            const label = context.dataset.label || '';
                            const price = context.parsed.y?.toFixed(2) || '--';
                            return `${label}: ${price} €/L`;
                        },
                        footer: (tooltipItems) => {
                            if (!tooltipItems.length) return '';
                            
                            const date = new Date(tooltipItems[0].parsed.x);
                            const now = new Date();
                            now.setDate(1);
                            if (date <= now) return '';
                            
                            const prevPrices = dataService.getPreviousYearPrices(date.getMonth(), 2);
                            if (!prevPrices.length) return '';
                            
                            const lines = ['─────────────', '📊 Vorjahresvergleich:'];
                            prevPrices.forEach(p => lines.push(`  ${p.year}: ${p.price.toFixed(2)} €/L`));
                            return lines.join('\n');
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: { unit: 'month', displayFormats: { month: 'MMM yyyy' } },
                    title: { display: true, text: 'Datum' }
                },
                y: {
                    title: { display: true, text: 'Preis (€/Liter)' }
                }
            }
        };
    }
    
    /**
     * Update chart data
     */
    updateChart() {
        const chartData = forecastEngine.getChartData();
        if (!chartData || !this.chart) return;
        
        this.chart.data.datasets[0].data = chartData.historical;
        this.chart.data.datasets[1].data = chartData.expected;
        this.chart.data.datasets[2].data = chartData.bestCase;
        this.chart.data.datasets[3].data = chartData.worstCase;
        
        this.chart.update();
    }
    
    /**
     * Update recommendation display
     */
    updateRecommendation() {
        const container = document.getElementById('recommendationContent');
        const recommendation = recommendationEngine.calculate();
        
        if (recommendation.empty) {
            container.innerHTML = `<p class="no-data">${recommendation.message}</p>`;
            return;
        }
        
        const html = recommendation.items.map(item => `
            <div class="recommendation-item ${item.urgency}">
                <span class="recommendation-label">${item.icon} ${item.label}</span>
                <span class="recommendation-value">${item.value}</span>
            </div>
        `).join('');
        
        container.innerHTML = html;
    }
    
    /**
     * Load and display events
     */
    async loadEvents() {
        const container = document.getElementById('eventsContainer');
        
        // Try to load real events
        let events = await dataService.fetchEvents();
        
        // Fallback to demo events
        if (!events.length) {
            events = this.getDemoEvents();
        }
        
        this.renderEvents(events);
    }
    
    /**
     * Get demo events for fallback
     */
    getDemoEvents() {
        return [
            { title: 'Heizölpreise: Entwicklung im Februar', link: '#', date: '2026-02-10', source: 'Demo', type: 'global' },
            { title: 'Energiepreise 2026: Prognose', link: '#', date: '2026-02-05', source: 'Demo', type: 'global' }
        ];
    }
    
    /**
     * Render events in container
     */
    renderEvents(events) {
        const container = document.getElementById('eventsContainer');
        
        const html = events.map(event => `
            <div class="event-item">
                <span class="event-icon">${event.type === 'global' ? '🌍' : '🏔️'}</span>
                <div class="event-content">
                    <h4><a href="${event.link}" target="_blank">${event.title}</a></h4>
                    <div class="event-meta">
                        <span>${event.date}</span>
                        <span>${event.source}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = html;
    }
    
    /**
     * Refresh all data
     */
    async refreshData() {
        await dataService.refresh();
        forecastEngine.generateForecast();
        this.updateChart();
        this.updateRecommendation();
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new HeizolOptimizer();
    app.init();
    
    // Expose for debugging
    window.heizolOptimizer = app;
});

export default HeizolOptimizer;