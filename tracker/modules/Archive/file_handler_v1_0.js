/**
 * Enhanced FileHandler Module - Realistic Sample Data
 * File: file_handler_v1_1.js
 * Last Updated: 2025-08-29 20:15:00 UTC
 * 
 * ENHANCEMENTS:
 * - Realistic market scenarios with directional trends
 * - Multiple scenario options for testing
 * - Proper momentum patterns that drive theme probabilities
 */

const FileHandler = {
    version: '1.1',
    
    // Previous functions remain the same...
    handleInitFile: function(event, callback) {
        // [Previous implementation unchanged]
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
        // [Previous implementation unchanged]
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
            overvaluation: 'Market overvaluation scenario',
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

    // Generate indicators based on market scenario
    generateScenarioIndicators: function(scenario, type) {
        const indicators = {};
        
        switch(scenario) {
            case 'usd_strength':
                // Strong USD theme triggers
                indicators.dxy = this.createIndicator(108.5, this.generateTrend(102, 108.5, 6, 'bullish'), 'Yahoo Finance');
                indicators.goldHoldings = this.createIndicator(34200, this.generateTrend(35800, 34200, 6, 'bearish'), 'GLD ETF');
                indicators.yuanSwiftShare = this.createIndicator(3.2, this.generateTrend(4.5, 3.2, 6, 'bearish'), 'SWIFT Tracker');
                indicators.reserveShare = this.createIndicator(61.2, this.generateTrend(58.4, 61.2, 6, 'bullish'), 'IMF COFER');
                
                // Neutral other themes
                indicators.qqqSpyRatio = this.createIndicator(0.75, this.generateTrend(0.74, 0.75, 6, 'flat'), 'Yahoo Finance');
                indicators.productivity = this.createIndicator(2.1, this.generateTrend(2.0, 2.1, 6, 'flat'), 'FRED API');
                indicators.netMargins = this.createIndicator(11.8, this.generateTrend(11.9, 11.8, 6, 'flat'), 'S&P 500');
                
                indicators.forwardPE = this.createIndicator(19.5, this.generateTrend(20.8, 19.5, 6, 'bearish'), 'Yahoo Finance');
                indicators.cape = this.createIndicator(32.1, this.generateTrend(34.2, 32.1, 6, 'bearish'), 'multpl.com');
                indicators.riskPremium = this.createIndicator(0.75, this.generateTrend(0.62, 0.75, 6, 'bullish'), 'Calculated');
                
                indicators.spVsWorld = this.createIndicator(1.08, this.generateTrend(1.03, 1.08, 6, 'bullish'), 'Yahoo Finance');
                indicators.usPercentACWI = this.createIndicator(62.5, this.generateTrend(60.2, 62.5, 6, 'bullish'), 'Estimated');
                indicators.ticFlows = this.createIndicator(85.2, this.generateTrend(125.4, 85.2, 6, 'bearish'), 'Treasury TIC');
                break;
                
            case 'tech_boom':
                // Innovation theme strong
                indicators.qqqSpyRatio = this.createIndicator(0.82, this.generateTrend(0.75, 0.82, 6, 'bullish'), 'Yahoo Finance');
                indicators.productivity = this.createIndicator(3.8, this.generateTrend(2.3, 3.8, 6, 'bullish'), 'FRED API');
                indicators.netMargins = this.createIndicator(14.2, this.generateTrend(12.0, 14.2, 6, 'bullish'), 'S&P 500');
                
                // USD weakening due to risk-on
                indicators.dxy = this.createIndicator(98.2, this.generateTrend(103.5, 98.2, 6, 'bearish'), 'Yahoo Finance');
                indicators.goldHoldings = this.createIndicator(36800, this.generateTrend(35800, 36800, 6, 'bullish'), 'GLD ETF');
                indicators.yuanSwiftShare = this.createIndicator(5.8, this.generateTrend(4.7, 5.8, 6, 'bullish'), 'SWIFT Tracker');
                indicators.reserveShare = this.createIndicator(56.1, this.generateTrend(58.4, 56.1, 6, 'bearish'), 'IMF COFER');
                
                // P/E theme mixed (growth premium)
                indicators.forwardPE = this.createIndicator(22.8, this.generateTrend(20.8, 22.8, 6, 'bullish'), 'Yahoo Finance');
                indicators.cape = this.createIndicator(36.5, this.generateTrend(34.2, 36.5, 6, 'bullish'), 'multpl.com');
                indicators.riskPremium = this.createIndicator(0.45, this.generateTrend(0.62, 0.45, 6, 'bearish'), 'Calculated');
                
                // International mixed
                indicators.spVsWorld = this.createIndicator(1.06, this.generateTrend(1.03, 1.06, 6, 'bullish'), 'Yahoo Finance');
                indicators.usPercentACWI = this.createIndicator(61.8, this.generateTrend(60.2, 61.8, 6, 'bullish'), 'Estimated');
                indicators.ticFlows = this.createIndicator(145.8, this.generateTrend(125.4, 145.8, 6, 'bullish'), 'Treasury TIC');
                break;
                
            case 'overvaluation':
                // P/E theme strongly triggered
                indicators.forwardPE = this.createIndicator(24.5, this.generateTrend(20.8, 24.5, 6, 'bullish'), 'Yahoo Finance');
                indicators.cape = this.createIndicator(38.8, this.generateTrend(34.2, 38.8, 6, 'bullish'), 'multpl.com');
                indicators.riskPremium = this.createIndicator(0.28, this.generateTrend(0.62, 0.28, 6, 'bearish'), 'Calculated');
                
                // Other themes moderate/mixed
                indicators.dxy = this.createIndicator(105.2, this.generateTrend(103.5, 105.2, 6, 'bullish'), 'Yahoo Finance');
                indicators.goldHoldings = this.createIndicator(35200, this.generateTrend(35800, 35200, 6, 'bearish'), 'GLD ETF');
                indicators.yuanSwiftShare = this.createIndicator(4.9, this.generateTrend(4.7, 4.9, 6, 'bullish'), 'SWIFT Tracker');
                indicators.reserveShare = this.createIndicator(57.8, this.generateTrend(58.4, 57.8, 6, 'bearish'), 'IMF COFER');
                
                indicators.qqqSpyRatio = this.createIndicator(0.78, this.generateTrend(0.75, 0.78, 6, 'bullish'), 'Yahoo Finance');
                indicators.productivity = this.createIndicator(2.4, this.generateTrend(2.3, 2.4, 6, 'flat'), 'FRED API');
                indicators.netMargins = this.createIndicator(12.8, this.generateTrend(12.0, 12.8, 6, 'bullish'), 'S&P 500');
                
                indicators.spVsWorld = this.createIndicator(0.98, this.generateTrend(1.03, 0.98, 6, 'bearish'), 'Yahoo Finance');
                indicators.usPercentACWI = this.createIndicator(58.9, this.generateTrend(60.2, 58.9, 6, 'bearish'), 'Estimated');
                indicators.ticFlows = this.createIndicator(95.2, this.generateTrend(125.4, 95.2, 6, 'bearish'), 'Treasury TIC');
                break;
                
            case 'international':
                // International theme strong
                indicators.spVsWorld = this.createIndicator(0.95, this.generateTrend(1.03, 0.95, 6, 'bearish'), 'Yahoo Finance');
                indicators.usPercentACWI = this.createIndicator(57.2, this.generateTrend(60.2, 57.2, 6, 'bearish'), 'Estimated');
                indicators.ticFlows = this.createIndicator(65.8, this.generateTrend(125.4, 65.8, 6, 'bearish'), 'Treasury TIC');
                
                // USD weakness supporting international
                indicators.dxy = this.createIndicator(96.8, this.generateTrend(103.5, 96.8, 6, 'bearish'), 'Yahoo Finance');
                indicators.goldHoldings = this.createIndicator(37200, this.generateTrend(35800, 37200, 6, 'bullish'), 'GLD ETF');
                indicators.yuanSwiftShare = this.createIndicator(6.2, this.generateTrend(4.7, 6.2, 6, 'bullish'), 'SWIFT Tracker');
                indicators.reserveShare = this.createIndicator(55.8, this.generateTrend(58.4, 55.8, 6, 'bearish'), 'IMF COFER');
                
                // Mixed other themes
                indicators.qqqSpyRatio = this.createIndicator(0.73, this.generateTrend(0.75, 0.73, 6, 'bearish'), 'Yahoo Finance');
                indicators.productivity = this.createIndicator(2.0, this.generateTrend(2.3, 2.0, 6, 'bearish'), 'FRED API');
                indicators.netMargins = this.createIndicator(11.2, this.generateTrend(12.0, 11.2, 6, 'bearish'), 'S&P 500');
                
                indicators.forwardPE = this.createIndicator(21.8, this.generateTrend(20.8, 21.8, 6, 'bullish'), 'Yahoo Finance');
                indicators.cape = this.createIndicator(35.1, this.generateTrend(34.2, 35.1, 6, 'bullish'), 'multpl.com');
                indicators.riskPremium = this.createIndicator(0.52, this.generateTrend(0.62, 0.52, 6, 'bearish'), 'Calculated');
                break;
                
            default: // mixed scenario
                indicators.dxy = this.createIndicator(103.45, this.generateTrend(100.0, 103.45, 6, 'mixed'), 'Yahoo Finance');
                indicators.goldHoldings = this.createIndicator(35842.3, this.generateTrend(35000.0, 35842.3, 6, 'mixed'), 'GLD ETF');
                indicators.yuanSwiftShare = this.createIndicator(4.74, this.generateTrend(3.5, 4.74, 6, 'mixed'), 'SWIFT Tracker');
                indicators.reserveShare = this.createIndicator(58.4, this.generateTrend(58.0, 58.4, 6, 'mixed'), 'IMF COFER');
                
                indicators.qqqSpyRatio = this.createIndicator(0.756, this.generateTrend(0.70, 0.756, 6, 'mixed'), 'Yahoo Finance');
                indicators.productivity = this.createIndicator(2.3, this.generateTrend(1.8, 2.3, 6, 'mixed'), 'FRED API');
                indicators.netMargins = this.createIndicator(12.0, this.generateTrend(10.5, 12.0, 6, 'mixed'), 'S&P 500');
                
                indicators.forwardPE = this.createIndicator(20.8, this.generateTrend(18.0, 20.8, 6, 'mixed'), 'Yahoo Finance');
                indicators.cape = this.createIndicator(34.2, this.generateTrend(30.0, 34.2, 6, 'mixed'), 'multpl.com');
                indicators.riskPremium = this.createIndicator(0.62, this.generateTrend(0.3, 0.62, 6, 'mixed'), 'Calculated');
                
                indicators.spVsWorld = this.createIndicator(1.034, this.generateTrend(0.95, 1.034, 6, 'mixed'), 'Yahoo Finance');
                indicators.usPercentACWI = this.createIndicator(60.2, this.generateTrend(58.0, 60.2, 6, 'mixed'), 'Estimated');
                indicators.ticFlows = this.createIndicator(125.4, this.generateTrend(100.0, 125.4, 6, 'mixed'), 'Treasury TIC');
                break;
        }
        
        return indicators;
    },

    // Create individual indicator object
    createIndicator: function(current, history, source) {
        return {
            current: current,
            freshness: 'fresh',
            source: source,
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
                const sampleData = this.generateSampleData('monthly', 'tech_boom'); // Default to interesting scenario
                callbacks.sampleCallback(sampleData, 'sample');
            });
        }
        
        console.log('File Handler inputs setup complete');
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileHandler;
}