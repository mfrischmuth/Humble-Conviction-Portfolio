/**
 * Enhanced FileHandler Module v1.2 - Fixed Data Keys
 * File: file_handler_v1_2.js
 * Last Updated: 2025-08-29 13:30:00 UTC
 * 
 * CRITICAL FIX v1.2:
 * - All indicator keys now use snake_case per PRD v3.3
 * - Matches expected keys from ThemeCalculator
 * - Fixed missing indicators in tech_boom scenario
 */

const FileHandler = {
    version: '1.2',
    lastUpdated: '2025-08-29T13:30:00.000Z',
    
    // File validation functions remain the same
    handleInitFile: function(event, callback) {
        const file = event.target.files[0];
        if (!file) return false;
        
        if (!file.name.includes('initialize') && !file.name.includes('init')) {
            alert('This appears to be a monthly file. Please select an initialization file.');
            return false;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                const validation = this.validateInitializationFile(data);
                if (!validation.isValid) {
                    alert('Invalid initialization file:\n' + validation.errors.join('\n'));
                    return false;
                }
                
                document.getElementById('init-status').innerHTML = 
                    '<span class="status-good">✅ Initialization data loaded successfully</span>';
                
                console.log('Initialization file loaded successfully');
                
                if (callback) callback(data, 'initialization');
                return true;
                
            } catch (error) {
                alert('Error parsing initialization file: ' + error.message);
                return false;
            }
        };
        
        reader.readAsText(file);
        return true;
    },

    handleMonthlyFile: function(event, callback) {
        const file = event.target.files[0];
        if (!file) return false;
        
        if (!file.name.includes('monthly')) {
            alert('This appears to be an initialization file. Please select a monthly update file.');
            return false;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                const validation = this.validateMonthlyFile(data);
                if (!validation.isValid) {
                    alert('Invalid monthly file:\n' + validation.errors.join('\n'));
                    return false;
                }
                
                document.getElementById('monthly-status').innerHTML = 
                    '<span class="status-good">✅ Monthly data loaded successfully</span>';
                
                console.log('Monthly file loaded successfully');
                
                if (callback) callback(data, 'monthly');
                return true;
                
            } catch (error) {
                alert('Error parsing monthly file: ' + error.message);
                return false;
            }
        };
        
        reader.readAsText(file);
        return true;
    },

    validateInitializationFile: function(data) {
        const validation = { isValid: true, errors: [], warnings: [] };
        
        if (!data) {
            validation.isValid = false;
            validation.errors.push('File is empty or corrupted');
            return validation;
        }
        
        if (!data.data_type || data.data_type !== 'initialization') {
            validation.warnings.push('Data type not specified as initialization');
        }
        
        if (!data.indicators) {
            validation.isValid = false;
            validation.errors.push('Missing indicators data');
            return validation;
        }
        
        let hasHistoricalData = false;
        Object.values(data.indicators).forEach(indicator => {
            if (indicator.history && indicator.history.length > 6) {
                hasHistoricalData = true;
            }
        });
        
        if (!hasHistoricalData) {
            validation.warnings.push('Limited historical data - may affect momentum calculations');
        }
        
        return validation;
    },

    validateMonthlyFile: function(data) {
        const validation = { isValid: true, errors: [], warnings: [] };
        
        if (!data) {
            validation.isValid = false;
            validation.errors.push('File is empty or corrupted');
            return validation;
        }
        
        if (!data.indicators) {
            validation.isValid = false;
            validation.errors.push('Missing indicators data');
            return validation;
        }
        
        if (!data.trading_status) {
            validation.warnings.push('No trading status specified');
        }
        
        let hasCurrentValues = false;
        Object.values(data.indicators).forEach(indicator => {
            if (indicator.current !== null && indicator.current !== undefined) {
                hasCurrentValues = true;
            }
        });
        
        if (!hasCurrentValues) {
            validation.isValid = false;
            validation.errors.push('No current indicator values found');
        }
        
        return validation;
    },
    
    // ENHANCED: Generate realistic sample data with market scenarios
    generateSampleData: function(type = 'monthly', scenario = 'mixed') {
        const scenarios = {
            mixed: 'Mixed signals with varied momentum',
            usd_strength: 'USD strength scenario',
            tech_boom: 'AI/Technology boom scenario', 
            pe_reversion: 'P/E mean reversion scenario',
            international: 'International outperformance scenario'
        };
        
        console.log(`Generating ${scenario} sample data:`, scenarios[scenario]);
        
        const sampleData = {
            data_type: type,
            version: '3.8.2',
            timestamp: new Date().toISOString(),
            trading_status: 'GREEN',
            scenario: scenario,
            scenario_description: scenarios[scenario],
            data_quality: {
                overall_score: 92,
                fresh_indicators: 13,
                total_indicators: 13
            },
            indicators: this.generateScenarioIndicators(scenario, type)
        };
        
        return sampleData;
    },

    // CRITICAL FIX: Use snake_case keys matching PRD v3.3
    generateScenarioIndicators: function(scenario, type) {
        const indicators = {};
        
        switch(scenario) {
            case 'usd_strength':
                // USD Theme (4 indicators)
                indicators.dxy = this.createIndicator(108.5, this.generateTrend(102, 108.5, 6, 'bullish'), 'DXY Index', 'Yahoo Finance');
                indicators.gold_purchases = this.createIndicator(34.2, this.generateTrend(35.8, 34.2, 6, 'bearish'), 'Central Bank Gold', 'World Gold Council');
                indicators.yuan_swift = this.createIndicator(3.2, this.generateTrend(4.5, 3.2, 6, 'bearish'), 'Yuan SWIFT Share', 'SWIFT');
                indicators.reserve_share = this.createIndicator(61.2, this.generateTrend(58.4, 61.2, 6, 'bullish'), 'USD Reserve Share', 'IMF COFER');
                
                // Innovation Theme (3 indicators)
                indicators.qqq_spy = this.createIndicator(0.75, this.generateTrend(0.74, 0.75, 6, 'flat'), 'QQQ/SPY Ratio', 'Yahoo Finance');
                indicators.productivity = this.createIndicator(2.1, this.generateTrend(2.0, 2.1, 6, 'flat'), 'Productivity Growth', 'BLS');
                indicators.net_margins = this.createIndicator(11.8, this.generateTrend(11.9, 11.8, 6, 'flat'), 'S&P Net Margins', 'S&P Global');
                
                // P/E Theme (3 indicators)
                indicators.forward_pe = this.createIndicator(19.5, this.generateTrend(20.8, 19.5, 6, 'bearish'), 'Forward P/E', 'FactSet');
                indicators.cape = this.createIndicator(32.1, this.generateTrend(34.2, 32.1, 6, 'bearish'), 'Shiller CAPE', 'Shiller');
                indicators.risk_premium = this.createIndicator(0.75, this.generateTrend(0.62, 0.75, 6, 'bullish'), 'Equity Risk Premium', 'Calculated');
                
                // International Theme (3 indicators)
                indicators.acwx_spy = this.createIndicator(0.88, this.generateTrend(0.92, 0.88, 6, 'bearish'), 'ACWX/SPY Relative', 'Yahoo Finance');
                indicators.sp_vs_world = this.createIndicator(1.08, this.generateTrend(1.03, 1.08, 6, 'bullish'), 'S&P vs MSCI World', 'MSCI');
                indicators.tic_flows = this.createIndicator(85.2, this.generateTrend(125.4, 85.2, 6, 'bearish'), 'TIC Net Flows', 'Treasury');
                break;
                
            case 'tech_boom':
                // USD Theme - weakening due to risk-on
                indicators.dxy = this.createIndicator(98.2, this.generateTrend(103.5, 98.2, 6, 'bearish'), 'DXY Index', 'Yahoo Finance');
                indicators.gold_purchases = this.createIndicator(36.8, this.generateTrend(35.8, 36.8, 6, 'bullish'), 'Central Bank Gold', 'World Gold Council');
                indicators.yuan_swift = this.createIndicator(5.8, this.generateTrend(4.7, 5.8, 6, 'bullish'), 'Yuan SWIFT Share', 'SWIFT');
                indicators.reserve_share = this.createIndicator(56.1, this.generateTrend(58.4, 56.1, 6, 'bearish'), 'USD Reserve Share', 'IMF COFER');
                
                // Innovation Theme - STRONG (ALL 3 INDICATORS REQUIRED)
                indicators.qqq_spy = this.createIndicator(0.82, this.generateTrend(0.75, 0.82, 6, 'bullish'), 'QQQ/SPY Ratio', 'Yahoo Finance');
                indicators.productivity = this.createIndicator(3.8, this.generateTrend(2.3, 3.8, 6, 'bullish'), 'Productivity Growth', 'BLS');
                indicators.net_margins = this.createIndicator(14.2, this.generateTrend(12.0, 14.2, 6, 'bullish'), 'S&P Net Margins', 'S&P Global');
                
                // P/E Theme - elevated due to growth
                indicators.forward_pe = this.createIndicator(22.8, this.generateTrend(20.8, 22.8, 6, 'bullish'), 'Forward P/E', 'FactSet');
                indicators.cape = this.createIndicator(36.5, this.generateTrend(34.2, 36.5, 6, 'bullish'), 'Shiller CAPE', 'Shiller');
                indicators.risk_premium = this.createIndicator(0.45, this.generateTrend(0.62, 0.45, 6, 'bearish'), 'Equity Risk Premium', 'Calculated');
                
                // International Theme - mixed
                indicators.acwx_spy = this.createIndicator(0.94, this.generateTrend(0.96, 0.94, 6, 'bearish'), 'ACWX/SPY Relative', 'Yahoo Finance');
                indicators.sp_vs_world = this.createIndicator(1.06, this.generateTrend(1.03, 1.06, 6, 'bullish'), 'S&P vs MSCI World', 'MSCI');
                indicators.tic_flows = this.createIndicator(145.8, this.generateTrend(125.4, 145.8, 6, 'bullish'), 'TIC Net Flows', 'Treasury');
                break;
                
            case 'pe_reversion':
                // USD Theme - moderate
                indicators.dxy = this.createIndicator(105.2, this.generateTrend(103.5, 105.2, 6, 'bullish'), 'DXY Index', 'Yahoo Finance');
                indicators.gold_purchases = this.createIndicator(35.2, this.generateTrend(35.8, 35.2, 6, 'bearish'), 'Central Bank Gold', 'World Gold Council');
                indicators.yuan_swift = this.createIndicator(4.9, this.generateTrend(4.7, 4.9, 6, 'bullish'), 'Yuan SWIFT Share', 'SWIFT');
                indicators.reserve_share = this.createIndicator(57.8, this.generateTrend(58.4, 57.8, 6, 'bearish'), 'USD Reserve Share', 'IMF COFER');
                
                // Innovation Theme - moderate
                indicators.qqq_spy = this.createIndicator(0.78, this.generateTrend(0.75, 0.78, 6, 'bullish'), 'QQQ/SPY Ratio', 'Yahoo Finance');
                indicators.productivity = this.createIndicator(2.4, this.generateTrend(2.3, 2.4, 6, 'flat'), 'Productivity Growth', 'BLS');
                indicators.net_margins = this.createIndicator(12.8, this.generateTrend(12.0, 12.8, 6, 'bullish'), 'S&P Net Margins', 'S&P Global');
                
                // P/E Theme - STRONG reversion signals
                indicators.forward_pe = this.createIndicator(24.5, this.generateTrend(20.8, 24.5, 6, 'bullish'), 'Forward P/E', 'FactSet');
                indicators.cape = this.createIndicator(38.8, this.generateTrend(34.2, 38.8, 6, 'bullish'), 'Shiller CAPE', 'Shiller');
                indicators.risk_premium = this.createIndicator(0.28, this.generateTrend(0.62, 0.28, 6, 'bearish'), 'Equity Risk Premium', 'Calculated');
                
                // International Theme - bearish US = bullish international
                indicators.acwx_spy = this.createIndicator(0.98, this.generateTrend(0.95, 0.98, 6, 'bullish'), 'ACWX/SPY Relative', 'Yahoo Finance');
                indicators.sp_vs_world = this.createIndicator(0.98, this.generateTrend(1.03, 0.98, 6, 'bearish'), 'S&P vs MSCI World', 'MSCI');
                indicators.tic_flows = this.createIndicator(95.2, this.generateTrend(125.4, 95.2, 6, 'bearish'), 'TIC Net Flows', 'Treasury');
                break;
                
            case 'international':
                // USD Theme - weak USD supporting international
                indicators.dxy = this.createIndicator(96.8, this.generateTrend(103.5, 96.8, 6, 'bearish'), 'DXY Index', 'Yahoo Finance');
                indicators.gold_purchases = this.createIndicator(37.2, this.generateTrend(35.8, 37.2, 6, 'bullish'), 'Central Bank Gold', 'World Gold Council');
                indicators.yuan_swift = this.createIndicator(6.2, this.generateTrend(4.7, 6.2, 6, 'bullish'), 'Yuan SWIFT Share', 'SWIFT');
                indicators.reserve_share = this.createIndicator(55.8, this.generateTrend(58.4, 55.8, 6, 'bearish'), 'USD Reserve Share', 'IMF COFER');
                
                // Innovation Theme - underperforming
                indicators.qqq_spy = this.createIndicator(0.73, this.generateTrend(0.75, 0.73, 6, 'bearish'), 'QQQ/SPY Ratio', 'Yahoo Finance');
                indicators.productivity = this.createIndicator(2.0, this.generateTrend(2.3, 2.0, 6, 'bearish'), 'Productivity Growth', 'BLS');
                indicators.net_margins = this.createIndicator(11.2, this.generateTrend(12.0, 11.2, 6, 'bearish'), 'S&P Net Margins', 'S&P Global');
                
                // P/E Theme - mixed
                indicators.forward_pe = this.createIndicator(21.8, this.generateTrend(20.8, 21.8, 6, 'bullish'), 'Forward P/E', 'FactSet');
                indicators.cape = this.createIndicator(35.1, this.generateTrend(34.2, 35.1, 6, 'bullish'), 'Shiller CAPE', 'Shiller');
                indicators.risk_premium = this.createIndicator(0.52, this.generateTrend(0.62, 0.52, 6, 'bearish'), 'Equity Risk Premium', 'Calculated');
                
                // International Theme - STRONG
                indicators.acwx_spy = this.createIndicator(1.02, this.generateTrend(0.95, 1.02, 6, 'bullish'), 'ACWX/SPY Relative', 'Yahoo Finance');
                indicators.sp_vs_world = this.createIndicator(0.95, this.generateTrend(1.03, 0.95, 6, 'bearish'), 'S&P vs MSCI World', 'MSCI');
                indicators.tic_flows = this.createIndicator(-65.8, this.generateTrend(125.4, -65.8, 6, 'bearish'), 'TIC Net Flows', 'Treasury');
                break;
                
            default: // mixed scenario
                // USD Theme
                indicators.dxy = this.createIndicator(103.45, this.generateTrend(100.0, 103.45, 6, 'mixed'), 'DXY Index', 'Yahoo Finance');
                indicators.gold_purchases = this.createIndicator(35.8, this.generateTrend(35.0, 35.8, 6, 'mixed'), 'Central Bank Gold', 'World Gold Council');
                indicators.yuan_swift = this.createIndicator(4.74, this.generateTrend(3.5, 4.74, 6, 'mixed'), 'Yuan SWIFT Share', 'SWIFT');
                indicators.reserve_share = this.createIndicator(58.4, this.generateTrend(58.0, 58.4, 6, 'mixed'), 'USD Reserve Share', 'IMF COFER');
                
                // Innovation Theme
                indicators.qqq_spy = this.createIndicator(0.756, this.generateTrend(0.70, 0.756, 6, 'mixed'), 'QQQ/SPY Ratio', 'Yahoo Finance');
                indicators.productivity = this.createIndicator(2.3, this.generateTrend(1.8, 2.3, 6, 'mixed'), 'Productivity Growth', 'BLS');
                indicators.net_margins = this.createIndicator(12.0, this.generateTrend(10.5, 12.0, 6, 'mixed'), 'S&P Net Margins', 'S&P Global');
                
                // P/E Theme
                indicators.forward_pe = this.createIndicator(20.8, this.generateTrend(18.0, 20.8, 6, 'mixed'), 'Forward P/E', 'FactSet');
                indicators.cape = this.createIndicator(34.2, this.generateTrend(30.0, 34.2, 6, 'mixed'), 'Shiller CAPE', 'Shiller');
                indicators.risk_premium = this.createIndicator(0.62, this.generateTrend(0.3, 0.62, 6, 'mixed'), 'Equity Risk Premium', 'Calculated');
                
                // International Theme
                indicators.acwx_spy = this.createIndicator(0.96, this.generateTrend(0.92, 0.96, 6, 'mixed'), 'ACWX/SPY Relative', 'Yahoo Finance');
                indicators.sp_vs_world = this.createIndicator(1.034, this.generateTrend(0.95, 1.034, 6, 'mixed'), 'S&P vs MSCI World', 'MSCI');
                indicators.tic_flows = this.createIndicator(125.4, this.generateTrend(100.0, 125.4, 6, 'mixed'), 'TIC Net Flows', 'Treasury');
                break;
        }
        
        // Log what was generated for debugging
        console.log('Generated indicators:', Object.keys(indicators));
        console.log('Innovation indicators:', {
            qqq_spy: indicators.qqq_spy?.current,
            productivity: indicators.productivity?.current,
            net_margins: indicators.net_margins?.current
        });
        
        return indicators;
    },

    // Create individual indicator object with name
    createIndicator: function(current, history, name, source) {
        return {
            current: current,
            freshness: 'fresh',
            source: source || 'Generated',
            name: name,
            history: history
        };
    },

    // Generate trending historical data
    generateTrend: function(start, end, length, direction) {
        const history = [];
        const totalChange = end - start;
        
        for (let i = 0; i < length; i++) {
            const progress = i / (length - 1);
            let value;
            
            switch(direction) {
                case 'bullish':
                    // Accelerating upward trend
                    value = start + (totalChange * Math.pow(progress, 0.7));
                    break;
                case 'bearish':
                    // Accelerating downward trend  
                    value = start + (totalChange * Math.pow(progress, 0.7));
                    break;
                case 'mixed':
                    // Oscillating with overall trend
                    const trend = start + (totalChange * progress);
                    const noise = (Math.random() - 0.5) * Math.abs(totalChange) * 0.1;
                    value = trend + noise;
                    break;
                case 'flat':
                    // Minimal movement
                    const flatNoise = (Math.random() - 0.5) * Math.abs(end - start) * 0.3;
                    value = start + flatNoise;
                    break;
                default:
                    value = start + (totalChange * progress);
            }
            
            history.push(parseFloat(value.toFixed(2)));
        }
        
        return history;
    },

    // Enhanced sample data with scenario selection
    downloadSampleData: function(type = 'monthly', scenario = 'mixed') {
        const sampleData = this.generateSampleData(type, scenario);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `hcp_data_${type}_${scenario}_${timestamp}.json`;
        
        const blob = new Blob([JSON.stringify(sampleData, null, 2)], 
            { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log(`Sample ${type} data (${scenario}) downloaded: ${filename}`);
    },

    setupFileInputs: function(callbacks = {}) {
        const initInput = document.getElementById('init-file');
        const monthlyInput = document.getElementById('monthly-file');
        
        if (initInput && callbacks.initCallback) {
            initInput.addEventListener('change', (event) => {
                this.handleInitFile(event, callbacks.initCallback);
            });
        }
        
        if (monthlyInput && callbacks.monthlyCallback) {
            monthlyInput.addEventListener('change', (event) => {
                this.handleMonthlyFile(event, callbacks.monthlyCallback);
            });
        }
        
        const sampleBtn = document.getElementById('generate-sample');
        if (sampleBtn && callbacks.sampleCallback) {
            sampleBtn.addEventListener('click', () => {
                const sampleData = this.generateSampleData('monthly', 'tech_boom');
                callbacks.sampleCallback(sampleData, 'sample');
            });
        }
        
        console.log('File Handler v1.2 inputs setup complete');
    }
};

// Make available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileHandler;
}