/**
 * HCP Portfolio Tracker - Indicators Module v2.1
 * File: indicators_v2_1.js
 * Based on: IPS v4.1 Extended History Indicators
 * Last Updated: 2025-09-05 19:00:00 UTC
 * 
 * CHANGES IN v2.1:
 * - QQQ/SPY replaces ARKK/SPY for innovation theme
 * - SPY/EFA replaces SPY/VXUS for US leadership theme
 * - Updated percentile windows for extended history
 * - All other functionality PRESERVED from v2.0
 * 
 * HANDLES:
 * - 12 indicator definitions (3 per theme) per IPS v4.1
 * - Temporal classification framework (leading, concurrent, lagging)
 * - Three-state regime classification (-1, 0, +1)
 * - Balanced indicator coverage across themes
 */

const Indicators = {
    version: '2.1',
    framework: 'IPS v4.1 Extended History Indicators',
    
    // 12 Indicators per IPS v4.1 - UPDATED FOR EXTENDED HISTORY
    definitions: {
        usd: {
            dxy: { 
                name: 'DXY Index', 
                temporal: 'leading', 
                weight: 0.30,
                description: 'FX market expectations for USD strength',
                dataKey: 'dxy',
                source: 'Yahoo Finance (DX-Y.NYB)',
                frequency: 'daily',
                percentileWindow: 15,  // years for percentile calculation
                dataAvailableFrom: 1967
            },
            realRate: { 
                name: 'Real Rate Differential', 
                temporal: 'concurrent', 
                weight: 0.40,
                description: 'US 10yr real yield minus G10 average',
                dataKey: 'real_rate_diff',
                source: 'FRED (DFII10) + G10 data',
                frequency: 'daily',
                percentileWindow: 15,
                dataAvailableFrom: 2003
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
                dataAvailableFrom: 1999
            }
        },
        innovation: {
            qqqSpy: {   // CHANGED from arkkSpy
                name: 'QQQ/SPY Ratio',   // UPDATED
                temporal: 'leading', 
                weight: 0.30,
                description: 'Tech/innovation sentiment vs broad market',  // UPDATED
                dataKey: 'qqq_spy',  // UPDATED
                source: 'Yahoo Finance',
                frequency: 'daily',
                percentileWindow: 15,  // INCREASED from 10
                dataAvailableFrom: 1999,  // EXTENDED from 2014
                note: 'Replaced ARKK/SPY in v4.1 for extended history'
            },
            productivity: { 
                name: 'US Productivity Growth', 
                temporal: 'concurrent', 
                weight: 0.40,
                description: 'Nonfarm output per hour YoY',
                dataKey: 'productivity',
                source: 'BLS/FRED (OPHNFB)',
                frequency: 'quarterly',
                percentileWindow: 15,
                dataAvailableFrom: 1947
            },
            rdRevenue: { 
                name: 'Corporate R&D/Revenue', 
                temporal: 'lagging', 
                weight: 0.30,
                description: 'S&P 500 R&D intensity',
                dataKey: 'rd_revenue',
                source: 'S&P/Bloomberg',
                frequency: 'quarterly',
                percentileWindow: 15,
                dataAvailableFrom: 1990
            }
        },
        pe: {
            putCall: { 
                name: 'Equity Put/Call Ratio', 
                temporal: 'leading', 
                weight: 0.30,
                description: 'Options positioning sentiment (inverted)',
                dataKey: 'put_call',
                source: 'CBOE (PCALL)',
                frequency: 'daily',
                percentileWindow: 15,
                inverted: true,  // high ratio = fear = low state
                dataAvailableFrom: 2006  // Constraint indicator
            },
            forwardPe: { 
                name: 'S&P 500 Forward P/E', 
                temporal: 'concurrent', 
                weight: 0.40,
                description: '12-month forward earnings multiple',
                dataKey: 'forward_pe',
                source: 'Bloomberg/Refinitiv',
                frequency: 'daily',
                percentileWindow: 15,
                dataAvailableFrom: 1990
            },
            epsDelivery: { 
                name: '12M EPS Delivery Rate', 
                temporal: 'lagging', 
                weight: 0.30,
                description: 'Actual vs expected EPS ratio',
                dataKey: 'eps_delivery',
                source: 'FactSet',
                frequency: 'monthly',
                percentileWindow: 15,
                dataAvailableFrom: 1990
            }
        },
        usLeadership: {
            spyEfa: {   // CHANGED from spyVxus
                name: 'SPY/EFA Momentum',  // UPDATED
                temporal: 'leading', 
                weight: 0.30,
                description: '3-month relative performance US vs Developed Intl',  // UPDATED
                dataKey: 'spy_efa_momentum',  // UPDATED
                source: 'Yahoo Finance',
                frequency: 'daily',
                percentileWindow: 15,
                dataAvailableFrom: 2001,  // EXTENDED from 2011
                note: 'Replaced SPY/VXUS in v4.1 for extended history'
            },
            marketCapShare: { 
                name: 'US Market Cap % Global', 
                temporal: 'concurrent', 
                weight: 0.40,
                description: 'US share of world equity market cap',
                dataKey: 'us_market_cap_pct',
                source: 'Bloomberg World Exchange',
                frequency: 'monthly',
                percentileWindow: 15,
                dataAvailableFrom: 1980
            },
            etfFlows: { 
                name: 'Cumulative ETF Flows', 
                temporal: 'lagging', 
                weight: 0.30,
                description: '12M US vs International flows',
                dataKey: 'etf_flow_differential',
                source: 'ETF.com',
                frequency: 'monthly',
                percentileWindow: 15,
                dataAvailableFrom: 2003
            }
        }
    },

    // Temporal weights for aggregation - PRESERVED FROM v2.0
    temporalWeights: {
        leading: 0.30,    // Early signals but noisy
        concurrent: 0.40, // Current reality
        lagging: 0.30     // Structural confirmation
    },

    // Get all indicators as flat list - UTILITY (PRESERVED)
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

    // Get indicators by temporal classification - UTILITY (PRESERVED)
    getIndicatorsByTemporal: function(temporal) {
        return this.getAllIndicators().filter(indicator => indicator.temporal === temporal);
    },

    // Get indicators by theme - UTILITY (PRESERVED)
    getIndicatorsByTheme: function(theme) {
        return this.definitions[theme] || {};
    },

    // Get indicator configuration - UTILITY (PRESERVED)
    getIndicatorConfig: function(theme, key) {
        return this.definitions[theme]?.[key] || null;
    },

    // Calculate three-state classification - CORE CALCULATION (PRESERVED)
    calculateThreeState: function(value, percentiles) {
        if (!percentiles || !percentiles.p33 || !percentiles.p67) {
            console.warn('Missing percentile data for three-state calculation');
            return 0;
        }
        
        if (value <= percentiles.p33) {
            return -1; // Bottom tercile
        } else if (value >= percentiles.p67) {
            return 1;  // Top tercile
        } else {
            return 0;   // Middle tercile
        }
    },

    // Calculate continuous theme value - CORE CALCULATION (PRESERVED)
    calculateContinuousThemeValue: function(themeData, theme) {
        const themeIndicators = this.getIndicatorsByTheme(theme);
        const temporalWeights = this.temporalWeights;
        
        let totalWeight = 0;
        let weightedSum = 0;
        
        Object.entries(themeIndicators).forEach(([key, config]) => {
            const dataKey = config.dataKey;
            const indicator = themeData[dataKey];
            
            if (indicator && indicator.value !== null && indicator.percentiles) {
                // Get continuous position in distribution (-1 to +1)
                const continuousValue = this.calculateContinuousPosition(
                    indicator.value, 
                    indicator.percentiles
                );
                
                // Apply inverted logic if needed (e.g., put/call ratio)
                const adjustedValue = config.inverted ? -continuousValue : continuousValue;
                
                // Weight by temporal classification
                const weight = temporalWeights[config.temporal] * config.weight;
                weightedSum += adjustedValue * weight;
                totalWeight += weight;
            }
        });
        
        if (totalWeight === 0) {
            return 0; // Neutral if no data
        }
        
        return weightedSum / totalWeight; // Returns value between -1 and +1
    },

    // Calculate continuous position in distribution - UTILITY (PRESERVED)
    calculateContinuousPosition: function(value, percentiles) {
        if (!percentiles) return 0;
        
        // Map to continuous -1 to +1 scale based on percentile position
        // This preserves more information than discrete states
        
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

    // Determine discrete theme state from continuous value - CORE CALCULATION (PRESERVED)
    getThemeState: function(continuousValue) {
        if (continuousValue <= -0.33) return -1;
        if (continuousValue >= 0.33) return 1;
        return 0;
    },

    // Calculate current scenario (1-81) - CORE CALCULATION (PRESERVED)
    calculateCurrentScenario: function(themeValues) {
        // Convert continuous theme values to discrete states
        const states = {
            usd: this.getThemeState(themeValues.usd),
            innovation: this.getThemeState(themeValues.innovation),
            pe: this.getThemeState(themeValues.pe),
            usLeadership: this.getThemeState(themeValues.usLeadership)
        };
        
        // Convert to scenario number (1-81)
        // Using base-3 encoding: USD*27 + Innovation*9 + PE*3 + USLeadership
        const scenarioIndex = 
            (states.usd + 1) * 27 +
            (states.innovation + 1) * 9 +
            (states.pe + 1) * 3 +
            (states.usLeadership + 1);
        
        return {
            scenarioNumber: scenarioIndex + 1, // 1-81 instead of 0-80
            states: states,
            notation: `[${states.usd}, ${states.innovation}, ${states.pe}, ${states.usLeadership}]`
        };
    },

    // Validate indicator data structure - UTILITY (PRESERVED)
    validateIndicatorData: function(data) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: [],
            coverage: {}
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
                const dataKey = config.dataKey;
                const indicator = data.indicators[dataKey];
                
                if (!indicator) {
                    validation.warnings.push(`Missing indicator: ${config.name} (${dataKey})`);
                    validation.coverage[theme][key] = 'missing';
                } else if (indicator.value === null || indicator.value === undefined) {
                    validation.warnings.push(`No value for: ${config.name}`);
                    validation.coverage[theme][key] = 'no_value';
                } else if (!indicator.percentiles) {
                    validation.warnings.push(`No percentiles for: ${config.name}`);
                    validation.coverage[theme][key] = 'no_percentiles';
                } else {
                    validation.coverage[theme][key] = 'ok';
                }
            });
        });

        // Check temporal balance
        const temporalCounts = { leading: 0, concurrent: 0, lagging: 0 };
        this.getAllIndicators().forEach(ind => {
            if (validation.coverage[ind.theme][ind.key] === 'ok') {
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

    // Get indicator summary for reporting - REPORTING (PRESERVED)
    getIndicatorSummary: function(data) {
        const validation = this.validateIndicatorData(data);
        const themes = Object.keys(this.definitions);
        
        const summary = {
            totalIndicators: 12,
            availableIndicators: 0,
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
        const maxTemporal = Math.max(...Object.values(summary.temporal));
        if (minTemporal >= 3) summary.balance = 'excellent';
        else if (minTemporal >= 2) summary.balance = 'good';
        else if (minTemporal >= 1) summary.balance = 'fair';
        else summary.balance = 'poor';

        return summary;
    },

    // Get theme display names - UTILITY (PRESERVED)
    getThemeDisplayNames: function() {
        return {
            usd: 'USD Reserve Status',
            innovation: 'Innovation Environment',
            pe: 'P/E Valuation',
            usLeadership: 'US Market Leadership'
        };
    },

    // Map state to description - UTILITY (PRESERVED)
    getStateDescription: function(state) {
        const descriptions = {
            '-1': 'Weak/Low',
            '0': 'Neutral',
            '1': 'Strong/High'
        };
        return descriptions[state.toString()] || 'Unknown';
    },

    // Generate scenario description - REPORTING (PRESERVED)
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

    // NEW v2.1: Get minimum data availability across all indicators
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

    // NEW v2.1: Validate configuration for IPS v4.1 compliance
    validateConfiguration: function() {
        const minData = this.getMinimumDataAvailability();
        console.log("Indicators v2.1 Configuration Validation");
        console.log("=" + "=".repeat(50));
        console.log(`  Framework: IPS v4.1 Extended History`);
        console.log(`  Innovation Indicator: QQQ/SPY (${1999} start)`);
        console.log(`  US Leadership Indicator: SPY/EFA (${2001} start)`);
        console.log(`  Minimum Data: ${minData.years} years (${minData.constraintIndicator})`);
        console.log(`  All indicators support 15-year GARCH lookback`);
        return minData.years >= 15;
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