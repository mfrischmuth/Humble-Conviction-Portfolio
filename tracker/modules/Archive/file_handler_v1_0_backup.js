/**
 * HCP Portfolio Tracker - File Handler Module v1.0
 * File: file_handler_v1_0.js
 * Extracted from: v6.3.1 (working file import system)
 * Last Updated: 2025-08-29 18:20:00 UTC
 * 
 * HANDLES:
 * - JSON file upload and processing
 * - Data validation and error handling
 * - Sample data generation for testing
 * - File format compatibility checks
 */

const FileHandler = {
    version: '1.0',
    
    // Handle initialization file upload - WORKING from v6.3.1
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
                
                // Validate initialization file structure
                const validation = this.validateInitializationFile(data);
                if (!validation.isValid) {
                    alert('Invalid initialization file:\n' + validation.errors.join('\n'));
                    return false;
                }
                
                // Update status display
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
    
    // Handle monthly file upload - WORKING from v6.3.1
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
                
                // Validate monthly file structure  
                const validation = this.validateMonthlyFile(data);
                if (!validation.isValid) {
                    alert('Invalid monthly file:\n' + validation.errors.join('\n'));
                    return false;
                }
                
                // Update status display
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
    
    // Validate initialization file - DATA VALIDATION
    validateInitializationFile: function(data) {
        const validation = { isValid: true, errors: [], warnings: [] };
        
        // Check basic structure
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
        
        // Check for historical data
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
    
    // Validate monthly file - DATA VALIDATION
    validateMonthlyFile: function(data) {
        const validation = { isValid: true, errors: [], warnings: [] };
        
        // Check basic structure
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
        
        // Check for current values
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
    
    // Generate sample data for testing - WORKING from v6.3.1
    generateSampleData: function(type = 'monthly') {
        const sampleData = {
            data_type: type,
            version: '3.8.2',
            timestamp: new Date().toISOString(),
            trading_status: 'GREEN',
            data_quality: {
                overall_score: 92,
                fresh_indicators: 13,
                total_indicators: 13
            },
            indicators: {
                // USD Theme
                dxy: {
                    current: 103.45,
                    freshness: 'fresh',
                    source: 'Yahoo Finance',
                    history: type === 'initialization' ? 
                        this.generateHistory(100.0, 110.0, 24) : 
                        this.generateHistory(103.0, 104.0, 6)
                },
                goldHoldings: {
                    current: 35842.3,
                    freshness: 'fresh', 
                    source: 'GLD ETF',
                    history: type === 'initialization' ?
                        this.generateHistory(35000.0, 36000.0, 24) :
                        this.generateHistory(35800.0, 35900.0, 6)
                },
                yuanSwiftShare: {
                    current: 4.74,
                    freshness: 'fresh',
                    source: 'SWIFT Tracker PDF',
                    history: type === 'initialization' ?
                        this.generateHistory(3.5, 5.0, 24) :
                        this.generateHistory(4.6, 4.8, 6)
                },
                reserveShare: {
                    current: 58.4,
                    freshness: 'fresh',
                    source: 'IMF COFER',
                    history: type === 'initialization' ?
                        this.generateHistory(58.0, 61.0, 24) :
                        this.generateHistory(58.2, 58.6, 6)
                },
                
                // Innovation Theme
                qqqSpyRatio: {
                    current: 0.756,
                    freshness: 'fresh',
                    source: 'Yahoo Finance',
                    history: type === 'initialization' ?
                        this.generateHistory(0.70, 0.80, 24) :
                        this.generateHistory(0.75, 0.76, 6)
                },
                productivity: {
                    current: 2.3,
                    freshness: 'fresh',
                    source: 'FRED API',
                    history: type === 'initialization' ?
                        this.generateHistory(1.8, 2.5, 24) :
                        this.generateHistory(2.2, 2.4, 6)
                },
                netMargins: {
                    current: 12.0,
                    freshness: 'fresh',
                    source: 'S&P 500',
                    history: type === 'initialization' ?
                        this.generateHistory(10.5, 13.0, 24) :
                        this.generateHistory(11.8, 12.2, 6)
                },
                
                // P/E Theme
                forwardPE: {
                    current: 20.8,
                    freshness: 'fresh',
                    source: 'Yahoo Finance',
                    history: type === 'initialization' ?
                        this.generateHistory(18.0, 22.0, 24) :
                        this.generateHistory(20.5, 21.0, 6)
                },
                cape: {
                    current: 34.2,
                    freshness: 'fresh',
                    source: 'multpl.com',
                    history: type === 'initialization' ?
                        this.generateHistory(30.0, 36.0, 24) :
                        this.generateHistory(33.8, 34.5, 6)
                },
                riskPremium: {
                    current: 0.62,
                    freshness: 'fresh',
                    source: 'Calculated',
                    history: type === 'initialization' ?
                        this.generateHistory(0.3, 0.8, 24) :
                        this.generateHistory(0.58, 0.65, 6)
                },
                
                // International Theme
                spVsWorld: {
                    current: 1.034,
                    freshness: 'fresh',
                    source: 'Yahoo Finance',
                    history: type === 'initialization' ?
                        this.generateHistory(0.95, 1.10, 24) :
                        this.generateHistory(1.02, 1.04, 6)
                },
                usPercentACWI: {
                    current: 60.2,
                    freshness: 'fresh',
                    source: 'Estimated',
                    history: type === 'initialization' ?
                        this.generateHistory(58.0, 62.0, 24) :
                        this.generateHistory(59.8, 60.5, 6)
                },
                ticFlows: {
                    current: 125.4,
                    freshness: 'fresh',
                    source: 'Treasury TIC',
                    history: type === 'initialization' ?
                        this.generateHistory(100.0, 150.0, 24) :
                        this.generateHistory(120.0, 130.0, 6)
                }
            }
        };
        
        return sampleData;
    },
    
    // Generate realistic historical data - UTILITY
    generateHistory: function(min, max, length) {
        const history = [];
        let current = min + (max - min) * Math.random();
        
        for (let i = 0; i < length; i++) {
            // Add some randomness but keep within bounds
            const change = (Math.random() - 0.5) * (max - min) * 0.1;
            current = Math.max(min, Math.min(max, current + change));
            history.push(parseFloat(current.toFixed(2)));
        }
        
        return history;
    },
    
    // Download sample data file - UTILITY
    downloadSampleData: function(type = 'monthly') {
        const sampleData = this.generateSampleData(type);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `hcp_data_${type}_${timestamp}.json`;
        
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
        
        console.log(`Sample ${type} data downloaded: ${filename}`);
    },
    
    // Setup file input handlers - SETUP
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
        
        // Setup sample data button
        const sampleBtn = document.getElementById('generate-sample');
        if (sampleBtn && callbacks.sampleCallback) {
            sampleBtn.addEventListener('click', () => {
                const sampleData = this.generateSampleData('monthly');
                callbacks.sampleCallback(sampleData, 'sample');
            });
        }
        
        console.log('File Handler inputs setup complete');
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileHandler;
}