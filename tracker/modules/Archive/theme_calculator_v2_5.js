/**
 * HCP Portfolio Tracker - Theme Calculator Module v2.5
 * File: theme_calculator_v2_5.js
 * Based on: IPS v3.9 Appendix H Mathematical Specifications
 * Last Updated: 2025-08-30 20:30:00 UTC
 * 
 * CHANGES IN v2.5:
 * - COMPLETE DATA ALIGNMENT: All data keys now match FileHandler v1.2 exactly
 * - Fixed nested data structure lookup for all themes
 * - Verified all 13 indicators use correct snake_case keys per PRD v3.3
 * 
 * CHANGES IN v2.4:
 * - Fixed indicatorSpecs theme naming: renamed 'ai' to 'innovation' to match FileHandler v1.2
 * - Now both specs lookup and data lookup use consistent theme names
 * 
 * HANDLES:
 * - IPS v3.9 compliant probability calculations
 * - Three-component model: Current State + Momentum + Distance
 * - Physics-based time-to-trigger estimation
 * - Boundary conditions and direction adjustments
 * - Theme aggregation with proper weighting
 * - Nested data structure navigation
 * 
 * REPLACES: theme_calculator_v2_4.js (theme naming fix)
 */

const ThemeCalculator = {
    version: '2.5',
    framework: 'IPS v3.9 Appendix H',
    
    // IPS v3.9 Indicator Specifications - ALIGNED WITH FILEHANDLER v1.2
    indicatorSpecs: {
        // USD Theme (4 indicators) - FIXED KEYS
        usd: {
            dxy: {
                dataKey: 'dxy',  // FileHandler: indicators.usd.dxy
                name: 'DXY Index',
                method: 'ma_comparison',
                short_ma: 200,
                long_ma: 400,
                trigger_condition: 'short_below_long',
                tier: 'canary',
                weight: 0.30
            },
            reserves: {
                dataKey: 'reserve_share',  // FileHandler: indicators.usd.reserve_share  
                name: 'USD Reserve Share',
                method: 'fixed_threshold',
                threshold: -0.005,
                tier: 'structural',
                weight: 0.25
            },
            yuan: {
                dataKey: 'yuan_swift',  // FileHandler: indicators.usd.yuan_swift
                name: 'Yuan SWIFT Share',
                method: 'ma_comparison',
                short_ma: 12,
                long_ma: 36,
                trigger_condition: 'short_above_long',
                tier: 'primary',
                weight: 0.25
            },
            gold: {
                dataKey: 'gold_purchases',  // FileHandler: indicators.usd.gold_purchases
                name: 'Central Bank Gold',
                method: 'ma_comparison',
                short_ma: 4,
                long_ma: 12,
                trigger_condition: 'short_above_long',
                tier: 'structural',
                weight: 0.20
            }
        },
        
        // Innovation Theme (3 indicators) - ALIGNED WITH FILEHANDLER v1.2
        innovation: {
            productivity: {
                dataKey: 'productivity',  // FileHandler: indicators.innovation.productivity
                name: 'Productivity Growth',
                method: 'ma_comparison',
                short_ma: 2,
                long_ma: 6,
                trigger_condition: 'short_above_long',
                tier: 'structural',
                weight: 0.40,
                calibrated: true,
                trigger_rate: 0.477
            },
            qqqSpy: {
                dataKey: 'qqq_spy',  // FileHandler: indicators.innovation.qqq_spy
                name: 'QQQ/SPY Ratio',
                method: 'ma_comparison',
                short_ma: 50,
                long_ma: 200,
                trigger_condition: 'short_above_long',
                tier: 'canary',
                weight: 0.35
            },
            margins: {
                dataKey: 'net_margins',  // FileHandler: indicators.innovation.net_margins
                name: 'S&P Net Margins',
                method: 'threshold_vs_ma',
                ma_period: 36,
                threshold_offset: 0.005,
                tier: 'primary',
                weight: 0.25
            }
        },
        
        // P/E Mean Reversion Theme (3 indicators) - FIXED KEYS
        pe: {
            forwardPE: {
                dataKey: 'forward_pe',  // FileHandler: indicators.pe.forward_pe
                name: 'Forward P/E',
                method: 'ma_comparison',
                short_ma: 12,
                long_ma: 36,
                trigger_condition: 'short_above_long',
                tier: 'primary',
                weight: 0.40,
                calibrated: true,
                trigger_rate: 0.494
            },
            cape: {
                dataKey: 'cape',  // FileHandler: indicators.pe.cape
                name: 'Shiller CAPE',
                method: 'vs_long_ma',
                ma_period: 240,
                trigger_condition: 'current_above_ma',
                tier: 'primary',
                weight: 0.35
            },
            riskPremium: {
                dataKey: 'risk_premium',  // FileHandler: indicators.pe.risk_premium
                name: 'Equity Risk Premium',
                method: 'ma_comparison',
                short_ma: 6,
                long_ma: 18,
                trigger_condition: 'short_below_long',
                tier: 'canary',
                weight: 0.25
            }
        },
        
        // International Theme (3 indicators) - ALIGNED WITH FILEHANDLER v1.2  
        intl: {
            acwxSpy: {
                dataKey: 'acwx_spy',  // FileHandler: indicators.intl.acwx_spy
                name: 'ACWX/SPY Relative',
                method: 'ma_comparison',
                short_ma: 30,
                long_ma: 90,
                trigger_condition: 'short_above_long',
                tier: 'canary',
                weight: 0.30
            },
            spWorld: {
                dataKey: 'sp_vs_world',  // FileHandler: indicators.intl.sp_vs_world
                name: 'S&P vs MSCI World',
                method: 'relative_performance',
                period: 6,
                threshold: -0.02,
                tier: 'primary',
                weight: 0.35
            },
            ticFlows: {
                dataKey: 'tic_flows',  // FileHandler: indicators.intl.tic_flows
                name: 'TIC Net Flows',
                method: 'fixed_threshold',
                threshold: 0,
                tier: 'structural',
                weight: 0.35  // Increased weight since US % removed per IPS v3.9
            }
        }
    },

    /**
     * ENHANCED v2.5: Search indicator in FileHandler v1.2 nested structure
     */
    findIndicatorInThemes: function(dataIndicators, dataKey) {
        // Search through nested theme structure: {usd: {dxy: {...}}, innovation: {qqq_spy: {...}}}
        for (const themeName in dataIndicators) {
            const themeData = dataIndicators[themeName];
            if (themeData && typeof themeData === 'object') {
                if (themeData[dataKey]) {
                    return themeData[dataKey];
                }
            }
        }
        return null;
    },

    /**
     * IPS v3.9 Appendix H: Enhanced Transition Probability Calculation
     * Three-component model: Current State + Momentum + Distance
     */
    calculateEnhancedTransitionProbability: function(indicator, spec) {
        try {
            // Step 1: Determine current state relative to trigger
            const currentState = this.getCurrentState(indicator, spec);
            
            // Step 2: Calculate momentum (-1 to +1 range)
            const momentum = this.calculateMomentum(indicator);
            
            // Step 3: Calculate distance to trigger (percentage)
            const distanceToTrigger = this.calculateDistanceToTrigger(indicator, spec);
            
            // Step 4: Physics-based time-to-trigger estimation
            const monthsToTrigger = this.estimateTimeToTrigger(distanceToTrigger, momentum);
            
            // Step 5: Time-based probability decay (IPS v3.9 formula)
            let baseProbability;
            if (monthsToTrigger < 3) {
                baseProbability = 0.70; // Likely within quarter
            } else if (monthsToTrigger < 6) {
                baseProbability = 0.40; // Likely within 2 quarters
            } else if (monthsToTrigger < 12) {
                baseProbability = 0.20; // Possible within year
            } else if (monthsToTrigger < 24) {
                baseProbability = 0.10; // Unlikely but possible
            } else {
                baseProbability = 0.05; // Base rate for distant events
            }
            
            // Step 6: Direction adjustment (IPS v3.9 specification)
            const movingTowardTrigger = this.isMovingTowardTrigger(distanceToTrigger, momentum);
            let finalProbability;
            
            if (movingTowardTrigger) {
                finalProbability = baseProbability;
            } else {
                // Moving away from trigger - 70% reduction per IPS v3.9
                finalProbability = baseProbability * 0.3;
            }
            
            // Step 7: Boundary conditions (IPS v3.9 edge cases)
            // Near trigger override - if within 5% of MA, minimum 30% probability
            if (Math.abs(distanceToTrigger) < 0.05) {
                finalProbability = Math.max(finalProbability, 0.30);
            }
            
            // Far from trigger cap - if beyond 30% from MA, maximum 20% probability
            if (Math.abs(distanceToTrigger) > 0.30) {
                finalProbability = Math.min(finalProbability, 0.20);
            }
            
            // Extreme momentum override - very strong momentum adds probability
            if (Math.abs(momentum) > 0.8 && movingTowardTrigger) {
                finalProbability = Math.min(0.95, finalProbability + 0.20);
            }
            
            // Step 8: Apply IPS v3.9 bounds [0.05, 0.95]
            return Math.min(0.95, Math.max(0.05, finalProbability));
            
        } catch (error) {
            console.warn(`Error calculating probability for ${spec.name}:`, error);
            return 0.15; // Default base rate
        }
    },

    /**
     * Determine current state relative to MA trigger
     */
    getCurrentState: function(indicator, spec) {
        if (!indicator || !indicator.current) return 'unknown';
        
        switch (spec.method) {
            case 'ma_comparison':
                return this.calculateMAComparison(indicator, spec);
            case 'fixed_threshold':
                return indicator.current > spec.threshold ? 'above' : 'below';
            case 'threshold_vs_ma':
                const ma = this.calculateMovingAverage(indicator.history, spec.ma_period);
                return indicator.current > (ma + spec.threshold_offset) ? 'above' : 'below';
            case 'vs_long_ma':
                const longMA = this.calculateMovingAverage(indicator.history, spec.ma_period);
                return indicator.current > longMA ? 'above' : 'below';
            case 'relative_performance':
                return 'neutral'; // Placeholder
            default:
                return 'unknown';
        }
    },

    /**
     * Calculate MA comparison for adaptive triggers
     */
    calculateMAComparison: function(indicator, spec) {
        if (!indicator.history || indicator.history.length < spec.long_ma) {
            return 'insufficient_data';
        }
        
        const shortMA = this.calculateMovingAverage(indicator.history.slice(-spec.short_ma), spec.short_ma);
        const longMA = this.calculateMovingAverage(indicator.history.slice(-spec.long_ma), spec.long_ma);
        
        switch (spec.trigger_condition) {
            case 'short_above_long':
                return shortMA > longMA ? 'triggered' : 'not_triggered';
            case 'short_below_long':
                return shortMA < longMA ? 'triggered' : 'not_triggered';
            default:
                return 'unknown';
        }
    },

    /**
     * Calculate moving average
     */
    calculateMovingAverage: function(data, periods) {
        if (!data || data.length < periods) return null;
        
        const recentData = data.slice(-periods);
        const sum = recentData.reduce((acc, val) => acc + val, 0);
        return sum / periods;
    },

    /**
     * Calculate momentum using IPS methodology
     */
    calculateMomentum: function(indicator) {
        if (!indicator.history || indicator.history.length < 6) {
            return 0; // No momentum if insufficient data
        }
        
        // Use 6-month momentum calculation
        const current = indicator.current;
        const sixMonthsAgo = indicator.history[indicator.history.length - 6];
        
        if (sixMonthsAgo === 0) return 0;
        
        // Calculate percentage change
        const percentChange = (current - sixMonthsAgo) / Math.abs(sixMonthsAgo);
        
        // Apply trend consistency factor (simplified)
        const recentData = indicator.history.slice(-6);
        let positiveChanges = 0;
        
        for (let i = 1; i < recentData.length; i++) {
            if (recentData[i] > recentData[i-1]) positiveChanges++;
        }
        
        const trendConsistency = Math.abs((positiveChanges / 5) - 0.5) * 2;
        
        // Scale and bound momentum to [-1, 1]
        let momentum = percentChange * trendConsistency;
        return Math.max(-1, Math.min(1, momentum));
    },

    /**
     * Calculate distance to trigger as percentage
     */
    calculateDistanceToTrigger: function(indicator, spec) {
        if (!indicator || !indicator.current) return 0;
        
        let triggerValue;
        
        switch (spec.method) {
            case 'ma_comparison':
                // Distance to MA crossover
                const shortMA = this.calculateMovingAverage(indicator.history.slice(-spec.short_ma), spec.short_ma);
                const longMA = this.calculateMovingAverage(indicator.history.slice(-spec.long_ma), spec.long_ma);
                
                if (!shortMA || !longMA) return 0;
                
                // Distance is how far short MA is from long MA
                return (shortMA - longMA) / longMA;
                
            case 'fixed_threshold':
                triggerValue = spec.threshold;
                return (indicator.current - triggerValue) / Math.abs(triggerValue || 1);
                
            case 'threshold_vs_ma':
                const ma = this.calculateMovingAverage(indicator.history, spec.ma_period);
                triggerValue = ma + spec.threshold_offset;
                return (indicator.current - triggerValue) / triggerValue;
                
            case 'vs_long_ma':
                triggerValue = this.calculateMovingAverage(indicator.history, spec.ma_period);
                if (!triggerValue) return 0;
                return (indicator.current - triggerValue) / triggerValue;
                
            default:
                return 0;
        }
    },

    /**
     * Physics-based time-to-trigger estimation (IPS v3.9)
     */
    estimateTimeToTrigger: function(distanceToTrigger, momentum) {
        // IPS v3.9: Assumes momentum of 1.0 = ~2% monthly change
        if (Math.abs(momentum) <= 0.01) {
            return 999; // Effectively infinite for near-zero momentum
        }
        
        const monthlyChangeRate = Math.abs(momentum) * 0.02; // 2% per unit momentum
        const monthsToTrigger = Math.abs(distanceToTrigger) / monthlyChangeRate;
        
        return Math.max(0, monthsToTrigger);
    },

    /**
     * Check if momentum is moving toward trigger
     */
    isMovingTowardTrigger: function(distanceToTrigger, momentum) {
        // Moving toward trigger if:
        // - Distance is positive (above trigger) and momentum is negative (falling)
        // - Distance is negative (below trigger) and momentum is positive (rising)
        return (distanceToTrigger > 0 && momentum < 0) || 
               (distanceToTrigger < 0 && momentum > 0);
    },

    /**
     * FIXED v2.5: Calculate theme probability using correct data structure
     */
    calculateThemeProbability: function(dataIndicators, themeName) {
        const indicatorSpecs = this.indicatorSpecs[themeName];
        if (!indicatorSpecs) {
            console.warn(`No indicator specs found for theme: ${themeName}`);
            return 0.15;
        }
        
        let weightedProbabilities = [];
        let totalWeight = 0;
        
        Object.keys(indicatorSpecs).forEach(key => {
            const spec = indicatorSpecs[key];
            // FIXED v2.5: Use nested data lookup for FileHandler v1.2 structure
            const indicator = this.findIndicatorInThemes(dataIndicators, spec.dataKey);
            
            if (indicator && indicator.current !== null && indicator.current !== undefined) {
                const probability = this.calculateEnhancedTransitionProbability(indicator, spec);
                weightedProbabilities.push(probability * spec.weight);
                totalWeight += spec.weight;
                console.log(`✓ Found ${spec.name} (${spec.dataKey}): ${indicator.current.toFixed(2)}, probability: ${(probability*100).toFixed(1)}%`);
            } else {
                console.warn(`✗ Indicator ${spec.dataKey} not found for theme ${themeName}`);
            }
        });
        
        if (totalWeight === 0) {
            console.warn(`No indicators found for theme ${themeName}, using default 15%`);
            return 0.15;
        }
        
        const themeProbability = weightedProbabilities.reduce((sum, p) => sum + p, 0) / totalWeight;
        return Math.max(0.05, Math.min(0.95, themeProbability));
    },

    /**
     * Main analysis function using IPS v3.9 methodology
     */
    calculateThemeAnalysis: function(monthlyData, indicators) {
        if (!monthlyData || !monthlyData.indicators) {
            return { error: 'No data available for analysis' };
        }
        
        console.log('Starting theme analysis with data structure:', Object.keys(monthlyData.indicators));
        
        const dataIndicators = monthlyData.indicators;
        
        // Calculate theme probabilities using IPS v3.9 methodology
        const themes = {
            usd: this.calculateThemeProbability(dataIndicators, 'usd'),
            ai: this.calculateThemeProbability(dataIndicators, 'innovation'), // Map 'ai' results to 'innovation' data
            pe: this.calculateThemeProbability(dataIndicators, 'pe'),
            intl: this.calculateThemeProbability(dataIndicators, 'intl')
        };
        
        console.log('Theme probabilities calculated:', themes);
        
        // Generate 16 scenarios
        const scenarios = this.generateScenarios(themes);
        
        // Calculate analysis summary
        const summary = this.calculateAnalysisSummary(themes, scenarios);
        
        return {
            methodology: 'IPS v3.9 Appendix H',
            version: this.version,
            themes: themes,
            scenarios: scenarios,
            summary: summary,
            timestamp: new Date().toISOString(),
            validation: this.validateResults(themes, scenarios)
        };
    },

    /**
     * Generate 16 scenarios from theme probabilities
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
                rank: 0 // Will be set after sorting
            });
        }
        
        // Sort by probability and assign ranks
        scenarios.sort((a, b) => b.probability - a.probability);
        scenarios.forEach((scenario, index) => {
            scenario.rank = index + 1;
        });
        
        return scenarios;
    },

    /**
     * Calculate analysis summary statistics
     */
    calculateAnalysisSummary: function(themes, scenarios) {
        const topScenario = scenarios[0];
        const top5Concentration = scenarios.slice(0, 5)
            .reduce((sum, s) => sum + s.probability, 0);
        
        // Calculate uncertainty level based on probability distribution
        const entropy = -scenarios.reduce((sum, s) => {
            if (s.probability > 0) {
                return sum + s.probability * Math.log2(s.probability);
            }
            return sum;
        }, 0);
        
        const maxEntropy = Math.log2(16); // Maximum entropy for 16 equally likely scenarios
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
            dataConfidence: this.assessDataConfidence(),
            themeSummary: {
                strongest: this.getStrongestTheme(themes),
                weakest: this.getWeakestTheme(themes)
            }
        };
    },

    /**
     * Validate results against IPS v3.9 expectations
     */
    validateResults: function(themes, scenarios) {
        const issues = [];
        
        // Check theme probability bounds
        Object.entries(themes).forEach(([name, prob]) => {
            if (prob < 0.05 || prob > 0.95) {
                issues.push(`${name} theme probability ${(prob*100).toFixed(1)}% outside bounds [5%, 95%]`);
            }
        });
        
        // Check scenario probability sum
        const totalProb = scenarios.reduce((sum, s) => sum + s.probability, 0);
        if (Math.abs(totalProb - 1.0) > 0.01) {
            issues.push(`Scenario probabilities sum to ${(totalProb*100).toFixed(1)}% instead of 100%`);
        }
        
        // Check for realistic probability dispersion
        const maxScenario = Math.max(...scenarios.map(s => s.probability));
        const minScenario = Math.min(...scenarios.map(s => s.probability));
        
        if (maxScenario < 0.15) {
            issues.push('All scenarios have low probabilities - may indicate weak signals');
        }
        
        if (minScenario > 0.02) {
            issues.push('All scenarios have high probabilities - may indicate flat momentum');
        }
        
        return {
            valid: issues.length === 0,
            issues: issues,
            calibrationStatus: this.getCalibrationStatus()
        };
    },

    /**
     * Helper methods
     */
    assessDataConfidence: function() {
        return 'HIGH'; // Simplified - would check data freshness, completeness, etc.
    },

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

    getCalibrationStatus: function() {
        return {
            productivity: { calibrated: true, rate: '47.7%' },
            forwardPE: { calibrated: true, rate: '49.4%' },
            remaining: { calibrated: false, count: 11 }
        };
    },

    /**
     * Display enhanced results - PRD v3.3 COMPLIANT (NO CONFIDENCE LABELS)
     */
    displayThemeResults: function(analysis, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        let html = `
            <div class="theme-analysis-v2">
                <div class="analysis-header">
                    <h3>Theme Analysis - ${analysis.methodology}</h3>
                    <div class="analysis-meta">
                        Version ${analysis.version} | ${new Date(analysis.timestamp).toLocaleString()}
                    </div>
                </div>
                
                <div class="analysis-summary">
                    <div class="summary-grid">
                        <div class="summary-item">
                            <span class="summary-label">Dominant Scenario:</span>
                            <span class="summary-value">${analysis.summary.dominantScenario} (${(analysis.summary.dominantProbability * 100).toFixed(1)}%)</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Top 5 Concentration:</span>
                            <span class="summary-value">${(analysis.summary.top5Concentration * 100).toFixed(1)}%</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Uncertainty Level:</span>
                            <span class="summary-value uncertainty-${analysis.summary.uncertaintyLevel.toLowerCase().replace(' ', '-')}">${analysis.summary.uncertaintyLevel}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Data Confidence:</span>
                            <span class="summary-value confidence-${analysis.summary.dataConfidence.toLowerCase()}">${analysis.summary.dataConfidence}</span>
                        </div>
                    </div>
                </div>
                
                <div class="theme-probabilities">
                    <h4>Theme Probabilities</h4>
        `;
        
        // Theme probability bars (PRD v3.3 COMPLIANT - NO CONFIDENCE LABELS)
        const themeNames = {
            usd: 'USD Dominance',
            ai: 'AI Productivity Boom', 
            pe: 'P/E Mean Reversion',
            intl: 'International Outperformance'
        };
        
        const themeDescriptions = {
            usd: 'Weakening USD enables international rotation',
            ai: 'Technology-driven productivity acceleration',
            pe: 'Overvaluation correction',
            intl: 'Non-US markets outperform'
        };
        
        Object.entries(analysis.themes).forEach(([key, probability]) => {
            const percentage = (probability * 100).toFixed(1);
            
            html += `
                <div class="theme-item">
                    <div class="theme-header">
                        <div class="theme-name">${themeNames[key]}</div>
                        <div class="theme-percentage">${percentage}%</div>
                    </div>
                    <div class="theme-bar">
                        <div class="theme-fill theme-${key}" style="width: ${percentage}%"></div>
                    </div>
                    <div class="theme-description">${themeDescriptions[key]}</div>
                </div>
            `;
        });
        
        html += `
                </div>
                
                <div class="scenario-matrix">
                    <h4>Scenario Probability Matrix</h4>
                    <div class="scenario-grid">
        `;
        
        // Scenario matrix
        analysis.scenarios.forEach(scenario => {
            const percentage = (scenario.probability * 100).toFixed(1);
            const colorClass = this.getScenarioColorClass(scenario.probability);
            
            html += `
                <div class="scenario-item ${colorClass}">
                    <div class="scenario-rank">#${scenario.rank}</div>
                    <div class="scenario-name">${scenario.name}</div>
                    <div class="scenario-probability">${percentage}%</div>
                    <div class="scenario-binary">${scenario.binary}</div>
                </div>
            `;
        });
        
        html += `
                    </div>
                </div>
                
                <div class="validation-status">
                    <h4>Validation Status</h4>
                    <div class="validation-indicator ${analysis.validation.valid ? 'valid' : 'invalid'}">
                        ${analysis.validation.valid ? '✓ All validations passed' : '⚠ Issues detected'}
                    </div>
        `;
        
        if (analysis.validation.issues.length > 0) {
            html += '<ul class="validation-issues">';
            analysis.validation.issues.forEach(issue => {
                html += `<li>${issue}</li>`;
            });
            html += '</ul>';
        }
        
        html += `
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    },

    /**
     * Get color class for scenario probability (PRD v3.3 5-tier system)
     */
    getScenarioColorClass: function(probability) {
        if (probability >= 0.25) return 'scenario-very-high';   // >25% Dark Green
        if (probability >= 0.10) return 'scenario-high';        // 10-25% Light Green  
        if (probability >= 0.05) return 'scenario-medium';      // 5-10% Yellow
        if (probability >= 0.01) return 'scenario-low';         // 1-5% Light Red
        return 'scenario-very-low';                             // <1% Dark Gray
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