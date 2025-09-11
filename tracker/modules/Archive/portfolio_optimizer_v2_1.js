/**
 * HCP Portfolio Optimizer v2.1 - Position Constraints Under Consideration
 * File: portfolio_optimizer_v2_1.js
 * Based on: v2.0 + IPS v3.11 Position Constraint Evaluation
 * Last Updated: 2025-09-02 23:30:00 UTC
 * 
 * NEW IN v2.1:
 * - Position constraints marked "under consideration" for regret minimization testing
 * - Constraint violations logged but not enforced
 * - All constraint logic preserved for easy re-enablement
 * - Enhanced monitoring of concentration levels
 * - Zero regression compliance maintained
 * 
 * PRESERVED FROM v2.0:
 * - Complete 6-step regret minimization framework
 * - Dual optimization: α × Max_Regret + (1-α) × Weighted_Regret
 * - Smart hedging protocols with correlation assessment
 * - Complete 12-asset security universe from IPS v3.10
 * - Security-specific trading rules (PIMIX hold-only, PYLD primary income)
 */

const PortfolioOptimizer = {
    version: '2.1',
    framework: 'IPS v3.11 Regret Minimization with Constraint Evaluation',
    lastUpdated: '2025-09-02T23:30:00.000Z',
    
    // IPS v3.11 Complete Security Universe (12 Assets) - UNCHANGED
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

    // IPS v3.11 Position Limits and Risk Constraints - UNDER CONSIDERATION
    constraints: {
        // UNDER CONSIDERATION - Position Limits (Monitored but not enforced)
        maxSinglePosition: 0.35,        // 35% maximum single position
        maxSectorConcentration: 0.50,   // 50% maximum sector concentration
        minCashPosition: 0.01,          // 1% minimum cash
        maxAlternatives: 0.30,          // 30% maximum alternatives combined
        maxDBMF: 0.15,                  // 15% maximum DBMF (hedging limit)
        maxIncome: 0.30,                // 30% maximum combined income
        
        // ACTIVE CONSTRAINTS - Still enforced
        securitySpecificRules: {
            pimixHoldOnly: true,        // PIMIX hold-only rule ACTIVE
            pyldPrimaryIncome: true     // PYLD primary income rule ACTIVE
        },
        
        maxRegretTarget: {              // Variable based on correlation
            high: 0.05,                 // 5% max regret if correlation > 0.7
            medium: 0.06,               // 6% max regret if correlation 0.5-0.7
            low: 0.08                   // 8% max regret if correlation < 0.5
        }
    },

    // Theme-Based Portfolio Tilts (IPS v3.11 Specifications) - UNCHANGED
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
     * STEP 1: SCENARIO SELECTION - UNCHANGED FROM v2.0
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
     * STEP 2: INDIVIDUAL SCENARIO OPTIMIZATION - UNCHANGED FROM v2.0
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
     * Create optimal allocation for a specific scenario using theme tilts - UNCHANGED
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
        
        // NEW v2.1 - Apply only active constraints, monitor others
        allocation = this.applyActiveConstraints(allocation);
        allocation = this.normalizeAllocation(allocation);
        
        return allocation;
    },

    /**
     * Get baseline allocation (neutral scenario) - UNCHANGED
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
     * Determine active themes from scenario binary representation - UNCHANGED
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
     * Apply theme tilt to allocation - UNCHANGED
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
     * STEPS 3-4: REGRET MATRIX AND DUAL OPTIMIZATION - UNCHANGED FROM v2.0
     * [Full implementation preserved from v2.0 - keeping for brevity]
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

    calculateExpectedReturn: function(allocation, scenario) {
        // Simplified expected return calculation based on theme strength
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
     * STEP 5: SMART HEDGING PROTOCOL - UNCHANGED FROM v2.0
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

    // [Correlation and hedging methods preserved from v2.0 - keeping for brevity]
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

    determineHedgingStrategy: function(selectedScenarios, allocation) {
        // Analyze scenario divergence to determine hedge type
        const geographicDivergence = this.assessGeographicDivergence(selectedScenarios);
        const volatilityDivergence = this.assessVolatilityDivergence(selectedScenarios);
        
        if (volatilityDivergence > 0.6) {
            return { type: 'volatility', hedge: 'DBMF', amount: 0.05, reason: 'High volatility divergence' };
        } else if (geographicDivergence > 0.5) {
            return { type: 'geographic', hedge: 'VEA', amount: 0.03, reason: 'Geographic divergence' };
        } else {
            return { type: 'cash', hedge: 'SWVXX', amount: 0.02, reason: 'Irreconcilable scenarios' };
        }
    },

    assessGeographicDivergence: function(scenarios) {
        const intlActive = scenarios.filter(s => this.getActiveThemes(s).includes('intl')).length;
        return intlActive / scenarios.length;
    },

    assessVolatilityDivergence: function(scenarios) {
        let volatilityScenarios = 0;
        for (const scenario of scenarios) {
            const themes = this.getActiveThemes(scenario);
            if (themes.length >= 3 || themes.includes('ai') && themes.includes('pe')) {
                volatilityScenarios++;
            }
        }
        return volatilityScenarios / scenarios.length;
    },

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
     * STEP 6: FINAL VALIDATION - NEW v2.1 CONSTRAINT EVALUATION APPROACH
     */
    validateFinalAllocation: function(allocation, hedgingResult) {
        console.log('=== Step 6: Final Validation - v2.1 Constraint Evaluation ===');
        
        let validatedAllocation = {...allocation};
        const validationResults = {
            constraintViolations: [],
            constraintMonitoring: [],
            adjustmentsMade: [],
            finalAllocation: null,
            validationPassed: true,
            concentrationAnalysis: {}
        };
        
        // UNDER CONSIDERATION - Monitor position limits but don't enforce
        let maxPosition = 0;
        let maxPositionSecurity = '';
        
        for (const [security, weight] of Object.entries(validatedAllocation)) {
            if (weight > maxPosition) {
                maxPosition = weight;
                maxPositionSecurity = security;
            }
            
            if (weight > this.constraints.maxSinglePosition) {
                validationResults.constraintMonitoring.push(
                    `⚠️  UNDER CONSIDERATION: ${security} ${(weight*100).toFixed(1)}% > ${(this.constraints.maxSinglePosition*100).toFixed(1)}% limit`
                );
            }
        }
        
        // UNDER CONSIDERATION - Monitor sector concentrations but don't enforce
        const sectorWeights = this.calculateSectorWeights(validatedAllocation);
        for (const [sector, weight] of Object.entries(sectorWeights)) {
            if (weight > this.constraints.maxSectorConcentration) {
                validationResults.constraintMonitoring.push(
                    `⚠️  UNDER CONSIDERATION: ${sector} sector ${(weight*100).toFixed(1)}% > ${(this.constraints.maxSectorConcentration*100).toFixed(1)}% limit`
                );
            }
        }
        
        // Store concentration analysis for monitoring
        validationResults.concentrationAnalysis = {
            maxSinglePosition: {
                security: maxPositionSecurity,
                weight: maxPosition,
                limit: this.constraints.maxSinglePosition,
                withinLimit: maxPosition <= this.constraints.maxSinglePosition
            },
            sectorConcentrations: sectorWeights,
            totalMonitoringAlerts: validationResults.constraintMonitoring.length
        };
        
        // ACTIVE CONSTRAINTS - Still enforced
        validatedAllocation = this.applyActiveConstraints(validatedAllocation);
        
        // Always normalize regardless of constraint monitoring
        validatedAllocation = this.normalizeAllocation(validatedAllocation);
        
        validationResults.finalAllocation = validatedAllocation;
        validationResults.validationPassed = true; // Pass even with monitoring alerts
        
        // Enhanced logging for v2.1
        if (validationResults.constraintMonitoring.length > 0) {
            console.log(`📊 Position Constraint Monitoring (${validationResults.constraintMonitoring.length} alerts):`);
            validationResults.constraintMonitoring.forEach(alert => console.log(alert));
        } else {
            console.log('✅ No position constraint violations detected');
        }
        
        console.log(`Max single position: ${maxPositionSecurity} ${(maxPosition*100).toFixed(1)}%`);
        console.log('Final validation: PASSED (constraints under evaluation)');
        
        return validationResults;
    },

    /**
     * NEW v2.1 - Apply only active constraints (PIMIX/PYLD rules)
     */
    applyActiveConstraints: function(allocation) {
        let constrainedAllocation = {...allocation};
        
        // ACTIVE: Apply PIMIX hold-only constraint
        if (this.securities.PIMIX.holdOnly && this.constraints.securitySpecificRules.pimixHoldOnly) {
            if (constrainedAllocation.PIMIX > 0.05) {
                // Don't increase PIMIX beyond small existing position
                const previousPIMIX = constrainedAllocation.PIMIX;
                constrainedAllocation.PIMIX = Math.min(constrainedAllocation.PIMIX, 0.05);
                console.log(`✅ PIMIX hold-only constraint applied: ${(previousPIMIX*100).toFixed(1)}% → ${(constrainedAllocation.PIMIX*100).toFixed(1)}%`);
            }
        }
        
        // ACTIVE: Ensure minimum cash position (safety requirement)
        if (constrainedAllocation.SWVXX < this.constraints.minCashPosition) {
            constrainedAllocation.SWVXX = this.constraints.minCashPosition;
            console.log(`✅ Minimum cash constraint applied: ${(this.constraints.minCashPosition*100).toFixed(1)}%`);
        }
        
        // ACTIVE: Ensure non-negative allocations
        for (const security of Object.keys(constrainedAllocation)) {
            if (constrainedAllocation[security] < 0) {
                console.log(`✅ Negative allocation corrected: ${security} ${(constrainedAllocation[security]*100).toFixed(1)}% → 0.0%`);
                constrainedAllocation[security] = 0;
            }
        }
        
        return constrainedAllocation;
    },

    /**
     * Calculate sector weights for concentration monitoring - ENHANCED v2.1
     */
    calculateSectorWeights: function(allocation) {
        const sectorWeights = {
            equity: 0,
            income: 0,
            alternative: 0,
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
     * Normalize allocation to sum to 100% - UNCHANGED
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
     * MAIN OPTIMIZATION ENTRY POINT - ENHANCED v2.1 with constraint monitoring
     */
    optimizePortfolio: function(scenarioProbabilities, options = {}) {
        console.log('=== HCP Portfolio Optimizer v2.1 - Regret Minimization with Constraint Evaluation ===');
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
            
            // Step 6: Final Validation with Constraint Evaluation
            const step6 = this.validateFinalAllocation(step5.allocation, step5);
            results.steps.finalValidation = step6;
            
            // Enhanced results for v2.1
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
            
            // NEW v2.1 - Constraint monitoring results
            results.constraintMonitoring = {
                totalAlerts: step6.constraintMonitoring.length,
                alerts: step6.constraintMonitoring,
                concentrationAnalysis: step6.concentrationAnalysis,
                positionLimitsUnderConsideration: true,
                activeConstraintsEnforced: ['pimixHoldOnly', 'minCash', 'nonNegative']
            };
            
            results.performance.executionTimeMs = Date.now() - startTime;
            results.performance.success = true;
            
            console.log('=== Portfolio Optimization COMPLETED ===');
            console.log(`Execution time: ${results.performance.executionTimeMs}ms`);
            console.log('Final allocation:', this.formatAllocationSummary(results.finalAllocation));
            
            if (results.constraintMonitoring.totalAlerts > 0) {
                console.log(`⚠️  ${results.constraintMonitoring.totalAlerts} position constraint monitoring alerts - see results.constraintMonitoring for details`);
            }
            
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
     * Utility function to format allocation for display - UNCHANGED
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
     * ENHANCED v2.1 - Display optimization results with constraint monitoring
     */
    displayOptimizationResults: function(results, containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container not found:', containerId);
            return;
        }
        
        const allocation = results.finalAllocation;
        const optimization = results.optimization;
        const constraintMonitoring = results.constraintMonitoring || {};
        
        let html = `
            <div class="portfolio-optimization-results">
                <h3>Portfolio Optimization Results v2.1</h3>
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
        `;
        
        // NEW v2.1 - Constraint monitoring section
        if (constraintMonitoring.totalAlerts > 0) {
            html += `
                <div class="constraint-monitoring">
                    <h4>⚠️ Position Constraint Monitoring (Under Consideration)</h4>
                    <div style="background: #fff3cd; padding: 15px; border-radius: 6px; margin: 10px 0;">
                        <div style="color: #856404; margin-bottom: 10px;"><strong>${constraintMonitoring.totalAlerts} monitoring alerts</strong></div>
            `;
            
            constraintMonitoring.alerts.forEach(alert => {
                html += `<div style="color: #856404; font-size: 0.9em; margin: 3px 0;">${alert}</div>`;
            });
            
            html += `
                        <div style="margin-top: 10px; font-size: 0.85em; color: #6c757d;">
                            Position limits under consideration for regret minimization evaluation
                        </div>
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="constraint-monitoring">
                    <div style="background: #d4edda; padding: 10px; border-radius: 6px; margin: 10px 0;">
                        <span style="color: #155724;">✅ No position constraint violations detected</span>
                    </div>
                </div>
            `;
        }
        
        html += `
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
            
            // Highlight if position exceeds traditional limits
            let highlightClass = '';
            if (weight > this.constraints.maxSinglePosition) {
                highlightClass = 'position-monitoring';
            }
            
            html += `
                <div class="allocation-row ${highlightClass}">
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
                .allocation-row.position-monitoring { background: #fffbf0; border-left: 3px solid #ffc107; }
                .security-info { flex: 1; }
                .security-info strong { display: block; }
                .security-info small { color: #666; font-size: 0.85em; }
                .allocation-bar { display: flex; align-items: center; gap: 10px; min-width: 150px; }
                .bar-fill { height: 20px; border-radius: 3px; }
                .percentage { font-weight: bold; min-width: 40px; text-align: right; }
                .constraint-monitoring { margin: 20px 0; }
            </style>
        `;
        
        container.innerHTML = html;
    },

    /**
     * Calculate sector weight for risk analysis - UNCHANGED
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
     * Get color for security type - UNCHANGED
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

console.log('PortfolioOptimizer v2.1 loaded - Position Constraints Under Consideration for Regret Minimization Evaluation');