/**
 * HCP Portfolio Tracker - Indicators Module v1.0
 * File: indicators_v1_0.js
 * Extracted from: v6.3.1 (13 indicators, three-tier framework)
 * Last Updated: 2025-08-29 18:15:00 UTC
 * 
 * HANDLES:
 * - 13 indicator definitions per IPS v3.9
 * - Three-tier framework (canary, primary, structural)
 * - Indicator metadata and configuration
 * - Theme organization
 */

const Indicators = {
    version: '1.0',
    
    // 13 Indicators per IPS v3.9 - STABLE DEFINITION
    definitions: {
        usd: {
            dxy: { 
                name: 'DXY Index', 
                tier: 'canary', 
                weight: 0.35, 
                trigger: 'MA',
                description: 'USD strength vs major currencies',
                dataKey: 'dxy'
            },
            gold: { 
                name: 'Central Bank Gold Holdings', 
                tier: 'structural', 
                weight: 0.20, 
                trigger: 'MA',
                description: 'Total central bank gold reserves',
                dataKey: 'goldHoldings'
            },
            yuanSwift: { 
                name: 'Yuan SWIFT Share', 
                tier: 'primary', 
                weight: 0.25, 
                trigger: 'MA',
                description: 'Chinese Yuan share of SWIFT transactions',
                dataKey: 'yuanSwiftShare'
            },
            reserveShare: { 
                name: 'USD Reserve Share', 
                tier: 'structural', 
                weight: 0.20, 
                trigger: 'YoY',
                description: 'USD share of global foreign exchange reserves',
                dataKey: 'reserveShare'
            }
        },
        innovation: {
            qqqSpy: { 
                name: 'QQQ/SPY Ratio', 
                tier: 'canary', 
                weight: 0.40, 
                trigger: 'MA',
                description: 'Technology vs broad market performance',
                dataKey: 'qqqSpyRatio'
            },
            productivity: { 
                name: 'Labor Productivity', 
                tier: 'structural', 
                weight: 0.30, 
                trigger: 'YoY',
                description: 'Output per hour worked',
                dataKey: 'productivity'
            },
            netMargins: { 
                name: 'S&P 500 Net Margins', 
                tier: 'primary', 
                weight: 0.30, 
                trigger: 'YoY',
                description: 'Corporate profit margins',
                dataKey: 'netMargins'
            }
        },
        pe: {
            forwardPe: { 
                name: 'S&P 500 Forward P/E', 
                tier: 'canary', 
                weight: 0.40, 
                trigger: 'MA',
                description: 'Forward-looking price-to-earnings ratio',
                dataKey: 'forwardPE'
            },
            cape: { 
                name: 'CAPE Ratio', 
                tier: 'structural', 
                weight: 0.35, 
                trigger: 'MA',
                description: 'Cyclically adjusted price-to-earnings ratio',
                dataKey: 'cape'
            },
            riskPremium: { 
                name: 'Risk Premium', 
                tier: 'primary', 
                weight: 0.25, 
                trigger: 'MA',
                description: 'Earnings yield minus 10-year treasury yield',
                dataKey: 'riskPremium'
            }
        },
        international: {
            spVsWorld: { 
                name: 'S&P 500 vs World', 
                tier: 'canary', 
                weight: 0.35, 
                trigger: 'MA',
                description: 'US vs international market performance',
                dataKey: 'spVsWorld'
            },
            usAcwi: { 
                name: 'US % of ACWI', 
                tier: 'structural', 
                weight: 0.30, 
                trigger: 'MA',
                description: 'US market capitalization as % of world',
                dataKey: 'usPercentACWI'
            },
            ticFlows: { 
                name: 'TIC Flows', 
                tier: 'primary', 
                weight: 0.35, 
                trigger: 'MA',
                description: 'Foreign investment flows into US',
                dataKey: 'ticFlows'
            }
        }
    },

    // Get all indicators as flat list - UTILITY
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

    // Get indicators by tier - UTILITY
    getIndicatorsByTier: function(tier) {
        return this.getAllIndicators().filter(indicator => indicator.tier === tier);
    },

    // Get indicators by theme - UTILITY
    getIndicatorsByTheme: function(theme) {
        return this.definitions[theme] || {};
    },

    // Get indicator configuration - UTILITY
    getIndicatorConfig: function(theme, key) {
        return this.definitions[theme]?.[key] || null;
    },

    // Validate indicator structure - UTILITY
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
                } else if (indicator.current === null || indicator.current === undefined) {
                    validation.warnings.push(`No current value for: ${config.name}`);
                    validation.coverage[theme][key] = 'no_value';
                } else {
                    validation.coverage[theme][key] = 'ok';
                }
            });
        });

        return validation;
    },

    // Get tier weights - CONFIGURATION
    getTierWeights: function() {
        return {
            canary: 0.5,      // Quick signals
            primary: 0.3,     // Core indicators  
            structural: 0.2   // Long-term trends
        };
    },

    // Get theme weights - CONFIGURATION
    getThemeWeights: function() {
        return {
            usd: 0.30,
            innovation: 0.25,
            pe: 0.25,
            international: 0.20
        };
    },

    // Calculate theme probability - CORE CALCULATION
    calculateThemeProbability: function(themeData, theme) {
        const themeIndicators = this.getIndicatorsByTheme(theme);
        const tierWeights = this.getTierWeights();
        
        let totalWeight = 0;
        let weightedSum = 0;
        
        Object.entries(themeIndicators).forEach(([key, config]) => {
            const dataKey = config.dataKey;
            const indicator = themeData[dataKey];
            
            if (indicator && indicator.current !== null) {
                // Simple momentum calculation (placeholder)
                // In full implementation, this would use moving averages
                const momentum = this.calculateIndicatorMomentum(indicator, config.trigger);
                const tierWeight = tierWeights[config.tier] || 1.0;
                const indicatorWeight = config.weight;
                
                const weight = tierWeight * indicatorWeight;
                weightedSum += momentum * weight;
                totalWeight += weight;
            }
        });
        
        if (totalWeight === 0) {
            return { probability: 0.5, confidence: 'low', dataQuality: 'insufficient' };
        }
        
        const probability = Math.max(0, Math.min(1, (weightedSum / totalWeight + 1) / 2));
        const confidence = totalWeight > 0.8 ? 'high' : (totalWeight > 0.5 ? 'medium' : 'low');
        
        return { 
            probability: probability, 
            confidence: confidence,
            dataQuality: 'good',
            weightUsed: totalWeight
        };
    },

    // Calculate indicator momentum - PLACEHOLDER
    calculateIndicatorMomentum: function(indicator, trigger) {
        // This is a simplified placeholder
        // Full implementation would use proper moving average calculations
        if (!indicator.history || indicator.history.length < 2) {
            return 0; // Neutral if no history
        }
        
        const current = indicator.current;
        const previous = indicator.history[indicator.history.length - 1];
        
        if (!current || !previous || previous === 0) {
            return 0;
        }
        
        // Simple momentum: (current - previous) / previous
        // Normalize to roughly [-1, 1] range
        const change = (current - previous) / Math.abs(previous);
        return Math.max(-1, Math.min(1, change * 10)); // Scale factor
    },

    // Get indicator summary - REPORTING
    getIndicatorSummary: function(data) {
        const validation = this.validateIndicatorData(data);
        const themes = Object.keys(this.definitions);
        
        const summary = {
            totalIndicators: 13,
            availableIndicators: 0,
            themes: {},
            tiers: { canary: 0, primary: 0, structural: 0 },
            overallHealth: 'unknown'
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

        // Count by tier
        this.getAllIndicators().forEach(indicator => {
            if (data && data.indicators && data.indicators[indicator.dataKey]) {
                summary.tiers[indicator.tier]++;
            }
        });

        // Overall health assessment
        const overallPercentage = (summary.availableIndicators / summary.totalIndicators) * 100;
        if (overallPercentage >= 85) summary.overallHealth = 'excellent';
        else if (overallPercentage >= 70) summary.overallHealth = 'good';
        else if (overallPercentage >= 50) summary.overallHealth = 'fair';
        else summary.overallHealth = 'poor';

        return summary;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Indicators;
}