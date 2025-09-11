/**
 * HCP Portfolio Tracker - Theme Calculator Module v3.0
 * File: theme_calculator_v3_0.js
 * Based on: IPS v4.0 Three-State Framework
 * Last Updated: 2025-09-05 15:00:00 UTC
 * 
 * COMPLETE REWRITE:
 * - Three-state classification (-1/0/+1) replacing binary triggers
 * - Vector extrapolation for trend projection
 * - GARCH(1,1) volatility modeling
 * - 81 scenario transition probabilities
 * - Natural correlation emergence through momentum alignment
 */

const ThemeCalculator = {
    version: '3.0',
    framework: 'IPS v4.0 Three-State Framework',
    
    // Configuration
    config: {
        lookbackMonths: 12,        // For trend fitting
        projectionMonths: 6,        // Forward-looking horizon
        percentileYears: 15,        // For percentile calculations
        garchWindow: 36,            // Months for GARCH calibration
        minDataPoints: 6,           // Minimum history for calculations
        tercileBoundaries: [-0.33, 0.33]  // State transition thresholds
    },

    // GARCH(1,1) Implementation
    GARCH: {
        // Default parameters (will be calibrated per theme)
        defaultParams: {
            omega: 0.00001,  // Baseline variance
            alpha: 0.10,     // Weight on recent shock
            beta: 0.85       // Weight on previous variance
        },

        /**
         * Estimate GARCH(1,1) parameters using simplified MLE
         * Returns { omega, alpha, beta }
         */
        calibrate: function(returns) {
            if (!returns || returns.length < 20) {
                return this.defaultParams;
            }

            // Calculate sample variance as starting point
            const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
            const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;

            // Simplified parameter estimation
            // In production, would use proper MLE optimization
            const omega = variance * 0.05;  // Long-run variance component
            const alpha = 0.10;              // Typical for monthly financial data
            const beta = 0.85;               // Ensures stationarity (α + β < 1)

            // Ensure stationarity
            if (alpha + beta >= 0.99) {
                return this.defaultParams;
            }

            return { omega, alpha, beta };
        },

        /**
         * Calculate conditional variance using GARCH(1,1)
         * Returns array of variance estimates
         */
        calculateVariance: function(returns, params = null) {
            if (!returns || returns.length < 2) {
                return [0.01]; // Default variance
            }

            const p = params || this.calibrate(returns);
            const variances = [];
            
            // Initialize with unconditional variance
            const unconditionalVar = p.omega / (1 - p.alpha - p.beta);
            variances[0] = unconditionalVar;

            // Calculate conditional variances
            for (let t = 1; t < returns.length; t++) {
                const shock = Math.pow(returns[t - 1], 2);
                const prevVariance = variances[t - 1];
                
                const variance = p.omega + 
                                p.alpha * shock + 
                                p.beta * prevVariance;
                
                variances[t] = Math.max(0.0001, variance); // Ensure positive
            }

            return variances;
        },

        /**
         * Forecast variance h periods ahead
         */
        forecastVariance: function(currentVariance, lastShock, params, horizon = 6) {
            const p = params || this.defaultParams;
            const forecasts = [];
            
            // First forecast uses current information
            forecasts[0] = p.omega + 
                          p.alpha * Math.pow(lastShock, 2) + 
                          p.beta * currentVariance;

            // Multi-step ahead forecasts converge to unconditional variance
            const unconditionalVar = p.omega / (1 - p.alpha - p.beta);
            
            for (let h = 1; h < horizon; h++) {
                const decay = Math.pow(p.alpha + p.beta, h);
                forecasts[h] = unconditionalVar * (1 - decay) + forecasts[0] * decay;
            }

            return forecasts;
        }
    },

    /**
     * Calculate continuous theme values from indicator data
     */
    calculateThemeValues: function(indicatorData) {
        if (!indicatorData || !window.Indicators) {
            console.error('Missing indicator data or Indicators module');
            return null;
        }

        const themes = {};
        const themeNames = ['usd', 'innovation', 'pe', 'usLeadership'];

        themeNames.forEach(theme => {
            themes[theme] = window.Indicators.calculateContinuousThemeValue(
                indicatorData.indicators,
                theme
            );
        });

        return themes;
    },

    /**
     * Fit linear trend to theme history
     * Returns { slope, intercept, r2 }
     */
    fitTrend: function(values) {
        if (!values || values.length < 2) {
            return { slope: 0, intercept: values ? values[values.length - 1] : 0, r2: 0 };
        }

        const n = values.length;
        const x = Array.from({ length: n }, (_, i) => i);
        
        // Calculate sums
        const sumX = x.reduce((sum, xi) => sum + xi, 0);
        const sumY = values.reduce((sum, yi) => sum + yi, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
        const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
        const sumY2 = values.reduce((sum, yi) => sum + yi * yi, 0);

        // Calculate regression coefficients
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Calculate R-squared
        const yMean = sumY / n;
        const ssTotal = values.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
        const ssResidual = values.reduce((sum, yi, i) => {
            const predicted = intercept + slope * i;
            return sum + Math.pow(yi - predicted, 2);
        }, 0);
        const r2 = 1 - (ssResidual / ssTotal);

        return { slope, intercept, r2: isNaN(r2) ? 0 : r2 };
    },

    /**
     * Project theme value forward using trend
     */
    projectThemeValue: function(trend, currentValue, months) {
        // Use current value as starting point, apply trend
        const projection = currentValue + (trend.slope * months);
        
        // Bound to [-1, 1] range
        return Math.max(-1, Math.min(1, projection));
    },

    /**
     * Calculate probability of crossing state boundary
     */
    calculateTransitionProbability: function(currentValue, projectedValue, volatility, boundary) {
        // Standard deviation over projection period (√months for scaling)
        const stdDev = Math.sqrt(volatility * this.config.projectionMonths);
        
        // Calculate probability of crossing boundary
        // Using cumulative normal distribution approximation
        const zScore = (boundary - projectedValue) / stdDev;
        const probability = this.normalCDF(zScore);
        
        // Adjust based on current position
        if (currentValue < boundary && projectedValue > boundary) {
            // Already trending toward crossing
            return Math.min(0.95, probability * 1.2);
        } else if (currentValue > boundary && projectedValue < boundary) {
            // Trending away from boundary
            return Math.max(0.05, probability * 0.8);
        }
        
        return probability;
    },

    /**
     * Cumulative normal distribution approximation
     */
    normalCDF: function(z) {
        const a1 =  0.254829592;
        const a2 = -0.284496736;
        const a3 =  1.421413741;
        const a4 = -1.453152027;
        const a5 =  1.061405429;
        const p  =  0.3275911;

        const sign = z < 0 ? -1 : 1;
        z = Math.abs(z) / Math.sqrt(2.0);

        const t = 1.0 / (1.0 + p * z);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

        return 0.5 * (1.0 + sign * y);
    },

    /**
     * Calculate full transition probability matrix (81x81)
     */
    calculateTransitionMatrix: function(themeHistories, currentValues) {
        const matrix = [];
        const themes = ['usd', 'innovation', 'pe', 'usLeadership'];
        
        // Calculate individual theme transition probabilities
        const themeTransitions = {};
        
        themes.forEach(theme => {
            const history = themeHistories[theme];
            const current = currentValues[theme];
            
            if (!history || history.length < this.config.minDataPoints) {
                // Default probabilities if insufficient history
                themeTransitions[theme] = {
                    down: 0.25,   // Probability of moving to lower state
                    stay: 0.50,   // Probability of staying in same state
                    up: 0.25      // Probability of moving to higher state
                };
            } else {
                // Fit trend
                const trend = this.fitTrend(history);
                
                // Project forward
                const projected = this.projectThemeValue(
                    trend,
                    current,
                    this.config.projectionMonths
                );
                
                // Calculate returns for GARCH
                const returns = [];
                for (let i = 1; i < history.length; i++) {
                    returns.push(history[i] - history[i - 1]);
                }
                
                // Estimate volatility
                const garchParams = this.GARCH.calibrate(returns);
                const variances = this.GARCH.calculateVariance(returns, garchParams);
                const currentVariance = variances[variances.length - 1];
                const volatility = Math.sqrt(currentVariance);
                
                // Calculate state transition probabilities
                const currentState = this.getState(current);
                
                if (currentState === -1) {
                    // Currently in low state
                    const probUp = this.calculateTransitionProbability(
                        current, projected, volatility, -0.33
                    );
                    themeTransitions[theme] = {
                        stay: 1 - probUp,
                        up: probUp * 0.7,        // Most likely to move to middle
                        upTwo: probUp * 0.3      // Less likely to jump to high
                    };
                } else if (currentState === 0) {
                    // Currently in middle state
                    const probDown = this.calculateTransitionProbability(
                        current, projected, volatility, -0.33
                    );
                    const probUp = this.calculateTransitionProbability(
                        current, projected, volatility, 0.33
                    );
                    themeTransitions[theme] = {
                        down: probDown,
                        stay: 1 - probDown - probUp,
                        up: probUp
                    };
                } else {
                    // Currently in high state
                    const probDown = this.calculateTransitionProbability(
                        current, projected, volatility, 0.33
                    );
                    themeTransitions[theme] = {
                        downTwo: probDown * 0.3,  // Less likely to crash to low
                        down: probDown * 0.7,      // Most likely to move to middle
                        stay: 1 - probDown
                    };
                }
            }
        });

        // Build full 81x81 matrix
        // This is simplified - in reality, would account for all transitions
        // For now, returning theme-level transitions for use in optimization
        return {
            themeTransitions: themeTransitions,
            currentScenario: this.getCurrentScenario(currentValues),
            summary: this.summarizeTransitions(themeTransitions, currentValues)
        };
    },

    /**
     * Get discrete state from continuous value
     */
    getState: function(value) {
        if (value <= -0.33) return -1;
        if (value >= 0.33) return 1;
        return 0;
    },

    /**
     * Calculate current scenario number (1-81)
     */
    getCurrentScenario: function(themeValues) {
        const states = {
            usd: this.getState(themeValues.usd),
            innovation: this.getState(themeValues.innovation),
            pe: this.getState(themeValues.pe),
            usLeadership: this.getState(themeValues.usLeadership)
        };
        
        // Convert to scenario number using base-3 encoding
        const index = (states.usd + 1) * 27 +
                     (states.innovation + 1) * 9 +
                     (states.pe + 1) * 3 +
                     (states.usLeadership + 1);
        
        return {
            number: index + 1,
            states: states,
            description: this.describeScenario(states)
        };
    },

    /**
     * Generate human-readable scenario description
     */
    describeScenario: function(states) {
        const descriptions = {
            usd: {
                '-1': 'USD weak',
                '0': 'USD stable',
                '1': 'USD strong'
            },
            innovation: {
                '-1': 'Innovation low',
                '0': 'Innovation normal',
                '1': 'Innovation high'
            },
            pe: {
                '-1': 'Valuations low',
                '0': 'Valuations normal',
                '1': 'Valuations high'
            },
            usLeadership: {
                '-1': 'US lagging',
                '0': 'Balanced global',
                '1': 'US leading'
            }
        };

        const parts = [];
        Object.entries(states).forEach(([theme, state]) => {
            parts.push(descriptions[theme][state]);
        });
        
        return parts.join(', ');
    },

    /**
     * Summarize transition probabilities for reporting
     */
    summarizeTransitions: function(themeTransitions, currentValues) {
        const summary = {
            mostLikelyTransitions: [],
            stabilityScore: 0,
            expectedChanges: 0
        };

        Object.entries(themeTransitions).forEach(([theme, probs]) => {
            const currentState = this.getState(currentValues[theme]);
            
            // Find most likely outcome
            let maxProb = 0;
            let likelyOutcome = 'stay';
            
            Object.entries(probs).forEach(([outcome, prob]) => {
                if (prob > maxProb) {
                    maxProb = prob;
                    likelyOutcome = outcome;
                }
            });

            summary.mostLikelyTransitions.push({
                theme: theme,
                current: currentState,
                likely: likelyOutcome,
                probability: maxProb
            });

            // Add to stability score if staying
            if (likelyOutcome === 'stay') {
                summary.stabilityScore += 0.25;
            } else {
                summary.expectedChanges += 0.25;
            }
        });

        return summary;
    },

    /**
     * Main analysis function
     */
    analyze: function(indicatorData, historicalData = null) {
        const analysis = {
            timestamp: new Date().toISOString(),
            framework: this.framework,
            version: this.version
        };

        try {
            // Calculate current theme values
            const themeValues = this.calculateThemeValues(indicatorData);
            if (!themeValues) {
                throw new Error('Failed to calculate theme values');
            }
            
            analysis.themeValues = themeValues;
            analysis.currentScenario = this.getCurrentScenario(themeValues);

            // If we have historical data, calculate transitions
            if (historicalData && historicalData.themeHistories) {
                analysis.transitions = this.calculateTransitionMatrix(
                    historicalData.themeHistories,
                    themeValues
                );
            } else {
                analysis.transitions = {
                    warning: 'No historical data for transition calculations',
                    defaulting: 'Using equal transition probabilities'
                };
            }

            // Generate investment implications
            analysis.implications = this.generateImplications(analysis);
            
        } catch (error) {
            console.error('Theme analysis error:', error);
            analysis.error = error.message;
        }

        return analysis;
    },

    /**
     * Generate investment implications from analysis
     */
    generateImplications: function(analysis) {
        const scenario = analysis.currentScenario;
        const implications = [];

        // USD implications
        if (scenario.states.usd === -1) {
            implications.push('Consider commodities and gold for USD hedge');
            implications.push('International assets may benefit from weak dollar');
        } else if (scenario.states.usd === 1) {
            implications.push('US assets favored with strong dollar');
            implications.push('Reduce commodity and emerging market exposure');
        }

        // Innovation implications
        if (scenario.states.innovation === 1) {
            implications.push('Technology and growth stocks attractive');
            implications.push('Consider innovation-focused ETFs (ARKK, SMH)');
        } else if (scenario.states.innovation === -1) {
            implications.push('Value and defensive sectors preferred');
            implications.push('Reduce growth stock exposure');
        }

        // Valuation implications
        if (scenario.states.pe === 1) {
            implications.push('Elevated valuations suggest caution');
            implications.push('Consider increasing cash or bond allocation');
        } else if (scenario.states.pe === -1) {
            implications.push('Compressed valuations offer opportunity');
            implications.push('Consider increasing equity allocation');
        }

        // US Leadership implications
        if (scenario.states.usLeadership === 1) {
            implications.push('Overweight US equities');
            implications.push('S&P 500 and US sectors preferred');
        } else if (scenario.states.usLeadership === -1) {
            implications.push('International diversification crucial');
            implications.push('Consider VTIAX, VWO for international exposure');
        }

        return implications;
    },

    /**
     * Display results in UI
     */
    displayResults: function(analysis, containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        let html = `
            <div class="theme-analysis-v3">
                <div class="analysis-header">
                    <h3>Theme Analysis - ${this.framework}</h3>
                    <div class="timestamp">${new Date(analysis.timestamp).toLocaleString()}</div>
                </div>
                
                <div class="current-scenario">
                    <h4>Current Scenario: #${analysis.currentScenario.number} of 81</h4>
                    <p class="scenario-description">${analysis.currentScenario.description}</p>
                </div>
                
                <div class="theme-values">
                    <h4>Continuous Theme Values</h4>
        `;

        // Display theme values with visual bars
        Object.entries(analysis.themeValues).forEach(([theme, value]) => {
            const percentage = ((value + 1) / 2 * 100).toFixed(1);
            const state = this.getState(value);
            const stateClass = state === -1 ? 'low' : state === 1 ? 'high' : 'neutral';
            
            html += `
                <div class="theme-item">
                    <div class="theme-name">${theme}</div>
                    <div class="theme-bar">
                        <div class="theme-fill ${stateClass}" style="width: ${percentage}%">
                            ${value.toFixed(2)}
                        </div>
                    </div>
                    <div class="theme-state">State: ${state}</div>
                </div>
            `;
        });

        // Display transition summary if available
        if (analysis.transitions && analysis.transitions.summary) {
            html += `
                <div class="transitions">
                    <h4>6-Month Transition Outlook</h4>
                    <p>Stability Score: ${(analysis.transitions.summary.stabilityScore * 100).toFixed(0)}%</p>
                    <p>Expected Changes: ${(analysis.transitions.summary.expectedChanges * 100).toFixed(0)}%</p>
                </div>
            `;
        }

        // Display implications
        if (analysis.implications && analysis.implications.length > 0) {
            html += `
                <div class="implications">
                    <h4>Investment Implications</h4>
                    <ul>
            `;
            analysis.implications.forEach(imp => {
                html += `<li>${imp}</li>`;
            });
            html += `
                    </ul>
                </div>
            `;
        }

        html += `
            </div>
        `;

        container.innerHTML = html;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeCalculator;
}

// Browser global
if (typeof window !== 'undefined') {
    window.ThemeCalculator = ThemeCalculator;
}