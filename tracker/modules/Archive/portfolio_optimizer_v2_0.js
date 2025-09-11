/**
 * HCP Portfolio Optimizer v2.0 - Regret Minimization Framework
 * File: portfolio_optimizer_v2_0.js
 * Based on: IPS v3.10 Complete Implementation Framework
 * Last Updated: 2025-09-02 21:00:00 UTC
 * 
 * IMPLEMENTS SOPHISTICATED REGRET MINIMIZATION:
 * - 6-Step portfolio optimization process per IPS v3.10
 * - Dual optimization: α × Max_Regret + (1-α) × Weighted_Regret
 * - Smart hedging protocols with correlation assessment
 * - Complete 12-asset security universe from IPS v3.10
 * - Security-specific trading rules (PIMIX hold-only, PYLD primary income)
 * 
 * REPLACES: PortfolioOptimizer v1.0 (completely incorrect approach)
 * INTEGRATION: Designed for integration_test_v3_3.html then HCP Tracker v6.5.5+
 */

const PortfolioOptimizer = {
    version: '2.0',
    framework: 'IPS v3.10 Regret Minimization',
    lastUpdated: '2025-09-02T21:00:00.000Z',
    
    // IPS v3.10 Complete Security Universe (12 Assets)
    securities: {
        // Equity Exposures (5)
        VTI: { name: 'US Total Market', type: 'equity', category: 'us_equity' },
        VEA: { name: 'Developed International', type: 'equity', category: 'intl_equity' },
        VWO: { name: 'Emerging Markets', type: 'equity', category: 'intl_equity' },
        SMH: { name: 'Semiconductors', type: 'equity', category: 'tech_equity' },
        SRVR: { name: 'Infrastructure/Data Centers', type: 'equity', category: 'tech_equity' },
        
        // Income Exposures (2)
        PIMIX: { name: 'PIMCO Income Fund', type: 'income', category: 'income', holdOnly: true },
        PYLD: { name: 'PIMCO Yield Opportunities', type: 'income', category: 'income', primaryIncome: true },
        
        // Alternative Exposures (4)
        GLD: { name: 'Gold', type: 'alternative', category: 'commodities' },
        COM: { name: 'Commodities', type: 'alternative', category: 'commodities' },
        IGF: { name: 'Global Infrastructure', type: 'alternative', category: 'infrastructure' },
        DBMF: { name: 'Managed Futures', type: 'alternative', category: 'hedge' },
        
        // Cash (1)
        SWVXX: { name: 'Money Market', type: 'cash', category: 'cash' }
    },

    // IPS v3.10 Position Limits and Risk Constraints
    constraints: {
        maxSinglePosition: 0.35,        // 35% maximum single position
        maxSectorConcentration: 0.50,   // 50% maximum sector concentration
        minCashPosition: 0.01,          // 1% minimum cash
        maxAlternatives: 0.30,          // 30% maximum alternatives combined
        maxDBMF: 0.15,                  // 15% maximum DBMF (hedging limit)
        maxIncome: 0.30,                // 30% maximum combined income
        maxRegretTarget: {              // Variable based on correlation
            high: 0.05,                 // 5% max regret if correlation > 0.7
            medium: 0.06,               // 6% max regret if correlation 0.5-0.7
            low: 0.08                   // 8% max regret if correlation < 0.5
        }
    },

    // Theme-Based Portfolio Tilts (IPS v3.10 Specifications)
    themeTilts: {
        usd: {  // USD Dominance Decline theme
            name: 'USD Dominance Decline',
            positive: { VEA: 0.05, VWO: 0.05, GLD: 0.03, COM: 0.02 },  // Increase these
            negative: { VTI: -0.05, SWVXX: -0.10 }                      // Decrease these
        },
        ai: {   // AI Productivity Boom theme  
            name: 'AI Productivity Boom',
            positive: { SMH: 0.08, SRVR: 0.05, VTI: 0.02 },            // Increase tech
            negative: { VEA: -0.03, PYLD: -0.02 }                       // Decrease traditional
        },
        pe: {   // P/E Mean Reversion theme
            name: 'P/E Mean Reversion', 
            positive: { PYLD: 0.05, GLD: 0.03, SWVXX: 0.05 },          // Increase defensive
            negative: { SMH: -0.05, VTI: -0.03, VWO: -0.02 }           // Decrease growth
        },
        intl: { // International Outperformance theme
            name: 'International Outperformance',
            positive: { VEA: 0.08, VWO: 0.05, IGF: 0.02 },             // Increase international
            negative: { VTI: -0.10, SMH: -0.03, SRVR: -0.02 }          // Decrease US equity
        }
    },

    /**
     * STEP 1: SCENARIO SELECTION
     * Select scenarios for optimization based on IPS v3.10 criteria
     */
    selectScenariosForOptimization: function(scenarioProbabilities) {
        console.log('=== Step 1: Scenario Selection ===');
        
        // Sort scenarios by probability (highest first)
        const sortedScenarios = [...scenarioProbabilities].sort((a, b) => b.probability - a.probability);
        
        let selectedScenarios = [];
        let cumulativeProbability = 0;
        
        // Include until cumulative ≥ 85%
        for (const scenario of sortedScenarios) {
            selectedScenarios.push(scenario);
            cumulativeProbability += scenario.probability;
            
            if (cumulativeProbability >= 0.85 && selectedScenarios.length >= 3) {
                break;
            }
            
            // Maximum 6 scenarios
            if (selectedScenarios.length >= 6) {
                break;
            }
        }
        
        // Include any scenario ≥ 10% probability regardless
        for (const scenario of sortedScenarios) {
            if (scenario.probability >= 0.10 && !selectedScenarios.some(s => s.id === scenario.id)) {
                selectedScenarios.push(scenario);
            }
        }
        
        // Ensure minimum 3 scenarios
        if (selectedScenarios.length < 3) {
            selectedScenarios = sortedScenarios.slice(0, 3);
        }
        
        const finalCumulative = selectedScenarios.reduce((sum, s) => sum + s.probability, 0);
        
        console.log(`Selected ${selectedScenarios.length} scenarios (${(finalCumulative*100).toFixed(1)}% cumulative):`, 
                   selectedScenarios.map(s => `S${s.id}:${(s.probability*100).toFixed(1)}%`));
        
        return {
            scenarios: selectedScenarios,
            cumulativeProbability: finalCumulative,
            selectionCriteria: {
                targetCumulative: 0.85,
                actualCumulative: finalCumulative,
                minScenarios: 3,
                maxScenarios: 6,
                selectedCount: selectedScenarios.length
            }
        };
    },

    /**
     * STEP 2: INDIVIDUAL SCENARIO OPTIMIZATION
     * Create optimal allocation for each selected scenario with theme tilts
     */
    optimizeIndividualScenarios: function(selectedScenarios) {
        console.log('=== Step 2: Individual Scenario Optimization ===');
        
        const scenarioAllocations = {};
        
        for (const scenario of selectedScenarios) {
            const allocation = this.createScenarioOptimalAllocation(scenario);
            scenarioAllocations[scenario.id] = allocation;
            
            console.log(`S${scenario.id} optimal allocation:`, this.formatAllocationSummary(allocation));
        }
        
        return scenarioAllocations;
    },

    /**
     * Create optimal allocation for a specific scenario using theme tilts
     */
    createScenarioOptimalAllocation: function(scenario) {
        // Start with baseline allocation
        let allocation = this.getBaselineAllocation();
        
        // Apply theme tilts based on active themes in scenario
        const activeThemes = this.getActiveThemes(scenario);
        
        for (const themeKey of activeThemes) {
            if (this.themeTilts[themeKey]) {
                allocation = this.applyThemeTilt(allocation, this.themeTilts[themeKey]);
            }
        }
        
        // Apply constraints and normalize
        allocation = this.applyConstraints(allocation);
        allocation = this.normalizeAllocation(allocation);
        
        return allocation;
    },

    /**
     * Get baseline allocation (neutral scenario)
     */
    getBaselineAllocation: function() {
        return {
            VTI: 0.35,      // US equity core
            VEA: 0.20,      // International developed
            VWO: 0.10,      // Emerging markets
            SMH: 0.08,      // Tech/semiconductors
            SRVR: 0.05,     // Infrastructure
            PYLD: 0.12,     // Primary income
            PIMIX: 0.03,    // Legacy income (hold-only)
            GLD: 0.02,      // Gold hedge
            COM: 0.01,      // Commodities
            IGF: 0.02,      // Infrastructure
            DBMF: 0.01,     // Managed futures
            SWVXX: 0.01     // Cash minimum
        };
    },

    /**
     * Determine active themes from scenario binary representation
     */
    getActiveThemes: function(scenario) {
        const activeThemes = [];
        
        // Parse scenario binary (format: ABCD where A=USD, B=AI, C=PE, D=INTL)
        const binary = scenario.binary || scenario.id.toString(2).padStart(4, '0');
        
        if (binary[0] === '1') activeThemes.push('usd');   // USD Decline active
        if (binary[1] === '1') activeThemes.push('ai');    // AI Boom active
        if (binary[2] === '1') activeThemes.push('pe');    // P/E Reversion active
        if (binary[3] === '1') activeThemes.push('intl');  // International active
        
        return activeThemes;
    },

    /**
     * Apply theme tilt to allocation
     */
    applyThemeTilt: function(allocation, tilt) {
        const newAllocation = {...allocation};
        
        // Apply positive tilts
        for (const [security, tiltAmount] of Object.entries(tilt.positive || {})) {
            if (newAllocation[security] !== undefined) {
                newAllocation[security] += tiltAmount;
            }
        }
        
        // Apply negative tilts
        for (const [security, tiltAmount] of Object.entries(tilt.negative || {})) {
            if (newAllocation[security] !== undefined) {
                newAllocation[security] += tiltAmount; // tiltAmount is already negative
            }
        }
        
        return newAllocation;
    },

    /**
     * STEP 3: REGRET MATRIX CALCULATION
     * Calculate regret for each allocation across all scenarios
     */
    calculateRegretMatrix: function(scenarioAllocations, selectedScenarios) {
        console.log('=== Step 3: Regret Matrix Calculation ===');
        
        const regretMatrix = {};
        const returnMatrix = {};
        
        // Calculate expected returns for each allocation in each scenario
        for (const [allocId, allocation] of Object.entries(scenarioAllocations)) {
            returnMatrix[allocId] = {};
            regretMatrix[allocId] = {};
            
            for (const scenario of selectedScenarios) {
                const expectedReturn = this.calculateExpectedReturn(allocation, scenario);
                returnMatrix[allocId][scenario.id] = expectedReturn;
            }
        }
        
        // Calculate regret: Return(portfolio, scenario) - Return(optimal_for_scenario, scenario)
        for (const [allocId, allocation] of Object.entries(scenarioAllocations)) {
            for (const scenario of selectedScenarios) {
                const portfolioReturn = returnMatrix[allocId][scenario.id];
                const optimalReturn = returnMatrix[scenario.id][scenario.id]; // Scenario's own optimal return
                const regret = portfolioReturn - optimalReturn;
                
                regretMatrix[allocId][scenario.id] = regret;
            }
        }
        
        // Calculate summary statistics
        const regretSummary = this.calculateRegretSummary(regretMatrix, selectedScenarios);
        
        console.log('Regret Matrix Summary:', regretSummary);
        
        return {
            regretMatrix: regretMatrix,
            returnMatrix: returnMatrix,
            summary: regretSummary
        };
    },

    /**
     * Calculate expected return for allocation in specific scenario
     */
    calculateExpectedReturn: function(allocation, scenario) {
        // Simplified expected return calculation based on theme strength
        // In production, this would use detailed asset return models
        
        const activeThemes = this.getActiveThemes(scenario);
        let expectedReturn = 0.08; // Base 8% return assumption
        
        // Theme-based return adjustments
        const themeReturns = {
            usd: { VEA: 0.03, VWO: 0.04, GLD: 0.15, COM: 0.08, VTI: -0.02 },
            ai: { SMH: 0.18, SRVR: 0.12, VTI: 0.03, VEA: -0.01 },
            pe: { PYLD: 0.06, GLD: 0.08, SWVXX: 0.02, SMH: -0.08, VTI: -0.05 },
            intl: { VEA: 0.08, VWO: 0.12, IGF: 0.06, VTI: -0.03, SMH: -0.02 }
        };
        
        let themeAdjustment = 0;
        for (const theme of activeThemes) {
            if (themeReturns[theme]) {
                for (const [security, weight] of Object.entries(allocation)) {
                    const themeReturn = themeReturns[theme][security] || 0;
                    themeAdjustment += weight * themeReturn;
                }
            }
        }
        
        return expectedReturn + themeAdjustment;
    },

    /**
     * Calculate regret matrix summary statistics
     */
    calculateRegretSummary: function(regretMatrix, selectedScenarios) {
        const summary = {};
        
        for (const [allocId, regrets] of Object.entries(regretMatrix)) {
            const regretValues = Object.values(regrets);
            const maxRegret = Math.min(...regretValues); // Most negative = worst regret
            
            // Probability-weighted regret
            let weightedRegret = 0;
            for (const scenario of selectedScenarios) {
                weightedRegret += scenario.probability * regrets[scenario.id];
            }
            
            summary[allocId] = {
                maxRegret: maxRegret,
                weightedRegret: weightedRegret,
                regretRange: Math.max(...regretValues) - Math.min(...regretValues),
                scenarios: regrets
            };
        }
        
        return summary;
    },

    /**
     * STEP 4: DUAL OPTIMIZATION
     * Find optimal α parameter and blended allocation
     */
    runDualOptimization: function(regretMatrix, selectedScenarios, regretSummary) {
        console.log('=== Step 4: Dual Optimization ===');
        
        const alphaRange = [0.3, 0.4, 0.5, 0.6, 0.7]; // Test alpha values
        let bestResult = null;
        let bestScore = Infinity;
        
        for (const alpha of alphaRange) {
            let bestAllocForAlpha = null;
            let bestScoreForAlpha = Infinity;
            
            // Test each scenario allocation with this alpha
            for (const [allocId, summary] of Object.entries(regretSummary)) {
                const dualScore = alpha * Math.abs(summary.maxRegret) + (1 - alpha) * Math.abs(summary.weightedRegret);
                
                if (dualScore < bestScoreForAlpha) {
                    bestScoreForAlpha = dualScore;
                    bestAllocForAlpha = allocId;
                }
            }
            
            if (bestScoreForAlpha < bestScore) {
                bestScore = bestScoreForAlpha;
                bestResult = {
                    alpha: alpha,
                    allocation: bestAllocForAlpha,
                    score: bestScoreForAlpha,
                    maxRegret: regretSummary[bestAllocForAlpha].maxRegret,
                    weightedRegret: regretSummary[bestAllocForAlpha].weightedRegret
                };
            }
        }
        
        console.log(`Best dual optimization result: α=${bestResult.alpha}, Score=${bestResult.score.toFixed(4)}`);
        console.log(`Max Regret: ${(bestResult.maxRegret*100).toFixed(2)}%, Weighted Regret: ${(bestResult.weightedRegret*100).toFixed(2)}%`);
        
        return bestResult;
    },

    /**
     * STEP 5: SMART HEDGING PROTOCOL
     * Apply smart hedging if regret exceeds tolerance
     */
    applySmartHedging: function(dualOptResult, scenarioAllocations, selectedScenarios) {
        console.log('=== Step 5: Smart Hedging Protocol ===');
        
        let finalAllocation = scenarioAllocations[dualOptResult.allocation];
        const maxRegretPercent = Math.abs(dualOptResult.maxRegret);
        
        // Assess portfolio correlation
        const correlation = this.assessPortfolioCorrelation(scenarioAllocations, selectedScenarios);
        let regretTolerance;
        
        if (correlation > 0.7) {
            regretTolerance = this.constraints.maxRegretTarget.high; // 5%
        } else if (correlation > 0.5) {
            regretTolerance = this.constraints.maxRegretTarget.medium; // 6%
        } else {
            regretTolerance = this.constraints.maxRegretTarget.low; // 8%
        }
        
        console.log(`Portfolio correlation: ${correlation.toFixed(3)}, Regret tolerance: ${(regretTolerance*100).toFixed(1)}%`);
        console.log(`Current max regret: ${(maxRegretPercent*100).toFixed(2)}%`);
        
        if (maxRegretPercent > regretTolerance) {
            console.log('Regret exceeds tolerance - applying smart hedging');
            
            const hedgingResult = this.determineHedgingStrategy(selectedScenarios, finalAllocation);
            finalAllocation = this.applyHedging(finalAllocation, hedgingResult);
            
            return {
                allocation: finalAllocation,
                hedgingApplied: true,
                hedgingReason: hedgingResult.reason,
                hedgeAmount: hedgingResult.amount,
                regretTolerance: regretTolerance,
                originalMaxRegret: maxRegretPercent
            };
        }
        
        return {
            allocation: finalAllocation,
            hedgingApplied: false,
            regretTolerance: regretTolerance,
            maxRegret: maxRegretPercent
        };
    },

    /**
     * Assess correlation between scenario allocations
     */
    assessPortfolioCorrelation: function(scenarioAllocations, selectedScenarios) {
        const allocations = selectedScenarios.map(s => scenarioAllocations[s.id]);
        const securities = Object.keys(this.securities);
        
        let totalCorrelation = 0;
        let pairCount = 0;
        
        for (let i = 0; i < allocations.length; i++) {
            for (let j = i + 1; j < allocations.length; j++) {
                const corr = this.calculateAllocationCorrelation(allocations[i], allocations[j], securities);
                totalCorrelation += corr;
                pairCount++;
            }
        }
        
        return pairCount > 0 ? totalCorrelation / pairCount : 0;
    },

    /**
     * Calculate correlation between two allocations
     */
    calculateAllocationCorrelation: function(alloc1, alloc2, securities) {
        const values1 = securities.map(s => alloc1[s] || 0);
        const values2 = securities.map(s => alloc2[s] || 0);
        
        const mean1 = values1.reduce((sum, v) => sum + v, 0) / values1.length;
        const mean2 = values2.reduce((sum, v) => sum + v, 0) / values2.length;
        
        let numerator = 0;
        let sumSquares1 = 0;
        let sumSquares2 = 0;
        
        for (let i = 0; i < values1.length; i++) {
            const diff1 = values1[i] - mean1;
            const diff2 = values2[i] - mean2;
            numerator += diff1 * diff2;
            sumSquares1 += diff1 * diff1;
            sumSquares2 += diff2 * diff2;
        }
        
        const denominator = Math.sqrt(sumSquares1 * sumSquares2);
        return denominator > 0 ? numerator / denominator : 0;
    },

    /**
     * Determine appropriate hedging strategy
     */
    determineHedgingStrategy: function(selectedScenarios, allocation) {
        // Analyze scenario divergence to determine hedge type
        const geographicDivergence = this.assessGeographicDivergence(selectedScenarios);
        const volatilityDivergence = this.assessVolatilityDivergence(selectedScenarios);
        const assetClassDivergence = this.assessAssetClassDivergence(selectedScenarios);
        
        if (volatilityDivergence > 0.6) {
            return { type: 'volatility', hedge: 'DBMF', amount: 0.05, reason: 'High volatility divergence' };
        } else if (geographicDivergence > 0.5) {
            return { type: 'geographic', hedge: 'VEA', amount: 0.03, reason: 'Geographic divergence' };
        } else if (assetClassDivergence > 0.5) {
            return { type: 'asset_class', hedge: 'IGF', amount: 0.03, reason: 'Asset class divergence' };
        } else {
            return { type: 'cash', hedge: 'SWVXX', amount: 0.02, reason: 'Irreconcilable scenarios' };
        }
    },

    /**
     * Assess geographic divergence between scenarios
     */
    assessGeographicDivergence: function(scenarios) {
        // Simple heuristic based on international theme prevalence
        const intlActive = scenarios.filter(s => this.getActiveThemes(s).includes('intl')).length;
        return intlActive / scenarios.length;
    },

    /**
     * Assess volatility divergence between scenarios
     */
    assessVolatilityDivergence: function(scenarios) {
        // Heuristic based on theme combinations that create volatility
        let volatilityScenarios = 0;
        for (const scenario of scenarios) {
            const themes = this.getActiveThemes(scenario);
            if (themes.length >= 3 || themes.includes('ai') && themes.includes('pe')) {
                volatilityScenarios++;
            }
        }
        return volatilityScenarios / scenarios.length;
    },

    /**
     * Assess asset class divergence
     */
    assessAssetClassDivergence: function(scenarios) {
        // Heuristic based on defensive vs growth theme conflicts
        let conflictScenarios = 0;
        for (const scenario of scenarios) {
            const themes = this.getActiveThemes(scenario);
            if (themes.includes('ai') && themes.includes('pe')) {
                conflictScenarios++; // Growth vs defensive conflict
            }
        }
        return conflictScenarios / scenarios.length;
    },

    /**
     * Apply hedging to allocation
     */
    applyHedging: function(allocation, hedgingResult) {
        const newAllocation = {...allocation};
        const hedgeAmount = hedgingResult.amount;
        const hedgeSecurity = hedgingResult.hedge;
        
        // Add hedge position
        newAllocation[hedgeSecurity] = (newAllocation[hedgeSecurity] || 0) + hedgeAmount;
        
        // Reduce other positions proportionally
        const totalToReduce = hedgeAmount;
        const nonHedgeTotal = 1 - (newAllocation[hedgeSecurity] || 0);
        
        for (const [security, weight] of Object.entries(newAllocation)) {
            if (security !== hedgeSecurity && weight > 0) {
                const reduction = (weight / nonHedgeTotal) * totalToReduce;
                newAllocation[security] = Math.max(0, weight - reduction);
            }
        }
        
        return this.normalizeAllocation(newAllocation);
    },

    /**
     * STEP 6: FINAL VALIDATION
     * Apply constraints and validate final allocation
     */
    validateFinalAllocation: function(allocation, hedgingResult) {
        console.log('=== Step 6: Final Validation ===');
        
        let validatedAllocation = {...allocation};
        const validationResults = {
            constraintViolations: [],
            adjustmentsMade: [],
            finalAllocation: null,
            validationPassed: true
        };
        
        // Apply all constraints
        validatedAllocation = this.applyConstraints(validatedAllocation);
        
        // Check position limits
        for (const [security, weight] of Object.entries(validatedAllocation)) {
            if (weight > this.constraints.maxSinglePosition) {
                validationResults.constraintViolations.push(
                    `${security} exceeds max position limit: ${(weight*100).toFixed(1)}% > ${(this.constraints.maxSinglePosition*100).toFixed(1)}%`
                );
            }
        }
        
        // Check sector concentrations
        const sectorWeights = this.calculateSectorWeights(validatedAllocation);
        for (const [sector, weight] of Object.entries(sectorWeights)) {
            if (weight > this.constraints.maxSectorConcentration) {
                validationResults.constraintViolations.push(
                    `${sector} sector exceeds concentration limit: ${(weight*100).toFixed(1)}% > ${(this.constraints.maxSectorConcentration*100).toFixed(1)}%`
                );
            }
        }
        
        // Ensure normalization
        validatedAllocation = this.normalizeAllocation(validatedAllocation);
        
        validationResults.finalAllocation = validatedAllocation;
        validationResults.validationPassed = validationResults.constraintViolations.length === 0;
        
        console.log(`Validation ${validationResults.validationPassed ? 'PASSED' : 'FAILED'}`);
        if (validationResults.constraintViolations.length > 0) {
            console.log('Constraint violations:', validationResults.constraintViolations);
        }
        
        return validationResults;
    },

    /**
     * Apply position and risk constraints
     */
    applyConstraints: function(allocation) {
        let constrainedAllocation = {...allocation};
        
        // Apply maximum single position constraint
        for (const security of Object.keys(constrainedAllocation)) {
            if (constrainedAllocation[security] > this.constraints.maxSinglePosition) {
                constrainedAllocation[security] = this.constraints.maxSinglePosition;
            }
        }
        
        // Ensure minimum cash position
        if (constrainedAllocation.SWVXX < this.constraints.minCashPosition) {
            constrainedAllocation.SWVXX = this.constraints.minCashPosition;
        }
        
        // Apply PIMIX hold-only constraint
        if (this.securities.PIMIX.holdOnly && constrainedAllocation.PIMIX > 0.05) {
            // Don't increase PIMIX beyond small existing position
            constrainedAllocation.PIMIX = Math.min(constrainedAllocation.PIMIX, 0.05);
        }
        
        // Ensure non-negative allocations
        for (const security of Object.keys(constrainedAllocation)) {
            constrainedAllocation[security] = Math.max(0, constrainedAllocation[security]);
        }
        
        return constrainedAllocation;
    },

    /**
     * Calculate sector weights for concentration limits
     */
    calculateSectorWeights: function(allocation) {
        const sectorWeights = {
            equity: 0,
            income: 0,
            alternatives: 0,
            cash: 0
        };
        
        for (const [security, weight] of Object.entries(allocation)) {
            const securityInfo = this.securities[security];
            if (securityInfo) {
                sectorWeights[securityInfo.type] += weight;
            }
        }
        
        return sectorWeights;
    },

    /**
     * Normalize allocation to sum to 100%
     */
    normalizeAllocation: function(allocation) {
        const total = Object.values(allocation).reduce((sum, weight) => sum + weight, 0);
        
        if (total === 0) {
            return this.getBaselineAllocation(); // Fallback if everything is zero
        }
        
        const normalized = {};
        for (const [security, weight] of Object.entries(allocation)) {
            normalized[security] = weight / total;
        }
        
        return normalized;
    },

    /**
     * MAIN OPTIMIZATION ENTRY POINT
     * Execute complete 6-step portfolio optimization process
     */
    optimizePortfolio: function(scenarioProbabilities, options = {}) {
        console.log('=== HCP Portfolio Optimizer v2.0 - Starting Regret Minimization ===');
        console.log('Input scenarios:', scenarioProbabilities.length);
        
        const startTime = Date.now();
        const results = {
            version: this.version,
            framework: this.framework,
            timestamp: new Date().toISOString(),
            inputs: {
                scenarios: scenarioProbabilities.length,
                options: options
            },
            steps: {},
            performance: {}
        };
        
        try {
            // Step 1: Scenario Selection
            const step1 = this.selectScenariosForOptimization(scenarioProbabilities);
            results.steps.scenarioSelection = step1;
            
            // Step 2: Individual Scenario Optimization
            const step2 = this.optimizeIndividualScenarios(step1.scenarios);
            results.steps.individualOptimization = step2;
            
            // Step 3: Regret Matrix Calculation
            const step3 = this.calculateRegretMatrix(step2, step1.scenarios);
            results.steps.regretMatrix = step3;
            
            // Step 4: Dual Optimization
            const step4 = this.runDualOptimization(step3.regretMatrix, step1.scenarios, step3.summary);
            results.steps.dualOptimization = step4;
            
            // Step 5: Smart Hedging Protocol
            const step5 = this.applySmartHedging(step4, step2, step1.scenarios);
            results.steps.smartHedging = step5;
            
            // Step 6: Final Validation
            const step6 = this.validateFinalAllocation(step5.allocation, step5);
            results.steps.finalValidation = step6;
            
            // Final results
            results.finalAllocation = step6.finalAllocation;
            results.optimization = {
                selectedScenarios: step1.scenarios.length,
                cumulativeProbability: step1.cumulativeProbability,
                optimalAlpha: step4.alpha,
                maxRegret: step4.maxRegret,
                weightedRegret: step4.weightedRegret,
                hedgingApplied: step5.hedgingApplied,
                validationPassed: step6.validationPassed
            };
            
            results.performance.executionTimeMs = Date.now() - startTime;
            results.performance.success = true;
            
            console.log('=== Portfolio Optimization COMPLETED ===');
            console.log(`Execution time: ${results.performance.executionTimeMs}ms`);
            console.log('Final allocation:', this.formatAllocationSummary(results.finalAllocation));
            
            return results;
            
        } catch (error) {
            console.error('Portfolio optimization failed:', error);
            results.performance.success = false;
            results.performance.error = error.message;
            results.performance.executionTimeMs = Date.now() - startTime;
            return results;
        }
    },

    /**
     * Utility function to format allocation for display
     */
    formatAllocationSummary: function(allocation) {
        const summary = {};
        for (const [security, weight] of Object.entries(allocation)) {
            if (weight > 0.005) { // Show only positions > 0.5%
                summary[security] = `${(weight * 100).toFixed(1)}%`;
            }
        }
        return summary;
    },

    /**
     * Display comprehensive optimization results
     */
    displayOptimizationResults: function(results, containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container not found:', containerId);
            return;
        }
        
        const allocation = results.finalAllocation;
        const optimization = results.optimization;
        
        let html = `
            <div class="portfolio-optimization-results">
                <h3>Portfolio Optimization Results</h3>
                <div class="optimization-meta">
                    <strong>Framework:</strong> ${results.framework} | 
                    <strong>Version:</strong> ${results.version} | 
                    <strong>Execution:</strong> ${results.performance.executionTimeMs}ms
                </div>
                
                <div class="optimization-summary">
                    <h4>Optimization Summary</h4>
                    <div class="summary-grid">
                        <div>Selected Scenarios: <strong>${optimization.selectedScenarios}</strong></div>
                        <div>Cumulative Probability: <strong>${(optimization.cumulativeProbability*100).toFixed(1)}%</strong></div>
                        <div>Optimal α: <strong>${optimization.optimalAlpha}</strong></div>
                        <div>Max Regret: <strong>${(optimization.maxRegret*100).toFixed(2)}%</strong></div>
                        <div>Weighted Regret: <strong>${(optimization.weightedRegret*100).toFixed(2)}%</strong></div>
                        <div>Hedging Applied: <strong>${optimization.hedgingApplied ? 'Yes' : 'No'}</strong></div>
                    </div>
                </div>
                
                <div class="final-allocation">
                    <h4>Final Portfolio Allocation</h4>
                    <div class="allocation-grid">
        `;
        
        // Sort allocations by weight (descending)
        const sortedAllocations = Object.entries(allocation)
            .sort(([,a], [,b]) => b - a)
            .filter(([,weight]) => weight > 0.005); // Show only positions > 0.5%
        
        for (const [security, weight] of sortedAllocations) {
            const securityInfo = this.securities[security];
            const percentage = (weight * 100).toFixed(1);
            const barWidth = Math.max(2, weight * 300); // Visual bar
            
            html += `
                <div class="allocation-row">
                    <div class="security-info">
                        <strong>${security}</strong>
                        <small>${securityInfo?.name || 'Unknown'}</small>
                    </div>
                    <div class="allocation-bar">
                        <div class="bar-fill" style="width: ${barWidth}px; background-color: ${this.getSecurityColor(securityInfo?.type)}"></div>
                        <span class="percentage">${percentage}%</span>
                    </div>
                </div>
            `;
        }
        
        html += `
                    </div>
                </div>
                
                <div class="risk-metrics">
                    <h4>Risk Analysis</h4>
                    <div class="risk-grid">
                        <div>Equity Exposure: <strong>${(this.calculateSectorWeight(allocation, 'equity')*100).toFixed(1)}%</strong></div>
                        <div>Income Exposure: <strong>${(this.calculateSectorWeight(allocation, 'income')*100).toFixed(1)}%</strong></div>
                        <div>Alternatives: <strong>${(this.calculateSectorWeight(allocation, 'alternative')*100).toFixed(1)}%</strong></div>
                        <div>Cash: <strong>${(this.calculateSectorWeight(allocation, 'cash')*100).toFixed(1)}%</strong></div>
                    </div>
                </div>
            </div>
            
            <style>
                .portfolio-optimization-results { font-family: -apple-system, sans-serif; max-width: 800px; }
                .optimization-meta { color: #666; font-size: 0.9em; margin-bottom: 20px; }
                .summary-grid, .risk-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 10px 0; }
                .allocation-grid { margin-top: 10px; }
                .allocation-row { display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #eee; }
                .security-info { flex: 1; }
                .security-info strong { display: block; }
                .security-info small { color: #666; font-size: 0.85em; }
                .allocation-bar { display: flex; align-items: center; gap: 10px; min-width: 150px; }
                .bar-fill { height: 20px; border-radius: 3px; }
                .percentage { font-weight: bold; min-width: 40px; text-align: right; }
            </style>
        `;
        
        container.innerHTML = html;
    },

    /**
     * Calculate sector weight for risk analysis
     */
    calculateSectorWeight: function(allocation, sectorType) {
        let weight = 0;
        for (const [security, alloc] of Object.entries(allocation)) {
            const securityInfo = this.securities[security];
            if (securityInfo && securityInfo.type === sectorType) {
                weight += alloc;
            }
        }
        return weight;
    },

    /**
     * Get color for security type
     */
    getSecurityColor: function(type) {
        const colors = {
            equity: '#007bff',      // Blue
            income: '#28a745',      // Green  
            alternative: '#ffc107', // Yellow
            cash: '#6c757d'         // Gray
        };
        return colors[type] || '#dee2e6';
    }
};

// Export for use in integration tests and tracker
if (typeof window !== 'undefined') {
    window.PortfolioOptimizer = PortfolioOptimizer;
}

console.log('PortfolioOptimizer v2.0 loaded - Regret Minimization Framework ready');
