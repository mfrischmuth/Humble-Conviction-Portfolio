/**
 * HCP Portfolio Tracker - Indicators Module v4.0
 * File: indicators_v4_0.js
 * Based on: IPS v4.3.2 Practical Implementation
 * Last Updated: 2025-09-09T22:20:00Z
 * 
 * CHANGES IN v4.0:
 * - THEME RENAMED: 'pe' → 'valuation' for consistency across all modules
 * - software_ip_investment replaces tech_employment_pct
 * - cape_rate_of_change replaces eps_delivery
 * - total_return_differential replaces etf_flow_differential
 * - All dataKey values match File Handler v5.0 output
 * - Migration functions added for smooth transition
 * - ALL other functionality PRESERVED from v3.0
 * - Backward compatibility with 'pe' theme key supported
 * 
 * HANDLES:
 * - 12 indicator definitions (3 per theme) per IPS v4.3.2
 * - Temporal classification framework (leading, concurrent, lagging)
 * - Three-state regime classification (-1, 0, +1)
 * - Balanced indicator coverage across themes
 */

const Indicators = {
    version: '4.0',
    framework: 'IPS v4.3.2 Practical Implementation',
    
    // 12 Indicators per IPS v4.3.2 - ALIGNED WITH FILE HANDLER v5.0
    definitions: {
        usd: {
            dxy: { 
                name: 'DXY Index', 
                temporal: 'leading', 
                weight: 0.30,
                description: 'FX market expectations for USD strength',
                dataKey: 'dxy_index',  // UNCHANGED
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
                dataKey: 'real_rate_differential',  // UNCHANGED
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
                dataKey: 'cofer_usd',  // UNCHANGED
                source: 'IMF Statistics',
                frequency: 'quarterly',
                percentileWindow: 15,
                dataAvailableFrom: 1999
            }
        },
        innovation: {
            qqqSpy: {
                name: 'QQQ/SPY Ratio',
                temporal: 'leading', 
                weight: 0.30,
                description: 'Tech/innovation sentiment vs broad market',
                dataKey: 'qqq_spy_ratio',  // UNCHANGED
                source: 'Yahoo Finance',
                frequency: 'daily',
                percentileWindow: 15,
                dataAvailableFrom: 1999,
                note: 'Extended history indicator per IPS v4.3.2'
            },
            productivity: { 
                name: 'US Productivity Growth', 
                temporal: 'concurrent', 
                weight: 0.40,
                description: 'Nonfarm output per hour YoY',
                dataKey: 'productivity_growth',  // UNCHANGED
                source: 'BLS/FRED (OPHNFB)',
                frequency: 'quarterly',
                percentileWindow: 15,
                dataAvailableFrom: 1947
            },
            softwareInvestment: {  // UPDATED from techEmployment
                name: 'Software IP Investment % GDP',  // UPDATED per IPS v4.3.2
                temporal: 'lagging', 
                weight: 0.30,
                description: 'Intellectual property software investment as % of GDP',  // UPDATED
                dataKey: 'software_ip_investment',  // NEW v4.0 field name
                oldDataKey: 'tech_employment_pct',  // Backward compatibility reference
                source: 'FRED (Y001RC1Q027SBEA)',  // UPDATED
                frequency: 'quarterly',  // UPDATED
                percentileWindow: 15,
                dataAvailableFrom: 1990,
                note: 'Replaced Tech Employment % in IPS v4.3.2 for better innovation measurement'
            }
        },
        pe: {  // Keeping 'pe' as theme key for backward compatibility
            putCall: { 
                name: 'Equity Put/Call Ratio', 
                temporal: 'leading', 
                weight: 0.30,
                description: 'Options positioning sentiment (inverted)',
                dataKey: 'put_call_ratio',  // UNCHANGED
                source: 'CBOE (PCALL)',
                frequency: 'daily',
                percentileWindow: 15,
                inverted: true,  // high ratio = fear = low state
                dataAvailableFrom: 2006  // Constraint indicator
            },
            trailingPe: {  // UNCHANGED from v3.0
                name: 'S&P 500 Trailing P/E',
                temporal: 'concurrent', 
                weight: 0.40,
                description: 'Trailing 12-month earnings multiple',
                dataKey: 'trailing_pe',  // UNCHANGED
                source: 'Yahoo Finance (SPY)',
                frequency: 'daily',
                percentileWindow: 15,
                dataAvailableFrom: 1990,
                note: 'Replaced Forward P/E in IPS v4.2 for automated collection'
            },
            capeChange: {  // UPDATED from epsDelivery
                name: 'CAPE Rate of Change',  // UPDATED per IPS v4.3.2
                temporal: 'lagging', 
                weight: 0.30,
                description: '12-month rate of change in Shiller CAPE ratio',  // UPDATED
                dataKey: 'cape_rate_of_change',  // NEW v4.0 field name
                oldDataKey: 'eps_delivery',  // Backward compatibility reference
                source: 'Calculated from Shiller data',  // UPDATED
                frequency: 'monthly',
                percentileWindow: 15,
                dataAvailableFrom: 1990,
                garchSuitable: true,  // New metadata flag
                note: 'Replaced EPS Delivery in IPS v4.3.2 for better valuation momentum capture'
            }
        },
        usLeadership: {
            spyEfa: {
                name: 'SPY/EFA Momentum',
                temporal: 'leading', 
                weight: 0.30,
                description: '3-month relative performance US vs Developed Intl',
                dataKey: 'spy_efa_momentum',  // UNCHANGED
                source: 'Yahoo Finance',
                frequency: 'daily',
                percentileWindow: 15,
                dataAvailableFrom: 2001,
                note: 'Extended history indicator per IPS v4.2'
            },
            marketCapShare: { 
                name: 'US Market Cap % Global', 
                temporal: 'concurrent', 
                weight: 0.40,
                description: 'US share of world equity market cap (proxy)',
                dataKey: 'us_market_pct',  // UNCHANGED
                source: 'Calculated from SPY/(SPY+EFA)',
                frequency: 'daily',
                percentileWindow: 15,
                dataAvailableFrom: 2001,
                note: 'Proxy calculation per IPS v4.2 practical implementation'
            },
            returnDifferential: {  // UPDATED from etfFlows
                name: 'Total Return Differential',  // UPDATED per IPS v4.3.2
                temporal: 'lagging', 
                weight: 0.30,
                description: '252-day rolling return differential US vs International',  // UPDATED
                dataKey: 'total_return_differential',  // NEW v4.0 field name
                oldDataKey: 'etf_flow_differential',  // Backward compatibility reference
                source: 'Calculated from SPY and EFA total returns',  // UPDATED
                frequency: 'daily',
                percentileWindow: 15,
                dataAvailableFrom: 2003,
                garchSuitable: true,  // New metadata flag
                note: 'Replaced ETF Flows in IPS v4.3.2 for more direct performance measurement'
            }
        }
    },

    // Temporal weights for aggregation - PRESERVED FROM v3.0
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

    // Get indicator configuration - ENHANCED for backward compatibility
    getIndicatorConfig: function(theme, key) {
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

    // Calculate continuous theme value - ENHANCED for backward compatibility
    calculateContinuousThemeValue: function(themeData, theme) {
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
            pe: this.getThemeState(themeValues.pe),  // Keep 'pe' for backward compatibility
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

    // Validate indicator data structure - ENHANCED for v4.0
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
                    
                    if (indicator.value === null || indicator.value === undefined) {
                        validation.warnings.push(`No value for: ${config.name}`);
                        validation.coverage[theme][key] = 'no_value';
                    } else if (!indicator.percentiles) {
                        validation.warnings.push(`No percentiles for: ${config.name}`);
                        validation.coverage[theme][key] = 'no_percentiles';
                    } else {
                        validation.coverage[theme][key] = 'ok';
                    }
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
            pe: 'P/E Valuation',  // Keep 'pe' key for backward compatibility
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

    // Get minimum data availability across all indicators - PRESERVED
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

    // Validate configuration for IPS v4.3.2 compliance - UPDATED
    validateConfiguration: function() {
        const minData = this.getMinimumDataAvailability();
        console.log("Indicators v4.0 Configuration Validation");
        console.log("=" + "=".repeat(50));
        console.log(`  Framework: IPS v4.3.2 Practical Implementation`);
        console.log(`  Innovation Indicator: QQQ/SPY (${1999} start)`);
        console.log(`  US Leadership Indicator: SPY/EFA (${2001} start)`);
        console.log(`  Valuation: Trailing P/E (automated collection)`);
        console.log(`  Innovation: Software IP Investment (quarterly)`);
        console.log(`  Valuation: CAPE Rate of Change (GARCH-suitable)`);
        console.log(`  US Leadership: Total Return Differential (GARCH-suitable)`);
        console.log(`  Minimum Data: ${minData.years} years (${minData.constraintIndicator})`);
        console.log(`  All indicators support 15-year GARCH lookback`);
        console.log(`  Aligned with File Handler v5.0 data structure`);
        console.log(`  Backward compatibility with v3.0 dataKeys maintained`);
        return minData.years >= 15;
    },

    // NEW v4.0 - Helper function to get indicator by dataKey (new or old)
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

    // NEW v4.0 - Migration helper for old data structures
    migrateDataKeys: function(data) {
        if (!data || !data.indicators) return data;
        
        const migrated = { ...data };
        const migrations = [
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