/**
 * HCP Portfolio Tracker - Indicators Module v4.1
 * File: indicators_v4_1.js
 * Based on: IPS v4.4 with Transformation Support
 * Last Updated: 2025-09-11T08:30:00Z
 * 
 * CHANGES IN v4.1:
 * - Updated real_rate_differential → tic_foreign_demand per IPS v4.4
 * - Fixed theme key: 'valuation' (not 'pe') for consistency
 * - Corrected GARCH suitability flags (only 2 indicators)
 * - Added transformation awareness for 5 indicators
 * - Added analysis method specifications from FileHandler v5.2
 * - Enhanced state determination logic for different analysis methods
 * 
 * HANDLES:
 * - 12 indicator definitions (3 per theme) per IPS v4.4
 * - Temporal classification framework (leading, concurrent, lagging)
 * - Three-state regime classification (-1, 0, +1)
 * - Transformation-aware calculations
 * - Analysis method-specific state determination
 */

const Indicators = {
    version: '4.1',
    framework: 'IPS v4.4 Transformation-Aware Implementation',
    
    // 12 Indicators per IPS v4.4 - ALIGNED WITH FILE HANDLER v5.2
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
                // Analysis specifications
                hasTransformation: true,
                transformation: '3-month rate of change',
                useForCalculations: 'transformed',
                analysisMethod: 'momentum',
                technique: 'percentile',
                garchSuitable: false // Already transformed
            },
            ticDemand: { // UPDATED FROM realRate
                name: 'TIC Foreign Demand Index', 
                temporal: 'concurrent', 
                weight: 0.40,
                description: 'Net foreign Treasury purchases, 3-month MA MoM change',
                dataKey: 'tic_foreign_demand', // UPDATED
                oldDataKey: 'real_rate_differential', // Backward compatibility
                source: 'US Treasury TIC Table 2',
                frequency: 'monthly',
                percentileWindow: 15,
                dataAvailableFrom: 1970,
                publicationLag: '~6 weeks',
                // Analysis specifications
                hasTransformation: true,
                transformation: '3-month MA of net purchases, MoM change',
                useForCalculations: 'transformed',
                analysisMethod: 'flow',
                technique: 'percentile',
                garchSuitable: false // Already transformed
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
                // Analysis specifications
                hasTransformation: false,
                useForCalculations: 'raw',
                analysisMethod: 'trend',
                technique: 'ma_comparison', // NOT GARCH - has secular trend
                garchSuitable: false // Strong secular trend violates GARCH
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
                // Analysis specifications
                hasTransformation: false,
                useForCalculations: 'raw',
                analysisMethod: 'ratio',
                technique: 'percentile',
                garchSuitable: false
            },
            productivity: { 
                name: 'US Productivity Growth', 
                temporal: 'concurrent', 
                weight: 0.40,
                description: 'Nonfarm output per hour YoY, 2-quarter MA',
                dataKey: 'productivity_growth',
                source: 'BLS/FRED (OPHNFB)',
                frequency: 'quarterly',
                percentileWindow: 15,
                dataAvailableFrom: 1947,
                // Analysis specifications
                hasTransformation: true,
                transformation: '2-quarter moving average',
                useForCalculations: 'transformed',
                analysisMethod: 'smoothed_trend',
                technique: 'percentile',
                garchSuitable: false
            },
            softwareInvestment: {
                name: 'Software IP Investment % GDP',
                temporal: 'lagging', 
                weight: 0.30,
                description: 'Intellectual property software investment as % of GDP',
                dataKey: 'software_ip_investment',
                oldDataKey: 'tech_employment_pct', // Backward compatibility
                source: 'FRED (Y001RC1Q027SBEA)',
                frequency: 'quarterly',
                percentileWindow: 15,
                dataAvailableFrom: 1990,
                // Analysis specifications
                hasTransformation: false,
                useForCalculations: 'raw',
                analysisMethod: 'level',
                technique: 'percentile',
                garchSuitable: false
            }
        },
        valuation: { // FIXED: Using 'valuation' not 'pe'
            putCall: { 
                name: 'Equity Put/Call Ratio', 
                temporal: 'leading', 
                weight: 0.30,
                description: 'Options positioning sentiment (inverted)',
                dataKey: 'put_call_ratio',
                source: 'CBOE (PCALL)',
                frequency: 'monthly',
                percentileWindow: 15,
                inverted: true, // High ratio = fear = low state
                dataAvailableFrom: 2006,
                // Analysis specifications
                hasTransformation: false,
                useForCalculations: 'raw',
                analysisMethod: 'sentiment',
                technique: 'percentile',
                stateLogic: 'percentile_inverted',
                garchSuitable: false
            },
            trailingPe: {
                name: 'S&P 500 Trailing P/E',
                temporal: 'concurrent', 
                weight: 0.40,
                description: 'Trailing 12-month earnings multiple, % deviation from 3-month MA',
                dataKey: 'trailing_pe',
                source: 'Yahoo Finance (SPY)',
                frequency: 'monthly',
                percentileWindow: 15,
                dataAvailableFrom: 1990,
                // Analysis specifications
                hasTransformation: true,
                transformation: '% deviation from 3-month average',
                useForCalculations: 'transformed',
                analysisMethod: 'mean_reversion',
                technique: 'deviation',
                stateLogic: 'threshold_based',
                garchSuitable: false // Already measuring deviation
            },
            capeChange: {
                name: 'CAPE Rate of Change',
                temporal: 'lagging', 
                weight: 0.30,
                description: '12-month rate of change in Shiller CAPE ratio',
                dataKey: 'cape_rate_of_change',
                oldDataKey: 'eps_delivery', // Backward compatibility
                source: 'Calculated from Shiller data',
                frequency: 'monthly',
                percentileWindow: 15,
                dataAvailableFrom: 1990,
                // Analysis specifications
                hasTransformation: false, // Already IS a rate of change
                useForCalculations: 'raw',
                analysisMethod: 'momentum',
                technique: 'percentile',
                garchSuitable: false // CORRECTED: Already transformed to RoC
            }
        },
        usLeadership: {
            spyEfa: {
                name: 'SPY/EFA Momentum',
                temporal: 'leading', 
                weight: 0.30,
                description: '3-month relative performance US vs Developed Intl, monthly mean',
                dataKey: 'spy_efa_momentum',
                source: 'Yahoo Finance',
                frequency: 'monthly',
                percentileWindow: 15,
                dataAvailableFrom: 2001,
                // Analysis specifications
                hasTransformation: true,
                transformation: 'monthly mean of daily momentum differential',
                useForCalculations: 'transformed',
                analysisMethod: 'momentum_differential',
                technique: 'garch', // CORRECTED: SUITABLE FOR GARCH
                stateLogic: 'zero_crossing',
                garchSuitable: true, // CORRECTED: Oscillating differential
                garchTarget: 'transformed'
            },
            marketCapShare: { 
                name: 'US Market Cap % Global', 
                temporal: 'concurrent', 
                weight: 0.40,
                description: 'US share of world equity market cap (proxy)',
                dataKey: 'us_market_pct',
                source: 'Calculated from SPY/(SPY+EFA)',
                frequency: 'monthly',
                percentileWindow: 15,
                dataAvailableFrom: 2001,
                // Analysis specifications
                hasTransformation: false,
                useForCalculations: 'raw',
                analysisMethod: 'level',
                technique: 'percentile',
                garchSuitable: false
            },
            returnDifferential: {
                name: 'Total Return Differential',
                temporal: 'lagging', 
                weight: 0.30,
                description: '252-day rolling return differential US vs International',
                dataKey: 'total_return_differential',
                oldDataKey: 'etf_flow_differential', // Backward compatibility
                source: 'Calculated from SPY and EFA total returns',
                frequency: 'monthly',
                percentileWindow: 15,
                dataAvailableFrom: 2003,
                // Analysis specifications
                hasTransformation: false,
                useForCalculations: 'raw',
                analysisMethod: 'momentum_differential',
                technique: 'garch', // SUITABLE FOR GARCH
                garchSuitable: true, // Oscillating spread
                garchTarget: 'raw'
            }
        }
    },

    // Temporal weights for aggregation - PRESERVED
    temporalWeights: {
        leading: 0.30,    // Early signals but noisy
        concurrent: 0.40, // Current reality
        lagging: 0.30     // Structural confirmation
    },

    // Get all indicators as flat list
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

    // Get GARCH-suitable indicators - NEW IN v4.1
    getGarchSuitableIndicators: function() {
        return this.getAllIndicators().filter(ind => ind.garchSuitable === true);
    },

    // Get transformed indicators - NEW IN v4.1
    getTransformedIndicators: function() {
        return this.getAllIndicators().filter(ind => ind.hasTransformation === true);
    },

    // Get indicators by temporal classification
    getIndicatorsByTemporal: function(temporal) {
        return this.getAllIndicators().filter(indicator => indicator.temporal === temporal);
    },

    // Get indicators by theme
    getIndicatorsByTheme: function(theme) {
        // Support both 'valuation' and 'pe' for backward compatibility
        if (theme === 'pe') {
            console.warn('Using deprecated theme key "pe" - use "valuation" instead');
            return this.definitions.valuation;
        }
        return this.definitions[theme] || {};
    },

    // Get indicator configuration - ENHANCED for v4.1
    getIndicatorConfig: function(theme, key) {
        // Support both theme names
        if (theme === 'pe') {
            theme = 'valuation';
        }
        
        const config = this.definitions[theme]?.[key];
        if (config) return config;
        
        // Check for old data keys for backward compatibility
        for (const [themeKey, themeIndicators] of Object.entries(this.definitions)) {
            for (const [indicatorKey, indicatorConfig] of Object.entries(themeIndicators)) {
                if (indicatorConfig.oldDataKey === key) {
                    console.warn(`Using old dataKey "${key}" - consider updating to "${indicatorConfig.dataKey}"`);
                    return indicatorConfig;
                }
            }
        }
        
        return null;
    },

    // Calculate three-state classification - ENHANCED FOR DIFFERENT METHODS
    calculateThreeState: function(value, percentiles, config = {}) {
        if (!percentiles || !percentiles.p33 || !percentiles.p67) {
            console.warn('Missing percentile data for three-state calculation');
            return 0;
        }
        
        const stateLogic = config.stateLogic || 'percentile_based';
        
        switch (stateLogic) {
            case 'percentile_based':
                if (value <= percentiles.p33) return -1;
                if (value >= percentiles.p67) return 1;
                return 0;
                
            case 'percentile_inverted': // For Put/Call ratio
                if (value >= percentiles.p67) return -1; // High P/C = bearish
                if (value <= percentiles.p33) return 1;  // Low P/C = bullish
                return 0;
                
            case 'zero_crossing': // For momentum differentials
                if (value < -0.01) return -1; // Negative momentum
                if (value > 0.01) return 1;   // Positive momentum
                return 0;
                
            case 'threshold_based': // For P/E deviation
                if (value < -5) return -1;  // >5% below average = cheap
                if (value > 5) return 1;     // >5% above average = expensive
                return 0;
                
            default:
                // Default to standard percentile
                if (value <= percentiles.p33) return -1;
                if (value >= percentiles.p67) return 1;
                return 0;
        }
    },

    // Calculate continuous theme value - ENHANCED FOR TRANSFORMATIONS
    calculateContinuousThemeValue: function(themeData, theme) {
        // Support both theme names
        if (theme === 'pe') {
            theme = 'valuation';
        }
        
        const themeIndicators = this.getIndicatorsByTheme(theme);
        const temporalWeights = this.temporalWeights;
        
        let totalWeight = 0;
        let weightedSum = 0;
        
        Object.entries(themeIndicators).forEach(([key, config]) => {
            // Try new dataKey first, then old dataKey for backward compatibility
            let indicator = themeData[config.dataKey];
            if (!indicator && config.oldDataKey) {
                indicator = themeData[config.oldDataKey];
                if (indicator) {
                    console.warn(`Found data under old key "${config.oldDataKey}" for ${config.name}`);
                }
            }
            
            if (indicator) {
                // Determine which value to use based on transformation
                let valueToUse;
                if (config.hasTransformation && indicator.currentTransformed !== undefined) {
                    valueToUse = indicator.currentTransformed;
                } else if (indicator.currentValue !== undefined) {
                    valueToUse = indicator.currentValue;
                } else {
                    valueToUse = indicator.value;
                }
                
                if (valueToUse !== null && valueToUse !== undefined && indicator.percentiles) {
                    // Get continuous position in distribution (-1 to +1)
                    const continuousValue = this.calculateContinuousPosition(
                        valueToUse, 
                        indicator.percentiles
                    );
                    
                    // Apply inverted logic if needed (e.g., put/call ratio)
                    const adjustedValue = config.inverted ? -continuousValue : continuousValue;
                    
                    // Weight by temporal classification
                    const weight = temporalWeights[config.temporal] * config.weight;
                    weightedSum += adjustedValue * weight;
                    totalWeight += weight;
                }
            }
        });
        
        if (totalWeight === 0) {
            return 0; // Neutral if no data
        }
        
        return weightedSum / totalWeight; // Returns value between -1 and +1
    },

    // Calculate continuous position in distribution
    calculateContinuousPosition: function(value, percentiles) {
        if (!percentiles) return 0;
        
        // Map to continuous -1 to +1 scale based on percentile position
        if (value <= percentiles.p33) {
            // Map 0th-33rd percentile to -1 to -0.33
            const range = percentiles.p33 - percentiles.min;
            if (range === 0) return -0.67;
            const position = (value - percentiles.min) / range;
            return -1 + (position * 0.67);
        } else if (value >= percentiles.p67) {
            // Map 67th-100th percentile to +0.33 to +1
            const range = percentiles.max - percentiles.p67;
            if (range === 0) return 0.67;
            const position = (value - percentiles.p67) / range;
            return 0.33 + (position * 0.67);
        } else {
            // Map 33rd-67th percentile to -0.33 to +0.33
            const range = percentiles.p67 - percentiles.p33;
            if (range === 0) return 0;
            const position = (value - percentiles.p33) / range;
            return -0.33 + (position * 0.67);
        }
    },

    // Determine discrete theme state from continuous value
    getThemeState: function(continuousValue) {
        if (continuousValue <= -0.33) return -1;
        if (continuousValue >= 0.33) return 1;
        return 0;
    },

    // Calculate current scenario (1-81) - UPDATED FOR 'valuation' theme
    calculateCurrentScenario: function(themeValues) {
        // Handle both old and new theme keys
        const valuationValue = themeValues.valuation || themeValues.pe || 0;
        
        // Convert continuous theme values to discrete states
        const states = {
            usd: this.getThemeState(themeValues.usd),
            innovation: this.getThemeState(themeValues.innovation),
            valuation: this.getThemeState(valuationValue),
            usLeadership: this.getThemeState(themeValues.usLeadership)
        };
        
        // Convert to scenario number (1-81)
        // Using base-3 encoding: USD*27 + Innovation*9 + Valuation*3 + USLeadership
        const scenarioIndex = 
            (states.usd + 1) * 27 +
            (states.innovation + 1) * 9 +
            (states.valuation + 1) * 3 +
            (states.usLeadership + 1);
        
        return {
            scenarioNumber: scenarioIndex + 1, // 1-81 instead of 0-80
            states: states,
            notation: `[${states.usd}, ${states.innovation}, ${states.valuation}, ${states.usLeadership}]`
        };
    },

    // Validate indicator data structure - ENHANCED for v4.1
    validateIndicatorData: function(data) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: [],
            coverage: {},
            transformationCoverage: 0,
            garchCoverage: 0
        };

        if (!data || !data.indicators) {
            validation.isValid = false;
            validation.errors.push('No indicators data found');
            return validation;
        }

        // Check each theme
        Object.entries(this.definitions).forEach(([theme, themeIndicators]) => {
            validation.coverage[theme] = {};
            
            Object.entries(themeIndicators).forEach(([key, config]) => {
                // Check new dataKey first, then old dataKey for backward compatibility
                let indicator = data.indicators[config.dataKey];
                let usingOldKey = false;
                
                if (!indicator && config.oldDataKey) {
                    indicator = data.indicators[config.oldDataKey];
                    usingOldKey = true;
                }
                
                if (!indicator) {
                    validation.warnings.push(`Missing indicator: ${config.name} (${config.dataKey})`);
                    validation.coverage[theme][key] = 'missing';
                } else {
                    if (usingOldKey) {
                        validation.warnings.push(`Using old dataKey for ${config.name}: ${config.oldDataKey} → ${config.dataKey}`);
                    }
                    
                    // Check for appropriate value based on transformation
                    let hasValue = false;
                    if (config.hasTransformation) {
                        hasValue = indicator.currentTransformed !== undefined && indicator.currentTransformed !== null;
                        if (hasValue) validation.transformationCoverage++;
                    } else {
                        hasValue = (indicator.currentValue !== undefined && indicator.currentValue !== null) ||
                                  (indicator.value !== undefined && indicator.value !== null);
                    }
                    
                    if (!hasValue) {
                        validation.warnings.push(`No value for: ${config.name}`);
                        validation.coverage[theme][key] = 'no_value';
                    } else if (!indicator.percentiles) {
                        validation.warnings.push(`No percentiles for: ${config.name}`);
                        validation.coverage[theme][key] = 'no_percentiles';
                    } else {
                        validation.coverage[theme][key] = 'ok';
                        if (config.garchSuitable) validation.garchCoverage++;
                    }
                }
            });
        });

        // Check temporal balance
        const temporalCounts = { leading: 0, concurrent: 0, lagging: 0 };
        this.getAllIndicators().forEach(ind => {
            if (validation.coverage[ind.theme]?.[ind.key] === 'ok') {
                temporalCounts[ind.temporal]++;
            }
        });
        
        if (temporalCounts.leading === 0) {
            validation.warnings.push('No leading indicators available');
        }
        if (temporalCounts.concurrent === 0) {
            validation.warnings.push('No concurrent indicators available');
        }
        if (temporalCounts.lagging === 0) {
            validation.warnings.push('No lagging indicators available');
        }

        return validation;
    },

    // Get indicator summary for reporting - ENHANCED
    getIndicatorSummary: function(data) {
        const validation = this.validateIndicatorData(data);
        const themes = Object.keys(this.definitions);
        
        const summary = {
            totalIndicators: 12,
            availableIndicators: 0,
            transformedIndicators: validation.transformationCoverage || 0,
            garchSuitableIndicators: validation.garchCoverage || 0,
            themes: {},
            temporal: { leading: 0, concurrent: 0, lagging: 0 },
            overallHealth: 'unknown',
            balance: 'unknown'
        };

        themes.forEach(theme => {
            const themeIndicators = this.getIndicatorsByTheme(theme);
            const themeCount = Object.keys(themeIndicators).length;
            const available = Object.values(validation.coverage[theme] || {})
                .filter(status => status === 'ok').length;
            
            summary.themes[theme] = {
                total: themeCount,
                available: available,
                percentage: Math.round((available / themeCount) * 100)
            };
            
            summary.availableIndicators += available;
        });

        // Count by temporal classification
        this.getAllIndicators().forEach(indicator => {
            const coverage = validation.coverage[indicator.theme]?.[indicator.key];
            if (coverage === 'ok') {
                summary.temporal[indicator.temporal]++;
            }
        });

        // Assess overall health
        const overallPercentage = (summary.availableIndicators / summary.totalIndicators) * 100;
        if (overallPercentage >= 90) summary.overallHealth = 'excellent';
        else if (overallPercentage >= 75) summary.overallHealth = 'good';
        else if (overallPercentage >= 60) summary.overallHealth = 'fair';
        else summary.overallHealth = 'poor';

        // Assess temporal balance
        const minTemporal = Math.min(...Object.values(summary.temporal));
        if (minTemporal >= 3) summary.balance = 'excellent';
        else if (minTemporal >= 2) summary.balance = 'good';
        else if (minTemporal >= 1) summary.balance = 'fair';
        else summary.balance = 'poor';

        return summary;
    },

    // Get theme display names - UPDATED
    getThemeDisplayNames: function() {
        return {
            usd: 'USD Reserve Status',
            innovation: 'Innovation Environment',
            valuation: 'P/E Valuation', // UPDATED
            usLeadership: 'US Market Leadership'
        };
    },

    // Map state to description
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

    // Get minimum data availability across all indicators
    getMinimumDataAvailability: function() {
        let minYears = Infinity;
        let constraintIndicator = null;
        
        this.getAllIndicators().forEach(indicator => {
            const yearsAvailable = new Date().getFullYear() - indicator.dataAvailableFrom;
            if (yearsAvailable < minYears) {
                minYears = yearsAvailable;
                constraintIndicator = indicator.name;
            }
        });
        
        return {
            years: minYears,
            constraintIndicator: constraintIndicator
        };
    },

    // Validate configuration for IPS v4.4 compliance - UPDATED
    validateConfiguration: function() {
        const minData = this.getMinimumDataAvailability();
        const garchIndicators = this.getGarchSuitableIndicators();
        const transformedIndicators = this.getTransformedIndicators();
        
        console.log("Indicators v4.1 Configuration Validation");
        console.log("=" + "=".repeat(50));
        console.log(`  Framework: IPS v4.4 Transformation-Aware`);
        console.log(`  Theme Key: 'valuation' (not 'pe')`);
        console.log(`  TIC Foreign Demand replaces Real Rate Differential`);
        console.log(`  Transformed Indicators: ${transformedIndicators.length} of 12`);
        console.log(`  GARCH-Suitable: ${garchIndicators.length} indicators`);
        garchIndicators.forEach(ind => {
            console.log(`    - ${ind.name}: ${ind.garchTarget || 'raw'} data`);
        });
        console.log(`  Minimum Data: ${minData.years} years (${minData.constraintIndicator})`);
        console.log(`  Aligned with FileHandler v5.2 analysis specs`);
        console.log(`  Backward compatibility maintained`);
        
        return minData.years >= 15;
    },

    // Helper function to get indicator by dataKey (new or old)
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

    // Migration helper for old data structures - ENHANCED
    migrateDataKeys: function(data) {
        if (!data || !data.indicators) return data;
        
        const migrated = { ...data };
        const migrations = [
            { old: 'real_rate_differential', new: 'tic_foreign_demand' },
            { old: 'tech_employment_pct', new: 'software_ip_investment' },
            { old: 'eps_delivery', new: 'cape_rate_of_change' },
            { old: 'etf_flow_differential', new: 'total_return_differential' }
        ];
        
        migrations.forEach(({ old, new: newKey }) => {
            if (migrated.indicators[old] && !migrated.indicators[newKey]) {
                console.log(`Migrating ${old} → ${newKey}`);
                migrated.indicators[newKey] = migrated.indicators[old];
                // Keep old key for backward compatibility
            }
        });
        
        return migrated;
    },

    // Get analysis summary - NEW IN v4.1
    getAnalysisSummary: function() {
        const summary = {
            garchSuitable: [],
            percentileBased: [],
            otherMethods: []
        };
        
        this.getAllIndicators().forEach(ind => {
            if (ind.garchSuitable) {
                summary.garchSuitable.push({
                    name: ind.name,
                    dataKey: ind.dataKey,
                    target: ind.garchTarget || 'raw'
                });
            } else if (ind.technique === 'percentile') {
                summary.percentileBased.push({
                    name: ind.name,
                    dataKey: ind.dataKey,
                    hasTransformation: ind.hasTransformation
                });
            } else {
                summary.otherMethods.push({
                    name: ind.name,
                    dataKey: ind.dataKey,
                    technique: ind.technique,
                    method: ind.analysisMethod
                });
            }
        });
        
        return summary;
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