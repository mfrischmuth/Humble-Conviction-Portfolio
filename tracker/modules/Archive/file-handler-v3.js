/**
 * HCP Portfolio Tracker - File Handler Module v3.0.1
 * File: file_handler_v3_0_1.js
 * Based on: IPS v4.2 Practical Implementation
 * Last Updated: 2025-09-07T23:30:00Z
 * 
 * CRITICAL: ZERO REGRESSION POLICY
 * - This module ONLY transforms data structures
 * - NO calculations that belong to other modules
 * - Theme scores: calculated by Theme Calculator
 * - States/scenarios: calculated by Indicators
 * - Percentiles: calculated by modules that need them
 * 
 * PURPOSE:
 * - Load hcp_master_data.json from Data Collector v4.2.5
 * - Map field names between Data Collector and modules
 * - Transform structure to match module expectations
 * - Pass through data WITHOUT processing
 */

const FileHandler = {
    version: '3.0.1',
    framework: 'IPS v4.2 Practical Implementation',
    lastUpdated: '2025-09-07T23:30:00Z',
    
    // Field name mapping: Data Collector -> Module expectations
    // Maps from hcp_master_data.json keys to what modules expect
    fieldMapping: {
        // Data Collector name -> Module expected name
        'dxy_index': 'dxy',
        'real_rate_differential': 'real_rate_diff',
        'cofer_usd': 'cofer_usd',
        'qqq_spy_ratio': 'qqq_spy',
        'productivity_growth': 'productivity',
        'tech_employment_pct': 'rd_revenue',  // IPS v4.2 substitution
        'put_call_ratio': 'put_call',
        'trailing_pe': 'forward_pe',  // IPS v4.2 substitution
        'eps_delivery': 'eps_delivery',
        'spy_efa_momentum': 'spy_efa_momentum',
        'us_market_pct': 'us_market_cap_pct',
        'etf_flow_differential': 'etf_flow_differential'
    },
    
    // Reverse mapping for lookups
    reverseMapping: null,
    
    /**
     * Initialize reverse mapping on first use
     */
    initializeReverseMapping: function() {
        if (!this.reverseMapping) {
            this.reverseMapping = {};
            Object.entries(this.fieldMapping).forEach(([dataKey, moduleKey]) => {
                this.reverseMapping[moduleKey] = dataKey;
            });
        }
    },
    
    /**
     * Load and transform hcp_master_data.json
     * @param {File|Object|string} fileOrData - File, parsed JSON, or path
     * @returns {Object} Transformed data for modules
     */
    loadMasterData: async function(fileOrData) {
        try {
            let rawData;
            
            // Handle different input types
            if (fileOrData instanceof File) {
                const text = await fileOrData.text();
                rawData = JSON.parse(text);
            } else if (typeof fileOrData === 'string') {
                if (fileOrData.startsWith('{')) {
                    rawData = JSON.parse(fileOrData);
                } else {
                    const response = await fetch(fileOrData);
                    rawData = await response.json();
                }
            } else {
                rawData = fileOrData;
            }
            
            // Validate basic structure
            if (!rawData.indicators || !rawData.metadata) {
                throw new Error('Invalid data structure: missing indicators or metadata');
            }
            
            // Transform to module format
            return this.transformForModules(rawData);
            
        } catch (error) {
            console.error('Error loading master data:', error);
            throw error;
        }
    },
    
    /**
     * Transform raw data to format expected by modules
     * NO CALCULATIONS - just structure transformation
     */
    transformForModules: function(rawData) {
        this.initializeReverseMapping();
        
        const transformed = {
            metadata: {
                ...rawData.metadata,
                file_handler_version: this.version,
                transformed_at: new Date().toISOString()
            },
            indicators: {},
            monthlyData: {  // For Data Editor v1.0
                indicators: {}
            }
        };
        
        // Transform each indicator
        Object.entries(rawData.indicators).forEach(([dataCollectorKey, data]) => {
            const moduleKey = this.fieldMapping[dataCollectorKey];
            
            if (!moduleKey) {
                console.warn(`Unknown indicator from Data Collector: ${dataCollectorKey}`);
                return;
            }
            
            // For Theme Calculator v3.2 (expects .current and .history)
            transformed.indicators[moduleKey] = {
                current: data.current_value,
                history: data.monthly_history || data.quarterly_history || [],
                dates: data.monthly_dates || data.quarterly_dates || [],
                source: data.source,
                lastUpdated: data.last_updated,
                dataQuality: data.data_quality,
                dataPoints: data.data_points
            };
            
            // For Data Editor v1.0 (expects monthlyData.indicators[key].current)
            transformed.monthlyData.indicators[moduleKey] = {
                current: data.current_value,
                source: data.source,
                manual_override: false,
                last_updated: data.last_updated
            };
            
            // Store raw history for modules that need it
            if (data.monthly_history) {
                transformed.indicators[moduleKey].frequency = 'monthly';
            } else if (data.quarterly_history) {
                transformed.indicators[moduleKey].frequency = 'quarterly';
            }
        });
        
        // For Indicators v2.1 - provide structure it expects
        // But DON'T calculate percentiles or states
        transformed.indicatorsModuleFormat = this.formatForIndicators(transformed.indicators);
        
        // For Theme Calculator v3.2 - provide theme structure
        // But DON'T calculate theme scores
        transformed.themeCalculatorFormat = this.formatForThemeCalculator(transformed.indicators);
        
        return transformed;
    },
    
    /**
     * Format data for Indicators module v2.1
     * Provides structure but no calculations
     */
    formatForIndicators: function(indicators) {
        const formatted = {
            indicators: {}
        };
        
        Object.entries(indicators).forEach(([key, data]) => {
            formatted.indicators[key] = {
                value: data.current,
                // Percentiles will be calculated by Indicators module
                percentiles: null,
                source: data.source,
                lastUpdated: data.lastUpdated
            };
        });
        
        return formatted;
    },
    
    /**
     * Format data for Theme Calculator v3.2
     * Groups by theme but doesn't calculate scores
     */
    formatForThemeCalculator: function(indicators) {
        // Theme Calculator expects indicators grouped by theme
        const themes = {
            usd: {
                dxy: indicators.dxy || null,
                real_rates: indicators.real_rate_diff || null,
                cofer: indicators.cofer_usd || null
            },
            innovation: {
                qqq_spy: indicators.qqq_spy || null,
                productivity: indicators.productivity || null,
                rd_revenue: indicators.rd_revenue || null  // Actually tech_employment_pct
            },
            valuation: {
                put_call: indicators.put_call || null,
                forward_pe: indicators.forward_pe || null,  // Actually trailing_pe
                eps_delivery: indicators.eps_delivery || null
            },
            usLeadership: {
                spy_efa_momentum: indicators.spy_efa_momentum || null,
                us_market_cap: indicators.us_market_cap_pct || null,
                etf_flows: indicators.etf_flow_differential || null
            }
        };
        
        return themes;
    },
    
    /**
     * Get data in format for specific module
     */
    getDataForModule: function(transformedData, moduleName) {
        switch (moduleName) {
            case 'ThemeCalculator':
                return transformedData.themeCalculatorFormat;
            
            case 'Indicators':
                return transformedData.indicatorsModuleFormat;
            
            case 'DataEditor':
                return transformedData.monthlyData;
            
            default:
                return transformedData;
        }
    },
    
    /**
     * Validate that data has required fields for processing
     * Does NOT validate values - that's each module's job
     */
    validateStructure: function(data) {
        const validation = {
            valid: true,
            errors: [],
            warnings: []
        };
        
        // Check for required structure
        if (!data) {
            validation.valid = false;
            validation.errors.push('No data provided');
            return validation;
        }
        
        if (!data.indicators) {
            validation.valid = false;
            validation.errors.push('Missing indicators object');
            return validation;
        }
        
        // Check for expected fields (not values)
        const expectedFields = Object.values(this.fieldMapping);
        const missingFields = [];
        
        expectedFields.forEach(field => {
            if (!data.indicators[field]) {
                missingFields.push(field);
            }
        });
        
        if (missingFields.length > 0) {
            validation.warnings.push(`Missing fields: ${missingFields.join(', ')}`);
            if (missingFields.length > 6) {
                validation.valid = false;
                validation.errors.push('Too many missing fields');
            }
        }
        
        return validation;
    },
    
    /**
     * Save transformed data back to file
     */
    saveToFile: function(data, filename = null) {
        const timestamp = new Date().toISOString().split('T')[0];
        const defaultFilename = `hcp_transformed_${timestamp}.json`;
        
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || defaultFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log(`Data saved to ${a.download}`);
    },
    
    /**
     * Generate test data for development
     * Mimics Data Collector output structure
     */
    generateTestData: function(scenario = 'current') {
        const scenarios = {
            'current': {
                dxy_index: 97.87,
                real_rate_differential: 0.33,
                cofer_usd: 57.74,
                qqq_spy_ratio: 0.89,
                productivity_growth: 1.5,
                tech_employment_pct: 1.83,
                put_call_ratio: 1.195,
                trailing_pe: 26.23,
                eps_delivery: 1.041,
                spy_efa_momentum: 0.0503,
                us_market_pct: 90.97,
                etf_flow_differential: 53.57
            }
        };
        
        const values = scenarios[scenario] || scenarios.current;
        
        // Create mock data in Data Collector format
        const mockData = {
            metadata: {
                version: "4.3.3",
                ips_version: "4.2",
                last_updated: new Date().toISOString(),
                scenario: scenario
            },
            indicators: {}
        };
        
        // Add each indicator with mock history
        Object.entries(values).forEach(([key, value]) => {
            // Generate simple history
            const history = [];
            for (let i = 0; i < 60; i++) {
                const variation = (Math.random() - 0.5) * value * 0.1;
                history.push(value + variation);
            }
            
            mockData.indicators[key] = {
                current_value: value,
                monthly_history: history,
                monthly_dates: Array(60).fill(0).map((_, i) => {
                    const d = new Date();
                    d.setMonth(d.getMonth() - (59 - i));
                    return d.toISOString().split('T')[0];
                }),
                source: "mock_data",
                last_updated: new Date().toISOString(),
                data_quality: "mock",
                data_points: 60
            };
        });
        
        return mockData;
    }
};

// Export for various environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileHandler;
}

if (typeof window !== 'undefined') {
    window.FileHandler = FileHandler;
}