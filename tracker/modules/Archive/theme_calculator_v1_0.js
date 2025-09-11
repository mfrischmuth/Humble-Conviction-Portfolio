/**
 * HCP Portfolio Tracker - Theme Calculator Module v1.0
 * File: theme_calculator_v1_0.js
 * Based on: IPS v3.9 (13 indicators, four themes, 16 scenarios)
 * Last Updated: 2025-08-29 19:30:00 UTC
 * 
 * HANDLES:
 * - Theme probability calculations with momentum and distance-to-trigger
 * - 16 scenario probability matrix (4x4 visualization)
 * - Three-tier weighting system (canary, primary, structural)
 * - Color-coded probability display
 * - Time-to-trigger estimates per IPS v3.7+
 */

const ThemeCalculator = {
    version: '1.0',
    
    // Four themes from IPS v3.9
    themes: {
        usd: {
            name: 'USD Dominance',
            description: 'Weakening USD enables international rotation',
            indicators: ['dxy', 'goldHoldings', 'yuanSwiftShare', 'reserveShare']
        },
        innovation: {
            name: 'AI Productivity Boom', 
            description: 'Technology-driven productivity acceleration',
            indicators: ['qqqSpyRatio', 'productivity', 'netMargins']
        },
        pe: {
            name: 'P/E Mean Reversion',
            description: 'Overvaluation correction',
            indicators: ['forwardPE', 'cape', 'riskPremium']
        },
        international: {
            name: 'International Outperformance',
            description: 'Non-US markets outperform',
            indicators: ['spVsWorld', 'usPercentACWI', 'ticFlows']
        }
    },

    // Calculate comprehensive theme analysis
    calculateThemeAnalysis: function(monthlyData, indicators) {
        if (!monthlyData || !monthlyData.indicators) {
            return { error: 'No monthly data available' };
        }

        const results = {
            themes: {},
            scenarios: [],
            summary: {},
            timestamp: new Date().toISOString()
        };

        // Calculate each theme probability
        Object.entries(this.themes).forEach(([themeKey, themeConfig]) => {
            const themeResult = this.calculateThemeProbability(
                monthlyData.indicators, 
                themeKey, 
                themeConfig, 
                indicators
            );
            results.themes[themeKey] = themeResult;
        });

        // Generate 16 scenarios
        results.scenarios = this.generateScenarios(results.themes);
        
        // Create summary statistics
        results.summary = this.generateSummary(results.themes, results.scenarios);

        return results;
    },

    // Calculate individual theme probability with three-tier weighting
    calculateThemeProbability: function(dataIndicators, themeKey, themeConfig, indicatorDefs) {
        const themeIndicators = indicatorDefs[themeKey] || {};
        const tierWeights = { canary: 0.5, primary: 0.3, structural: 0.2 };
        
        let weightedMomentum = 0;
        let totalWeight = 0;
        let indicatorResults = {};
        let confidence = 'high';

        // Process each indicator in the theme
        Object.entries(themeIndicators).forEach(([key, config]) => {
            const dataKey = config.dataKey;
            const indicator = dataIndicators[dataKey];
            
            if (indicator && indicator.current !== null && indicator.current !== undefined) {
                // Calculate enhanced momentum with distance-to-trigger
                const momentum = this.calculateEnhancedMomentum(indicator, config);
                
                // Apply three-tier weighting
                const tierWeight = tierWeights[config.tier] || 1.0;
                const indicatorWeight = config.weight || 1.0;
                const totalIndicatorWeight = tierWeight * indicatorWeight;
                
                weightedMomentum += momentum.score * totalIndicatorWeight;
                totalWeight += totalIndicatorWeight;
                
                indicatorResults[key] = {
                    ...momentum,
                    tier: config.tier,
                    weight: totalIndicatorWeight,
                    name: config.name
                };

                // Reduce confidence if data quality issues
                if (momentum.confidence !== 'high') {
                    confidence = momentum.confidence;
                }
            } else {
                indicatorResults[key] = {
                    score: 0,
                    probability: 0.5, // Neutral
                    confidence: 'missing',
                    message: 'No data available',
                    tier: config.tier,
                    name: config.name
                };
                confidence = 'low';
            }
        });

        // Calculate theme probability
        let themeProbability = 0.5; // Default neutral
        if (totalWeight > 0) {
            const avgMomentum = weightedMomentum / totalWeight;
            themeProbability = this.momentumToProbability(avgMomentum);
        }

        return {
            probability: Math.round(themeProbability * 1000) / 10, // Round to 0.1%
            confidence: confidence,
            momentum: weightedMomentum / (totalWeight || 1),
            weightUsed: totalWeight,
            indicators: indicatorResults,
            name: themeConfig.name,
            description: themeConfig.description
        };
    },

    // Enhanced momentum calculation per IPS v3.7+
    calculateEnhancedMomentum: function(indicator, config) {
        if (!indicator.history || indicator.history.length < 6) {
            return {
                score: 0,
                probability: 0.5,
                confidence: 'low',
                message: 'Insufficient history',
                timeToTrigger: null,
                distanceToTrigger: null
            };
        }

        const current = indicator.current;
        const history = indicator.history;
        
        // Calculate multi-period momentum (IPS v3.5 Appendix G)
        const momentum6mo = this.calculatePeriodMomentum(current, history, 6);
        const momentum3mo = this.calculatePeriodMomentum(current, history, 3);
        const momentum1mo = this.calculatePeriodMomentum(current, history, 1);
        
        // Weighted momentum: 50% 6mo, 30% 3mo, 20% 1mo
        const weightedMomentum = (momentum6mo * 0.5) + (momentum3mo * 0.3) + (momentum1mo * 0.2);
        
        // Calculate moving average and distance
        const ma6 = this.calculateMovingAverage(history.slice(-6));
        const distanceToTrigger = Math.abs(current - ma6) / ma6 * 100; // Percentage distance
        
        // Time-to-trigger estimation (IPS v3.7 physics model)
        const timeToTrigger = this.calculateTimeToTrigger(current, ma6, weightedMomentum);
        
        // Enhanced probability with distance component
        const rawProbability = this.momentumToProbability(weightedMomentum);
        const distanceAdjustment = this.calculateDistanceAdjustment(distanceToTrigger, timeToTrigger);
        const enhancedProbability = rawProbability * distanceAdjustment;
        
        // Determine confidence level
        let confidence = 'high';
        if (distanceToTrigger > 30) confidence = 'low';
        else if (distanceToTrigger > 15) confidence = 'medium';
        
        return {
            score: weightedMomentum,
            probability: Math.max(0.02, Math.min(0.98, enhancedProbability)),
            confidence: confidence,
            momentum: {
                '6mo': momentum6mo,
                '3mo': momentum3mo, 
                '1mo': momentum1mo,
                weighted: weightedMomentum
            },
            distanceToTrigger: Math.round(distanceToTrigger * 10) / 10,
            timeToTrigger: timeToTrigger,
            message: this.getMomentumMessage(weightedMomentum, distanceToTrigger, timeToTrigger)
        };
    },

    // Calculate period-specific momentum
    calculatePeriodMomentum: function(current, history, monthsBack) {
        if (history.length < monthsBack) return 0;
        
        const previous = history[history.length - monthsBack];
        if (!previous || previous === 0) return 0;
        
        return (current - previous) / Math.abs(previous);
    },

    // Calculate moving average
    calculateMovingAverage: function(values) {
        if (!values || values.length === 0) return 0;
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    },

    // Convert momentum to probability
    momentumToProbability: function(momentum) {
        // Sigmoid transformation: momentum [-1,1] -> probability [0.02, 0.98]
        const sigmoid = 1 / (1 + Math.exp(-momentum * 3));
        return Math.max(0.02, Math.min(0.98, sigmoid));
    },

    // Calculate time to trigger (IPS v3.7 physics model)
    calculateTimeToTrigger: function(current, target, momentum) {
        if (Math.abs(momentum) < 0.01) return null; // No meaningful momentum
        
        const distance = Math.abs(current - target);
        const velocity = Math.abs(momentum * current / 12); // Monthly velocity
        
        if (velocity === 0) return null;
        
        const monthsToTrigger = distance / velocity;
        return Math.round(monthsToTrigger * 10) / 10;
    },

    // Calculate distance adjustment factor
    calculateDistanceAdjustment: function(distance, timeToTrigger) {
        if (timeToTrigger === null) return 0.5;
        
        // Near trigger (< 3 months): Full probability
        if (timeToTrigger < 3) return 1.0;
        
        // Medium distance (3-12 months): Moderate adjustment
        if (timeToTrigger < 12) return 0.8;
        
        // Far from trigger (> 12 months): Reduced probability
        return 0.3;
    },

    // Generate descriptive message
    getMomentumMessage: function(momentum, distance, timeToTrigger) {
        if (timeToTrigger === null) return 'No clear momentum direction';
        
        const direction = momentum > 0 ? 'toward trigger' : 'away from trigger';
        const timeDesc = timeToTrigger < 3 ? 'Very close' : 
                        timeToTrigger < 12 ? 'Moderate distance' : 'Far from trigger';
        
        return `${timeDesc}, moving ${direction} (${timeToTrigger}mo)`;
    },

    // Generate all 16 scenarios
    generateScenarios: function(themes) {
        const scenarios = [];
        const themeKeys = ['usd', 'innovation', 'pe', 'international'];
        
        // Generate all 16 combinations (2^4)
        for (let i = 0; i < 16; i++) {
            const binary = i.toString(2).padStart(4, '0');
            const scenario = {
                id: i,
                code: binary,
                name: this.generateScenarioName(binary),
                themes: {
                    usd: binary[0] === '1',
                    innovation: binary[1] === '1', 
                    pe: binary[2] === '1',
                    international: binary[3] === '1'
                }
            };
            
            // Calculate scenario probability
            scenario.probability = this.calculateScenarioProbability(scenario.themes, themes);
            scenario.color = this.getScenarioColor(scenario.probability);
            
            scenarios.push(scenario);
        }
        
        // Sort by probability (descending)
        scenarios.sort((a, b) => b.probability - a.probability);
        
        // Add rank
        scenarios.forEach((scenario, index) => {
            scenario.rank = index + 1;
        });
        
        return scenarios;
    },

    // Calculate individual scenario probability
    calculateScenarioProbability: function(scenarioThemes, themeResults) {
        let probability = 1.0;
        
        Object.entries(scenarioThemes).forEach(([theme, triggered]) => {
            const themeProb = (themeResults[theme]?.probability || 50) / 100;
            probability *= triggered ? themeProb : (1 - themeProb);
        });
        
        return Math.round(probability * 1000) / 10; // Round to 0.1%
    },

    // Generate scenario name
    generateScenarioName: function(binary) {
        const names = [];
        if (binary[0] === '1') names.push('USD↓');
        if (binary[1] === '1') names.push('AI↑');
        if (binary[2] === '1') names.push('P/E↓');
        if (binary[3] === '1') names.push('INTL↑');
        
        return names.length > 0 ? names.join(' + ') : 'Base Case';
    },

    // Get color based on probability
    getScenarioColor: function(probability) {
        if (probability >= 15) return '#dc3545'; // High probability - red
        if (probability >= 10) return '#fd7e14'; // Medium-high - orange  
        if (probability >= 7) return '#ffc107';  // Medium - yellow
        if (probability >= 4) return '#28a745';  // Medium-low - green
        return '#6c757d'; // Low probability - gray
    },

    // Generate analysis summary
    generateSummary: function(themes, scenarios) {
        const topScenarios = scenarios.slice(0, 5);
        const topProbability = topScenarios.reduce((sum, s) => sum + s.probability, 0);
        
        // Find dominant themes
        const themeStrengths = Object.entries(themes).map(([key, data]) => ({
            theme: key,
            name: data.name,
            probability: data.probability,
            confidence: data.confidence
        })).sort((a, b) => b.probability - a.probability);
        
        return {
            dominantScenario: scenarios[0],
            topFiveConcentration: Math.round(topProbability * 10) / 10,
            strongestTheme: themeStrengths[0],
            weakestTheme: themeStrengths[themeStrengths.length - 1],
            averageConfidence: this.calculateAverageConfidence(themes),
            uncertainty: this.calculateUncertainty(scenarios)
        };
    },

    // Calculate average confidence across themes
    calculateAverageConfidence: function(themes) {
        const confidenceValues = { high: 3, medium: 2, low: 1, missing: 0 };
        const scores = Object.values(themes).map(t => confidenceValues[t.confidence] || 0);
        const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
        
        if (avgScore >= 2.5) return 'high';
        if (avgScore >= 1.5) return 'medium';
        return 'low';
    },

    // Calculate uncertainty (entropy-like measure)
    calculateUncertainty: function(scenarios) {
        const totalProb = scenarios.reduce((sum, s) => sum + s.probability, 0);
        if (totalProb === 0) return 'maximum';
        
        // Calculate concentration - if top 3 scenarios have >60%, low uncertainty
        const topThree = scenarios.slice(0, 3).reduce((sum, s) => sum + s.probability, 0);
        
        if (topThree >= 60) return 'low';
        if (topThree >= 40) return 'medium';
        return 'high';
    },

    // Display theme analysis results
    displayThemeResults: function(results, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return false;
        
        let html = '<div class="theme-analysis-results">';
        
        // Summary section
        html += '<div class="analysis-summary">';
        html += `<h3>Analysis Summary</h3>`;
        html += `<div class="summary-grid">`;
        html += `<div class="summary-item">
            <div class="summary-label">Dominant Scenario</div>
            <div class="summary-value">${results.summary.dominantScenario.name} (${results.summary.dominantScenario.probability}%)</div>
        </div>`;
        html += `<div class="summary-item">
            <div class="summary-label">Top 5 Concentration</div>
            <div class="summary-value">${results.summary.topFiveConcentration}%</div>
        </div>`;
        html += `<div class="summary-item">
            <div class="summary-label">Uncertainty Level</div>
            <div class="summary-value uncertainty-${results.summary.uncertainty}">${results.summary.uncertainty.toUpperCase()}</div>
        </div>`;
        html += `<div class="summary-item">
            <div class="summary-label">Data Confidence</div>
            <div class="summary-value confidence-${results.summary.averageConfidence}">${results.summary.averageConfidence.toUpperCase()}</div>
        </div>`;
        html += `</div></div>`;
        
        // Theme probabilities
        html += '<div class="theme-probabilities">';
        html += '<h3>Theme Probabilities</h3>';
        Object.entries(results.themes).forEach(([key, theme]) => {
            const percentage = theme.probability;
            html += `
                <div class="theme-item">
                    <div class="theme-header">
                        <div class="theme-name">${theme.name}</div>
                        <div class="theme-probability">${percentage}%</div>
                    </div>
                    <div class="theme-bar">
                        <div class="theme-fill theme-${key}" style="width: ${percentage}%"></div>
                    </div>
                    <div class="theme-details">
                        <span class="confidence-badge confidence-${theme.confidence}">${theme.confidence}</span>
                        <span class="theme-description">${theme.description}</span>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        // Scenario matrix (4x4 grid)
        html += '<div class="scenario-matrix">';
        html += '<h3>Scenario Probability Matrix</h3>';
        html += '<div class="matrix-grid">';
        
        results.scenarios.forEach((scenario, index) => {
            const isTop5 = index < 5;
            html += `
                <div class="scenario-cell ${isTop5 ? 'top-scenario' : ''}" 
                     style="background-color: ${scenario.color}15; border-left: 4px solid ${scenario.color};">
                    <div class="scenario-rank">#${scenario.rank}</div>
                    <div class="scenario-name">${scenario.name}</div>
                    <div class="scenario-probability">${scenario.probability}%</div>
                    <div class="scenario-code">${scenario.code}</div>
                </div>
            `;
        });
        
        html += '</div></div>';
        html += '</div>';
        
        container.innerHTML = html;
        return true;
    },

    // CSS styles for the display
    getRequiredCSS: function() {
        return `
            .theme-analysis-results {
                background: white;
                border-radius: 10px;
                padding: 20px;
                margin: 20px 0;
            }
            
            .analysis-summary {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 25px;
            }
            
            .summary-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin-top: 15px;
            }
            
            .summary-item {
                background: white;
                padding: 12px;
                border-radius: 6px;
                text-align: center;
            }
            
            .summary-label {
                font-size: 0.9em;
                color: #6c757d;
                margin-bottom: 5px;
            }
            
            .summary-value {
                font-size: 1.1em;
                font-weight: bold;
                color: #333;
            }
            
            .theme-probabilities {
                margin-bottom: 25px;
            }
            
            .theme-item {
                margin-bottom: 20px;
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
            }
            
            .theme-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            
            .theme-name {
                font-weight: bold;
                font-size: 1.1em;
            }
            
            .theme-probability {
                font-size: 1.2em;
                font-weight: bold;
                color: #667eea;
            }
            
            .theme-bar {
                background: #e9ecef;
                border-radius: 10px;
                height: 25px;
                position: relative;
                overflow: hidden;
                margin-bottom: 10px;
            }
            
            .theme-fill {
                height: 100%;
                border-radius: 10px;
                transition: width 0.5s ease;
            }
            
            .theme-usd { background: linear-gradient(90deg, #dc3545, #c82333); }
            .theme-innovation { background: linear-gradient(90deg, #007bff, #0056b3); }
            .theme-pe { background: linear-gradient(90deg, #ffc107, #e0a800); }
            .theme-international { background: linear-gradient(90deg, #28a745, #218838); }
            
            .theme-details {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .confidence-badge {
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 0.8em;
                font-weight: bold;
                text-transform: uppercase;
            }
            
            .confidence-high { background: #d4edda; color: #155724; }
            .confidence-medium { background: #fff3cd; color: #856404; }
            .confidence-low { background: #f8d7da; color: #721c24; }
            
            .theme-description {
                color: #6c757d;
                font-size: 0.9em;
            }
            
            .scenario-matrix {
                margin-top: 25px;
            }
            
            .matrix-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 12px;
                margin-top: 15px;
            }
            
            .scenario-cell {
                background: white;
                border: 1px solid #dee2e6;
                border-radius: 8px;
                padding: 12px;
                text-align: center;
                transition: all 0.3s ease;
            }
            
            .scenario-cell:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            
            .top-scenario {
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .scenario-rank {
                font-size: 0.8em;
                color: #6c757d;
                margin-bottom: 4px;
            }
            
            .scenario-name {
                font-weight: bold;
                margin-bottom: 6px;
                min-height: 20px;
            }
            
            .scenario-probability {
                font-size: 1.3em;
                font-weight: bold;
                color: #667eea;
                margin-bottom: 4px;
            }
            
            .scenario-code {
                font-family: monospace;
                font-size: 0.8em;
                color: #6c757d;
            }
            
            .uncertainty-high { color: #dc3545; }
            .uncertainty-medium { color: #ffc107; }
            .uncertainty-low { color: #28a745; }
        `;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeCalculator;
}