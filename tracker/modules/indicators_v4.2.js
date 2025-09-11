/**
 * HCP Portfolio Tracker - Indicators Module v4.2
 * File: indicators_v4_2.js
 * Based on: IPS v4.4 with TrackerCore v1.3 Integration
 * Last Updated: 2025-09-11T09:00:00Z
 * 
 * CHANGES IN v4.2:
 * - Added processIndicatorData() function for TrackerCore integration
 * - Added calculateIndicatorStates() for state determination
 * - Enhanced backward compatibility for theme names (pe -> valuation)
 * - Fixed inverted logic for Put/Call ratio
 * - Added proper handling of both flat and nested data structures
 * - Improved transformation value selection logic
 * - Added comprehensive data validation
 * 
 * PRESERVED FROM v4.1:
 * - All indicator definitions with IPS v4.4 field names
 * - GARCH suitability flags (only 2 indicators)
 * - Transformation awareness
 * - Analysis method specifications
 */

const Indicators = {
    version: '4.2',
    framework: 'IPS v4.4 with TrackerCore v1.3 Integration',
    lastUpdated: '2025-09-11T09:00:00Z',
    
    // 12 Indicators per IPS v4.4 - COMPLETE DEFINITIONS
    definitions: {
        usd: {
            dxy: { 
                name: 'DXY Index', 
                temporal: 'leading', 
                weight: 0.30,
                description: 'FX market expectations for USD strength',
                dataKey: 'dxy_index',
                source: 'Yahoo Finance (DX-Y.NYB)',
                frequency: 'monthly',
                percentileWindow: 15,
                dataAvailableFrom: 1967,
                hasTransformation: true,
                transformation: '3-month rate of change',
                useForCalculations: 'transformed',
                analysisMethod: 'momentum',
                technique: 'percentile',
                garchSuitable: false,
                inverted: false
            },
            ticDemand: {
                name: 'TIC Foreign Demand Index', 
                temporal: 'concurrent', 
                weight: 0.40,
                description: 'Net foreign Treasury purchases, 3-month MA MoM change',
                dataKey: 'tic_foreign_demand',
                oldDataKey: 'real_rate_differential', // Backward compatibility
                source: 'US Treasury TIC Table 2',
                frequency: 'monthly',
                percentileWindow: 15,
                dataAvailableFrom: 1970,
                publicationLag: '~6 weeks',
                hasTransformation: true,
                transformation: '3-month MA of net purchases, MoM change',
                useForCalculations: 'transformed',
                analysisMethod: 'flow',
                technique: 'percentile',
                garchSuitable: false,
                inverted: false
            },
            cofer: { 
                name: 'IMF COFER Reserve Share', 
                temporal: 'lagging', 
                weight: 0.30,
                description: 'USD share of central bank reserves',
                dataKey: 'cofer_usd',
                source: 'IMF Statistics',
                frequency: 'quarterly',
                percentileWindow: 15,
                dataAvailableFrom: 1999,
                hasTransformation: false,
                useForCalculations: 'raw',
                analysisMethod: 'trend',
                technique: 'ma_comparison',
                garchSuitable: false,
                inverted: false
            }
        },
        innovation: {
            qqqSpy: {
                name: 'QQQ/SPY Ratio',
                temporal: 'leading', 
                weight: 0.30,
                description: 'Tech/innovation sentiment vs broad market',
                dataKey: 'qqq_spy_ratio',
                source: 'Yahoo Finance',
                frequency: 'monthly',
                percentileWindow: 15,
                dataAvailableFrom: 1999,
                hasTransformation: false,
                useForCalculations: 'raw',
                analysisMethod: 'ratio',
                technique: 'percentile',
                garchSuitable: false,
                inverted: false
            },
            productivity: { 
                name: 'US Productivity Growth', 
                temporal: 'concurrent', 
                weight: 0.40,
                description: 'Output per hour YoY change',
                dataKey: 'productivity_growth',
                source: 'FRED (OPHNFB)',
                frequency: 'quarterly',
                percentileWindow: 15,
                dataAvailableFrom: 1947,
                hasTransformation: true,
                transformation: '2-quarter moving average',
                useForCalculations: 'transformed',
                analysisMethod: 'growth',
                technique: 'percentile',
                garchSuitable: false,
                inverted: false
            },
            softwareInvestment: { 
                name: 'Software IP Investment', 
                temporal: 'lagging', 
                weight: 0.30,
                description: 'Software investment as % of private fixed investment',
                dataKey: 'software_ip_investment',
                oldDataKey: 'tech_employment_pct',
                source: 'FRED (Y001RC1Q027SBEA)',
                frequency: 'quarterly',
                percentileWindow: 15,
                dataAvailableFrom: 1995,
                hasTransformation: false,
                useForCalculations: 'raw',
                analysisMethod: 'share',
                technique: 'percentile',
                garchSuitable: false,
                inverted: false
            }
        },
        valuation: { // Standardized theme name
            putCall: {
                name: 'Put/Call Ratio',
                temporal: 'leading', 
                weight: 0.30,
                description: 'Options sentiment indicator',
                dataKey: 'put_call_ratio',
                source: 'CBOE',
                frequency: 'daily',
                percentileWindow: 15,
                dataAvailableFrom: 2006,
                hasTransformation: false,
                useForCalculations: 'raw',
                analysisMethod: 'sentiment',
                technique: 'percentile',
                garchSuitable: false,
                inverted: true // HIGH P/C = bearish = LOW valuation state
            },
            trailingPE: { 
                name: 'Trailing P/E', 
                temporal: 'concurrent', 
                weight: 0.40,
                description: 'SPX trailing 12-month P/E ratio',
                dataKey: 'trailing_pe',
                oldDataKey: 'forward_pe',
                source: 'Yahoo Finance (SPY)',
                frequency: 'monthly',
                percentileWindow: 15,
                dataAvailableFrom: 1871,
                hasTransformation: true,
                transformation: '% deviation from 3-month average',
                useForCalculations: 'transformed',
                analysisMethod: 'valuation',
                technique: 'percentile',
                garchSuitable: false,
                inverted: false
            },
            capeRoC: { 
                name: 'CAPE Rate of Change', 
                temporal: 'lagging', 
                weight: 0.30,
                description: 'Shiller CAPE 12-month rate of change',
                dataKey: 'cape_rate_of_change',
                oldDataKey: 'eps_delivery',
                source: 'Shiller Data',
                frequency: 'monthly',
                percentileWindow: 15,
                dataAvailableFrom: 1871,
                hasTransformation: false,
                useForCalculations: 'raw',
                analysisMethod: 'valuation_momentum',
                technique: 'percentile',
                garchSuitable: false,
                inverted: false
            }
        },
        usLeadership: {
            spyEfa: {
                name: 'SPY/EFA Momentum',
                temporal: 'leading', 
                weight: 0.30,
                description: '3-month momentum differential (US vs Developed)',
                dataKey: 'spy_efa_momentum',
                source: 'Yahoo Finance',
                frequency: 'monthly',
                percentileWindow: 15,
                dataAvailableFrom: 2001,
                hasTransformation: true,
                transformation: 'Monthly mean of daily momentum',
                useForCalculations: 'transformed',
                analysisMethod: 'momentum_differential',
                technique: 'percentile',
                garchSuitable: false,
                inverted: false
            },
            usMarketShare: {
                name: 'US Market Share',
                temporal: 'concurrent', 
                weight: 0.40,
                description: 'US equity market cap as % of developed world',
                dataKey: 'us_market_pct',
                oldDataKey: 'us_market_cap_pct',
                source: 'Yahoo Finance',
                frequency: 'monthly',
                percentileWindow: 15,
                dataAvailableFrom: 2001,
                hasTransformation: false,
                useForCalculations: 'raw',
                analysisMethod: 'market_share',
                technique: 'garch',
                garchSuitable: true,
                garchTarget: 'raw',
                inverted: false
            },
            totalReturnDiff: {
                name: 'Total Return Differential',
                temporal: 'lagging', 
                weight: 0.30,
                description: 'SPY vs EFA 252-day rolling return differential',
                dataKey: 'total_return_differential',
                oldDataKey: 'etf_flow_differential',
                source: 'Yahoo Finance',
                frequency: 'monthly',
                percentileWindow: 15,
                dataAvailableFrom: 2001,
                hasTransformation: false,
                useForCalculations: 'raw',
                analysisMethod: 'momentum_differential',
                technique: 'garch',
                garchSuitable: true,
                garchTarget: 'raw',
                inverted: false
            }
        }
    },

    // Temporal weights for aggregation
    temporalWeights: {
        leading: 0.30,
        concurrent: 0.40,
        lagging: 0.30
    },

    // ============= MAIN PROCESSING FUNCTION FOR TRACKERCORE =============
    /**
     * Process indicator data from Data Collector or FileHandler
     * This is the main entry point called by TrackerCore
     */
    processIndicatorData: function(data) {
        console.log('Indicators v4.2: Processing indicator data');
        
        const result = {
            indicators: {},
            themes: {},
            states: {},
            scenario: null,
            validation: {
                isValid: false,
                errors: [],
                warnings: [],
                coverage: {},
                transformationStatus: {}
            }
        };

        // Detect data structure (flat vs nested)
        const isNested = this.detectDataStructure(data);
        
        // Extract and normalize indicator data
        if (isNested) {
            result.indicators = this.extractNestedIndicators(data);
        } else {
            result.indicators = this.extractFlatIndicators(data);
        }

        // Validate data completeness
        result.validation = this.validateIndicatorData(result.indicators);
        
        if (!result.validation.isValid) {
            console.warn('Indicators v4.2: Data validation failed', result.validation.errors);
            return result;
        }

        // Calculate states for each indicator
        result.states = this.calculateIndicatorStates(result.indicators);
        
        // Calculate theme values and states
        result.themes = this.calculateThemeValues(result.indicators);
        
        // Calculate current scenario
        result.scenario = this.calculateCurrentScenario(result.themes);
        
        console.log('Indicators v4.2: Processing complete', {
            indicatorCount: Object.keys(result.indicators).length,
            themes: Object.keys(result.themes),
            scenario: result.scenario.notation
        });
        
        return result;
    },

    // ============= STATE CALCULATION FUNCTION FOR TRACKERCORE =============
    /**
     * Calculate indicator states from data
     * Called by TrackerCore for state determination
     */
    calculateIndicatorStates: function(indicators) {
        console.log('Indicators v4.2: Calculating indicator states');
        
        const states = {};
        
        Object.entries(indicators).forEach(([key, indicator]) => {
            const config = this.getIndicatorByDataKey(key);
            if (!config) {
                console.warn(`No configuration found for indicator: ${key}`);
                return;
            }

            // Determine which value to use
            const value = this.selectIndicatorValue(indicator, config);
            
            if (value === null || value === undefined) {
                states[key] = {
                    state: 0,
                    value: null,
                    percentile: null,
                    reason: 'No data available'
                };
                return;
            }

            // Calculate state based on percentiles
            const percentiles = indicator.percentiles || {};
            const state = this.calculateThreeState(value, percentiles, config);
            
            states[key] = {
                state: state,
                value: value,
                percentile: this.calculatePercentileRank(value, percentiles),
                hasTransformation: config.hasTransformation,
                analysisMethod: config.analysisMethod
            };
        });
        
        return states;
    },

    // ============= HELPER FUNCTIONS =============
    
    detectDataStructure: function(data) {
        if (!data) return false;
        
        // Check for nested structure (themes containing indicators)
        if (data.indicators) {
            const firstKey = Object.keys(data.indicators)[0];
            if (firstKey && typeof data.indicators[firstKey] === 'object') {
                // Check if it's a theme object containing indicators
                const firstValue = data.indicators[firstKey];
                return firstValue.hasOwnProperty('usd') || 
                       firstValue.hasOwnProperty('innovation') ||
                       firstValue.hasOwnProperty('valuation') ||
                       firstValue.hasOwnProperty('usLeadership');
            }
        }
        
        return false;
    },

    extractNestedIndicators: function(data) {
        const indicators = {};
        const themes = ['usd', 'innovation', 'valuation', 'usLeadership'];
        
        themes.forEach(theme => {
            const themeData = data.indicators?.[theme] || data[theme];
            if (themeData) {
                Object.entries(themeData).forEach(([key, value]) => {
                    // Find the actual indicator config
                    const config = this.findIndicatorByThemeData(theme, value);
                    if (config) {
                        indicators[config.dataKey] = value;
                    }
                });
            }
        });
        
        return indicators;
    },

    extractFlatIndicators: function(data) {
        // Handle flat structure from Data Collector
        return data.indicators || data || {};
    },

    findIndicatorByThemeData: function(theme, indicatorData) {
        // Match indicator by various possible keys in the data
        const themeIndicators = this.definitions[theme];
        if (!themeIndicators) return null;
        
        for (const [key, config] of Object.entries(themeIndicators)) {
            // Check various possible matches
            if (indicatorData[config.dataKey] !== undefined ||
                indicatorData[config.oldDataKey] !== undefined ||
                indicatorData.name === config.name) {
                return config;
            }
        }
        
        return null;
    },

    selectIndicatorValue: function(indicator, config) {
        // Priority: transformed value (if transformation exists) > current value > raw value
        
        if (config.hasTransformation) {
            // Look for transformed value
            if (indicator.currentTransformed !== undefined) {
                return indicator.currentTransformed;
            }
            if (indicator.current_transformed !== undefined) {
                return indicator.current_transformed;
            }
            if (indicator.transformed !== undefined) {
                return indicator.transformed;
            }
        }
        
        // Fall back to current/raw values
        if (indicator.currentValue !== undefined) {
            return indicator.currentValue;
        }
        if (indicator.current_value !== undefined) {
            return indicator.current_value;
        }
        if (indicator.current !== undefined) {
            return indicator.current;
        }
        if (indicator.value !== undefined) {
            return indicator.value;
        }
        
        return null;
    },

    calculateThreeState: function(value, percentiles, config = {}) {
        if (!percentiles || !percentiles.p33 || !percentiles.p67) {
            console.warn('Missing percentile data for three-state calculation');
            return 0;
        }
        
        // Special handling for inverted indicators (e.g., Put/Call ratio)
        if (config.inverted) {
            // High value = negative state, Low value = positive state
            if (value >= percentiles.p67) return -1;
            if (value <= percentiles.p33) return 1;
            return 0;
        }
        
        // Standard logic
        if (value <= percentiles.p33) return -1;
        if (value >= percentiles.p67) return 1;
        return 0;
    },

    calculatePercentileRank: function(value, percentiles) {
        if (!percentiles || value === null) return null;
        
        // Simple linear interpolation
        if (value <= percentiles.min) return 0;
        if (value >= percentiles.max) return 100;
        
        if (value <= percentiles.p10) {
            return (value - percentiles.min) / (percentiles.p10 - percentiles.min) * 10;
        }
        if (value <= percentiles.p25) {
            return 10 + (value - percentiles.p10) / (percentiles.p25 - percentiles.p10) * 15;
        }
        if (value <= percentiles.p33) {
            return 25 + (value - percentiles.p25) / (percentiles.p33 - percentiles.p25) * 8;
        }
        if (value <= percentiles.p50) {
            return 33 + (value - percentiles.p33) / (percentiles.p50 - percentiles.p33) * 17;
        }
        if (value <= percentiles.p67) {
            return 50 + (value - percentiles.p50) / (percentiles.p67 - percentiles.p50) * 17;
        }
        if (value <= percentiles.p75) {
            return 67 + (value - percentiles.p67) / (percentiles.p75 - percentiles.p67) * 8;
        }
        if (value <= percentiles.p90) {
            return 75 + (value - percentiles.p75) / (percentiles.p90 - percentiles.p75) * 15;
        }
        
        return 90 + (value - percentiles.p90) / (percentiles.max - percentiles.p90) * 10;
    },

    calculateThemeValues: function(indicators) {
        const themes = {};
        
        // Process each theme
        ['usd', 'innovation', 'valuation', 'usLeadership'].forEach(theme => {
            themes[theme] = this.calculateContinuousThemeValue(indicators, theme);
        });
        
        return themes;
    },

    calculateContinuousThemeValue: function(indicators, theme) {
        const themeIndicators = this.definitions[theme];
        if (!themeIndicators) {
            console.warn(`Theme ${theme} not found in definitions`);
            return 0;
        }
        
        let totalWeight = 0;
        let weightedSum = 0;
        
        Object.entries(themeIndicators).forEach(([key, config]) => {
            const indicator = indicators[config.dataKey] || 
                            indicators[config.oldDataKey];
            
            if (!indicator) return;
            
            const value = this.selectIndicatorValue(indicator, config);
            if (value === null || value === undefined) return;
            
            const percentiles = indicator.percentiles || {};
            const continuousValue = this.calculateContinuousPosition(value, percentiles);
            
            // Apply inversion if needed
            const adjustedValue = config.inverted ? -continuousValue : continuousValue;
            
            // Weight by temporal classification
            const weight = this.temporalWeights[config.temporal] * config.weight;
            weightedSum += adjustedValue * weight;
            totalWeight += weight;
        });
        
        if (totalWeight === 0) return 0;
        
        return weightedSum / totalWeight;
    },

    calculateContinuousPosition: function(value, percentiles) {
        if (!percentiles) return 0;
        
        // Map to continuous -1 to +1 scale based on percentile position
        if (value <= percentiles.p33) {
            const range = percentiles.p33 - percentiles.min;
            if (range === 0) return -0.67;
            const position = (value - percentiles.min) / range;
            return -1 + (position * 0.67);
        } else if (value >= percentiles.p67) {
            const range = percentiles.max - percentiles.p67;
            if (range === 0) return 0.67;
            const position = (value - percentiles.p67) / range;
            return 0.33 + (position * 0.67);
        } else {
            const range = percentiles.p67 - percentiles.p33;
            if (range === 0) return 0;
            const position = (value - percentiles.p33) / range;
            return -0.33 + (position * 0.67);
        }
    },

    getThemeState: function(continuousValue) {
        if (continuousValue <= -0.33) return -1;
        if (continuousValue >= 0.33) return 1;
        return 0;
    },

    calculateCurrentScenario: function(themeValues) {
        // Convert continuous theme values to discrete states
        const states = {
            usd: this.getThemeState(themeValues.usd || 0),
            innovation: this.getThemeState(themeValues.innovation || 0),
            valuation: this.getThemeState(themeValues.valuation || themeValues.pe || 0),
            usLeadership: this.getThemeState(themeValues.usLeadership || 0)
        };
        
        // Convert to scenario number (1-81)
        const scenarioIndex = 
            (states.usd + 1) * 27 +
            (states.innovation + 1) * 9 +
            (states.valuation + 1) * 3 +
            (states.usLeadership + 1);
        
        return {
            scenarioNumber: scenarioIndex + 1,
            states: states,
            notation: `[${states.usd}, ${states.innovation}, ${states.valuation}, ${states.usLeadership}]`
        };
    },

    // ============= UTILITY FUNCTIONS =============
    
    getAllIndicators: function() {
        const indicators = [];
        Object.entries(this.definitions).forEach(([theme, themeIndicators]) => {
            Object.entries(themeIndicators).forEach(([key, config]) => {
                indicators.push({
                    theme: theme,
                    key: key,
                    ...config
                });
            });
        });
        return indicators;
    },

    getGarchSuitableIndicators: function() {
        return this.getAllIndicators().filter(ind => ind.garchSuitable === true);
    },

    getTransformedIndicators: function() {
        return this.getAllIndicators().filter(ind => ind.hasTransformation === true);
    },

    getIndicatorsByTheme: function(theme) {
        // Handle theme name compatibility
        if (theme === 'pe') {
            theme = 'valuation';
        }
        return this.definitions[theme] || {};
    },

    getIndicatorByDataKey: function(dataKey) {
        for (const [theme, themeIndicators] of Object.entries(this.definitions)) {
            for (const [key, config] of Object.entries(themeIndicators)) {
                if (config.dataKey === dataKey || config.oldDataKey === dataKey) {
                    return { theme, key, ...config };
                }
            }
        }
        return null;
    },

    validateIndicatorData: function(indicators) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: [],
            coverage: {},
            transformationStatus: {}
        };

        if (!indicators || Object.keys(indicators).length === 0) {
            validation.isValid = false;
            validation.errors.push('No indicator data provided');
            return validation;
        }

        // Check each required indicator
        let validCount = 0;
        let totalCount = 0;

        this.getAllIndicators().forEach(config => {
            totalCount++;
            const indicator = indicators[config.dataKey] || indicators[config.oldDataKey];
            
            if (!indicator) {
                validation.warnings.push(`Missing indicator: ${config.name}`);
                validation.coverage[config.dataKey] = 'missing';
            } else {
                const value = this.selectIndicatorValue(indicator, config);
                if (value !== null && value !== undefined) {
                    validCount++;
                    validation.coverage[config.dataKey] = 'valid';
                    
                    // Track transformation status
                    if (config.hasTransformation) {
                        validation.transformationStatus[config.dataKey] = 
                            (indicator.currentTransformed !== undefined ||
                             indicator.current_transformed !== undefined);
                    }
                } else {
                    validation.warnings.push(`No value for indicator: ${config.name}`);
                    validation.coverage[config.dataKey] = 'no-value';
                }
            }
        });

        // Need at least 8 valid indicators
        validation.isValid = validCount >= 8;
        
        if (!validation.isValid) {
            validation.errors.push(`Insufficient valid indicators: ${validCount}/${totalCount}`);
        }

        return validation;
    },

    // Get theme display names
    getThemeDisplayNames: function() {
        return {
            usd: 'USD Reserve Status',
            innovation: 'Innovation Environment',
            valuation: 'Valuation Dynamics', // Updated name
            usLeadership: 'US Market Leadership'
        };
    },

    // Get state description
    getStateDescription: function(state) {
        const descriptions = {
            '-1': 'Weak/Low',
            '0': 'Neutral',
            '1': 'Strong/High'
        };
        return descriptions[state.toString()] || 'Unknown';
    },

    // Generate scenario description
    getScenarioDescription: function(scenarioStates) {
        const themes = this.getThemeDisplayNames();
        const descriptions = [];
        
        Object.entries(scenarioStates).forEach(([theme, state]) => {
            const themeName = themes[theme];
            const stateDesc = this.getStateDescription(state);
            descriptions.push(`${themeName}: ${stateDesc}`);
        });
        
        return descriptions.join(', ');
    },

    // Get configuration summary for validation
    validateConfiguration: function() {
        const garchIndicators = this.getGarchSuitableIndicators();
        const transformedIndicators = this.getTransformedIndicators();
        
        console.log("Indicators v4.2 Configuration Validation");
        console.log("=" + "=".repeat(50));
        console.log(`  Framework: IPS v4.4 with TrackerCore v1.3 Integration`);
        console.log(`  Theme Names: usd, innovation, valuation, usLeadership`);
        console.log(`  TIC Foreign Demand replaces Real Rate Differential`);
        console.log(`  Total Indicators: 12`);
        console.log(`  Transformed Indicators: ${transformedIndicators.length}`);
        console.log(`  GARCH-Suitable: ${garchIndicators.length} indicators`);
        garchIndicators.forEach(ind => {
            console.log(`    - ${ind.name}: ${ind.garchTarget || 'raw'} data`);
        });
        console.log(`  Integration: processIndicatorData() and calculateIndicatorStates()`);
        console.log(`  Backward Compatibility: Maintained for old field names`);
        
        return true;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Indicators;
}

// Browser global
if (typeof window !== 'undefined') {
    window.Indicators = Indicators;
}