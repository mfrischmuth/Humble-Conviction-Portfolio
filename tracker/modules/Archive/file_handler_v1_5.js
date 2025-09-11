/**
 * Enhanced FileHandler Module v1.5 - MOMENTUM-AWARE DATA GENERATION
 * File: file_handler_v1_5.js
 * Last Updated: 2025-09-01 01:00:00 UTC
 * 
 * CRITICAL FIX v1.5:
 * - Fixed generateTrend() to ensure meaningful momentum between current and 6-back baseline
 * - Tech Boom now generates data where current != 6-periods-back
 * - Maintains same API - no changes needed to other modules
 * - Scenario-aware momentum patterns for realistic theme differentiation
 */

const FileHandler = {
    version: '1.5',
    lastUpdated: '2025-09-01T01:00:00.000Z',
    
    // [All existing functions remain the same until generateTrend...]
    
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
    
    generateSampleData: function(type = 'monthly', scenario = 'mixed') {
        const scenarios = {
            mixed: 'Mixed signals with varied momentum',
            usd_strength: 'USD strength scenario',
            tech_boom: 'AI/Technology boom scenario', 
            pe_reversion: 'P/E mean reversion scenario',
            international: 'International outperformance scenario',
            random: 'Random market scenario'
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

    generateScenarioIndicators: function(scenario, type) {
        const indicators = {
            usd: {},
            innovation: {},
            pe: {},
            intl: {}
        };
        
        switch(scenario) {
            case 'usd_strength':
                // USD Strong: DXY up, Gold/Yuan/Reserves declining
                indicators.usd.dxy = this.createMomentumIndicator(108.5, 102.0, 'bullish', 'DXY Index', 'Yahoo Finance');
                indicators.usd.gold_purchases = this.createMomentumIndicator(34.2, 36.8, 'bearish', 'Central Bank Gold', 'World Gold Council');
                indicators.usd.yuan_swift = this.createMomentumIndicator(3.2, 4.8, 'bearish', 'Yuan SWIFT Share', 'SWIFT');
                indicators.usd.reserve_share = this.createMomentumIndicator(61.2, 57.8, 'bullish', 'USD Reserve Share', 'IMF COFER');
                
                // Tech neutral/weak in USD strength
                indicators.innovation.qqq_spy = this.createMomentumIndicator(0.75, 0.78, 'bearish', 'QQQ/SPY Ratio', 'Yahoo Finance');
                indicators.innovation.productivity = this.createMomentumIndicator(2.1, 2.3, 'bearish', 'Productivity Growth', 'BLS');
                indicators.innovation.net_margins = this.createMomentumIndicator(11.8, 12.2, 'bearish', 'S&P Net Margins', 'S&P Global');
                
                // Valuations compressed
                indicators.pe.forward_pe = this.createMomentumIndicator(19.5, 21.8, 'bearish', 'Forward P/E', 'FactSet');
                indicators.pe.cape = this.createMomentumIndicator(32.1, 35.5, 'bearish', 'Shiller CAPE', 'Shiller');
                indicators.pe.risk_premium = this.createMomentumIndicator(0.75, 0.55, 'bullish', 'Equity Risk Premium', 'Calculated');
                
                // International weak
                indicators.intl.acwx_spy = this.createMomentumIndicator(0.88, 0.95, 'bearish', 'ACWX/SPY Relative', 'Yahoo Finance');
                indicators.intl.sp_vs_world = this.createMomentumIndicator(1.08, 1.02, 'bullish', 'S&P vs MSCI World', 'MSCI');
                indicators.intl.tic_flows = this.createMomentumIndicator(85.2, 145.8, 'bearish', 'TIC Net Flows', 'Treasury');
                break;
                
            case 'tech_boom':
                // USD weakening
                indicators.usd.dxy = this.createMomentumIndicator(98.2, 105.5, 'bearish', 'DXY Index', 'Yahoo Finance');
                indicators.usd.gold_purchases = this.createMomentumIndicator(36.8, 34.2, 'bullish', 'Central Bank Gold', 'World Gold Council');
                indicators.usd.yuan_swift = this.createMomentumIndicator(5.8, 4.2, 'bullish', 'Yuan SWIFT Share', 'SWIFT');
                indicators.usd.reserve_share = this.createMomentumIndicator(56.1, 59.4, 'bearish', 'USD Reserve Share', 'IMF COFER');
                
                // STRONG TECH MOMENTUM
                indicators.innovation.qqq_spy = this.createMomentumIndicator(0.84, 0.72, 'bullish', 'QQQ/SPY Ratio', 'Yahoo Finance');
                indicators.innovation.productivity = this.createMomentumIndicator(3.9, 2.1, 'bullish', 'Productivity Growth', 'BLS');
                indicators.innovation.net_margins = this.createMomentumIndicator(14.5, 11.8, 'bullish', 'S&P Net Margins', 'S&P Global');
                
                // Valuations stretched but supported
                indicators.pe.forward_pe = this.createMomentumIndicator(23.2, 20.1, 'bullish', 'Forward P/E', 'FactSet');
                indicators.pe.cape = this.createMomentumIndicator(37.8, 33.5, 'bullish', 'Shiller CAPE', 'Shiller');
                indicators.pe.risk_premium = this.createMomentumIndicator(0.42, 0.68, 'bearish', 'Equity Risk Premium', 'Calculated');
                
                // International mixed
                indicators.intl.acwx_spy = this.createMomentumIndicator(0.93, 0.98, 'bearish', 'ACWX/SPY Relative', 'Yahoo Finance');
                indicators.intl.sp_vs_world = this.createMomentumIndicator(1.07, 1.01, 'bullish', 'S&P vs MSCI World', 'MSCI');
                indicators.intl.tic_flows = this.createMomentumIndicator(152.8, 125.4, 'bullish', 'TIC Net Flows', 'Treasury');
                break;

            case 'pe_reversion':
                // USD mixed/strong
                indicators.usd.dxy = this.createMomentumIndicator(105.2, 101.8, 'bullish', 'DXY Index', 'Yahoo Finance');
                indicators.usd.gold_purchases = this.createMomentumIndicator(35.2, 36.8, 'bearish', 'Central Bank Gold', 'World Gold Council');
                indicators.usd.yuan_swift = this.createMomentumIndicator(4.9, 4.2, 'bullish', 'Yuan SWIFT Share', 'SWIFT');
                indicators.usd.reserve_share = this.createMomentumIndicator(57.8, 59.1, 'bearish', 'USD Reserve Share', 'IMF COFER');
                
                // Tech moderate
                indicators.innovation.qqq_spy = this.createMomentumIndicator(0.78, 0.74, 'bullish', 'QQQ/SPY Ratio', 'Yahoo Finance');
                indicators.innovation.productivity = this.createMomentumIndicator(2.4, 2.1, 'bullish', 'Productivity Growth', 'BLS');
                indicators.innovation.net_margins = this.createMomentumIndicator(12.8, 11.5, 'bullish', 'S&P Net Margins', 'S&P Global');
                
                // STRONG VALUATION SIGNALS
                indicators.pe.forward_pe = this.createMomentumIndicator(25.8, 19.2, 'bullish', 'Forward P/E', 'FactSet');
                indicators.pe.cape = this.createMomentumIndicator(41.2, 32.1, 'bullish', 'Shiller CAPE', 'Shiller');
                indicators.pe.risk_premium = this.createMomentumIndicator(0.22, 0.78, 'bearish', 'Equity Risk Premium', 'Calculated');
                
                // International mixed
                indicators.intl.acwx_spy = this.createMomentumIndicator(0.98, 0.92, 'bullish', 'ACWX/SPY Relative', 'Yahoo Finance');
                indicators.intl.sp_vs_world = this.createMomentumIndicator(0.98, 1.05, 'bearish', 'S&P vs MSCI World', 'MSCI');
                indicators.intl.tic_flows = this.createMomentumIndicator(95.2, 135.4, 'bearish', 'TIC Net Flows', 'Treasury');
                break;
                
            case 'international':
                // USD weakening significantly
                indicators.usd.dxy = this.createMomentumIndicator(96.8, 105.5, 'bearish', 'DXY Index', 'Yahoo Finance');
                indicators.usd.gold_purchases = this.createMomentumIndicator(37.2, 33.8, 'bullish', 'Central Bank Gold', 'World Gold Council');
                indicators.usd.yuan_swift = this.createMomentumIndicator(6.2, 4.2, 'bullish', 'Yuan SWIFT Share', 'SWIFT');
                indicators.usd.reserve_share = this.createMomentumIndicator(55.8, 59.4, 'bearish', 'USD Reserve Share', 'IMF COFER');
                
                // Tech weak
                indicators.innovation.qqq_spy = this.createMomentumIndicator(0.71, 0.78, 'bearish', 'QQQ/SPY Ratio', 'Yahoo Finance');
                indicators.innovation.productivity = this.createMomentumIndicator(1.8, 2.3, 'bearish', 'Productivity Growth', 'BLS');
                indicators.innovation.net_margins = this.createMomentumIndicator(10.9, 12.2, 'bearish', 'S&P Net Margins', 'S&P Global');
                
                // PE mixed
                indicators.pe.forward_pe = this.createMomentumIndicator(21.8, 20.1, 'bullish', 'Forward P/E', 'FactSet');
                indicators.pe.cape = this.createMomentumIndicator(35.1, 33.2, 'bullish', 'Shiller CAPE', 'Shiller');
                indicators.pe.risk_premium = this.createMomentumIndicator(0.52, 0.68, 'bearish', 'Equity Risk Premium', 'Calculated');
                
                // STRONG INTERNATIONAL MOMENTUM
                indicators.intl.acwx_spy = this.createMomentumIndicator(1.05, 0.88, 'bullish', 'ACWX/SPY Relative', 'Yahoo Finance');
                indicators.intl.sp_vs_world = this.createMomentumIndicator(0.92, 1.08, 'bearish', 'S&P vs MSCI World', 'MSCI');
                indicators.intl.tic_flows = this.createMomentumIndicator(-48.8, 125.4, 'bearish', 'TIC Net Flows', 'Treasury');
                break;
                
            default: // mixed or random scenario
                const randomFactor = scenario === 'random' ? 0.8 : 0.3;
                
                // Generate with moderate momentum in mixed scenario
                indicators.usd.dxy = this.createMomentumIndicator(
                    103.45 + (Math.random() - 0.5) * 10 * randomFactor, 
                    100.0 + (Math.random() - 0.5) * 8 * randomFactor, 
                    Math.random() > 0.5 ? 'bullish' : 'bearish', 
                    'DXY Index', 'Yahoo Finance'
                );
                
                indicators.usd.gold_purchases = this.createMomentumIndicator(
                    35.8 + (Math.random() - 0.5) * 5 * randomFactor,
                    35.0 + (Math.random() - 0.5) * 4 * randomFactor,
                    Math.random() > 0.5 ? 'bullish' : 'bearish',
                    'Central Bank Gold', 'World Gold Council'
                );
                
                indicators.usd.yuan_swift = this.createMomentumIndicator(
                    4.74 + (Math.random() - 0.5) * 2 * randomFactor,
                    3.5 + (Math.random() - 0.5) * 1.5 * randomFactor,
                    Math.random() > 0.5 ? 'bullish' : 'bearish',
                    'Yuan SWIFT Share', 'SWIFT'
                );
                
                indicators.usd.reserve_share = this.createMomentumIndicator(
                    58.4 + (Math.random() - 0.5) * 8 * randomFactor,
                    58.0 + (Math.random() - 0.5) * 6 * randomFactor,
                    Math.random() > 0.5 ? 'bullish' : 'bearish',
                    'USD Reserve Share', 'IMF COFER'
                );
                
                indicators.innovation.qqq_spy = this.createMomentumIndicator(
                    0.756 + (Math.random() - 0.5) * 0.2 * randomFactor,
                    0.70 + (Math.random() - 0.5) * 0.15 * randomFactor,
                    Math.random() > 0.5 ? 'bullish' : 'bearish',
                    'QQQ/SPY Ratio', 'Yahoo Finance'
                );
                
                indicators.innovation.productivity = this.createMomentumIndicator(
                    2.3 + (Math.random() - 0.5) * 1.5 * randomFactor,
                    1.8 + (Math.random() - 0.5) * 1.0 * randomFactor,
                    Math.random() > 0.5 ? 'bullish' : 'bearish',
                    'Productivity Growth', 'BLS'
                );
                
                indicators.innovation.net_margins = this.createMomentumIndicator(
                    12.0 + (Math.random() - 0.5) * 3 * randomFactor,
                    10.5 + (Math.random() - 0.5) * 2.5 * randomFactor,
                    Math.random() > 0.5 ? 'bullish' : 'bearish',
                    'S&P Net Margins', 'S&P Global'
                );
                
                indicators.pe.forward_pe = this.createMomentumIndicator(
                    20.8 + (Math.random() - 0.5) * 6 * randomFactor,
                    18.0 + (Math.random() - 0.5) * 5 * randomFactor,
                    Math.random() > 0.5 ? 'bullish' : 'bearish',
                    'Forward P/E', 'FactSet'
                );
                
                indicators.pe.cape = this.createMomentumIndicator(
                    34.2 + (Math.random() - 0.5) * 8 * randomFactor,
                    30.0 + (Math.random() - 0.5) * 6 * randomFactor,
                    Math.random() > 0.5 ? 'bullish' : 'bearish',
                    'Shiller CAPE', 'Shiller'
                );
                
                indicators.pe.risk_premium = this.createMomentumIndicator(
                    0.62 + (Math.random() - 0.5) * 0.6 * randomFactor,
                    0.3 + (Math.random() - 0.5) * 0.4 * randomFactor,
                    Math.random() > 0.5 ? 'bullish' : 'bearish',
                    'Equity Risk Premium', 'Calculated'
                );
                
                indicators.intl.acwx_spy = this.createMomentumIndicator(
                    0.96 + (Math.random() - 0.5) * 0.2 * randomFactor,
                    0.92 + (Math.random() - 0.5) * 0.15 * randomFactor,
                    Math.random() > 0.5 ? 'bullish' : 'bearish',
                    'ACWX/SPY Relative', 'Yahoo Finance'
                );
                
                indicators.intl.sp_vs_world = this.createMomentumIndicator(
                    1.034 + (Math.random() - 0.5) * 0.15 * randomFactor,
                    0.95 + (Math.random() - 0.5) * 0.12 * randomFactor,
                    Math.random() > 0.5 ? 'bullish' : 'bearish',
                    'S&P vs MSCI World', 'MSCI'
                );
                
                indicators.intl.tic_flows = this.createMomentumIndicator(
                    125.4 + (Math.random() - 0.5) * 100 * randomFactor,
                    100.0 + (Math.random() - 0.5) * 80 * randomFactor,
                    Math.random() > 0.5 ? 'bullish' : 'bearish',
                    'TIC Net Flows', 'Treasury'
                );
                break;
        }
        
        return indicators;
    },

    // NEW METHOD: Creates indicator with guaranteed momentum differentiation
    createMomentumIndicator: function(current, baselineValue, direction, name, source) {
        // Generate 450-point history ending 6 periods back at baselineValue
        const history = this.generateMomentumTrend(baselineValue, current, 450, direction);
        
        console.log(`Creating ${name}: current=${current}, baseline=${baselineValue}, direction=${direction}`);
        
        return {
            current: current,
            freshness: 'fresh',
            source: source || 'Generated',
            name: name,
            history: history
        };
    },

    // CRITICAL FIX: Generates trend with momentum separation between current and 6-back baseline
    generateMomentumTrend: function(baselineValue, currentValue, length, direction) {
        const history = [];
        const momentumChange = currentValue - baselineValue; // This is the key momentum signal
        
        // Generate the first 444 points (length - 6) as a trend toward baselineValue
        for (let i = 0; i < length - 6; i++) {
            const progress = i / (length - 7);
            let value;
            
            switch(direction) {
                case 'bullish':
                    // Accelerating upward trend
                    value = baselineValue - (momentumChange * 0.3) + (momentumChange * 0.3 * Math.pow(progress, 0.5));
                    break;
                case 'bearish':
                    // Decelerating or declining trend
                    value = baselineValue + (Math.abs(momentumChange) * 0.2) - (Math.abs(momentumChange) * 0.2 * Math.pow(progress, 0.5));
                    break;
                default:
                    // Mixed/flat with noise
                    const trend = baselineValue + (momentumChange * 0.1 * progress);
                    const noise = (Math.random() - 0.5) * Math.abs(momentumChange) * 0.1;
                    value = trend + noise;
            }
            
            history.push(parseFloat(value.toFixed(2)));
        }
        
        // Add the last 6 points leading from baseline to current
        // This ensures history[length-6] ≈ baselineValue and creates clear momentum
        for (let i = 0; i < 6; i++) {
            const stepProgress = i / 5; // 0 to 1 over 6 steps
            const value = baselineValue + (momentumChange * stepProgress);
            history.push(parseFloat(value.toFixed(2)));
        }
        
        // Verify the momentum calculation will work
        const sixBack = history[history.length - 6];
        const momentum = (currentValue - sixBack) / Math.abs(sixBack);
        console.log(`Momentum verification: current=${currentValue}, 6-back=${sixBack}, momentum=${(momentum*100).toFixed(1)}%`);
        
        return history;
    },

    // LEGACY METHOD: Keep for backward compatibility but now uses createMomentumIndicator
    createIndicator: function(current, history, name, source) {
        return {
            current: current,
            freshness: 'fresh',
            source: source || 'Generated',
            name: name,
            history: history
        };
    },

    // LEGACY METHOD: Keep for backward compatibility 
    generateTrend: function(start, end, length, direction) {
        console.warn('generateTrend() is deprecated. Use createMomentumIndicator() for proper momentum.');
        // Use the new momentum-aware method
        return this.generateMomentumTrend(start, end, length, direction);
    },

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
        
        console.log('File Handler v1.5 inputs setup complete');
    }
};

// Make available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileHandler;
}