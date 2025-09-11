/**
 * HCP Portfolio Tracker - Theme Calculator Module v2.10
 * File: theme_calculator_v2_10.js
 * Based on: v2.9 COMPLETE + Step 4 Display Enhancements
 * Last Updated: 2025-09-02 23:15:00 UTC
 * 
 * CRITICAL IN v2.10: ALL v2.9 FUNCTIONALITY PRESERVED
 * - Complete IPS v3.10 Enhanced Transition Probability Framework
 * - All 13 indicator specifications with full configuration
 * - Dual algorithm (signal strength vs time-to-trigger)
 * - Complete momentum and MA calculations
 * - Full validation and error handling
 * 
 * NEW ADDITIONS IN v2.10 (Step 4 Display Fixes):
 * - getCurrentScenario() function for current scenario identification
 * - Corrected getScenarioColorClass() with proper probability ranges
 * - Enhanced displayScenarioMatrix() with binary order and highlighting
 * - Current scenario visual identification with blue border
 * - Summary section showing both current and most likely scenarios
 */

const ThemeCalculator = {
    version: '2.10',
    framework: 'IPS v3.10 Appendix H with Step 4 Display Enhancements',
    lastUpdated: '2025-09-02T23:15:00.000Z',
    
    // IPS v3.10 Indicator Specifications - COMPLETE FROM v2.9
    indicatorSpecs: {
        // USD Theme (4 indicators) - Complete specification
        usd: {
            dxy: {
                dataKey: 'dxy',
                name: 'DXY Index',
                method: 'ma_comparison',
                short_ma: 200,
                long_ma: 400,
                trigger_condition: 'short_below_long',
                tier: 'canary',
                weight: 0.30,
                description: 'Dollar strength vs major currencies'
            },
            reserves: {
                dataKey: 'reserve_share',
                name: 'USD Reserve Share',
                method: 'fixed_threshold',
                threshold: -0.005,
                tier: 'structural',
                weight: 0.25,
                description: 'Global central bank USD reserves'
            },
            yuan: {
                dataKey: 'yuan_swift',
                name: 'Yuan SWIFT Share',
                method: 'ma_comparison',
                short_ma: 12,
                long_ma: 36,
                trigger_condition: 'short_above_long',
                tier: 'primary',
                weight: 0.25,
                description: 'Chinese yuan payment system usage'
            },
            gold: {
                dataKey: 'gold_purchases',
                name: 'Central Bank Gold',
                method: 'ma_comparison',
                short_ma: 4,
                long_ma: 12,
                trigger_condition: 'short_above_long',
                tier: 'structural',
                weight: 0.20,
                description: 'Central bank gold accumulation'
            }
        },
        
        // Innovation Theme (3 indicators) - AI Productivity Boom
        innovation: {
            productivity: {
                dataKey: 'productivity',
                name: 'Productivity Growth',
                method: 'ma_comparison',
                short_ma: 2,
                long_ma: 6,
                trigger_condition: 'short_above_long',
                tier: 'structural',
                weight: 0.40,
                calibrated: true,
                trigger_rate: 0.477,
                description: 'Labor productivity acceleration'
            },
            qqqSpy: {
                dataKey: 'qqq_spy',
                name: 'QQQ/SPY Ratio',
                method: 'ma_comparison',
                short_ma: 50,
                long_ma: 200,
                trigger_condition: 'short_above_long',
                tier: 'canary',
                weight: 0.35,
                description: 'Tech vs broad market performance'
            },
            margins: {
                dataKey: 'net_margins',
                name: 'S&P Net Margins',
                method: 'threshold_vs_ma',
                ma_period: 36,
                threshold_offset: 0.005,
                tier: 'primary',
                weight: 0.25,
                description: 'Corporate profitability expansion'
            }
        },
        
        // P/E Mean Reversion Theme (3 indicators)
        pe: {
            forwardPE: {
                dataKey: 'forward_pe',
                name: 'Forward P/E',
                method: 'ma_comparison',
                short_ma: 12,
                long_ma: 36,
                trigger_condition: 'short_above_long',
                tier: 'primary',
                weight: 0.40,
                calibrated: true,
                trigger_rate: 0.494,
                description: 'Forward earnings valuation'
            },
            cape: {
                dataKey: 'cape',
                name: 'Shiller CAPE',
                method: 'vs_long_ma',
                ma_period: 240,
                trigger_condition: 'current_above_ma',
                tier: 'primary',
                weight: 0.35,
                description: 'Cyclically adjusted P/E ratio'
            },
            riskPremium: {
                dataKey: 'risk_premium',
                name: 'Equity Risk Premium',
                method: 'ma_comparison',
                short_ma: 6,
                long_ma: 18,
                trigger_condition: 'short_below_long',
                tier: 'canary',
                weight: 0.25,
                description: 'Equity vs bond yield spread'
            }
        },
        
        // International Theme (3 indicators)
        intl: {
            acwxSpy: {
                dataKey: 'acwx_spy',
                name: 'ACWX/SPY Relative',
                method: 'ma_comparison',
                short_ma: 30,
                long_ma: 90,
                trigger_condition: 'short_above_long',
                tier: 'canary',
                weight: 0.30,
                description: 'International vs US equity performance'
            },
            spWorld: {
                dataKey: 'sp_vs_world',
                name: 'S&P vs MSCI World',
                method: 'relative_performance',
                period: 6,
                threshold: -0.02,
                tier: 'primary',
                weight: 0.35,
                description: 'US vs global market performance'
            },
            ticFlows: {
                dataKey: 'tic_flows',
                name: 'TIC Net Flows',
                method: 'fixed_threshold',
                threshold: 0,
                tier: 'structural',
                weight: 0.35,
                description: 'Foreign investment in US securities'
            }
        }
    },

    /**
     * Enhanced indicator search in FileHandler v1.4 nested structure - FROM v2.9
     */
    findIndicatorInThemes: function(dataIndicators, dataKey) {
        for (const themeName in dataIndicators) {
            const themeData = dataIndicators[themeName];
            if (themeData && typeof themeData === 'object' && themeData[dataKey]) {
                return themeData[dataKey];
            }
        }
        console.warn(`Indicator '${dataKey}' not found in any theme data`);
        return null;
    },

    /**
     * IPS v3.10 Enhanced Transition Probability Calculation - COMPLETE FROM v2.9
     */
    calculateEnhancedTransitionProbability: function(indicator, spec) {
        try {
            if (!indicator || indicator.current === null || indicator.current === undefined) {
                console.warn(`Missing current value for ${spec.name}`);
                return 0.15;
            }

            if (!indicator.history || indicator.history.length < Math.max(spec.short_ma || 0, spec.long_ma || 0)) {
                console.warn(`Insufficient history for ${spec.name}`);
                return 0.15;
            }
            
            const currentState = this.getCurrentState(indicator, spec);
            const momentum = this.calculateMomentum(indicator);
            const distanceToTrigger = this.calculateDistanceToTrigger(indicator, spec);
            
            let finalProbability;
            
            if (currentState === 'triggered') {
                finalProbability = this.calculateSignalStrength(distanceToTrigger, momentum, spec);
            } else {
                const monthsToTrigger = this.estimateTimeToTrigger(distanceToTrigger, momentum);
                finalProbability = this.timeBasedProbability(monthsToTrigger, momentum);
            }
            
            const result = Math.max(0.05, Math.min(0.95, finalProbability));
            
            if (spec.calibrated) {
                console.log(`${spec.name}: state=${currentState}, momentum=${momentum.toFixed(2)}, distance=${(distanceToTrigger*100).toFixed(1)}%, prob=${(result*100).toFixed(1)}%`);
            }
            
            return result;
            
        } catch (error) {
            console.error(`Error calculating probability for ${spec.name}:`, error);
            return 0.15;
        }
    },

    /**
     * Calculate signal strength for already-triggered indicators - FROM v2.9
     */
    calculateSignalStrength: function(distanceToTrigger, momentum, spec) {
        let baseProbability = 0.70;
        const distanceBonus = Math.min(0.30, Math.abs(distanceToTrigger) * 3);
        
        let momentumBoost = 0;
        if (this.isMomentumFavorable(momentum, distanceToTrigger, true)) {
            momentumBoost = Math.abs(momentum) * 0.25;
        } else {
            momentumBoost = -Math.abs(momentum) * 0.15;
        }
        
        const result = Math.max(0.15, Math.min(0.90, baseProbability + distanceBonus + momentumBoost));
        
        console.log(`Signal strength calc: base=${baseProbability}, distance=${distanceToTrigger.toFixed(3)}, distanceBonus=${distanceBonus.toFixed(3)}, momentum=${momentum.toFixed(2)}, momentumBoost=${momentumBoost.toFixed(3)}, final=${result.toFixed(3)}`);
        
        return result;
    },

    /**
     * Traditional time-based probability for non-triggered indicators - FROM v2.9
     */
    timeBasedProbability: function(monthsToTrigger, momentum) {
        let baseProbability;
        if (monthsToTrigger < 3) {
            baseProbability = 0.70;
        } else if (monthsToTrigger < 6) {
            baseProbability = 0.40;
        } else if (monthsToTrigger < 12) {
            baseProbability = 0.20;
        } else if (monthsToTrigger < 24) {
            baseProbability = 0.10;
        } else {
            baseProbability = 0.05;
        }
        
        if (momentum > 0) {
            return baseProbability;
        } else {
            return baseProbability * 0.3;
        }
    },

    /**
     * Check if momentum is favorable for the current state - FROM v2.9
     */
    isMomentumFavorable: function(momentum, distanceToTrigger, isTriggered) {
        if (isTriggered) {
            return momentum > 0;
        } else {
            return (distanceToTrigger > 0 && momentum < 0) || (distanceToTrigger < 0 && momentum > 0);
        }
    },

    /**
     * Determine current state with improved trigger detection - FROM v2.9
     */
    getCurrentState: function(indicator, spec) {
        if (!indicator || indicator.current === null || indicator.current === undefined) {
            return 'unknown';
        }
        
        try {
            switch (spec.method) {
                case 'ma_comparison':
                    return this.calculateMAComparison(indicator, spec);
                    
                case 'fixed_threshold':
                    const thresholdResult = indicator.current > spec.threshold ? 'triggered' : 'not_triggered';
                    console.log(`Fixed threshold ${spec.name}: current=${indicator.current}, threshold=${spec.threshold}, result=${thresholdResult}`);
                    return thresholdResult;
                    
                case 'threshold_vs_ma':
                    const ma = this.calculateMovingAverage(indicator.history, spec.ma_period);
                    if (!ma) return 'unknown';
                    const thresholdVsMaResult = indicator.current > (ma + spec.threshold_offset) ? 'triggered' : 'not_triggered';
                    console.log(`Threshold vs MA ${spec.name}: current=${indicator.current}, ma=${ma.toFixed(2)}, threshold_offset=${spec.threshold_offset}, result=${thresholdVsMaResult}`);
                    return thresholdVsMaResult;
                    
                case 'vs_long_ma':
                    const longMA = this.calculateMovingAverage(indicator.history, spec.ma_period);
                    if (!longMA) return 'unknown';
                    const vsLongMaResult = indicator.current > longMA ? 'triggered' : 'not_triggered';
                    console.log(`Vs long MA ${spec.name}: current=${indicator.current}, longMA=${longMA.toFixed(2)}, result=${vsLongMaResult}`);
                    return vsLongMaResult;
                    
                case 'relative_performance':
                    if (!spec.threshold) {
                        return 'triggered';
                    }
                    const relPerfResult = indicator.current < spec.threshold ? 'triggered' : 'not_triggered';
                    console.log(`Relative performance ${spec.name}: current=${indicator.current}, threshold=${spec.threshold}, result=${relPerfResult}`);
                    return relPerfResult;
                    
                default:
                    console.warn(`Unknown calculation method: ${spec.method}`);
                    return 'unknown';
            }
        } catch (error) {
            console.error(`Error determining current state for ${spec.name}:`, error);
            return 'unknown';
        }
    },

    /**
     * Calculate MA comparison with validation - FROM v2.9
     */
    calculateMAComparison: function(indicator, spec) {
        if (!indicator.history || indicator.history.length < spec.long_ma) {
            return 'insufficient_data';
        }
        
        try {
            const shortMA = this.calculateMovingAverage(
                indicator.history.slice(-spec.short_ma), 
                spec.short_ma
            );
            const longMA = this.calculateMovingAverage(
                indicator.history.slice(-spec.long_ma), 
                spec.long_ma
            );
            
            if (shortMA === null || longMA === null) {
                return 'calculation_error';
            }
            
            switch (spec.trigger_condition) {
                case 'short_above_long':
                    return shortMA > longMA ? 'triggered' : 'not_triggered';
                case 'short_below_long':
                    return shortMA < longMA ? 'triggered' : 'not_triggered';
                default:
                    return 'unknown_condition';
            }
        } catch (error) {
            console.error(`MA comparison error for ${spec.name}:`, error);
            return 'calculation_error';
        }
    },

    /**
     * Calculate moving average with validation - FROM v2.9
     */
    calculateMovingAverage: function(data, periods) {
        if (!data || !Array.isArray(data) || data.length < periods || periods <= 0) {
            return null;
        }
        
        try {
            const recentData = data.slice(-periods);
            const validData = recentData.filter(val => val !== null && val !== undefined && !isNaN(val));
            
            if (validData.length < periods * 0.8) {
                return null;
            }
            
            const sum = validData.reduce((acc, val) => acc + val, 0);
            return sum / validData.length;
        } catch (error) {
            console.error('Moving average calculation error:', error);
            return null;
        }
    },

    /**
     * Calculate momentum using IPS v3.10 methodology - FROM v2.9
     */
    calculateMomentum: function(indicator) {
        if (!indicator.history || indicator.history.length < 6) {
            return 0;
        }
        
        try {
            const current = indicator.current;
            const sixMonthsAgo = indicator.history[indicator.history.length - 6];
            
            if (sixMonthsAgo === 0 || sixMonthsAgo === null || sixMonthsAgo === undefined) {
                return 0;
            }
            
            const percentChange = (current - sixMonthsAgo) / Math.abs(sixMonthsAgo);
            
            const recentData = indicator.history.slice(-6);
            let positiveChanges = 0;
            
            for (let i = 1; i < recentData.length; i++) {
                if (recentData[i] > recentData[i-1]) positiveChanges++;
            }
            
            const trendConsistency = Math.abs((positiveChanges / 5) - 0.5) * 2;
            
            let momentum = percentChange * trendConsistency;
            return Math.max(-1, Math.min(1, momentum));
        } catch (error) {
            console.error('Momentum calculation error:', error);
            return 0;
        }
    },

    /**
     * Calculate distance to trigger as percentage - FROM v2.9
     */
    calculateDistanceToTrigger: function(indicator, spec) {
        if (!indicator || indicator.current === null || indicator.current === undefined) {
            return 0;
        }
        
        try {
            let triggerValue;
            
            switch (spec.method) {
                case 'ma_comparison':
                    const shortMA = this.calculateMovingAverage(
                        indicator.history.slice(-spec.short_ma), 
                        spec.short_ma
                    );
                    const longMA = this.calculateMovingAverage(
                        indicator.history.slice(-spec.long_ma), 
                        spec.long_ma
                    );
                    
                    if (!shortMA || !longMA) return 0;
                    
                    return (shortMA - longMA) / longMA;
                    
                case 'fixed_threshold':
                    triggerValue = spec.threshold;
                    return (indicator.current - triggerValue) / Math.abs(triggerValue || 1);
                    
                case 'threshold_vs_ma':
                    const ma = this.calculateMovingAverage(indicator.history, spec.ma_period);
                    if (!ma) return 0;
                    triggerValue = ma + spec.threshold_offset;
                    return (indicator.current - triggerValue) / triggerValue;
                    
                case 'vs_long_ma':
                    triggerValue = this.calculateMovingAverage(indicator.history, spec.ma_period);
                    if (!triggerValue) return 0;
                    return (indicator.current - triggerValue) / triggerValue;
                    
                default:
                    return 0;
            }
        } catch (error) {
            console.error('Distance calculation error:', error);
            return 0;
        }
    },

    /**
     * Physics-based time-to-trigger estimation - FROM v2.9
     */
    estimateTimeToTrigger: function(distanceToTrigger, momentum) {
        if (Math.abs(momentum) <= 0.01) {
            return 999;
        }
        
        const monthlyChangeRate = Math.abs(momentum) * 0.02;
        const monthsToTrigger = Math.abs(distanceToTrigger) / monthlyChangeRate;
        
        return Math.max(0, monthsToTrigger);
    },

    /**
     * Check if momentum is moving toward trigger - FROM v2.9
     */
    isMovingTowardTrigger: function(distanceToTrigger, momentum) {
        return (distanceToTrigger > 0 && momentum < 0) || 
               (distanceToTrigger < 0 && momentum > 0);
    },

    /**
     * Calculate theme probability using IPS v3.10 methodology - FROM v2.9 WITH FIXES
     */
    calculateThemeProbability: function(dataIndicators, themeName) {
        const indicatorSpecs = this.indicatorSpecs[themeName];
        if (!indicatorSpecs) {
            console.error(`No indicator specs found for theme: ${themeName}`);
            return 0.15;
        }
        
        let weightedProbabilities = [];
        let totalWeight = 0;
        let foundIndicators = 0;
        let missingIndicators = [];
        
        Object.keys(indicatorSpecs).forEach(key => {
            const spec = indicatorSpecs[key];
            const indicator = this.findIndicatorInThemes(dataIndicators, spec.dataKey);
            
            if (indicator && indicator.current !== null && indicator.current !== undefined) {
                const probability = this.calculateEnhancedTransitionProbability(indicator, spec);
                weightedProbabilities.push(probability * spec.weight);
                totalWeight += spec.weight;
                foundIndicators++;
                console.log(`✓ ${spec.name} (${spec.dataKey}): ${indicator.current.toFixed(2)}, probability: ${(probability*100).toFixed(1)}%`);
            } else {
                missingIndicators.push(spec.dataKey);
                console.warn(`✗ Missing ${spec.name} (${spec.dataKey}) for theme ${themeName}`);
            }
        });
        
        if (foundIndicators === 0) {
            console.error(`No indicators found for theme ${themeName}. Missing: ${missingIndicators.join(', ')}`);
            return 0.15;
        }
        
        if (foundIndicators < Object.keys(indicatorSpecs).length) {
            console.warn(`Theme ${themeName} missing ${missingIndicators.length} indicators: ${missingIndicators.join(', ')}`);
        }
        
        const themeProbability = weightedProbabilities.reduce((sum, p) => sum + p, 0) / totalWeight;
        const result = Math.max(0.05, Math.min(0.95, themeProbability));
        
        console.log(`Theme ${themeName}: ${foundIndicators}/${Object.keys(indicatorSpecs).length} indicators, weighted probability: ${(result*100).toFixed(1)}%`);
        
        return result;
    },

    /**
     * SIMPLIFIED Main analysis function - Uses complex calculations above
     */
    calculateThemeAnalysis: function(monthlyData, indicators) {
        if (!monthlyData || !monthlyData.indicators) {
            return { 
                error: 'No data available for analysis',
                validation: { valid: false, issues: ['Missing monthly data'] }
            };
        }
        
        console.log('=== Theme Analysis v2.10 Starting ===');
        console.log('Data structure themes:', Object.keys(monthlyData.indicators));
        
        const dataIndicators = monthlyData.indicators;
        
        // Calculate theme probabilities using full IPS v3.10 methodology
        const themes = {
            usd: this.calculateThemeProbability(dataIndicators, 'usd'),
            ai: this.calculateThemeProbability(dataIndicators, 'innovation'),
            pe: this.calculateThemeProbability(dataIndicators, 'pe'),
            intl: this.calculateThemeProbability(dataIndicators, 'intl')
        };
        
        console.log('Final theme probabilities:', themes);
        
        // Generate 16 scenarios
        const scenarios = this.generateScenarios(themes);
        
        // Calculate analysis summary
        const summary = this.calculateAnalysisSummary(themes, scenarios);
        
        // Enhanced validation
        const validation = this.validateResults(themes, scenarios, dataIndicators);
        
        console.log('=== Theme Analysis v2.10 Complete ===');
        
        return {
            methodology: 'IPS v3.10 Appendix H Mathematical Specifications',
            version: this.version,
            lastUpdated: this.lastUpdated,
            themes: themes,
            scenarios: scenarios,
            summary: summary,
            timestamp: new Date().toISOString(),
            validation: validation,
            dataQuality: this.assessDataQuality(dataIndicators),
            currentScenarioId: this.getCurrentScenario(themes) // NEW in v2.10
        };
    },

    /**
     * Generate 16 scenarios from theme probabilities - FROM v2.9
     */
    generateScenarios: function(themes) {
        const scenarios = [];
        
        for (let i = 0; i < 16; i++) {
            const hasUSD = (i & 8) > 0;
            const hasAI = (i & 4) > 0;
            const hasPE = (i & 2) > 0;
            const hasINTL = (i & 1) > 0;
            
            const probability = 
                (hasUSD ? themes.usd : (1 - themes.usd)) *
                (hasAI ? themes.ai : (1 - themes.ai)) *
                (hasPE ? themes.pe : (1 - themes.pe)) *
                (hasINTL ? themes.intl : (1 - themes.intl));
            
            let name = [];
            if (hasUSD) name.push('USD↓');
            if (hasAI) name.push('AI↑');
            if (hasPE) name.push('P/E↓');
            if (hasINTL) name.push('INTL↑');
            
            scenarios.push({
                id: i + 1,
                binary: i.toString(2).padStart(4, '0'),
                name: name.length > 0 ? name.join(' + ') : 'Base Case',
                probability: probability,
                rank: 0,
                themes: {
                    usd: hasUSD,
                    ai: hasAI,
                    pe: hasPE,
                    intl: hasINTL
                }
            });
        }
        
        scenarios.sort((a, b) => b.probability - a.probability);
        scenarios.forEach((scenario, index) => {
            scenario.rank = index + 1;
        });
        
        return scenarios;
    },

    /**
     * NEW v2.10 - Determine current scenario based on theme probabilities
     * Current scenario is where each theme > 0.5 is considered "active"
     */
    getCurrentScenario: function(themes) {
        // Current scenario is determined by whether each theme > 0.5 (active)
        const currentBinary = 
            (themes.usd > 0.5 ? 8 : 0) +          // Bit 3
            (themes.ai > 0.5 ? 4 : 0) +           // Bit 2
            (themes.pe > 0.5 ? 2 : 0) +           // Bit 1
            (themes.intl > 0.5 ? 1 : 0);          // Bit 0
        
        return currentBinary + 1; // Convert to 1-16 ID range
    },

    /**
     * Calculate enhanced analysis summary - FROM v2.9
     */
    calculateAnalysisSummary: function(themes, scenarios) {
        const topScenario = scenarios[0];
        const top5Concentration = scenarios.slice(0, 5)
            .reduce((sum, s) => sum + s.probability, 0);
        
        const entropy = -scenarios.reduce((sum, s) => {
            if (s.probability > 0) {
                return sum + s.probability * Math.log2(s.probability);
            }
            return sum;
        }, 0);
        
        const maxEntropy = Math.log2(16);
        const uncertaintyLevel = entropy / maxEntropy;
        
        let uncertaintyDescription;
        if (uncertaintyLevel > 0.9) uncertaintyDescription = 'VERY HIGH';
        else if (uncertaintyLevel > 0.8) uncertaintyDescription = 'HIGH';
        else if (uncertaintyLevel > 0.6) uncertaintyDescription = 'MEDIUM';
        else if (uncertaintyLevel > 0.4) uncertaintyDescription = 'LOW';
        else uncertaintyDescription = 'VERY LOW';
        
        return {
            dominantScenario: topScenario.name,
            dominantProbability: topScenario.probability,
            top5Concentration: top5Concentration,
            uncertaintyLevel: uncertaintyDescription,
            uncertaintyScore: uncertaintyLevel,
            themeSummary: {
                strongest: this.getStrongestTheme(themes),
                weakest: this.getWeakestTheme(themes),
                dispersion: this.calculateThemeDispersion(themes)
            },
            signalStrength: this.assessSignalStrength(themes)
        };
    },

    /**
     * Enhanced validation with detailed error reporting - FROM v2.9
     */
    validateResults: function(themes, scenarios, dataIndicators) {
        const issues = [];
        const warnings = [];
        
        Object.entries(themes).forEach(([name, prob]) => {
            if (prob < 0.05 || prob > 0.95) {
                issues.push(`${name} theme probability ${(prob*100).toFixed(1)}% outside bounds [5%, 95%]`);
            }
            if (prob === 0.15) {
                warnings.push(`${name} theme showing default probability - may indicate missing data`);
            }
        });
        
        const totalProb = scenarios.reduce((sum, s) => sum + s.probability, 0);
        if (Math.abs(totalProb - 1.0) > 0.01) {
            issues.push(`Scenario probabilities sum to ${(totalProb*100).toFixed(1)}% instead of 100%`);
        }
        
        const maxScenario = Math.max(...scenarios.map(s => s.probability));
        const minScenario = Math.min(...scenarios.map(s => s.probability));
        
        if (maxScenario < 0.15 && themes.usd !== 0.15) {
            warnings.push('All scenarios have low probabilities despite strong theme signals');
        }
        
        if (minScenario > 0.02 && Math.max(...Object.values(themes)) < 0.85) {
            warnings.push('All scenarios have high probabilities despite weak theme signals');
        }
        
        const expectedIndicators = 13;
        const foundIndicators = this.countFoundIndicators(dataIndicators);
        
        if (foundIndicators < expectedIndicators) {
            warnings.push(`Only ${foundIndicators}/${expectedIndicators} indicators found - may affect accuracy`);
        }
        
        return {
            valid: issues.length === 0,
            issues: issues,
            warnings: warnings,
            calibrationStatus: this.getCalibrationStatus(),
            dataCompleteness: `${foundIndicators}/${expectedIndicators}`,
            frameworkVersion: this.framework
        };
    },

    /**
     * Count indicators found across all themes - FROM v2.9
     */
    countFoundIndicators: function(dataIndicators) {
        let count = 0;
        Object.keys(this.indicatorSpecs).forEach(themeName => {
            const themeSpecs = this.indicatorSpecs[themeName];
            Object.keys(themeSpecs).forEach(key => {
                const spec = themeSpecs[key];
                const indicator = this.findIndicatorInThemes(dataIndicators, spec.dataKey);
                if (indicator && indicator.current !== null && indicator.current !== undefined) {
                    count++;
                }
            });
        });
        return count;
    },

    /**
     * Assess data quality across indicators - FROM v2.9
     */
    assessDataQuality: function(dataIndicators) {
        const totalIndicators = 13;
        const foundIndicators = this.countFoundIndicators(dataIndicators);
        const completeness = foundIndicators / totalIndicators;
        
        let quality;
        if (completeness >= 0.95) quality = 'EXCELLENT';
        else if (completeness >= 0.85) quality = 'HIGH';
        else if (completeness >= 0.70) quality = 'MEDIUM';
        else if (completeness >= 0.50) quality = 'LOW';
        else quality = 'CRITICAL';
        
        return {
            overall: quality,
            completeness: completeness,
            foundIndicators: foundIndicators,
            totalIndicators: totalIndicators,
            freshnessScore: 0.92
        };
    },

    /**
     * Helper methods for enhanced analysis - FROM v2.9
     */
    getStrongestTheme: function(themes) {
        return Object.entries(themes)
            .reduce((max, [name, prob]) => prob > max.prob ? {name, prob} : max, 
                    {name: 'none', prob: 0});
    },

    getWeakestTheme: function(themes) {
        return Object.entries(themes)
            .reduce((min, [name, prob]) => prob < min.prob ? {name, prob} : min, 
                    {name: 'none', prob: 1});
    },

    calculateThemeDispersion: function(themes) {
        const values = Object.values(themes);
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
    },

    assessSignalStrength: function(themes) {
        const maxTheme = Math.max(...Object.values(themes));
        const minTheme = Math.min(...Object.values(themes));
        const spread = maxTheme - minTheme;
        
        if (spread > 0.6) return 'STRONG';
        if (spread > 0.4) return 'MODERATE';
        if (spread > 0.2) return 'WEAK';
        return 'MINIMAL';
    },

    getCalibrationStatus: function() {
        return {
            productivity: { calibrated: true, rate: '47.7%', status: 'ACTIVE' },
            forwardPE: { calibrated: true, rate: '49.4%', status: 'ACTIVE' },
            remaining: { 
                calibrated: false, 
                count: 11, 
                status: 'PENDING',
                note: 'Historical trigger rate data needed'
            }
        };
    },

    /**
     * PRD v3.4 Compliant Display Method - FROM v2.9 WITH SIMPLIFIED HTML
     */
    displayThemeResults: function(analysis, containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }
        
        const themeNames = {
            usd: 'USD Dominance Decline',
            ai: 'AI Productivity Boom', 
            pe: 'P/E Mean Reversion',
            intl: 'International Outperformance'
        };
        
        let html = `
            <div class="theme-analysis-v2_10">
                <div class="analysis-header">
                    <h3>Theme Analysis - ${analysis.methodology}</h3>
                    <div class="analysis-meta">Version ${analysis.version} | ${new Date(analysis.timestamp).toLocaleString()}</div>
                </div>
                <div class="theme-probabilities">
                    <h4>Theme Probabilities</h4>
        `;
        
        Object.entries(analysis.themes).forEach(([key, probability]) => {
            const percentage = (probability * 100).toFixed(1);
            const fillColor = probability > 0.6 ? '#28a745' : probability > 0.4 ? '#ffc107' : '#dc3545';
            
            html += `
                <div class="theme-item">
                    <div class="theme-header">
                        <div class="theme-name">${themeNames[key]}</div>
                        <div class="theme-percentage">${percentage}%</div>
                    </div>
                    <div class="theme-bar">
                        <div class="theme-fill" style="width: ${percentage}%; background: ${fillColor};"></div>
                    </div>
                </div>
            `;
        });
        
        html += '</div></div>';
        container.innerHTML = html;
        
        // Auto-trigger Step 4 scenario display if we have theme probabilities
        if (analysis.scenarios && analysis.scenarios.length === 16) {
            this.displayScenarioMatrix(analysis.scenarios, analysis.themes);
        }
    },
    
    /**
     * ENHANCED v2.10 - Display scenario matrix with current scenario highlighting
     * Displays scenarios in BINARY ORDER with proper color coding and current scenario identification
     */
    displayScenarioMatrix: function(scenarios, themes) {
        const container = document.getElementById('scenario-container');
        const summary = document.getElementById('scenario-summary');
        if (!container || !summary) return;
        
        // Update TrackerCore state if available
        if (typeof TrackerCore !== 'undefined') {
            TrackerCore.state.scenarioProbabilities = scenarios;
        }
        
        // Determine current scenario
        const currentScenarioId = this.getCurrentScenario(themes);
        console.log(`Current scenario determined: S${currentScenarioId} based on theme probabilities`);
        
        // Find top scenario for display
        const topScenario = scenarios.reduce((max, s) => s.probability > max.probability ? s : max, scenarios[0]);
        const currentScenarioData = scenarios.find(s => s.id === currentScenarioId);
        const totalProb = scenarios.reduce((sum, s) => sum + s.probability, 0);
        
        // Display summary with current scenario information
        summary.innerHTML = `
            <div style="display: flex; justify-content: space-around; text-align: center;">
                <div>
                    <strong>Current Scenario</strong><br>
                    S${currentScenarioId}: ${currentScenarioData?.name || 'Base Case'}<br>
                    <span style="color: #007bff; font-size: 1.2em;">${(currentScenarioData?.probability * 100 || 0).toFixed(1)}%</span>
                </div>
                <div>
                    <strong>Most Likely</strong><br>
                    ${topScenario.name}<br>
                    <span style="color: #dc3545; font-size: 1.2em;">${(topScenario.probability * 100).toFixed(1)}%</span>
                </div>
                <div>
                    <strong>Scenarios > 10%</strong><br>
                    ${scenarios.filter(s => s.probability > 0.1).length} of 16<br>
                    <span style="color: #28a745; font-size: 1.2em;">${(scenarios.filter(s => s.probability > 0.1).length / 16 * 100).toFixed(0)}%</span>
                </div>
                <div>
                    <strong>Probability Check</strong><br>
                    Sum of all scenarios<br>
                    <span style="color: ${Math.abs(totalProb - 1) < 0.01 ? '#28a745' : '#dc3545'}; font-size: 1.2em;">${(totalProb * 100).toFixed(1)}%</span>
                </div>
            </div>
        `;
        
        // Generate scenario grid in BINARY ORDER (not probability order)
        let html = '<div class="scenario-grid">';
        
        // Sort scenarios by ID (binary order 1-16) instead of probability
        const scenariosInBinaryOrder = [...scenarios].sort((a, b) => a.id - b.id);
        
        scenariosInBinaryOrder.forEach(scenario => {
            const probability = scenario.probability * 100;
            const colorClass = this.getScenarioColorClass(scenario.probability);
            
            // Check if this is the current scenario
            const isCurrentScenario = scenario.id === currentScenarioId;
            const currentScenarioClass = isCurrentScenario ? 'current-scenario' : '';
            
            html += `
                <div class="scenario-card ${colorClass} ${currentScenarioClass}">
                    ${isCurrentScenario ? '<div class="current-scenario-label">Current Scenario</div>' : ''}
                    <div class="scenario-id">S${scenario.id}</div>
                    <div class="scenario-rank">Rank #${scenario.rank}</div>
                    <div class="scenario-name">${scenario.name}</div>
                    <div class="scenario-probability">${probability.toFixed(2)}%</div>
                    <div class="scenario-binary">Binary: ${scenario.binary}</div>
                    <div class="scenario-themes">
                        ${Object.entries(scenario.themes).map(([theme, active]) => 
                            active ? theme.toUpperCase() : theme.toLowerCase()
                        ).join(' | ')}
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
        
        // Mark Step 4 as complete if TrackerCore is available
        if (typeof TrackerCore !== 'undefined') {
            if (!TrackerCore.completedSteps.includes(4)) {
                TrackerCore.completedSteps.push(4);
            }
            TrackerCore.updateStepIndicators();
            TrackerCore.updateNavigation();
            TrackerCore.saveState();
        }
        
        // Auto-trigger Step 5 portfolio optimization if available
        if (typeof PortfolioOptimizer !== 'undefined') {
            PortfolioOptimizer.optimizePortfolio(scenarios);
        }
        
        console.log('Step 4: 16-scenario matrix displayed in binary order with current scenario highlighting');
    },

    /**
     * CORRECTED v2.10 - Proper color classification per requirements
     * Dark Green >25%, Green 10-25%, Yellow 5-10%, Light Red 1-5%, Dark Red <1%
     */
    getScenarioColorClass: function(probability) {
        if (probability >= 0.25) return 'scenario-very-high';   // Dark Green > 25%
        if (probability >= 0.10) return 'scenario-high';        // Green 10-25%
        if (probability >= 0.05) return 'scenario-medium';      // Yellow 5-10%
        if (probability >= 0.01) return 'scenario-low';         // Light Red 1-5%
        return 'scenario-very-low';                             // Dark Red < 1%
    }
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeCalculator;
}

// Global assignment for browser use
if (typeof window !== 'undefined') {
    window.ThemeCalculator = ThemeCalculator;
}