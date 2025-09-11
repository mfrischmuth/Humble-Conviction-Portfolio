/**
 * HCP Portfolio Optimizer v3.0 - 81 Ternary Scenarios
 * File: portfolio_optimizer_v3_0.js
 * Based on: IPS v4.3.2 with complete return framework
 * Last Updated: 2025-09-08 18:00:00 UTC
 * 
 * NEW IN v3.0:
 * - Handles 81 ternary scenarios [USD, Innovation, Valuation, USLeadership]
 * - Factor-based portfolio construction per IPS v4.3.2
 * - Complete expected return modeling with theme impacts
 * - Dynamic scenario selection (3-15 scenarios)
 * - Full transparency with detailed step logging
 * - No position limits enforcement (removed from framework)
 */

const PortfolioOptimizer = {
    version: '3.0',
    framework: 'IPS v4.3.2 - 81 Ternary Scenarios',
    lastUpdated: '2025-09-08T18:00:00.000Z',
    
    // ===== SECURITY UNIVERSE (12 Assets) =====
    securities: {
        // Equity (6)
        VTI: { name: 'US Total Market', type: 'equity', category: 'us_equity' },
        VEA: { name: 'Developed International', type: 'equity', category: 'intl_equity' },
        VWO: { name: 'Emerging Markets', type: 'equity', category: 'intl_equity' },
        SMH: { name: 'Semiconductors', type: 'equity', category: 'tech_equity' },
        SRVR: { name: 'Infrastructure/Data Centers', type: 'equity', category: 'tech_equity' },
        IGF: { name: 'Global Infrastructure', type: 'equity', category: 'infrastructure' },
        
        // Income (2)
        PIMIX: { name: 'PIMCO Income Fund', type: 'income', category: 'income', holdOnly: true },
        PYLD: { name: 'PIMCO Yield Opportunities', type: 'income', category: 'income', primaryIncome: true },
        
        // Alternatives (3)
        GLD: { name: 'Gold', type: 'alternative', category: 'commodities' },
        COM: { name: 'Commodities', type: 'alternative', category: 'commodities' },
        DBMF: { name: 'Managed Futures', type: 'alternative', category: 'hedge' },
        
        // Cash (1)
        SWVXX: { name: 'Money Market', type: 'cash', category: 'cash' }
    },

    // ===== BASELINE PORTFOLIO (Neutral [0,0,0,0]) =====
    baselineAllocation: {
        VTI: 0.30,   // 30%
        VEA: 0.15,   // 15%
        VWO: 0.08,   // 8%
        SMH: 0.03,   // 3%
        SRVR: 0.02,  // 2%
        IGF: 0.02,   // 2%
        PYLD: 0.25,  // 25%
        PIMIX: 0.05, // 5%
        GLD: 0.03,   // 3%
        COM: 0.03,   // 3%
        DBMF: 0.03,  // 3%
        SWVXX: 0.01  // 1%
    },

    // ===== BASE RETURNS (Neutral Scenario) =====
    baseReturns: {
        VTI: 0.100,   // 10.0%
        VEA: 0.095,   // 9.5%
        VWO: 0.085,   // 8.5%
        SMH: 0.115,   // 11.5%
        SRVR: 0.080,  // 8.0%
        IGF: 0.080,   // 8.0%
        PYLD: 0.065,  // 6.5%
        PIMIX: 0.060, // 6.0%
        GLD: 0.045,   // 4.5%
        COM: 0.055,   // 5.5%
        DBMF: 0.055,  // 5.5%
        SWVXX: 0.045  // 4.5%
    },

    // ===== THEME RETURN IMPACT MATRIX =====
    // Format: [USD-weak, USD-neutral, USD-strong], [Innovation-weak, Innovation-neutral, Innovation-strong], etc.
    themeReturnImpacts: {
        //         USD States              Innovation States         Valuation States          US Leadership States
        VTI:    [[-0.02, 0.00, +0.01], [-0.03, 0.00, +0.04], [+0.06, 0.00, -0.04], [-0.05, 0.00, +0.03]],
        VEA:    [[+0.04, 0.00, -0.03], [-0.01, 0.00, +0.01], [+0.04, 0.00, -0.03], [+0.06, 0.00, -0.04]],
        VWO:    [[+0.06, 0.00, -0.05], [-0.02, 0.00, -0.01], [+0.05, 0.00, -0.04], [+0.08, 0.00, -0.06]],
        SMH:    [[-0.01, 0.00, +0.01], [-0.08, 0.00, +0.12], [+0.10, 0.00, -0.08], [-0.03, 0.00, +0.02]],
        SRVR:   [[-0.01, 0.00, +0.01], [-0.05, 0.00, +0.08], [+0.07, 0.00, -0.05], [-0.02, 0.00, +0.02]],
        IGF:    [[+0.02, 0.00, -0.02], [-0.01, 0.00, +0.02], [+0.03, 0.00, -0.02], [+0.04, 0.00, -0.03]],
        PYLD:   [[+0.01, 0.00, -0.01], [+0.02, 0.00, -0.03], [-0.04, 0.00, +0.05], [+0.01, 0.00, -0.01]],
        PIMIX:  [[+0.01, 0.00, -0.01], [+0.01, 0.00, -0.02], [-0.03, 0.00, +0.04], [+0.01, 0.00, -0.01]],
        GLD:    [[+0.12, 0.00, -0.08], [+0.02, 0.00, -0.03], [-0.05, 0.00, +0.08], [+0.03, 0.00, -0.02]],
        COM:    [[+0.08, 0.00, -0.06], [+0.00, 0.00, +0.00], [-0.02, 0.00, +0.03], [+0.02, 0.00, -0.02]],
        DBMF:   [[+0.03, 0.00, -0.02], [+0.02, 0.00, -0.02], [-0.03, 0.00, +0.06], [+0.02, 0.00, -0.02]],
        SWVXX:  [[-0.01, 0.00, +0.02], [+0.00, 0.00, +0.00], [-0.02, 0.00, +0.03], [+0.00, 0.00, +0.00]]
    },

    // ===== FACTOR ADJUSTMENT MATRIX (for portfolio construction) =====
    factorAdjustments: {
        //         USD States              Innovation States         Valuation States          US Leadership States
        VTI:    [[-0.10, 0.00, +0.05], [-0.05, 0.00, +0.10], [+0.15, 0.00, -0.10], [-0.15, 0.00, +0.10]],
        VEA:    [[+0.10, 0.00, -0.08], [-0.02, 0.00, +0.02], [+0.08, 0.00, -0.05], [+0.12, 0.00, -0.10]],
        VWO:    [[+0.12, 0.00, -0.10], [-0.03, 0.00, -0.02], [+0.10, 0.00, -0.08], [+0.15, 0.00, -0.12]],
        SMH:    [[-0.02, 0.00, +0.02], [-0.15, 0.00, +0.20], [+0.20, 0.00, -0.15], [-0.05, 0.00, +0.05]],
        SRVR:   [[-0.03, 0.00, +0.03], [-0.10, 0.00, +0.15], [+0.15, 0.00, -0.12], [-0.04, 0.00, +0.04]],
        IGF:    [[+0.04, 0.00, -0.03], [-0.02, 0.00, +0.03], [+0.02, 0.00, -0.02], [+0.08, 0.00, -0.06]],
        PYLD:   [[+0.02, 0.00, -0.02], [+0.05, 0.00, -0.08], [-0.10, 0.00, +0.12], [+0.02, 0.00, -0.02]],
        PIMIX:  [[+0.00, 0.00, +0.00], [+0.02, 0.00, -0.03], [-0.05, 0.00, +0.08], [+0.00, 0.00, +0.00]],
        GLD:    [[+0.15, 0.00, -0.12], [+0.03, 0.00, -0.05], [-0.08, 0.00, +0.15], [+0.05, 0.00, -0.03]],
        COM:    [[+0.08, 0.00, -0.06], [+0.00, 0.00, +0.00], [-0.03, 0.00, +0.05], [+0.03, 0.00, -0.02]],
        DBMF:   [[+0.02, 0.00, -0.02], [+0.02, 0.00, -0.02], [-0.05, 0.00, +0.10], [+0.02, 0.00, -0.02]],
        SWVXX:  [[-0.05, 0.00, +0.08], [+0.03, 0.00, -0.02], [-0.12, 0.00, +0.15], [-0.02, 0.00, +0.02]]
    },

    // ===== CONFIGURATION =====
    config: {
        minScenarios: 3,
        maxScenarios: 15,
        targetCumulativeProbability: 0.85,
        highProbabilityThreshold: 0.10,
        alphaRange: [0.3, 0.4, 0.5, 0.6, 0.7],
        maxRegretTargets: {
            high: 0.05,    // 5% if correlation > 0.7
            medium: 0.06,  // 6% if correlation 0.5-0.7
            low: 0.08      // 8% if correlation < 0.5
        },
        minCashPosition: 0.01,
        debugMode: true  // Enable detailed logging
    },

    // ===== MAIN OPTIMIZATION ENTRY POINT =====
    optimizePortfolio: function(themeTransitions, options = {}) {
        console.log('=== HCP Portfolio Optimizer v3.0 - 81 Ternary Scenarios ===');
        const startTime = Date.now();
        
        const results = {
            version: this.version,
            framework: this.framework,
            timestamp: new Date().toISOString(),
            inputs: {
                themes: Object.keys(themeTransitions),
                options: options
            },
            steps: {},
            performance: {}
        };

        try {
            // Step 0: Generate all 81 scenarios with probabilities
            console.log('\n=== Step 0: Generate 81 Scenarios ===');
            const scenarios = this.generateScenarios(themeTransitions);
            results.steps.scenarioGeneration = {
                totalScenarios: scenarios.length,
                topScenarios: scenarios.slice(0, 5).map(s => ({
                    states: s.states,
                    probability: (s.probability * 100).toFixed(2) + '%'
                }))
            };

            // Step 1: Select scenarios for optimization
            console.log('\n=== Step 1: Scenario Selection ===');
            const selectedScenarios = this.selectScenariosForOptimization(scenarios);
            results.steps.scenarioSelection = selectedScenarios;

            // Step 2: Optimize individual scenarios
            console.log('\n=== Step 2: Individual Scenario Optimization ===');
            const scenarioAllocations = this.optimizeIndividualScenarios(selectedScenarios.scenarios);
            results.steps.individualOptimization = {
                count: Object.keys(scenarioAllocations).length,
                allocations: scenarioAllocations
            };

            // Step 3: Calculate regret matrix
            console.log('\n=== Step 3: Regret Matrix Calculation ===');
            const regretAnalysis = this.calculateRegretMatrix(scenarioAllocations, selectedScenarios.scenarios);
            results.steps.regretMatrix = regretAnalysis;

            // Step 4: Dual optimization
            console.log('\n=== Step 4: Dual Optimization ===');
            const dualOptResult = this.runDualOptimization(regretAnalysis, selectedScenarios.scenarios);
            results.steps.dualOptimization = dualOptResult;

            // Step 5: Smart hedging
            console.log('\n=== Step 5: Smart Hedging Protocol ===');
            const hedgingResult = this.applySmartHedging(dualOptResult, scenarioAllocations, selectedScenarios.scenarios);
            results.steps.smartHedging = hedgingResult;

            // Step 6: Final validation
            console.log('\n=== Step 6: Final Validation ===');
            const finalAllocation = this.validateFinalAllocation(hedgingResult.allocation);
            results.steps.finalValidation = finalAllocation;

            // Compile results
            results.finalAllocation = finalAllocation.allocation;
            results.optimization = {
                selectedScenarios: selectedScenarios.scenarios.length,
                cumulativeProbability: selectedScenarios.cumulativeProbability,
                optimalAlpha: dualOptResult.alpha,
                maxRegret: dualOptResult.maxRegret,
                weightedRegret: dualOptResult.weightedRegret,
                hedgingApplied: hedgingResult.hedgingApplied,
                validationPassed: finalAllocation.valid
            };

            results.performance.executionTimeMs = Date.now() - startTime;
            results.performance.success = true;

            console.log('\n=== Optimization Complete ===');
            console.log(`Execution time: ${results.performance.executionTimeMs}ms`);
            console.log('Final allocation:', this.formatAllocation(results.finalAllocation));

            return results;

        } catch (error) {
            console.error('Optimization failed:', error);
            results.performance.success = false;
            results.performance.error = error.message;
            results.performance.executionTimeMs = Date.now() - startTime;
            return results;
        }
    },

    // ===== STEP 0: SCENARIO GENERATION =====
    generateScenarios: function(themeTransitions) {
        const scenarios = [];
        const themes = ['usd', 'innovation', 'valuation', 'usLeadership'];
        const states = [-1, 0, 1];
        
        // Generate all 81 combinations
        for (const usd of states) {
            for (const innovation of states) {
                for (const valuation of states) {
                    for (const usLeadership of states) {
                        const scenarioStates = [usd, innovation, valuation, usLeadership];
                        
                        // Calculate probability as product of individual theme transition probabilities
                        let probability = 1.0;
                        themes.forEach((theme, idx) => {
                            const themeData = themeTransitions[theme];
                            if (themeData && themeData.transitions) {
                                const stateStr = scenarioStates[idx].toString();
                                probability *= themeData.transitions[stateStr] || 0.33;
                            } else {
                                probability *= 0.33; // Default if no data
                            }
                        });
                        
                        scenarios.push({
                            id: scenarios.length + 1,
                            states: scenarioStates,
                            stateNames: {
                                usd: this.getStateName(usd),
                                innovation: this.getStateName(innovation),
                                valuation: this.getStateName(valuation),
                                usLeadership: this.getStateName(usLeadership)
                            },
                            probability: probability
                        });
                    }
                }
            }
        }
        
        // Sort by probability (highest first)
        scenarios.sort((a, b) => b.probability - a.probability);
        
        if (this.config.debugMode) {
            console.log(`Generated ${scenarios.length} scenarios`);
            console.log('Top 5 scenarios:');
            scenarios.slice(0, 5).forEach(s => {
                console.log(`  [${s.states.join(',')}]: ${(s.probability * 100).toFixed(2)}%`);
            });
        }
        
        return scenarios;
    },

    // ===== STEP 1: SCENARIO SELECTION =====
    selectScenariosForOptimization: function(scenarios) {
        let selectedScenarios = [];
        let cumulativeProbability = 0;
        
        // Include scenarios until cumulative ≥ 85%
        for (const scenario of scenarios) {
            selectedScenarios.push(scenario);
            cumulativeProbability += scenario.probability;
            
            if (cumulativeProbability >= this.config.targetCumulativeProbability && 
                selectedScenarios.length >= this.config.minScenarios) {
                break;
            }
            
            if (selectedScenarios.length >= this.config.maxScenarios) {
                break;
            }
        }
        
        // Include any scenario ≥ 10% probability
        for (const scenario of scenarios) {
            if (scenario.probability >= this.config.highProbabilityThreshold && 
                !selectedScenarios.some(s => s.id === scenario.id)) {
                selectedScenarios.push(scenario);
                cumulativeProbability += scenario.probability;
            }
        }
        
        // Ensure minimum scenarios
        if (selectedScenarios.length < this.config.minScenarios) {
            selectedScenarios = scenarios.slice(0, this.config.minScenarios);
            cumulativeProbability = selectedScenarios.reduce((sum, s) => sum + s.probability, 0);
        }
        
        console.log(`Selected ${selectedScenarios.length} scenarios (${(cumulativeProbability * 100).toFixed(1)}% cumulative)`);
        
        return {
            scenarios: selectedScenarios,
            cumulativeProbability: cumulativeProbability,
            selectionCriteria: {
                targetCumulative: this.config.targetCumulativeProbability,
                actualCumulative: cumulativeProbability,
                minScenarios: this.config.minScenarios,
                maxScenarios: this.config.maxScenarios,
                selectedCount: selectedScenarios.length
            }
        };
    },

    // ===== STEP 2: INDIVIDUAL SCENARIO OPTIMIZATION =====
    optimizeIndividualScenarios: function(selectedScenarios) {
        const scenarioAllocations = {};
        
        for (const scenario of selectedScenarios) {
            const allocation = this.createScenarioOptimalAllocation(scenario);
            scenarioAllocations[scenario.id] = {
                scenario: scenario,
                allocation: allocation,
                expectedReturn: this.calculateExpectedReturn(allocation, scenario.states)
            };
            
            if (this.config.debugMode && selectedScenarios.indexOf(scenario) < 3) {
                console.log(`Scenario ${scenario.id} [${scenario.states.join(',')}]:`);
                console.log('  Top allocations:', this.getTopAllocations(allocation, 5));
            }
        }
        
        return scenarioAllocations;
    },

    // ===== CREATE OPTIMAL ALLOCATION FOR A SCENARIO =====
    createScenarioOptimalAllocation: function(scenario) {
        // Start with baseline
        let allocation = {...this.baselineAllocation};
        
        // Apply factor adjustments based on scenario states
        const states = scenario.states;
        
        for (const [security, baseWeight] of Object.entries(allocation)) {
            let totalAdjustment = 0;
            
            // Apply adjustment for each theme
            for (let themeIdx = 0; themeIdx < 4; themeIdx++) {
                const state = states[themeIdx];
                const stateIdx = state + 1; // Convert -1,0,1 to 0,1,2 for array indexing
                
                if (this.factorAdjustments[security] && this.factorAdjustments[security][themeIdx]) {
                    totalAdjustment += this.factorAdjustments[security][themeIdx][stateIdx];
                }
            }
            
            // Apply adjustment
            allocation[security] = baseWeight + totalAdjustment;
        }
        
        // Apply constraints and normalize
        allocation = this.applyConstraints(allocation);
        allocation = this.normalizeAllocation(allocation);
        
        return allocation;
    },

    // ===== CALCULATE EXPECTED RETURN =====
    calculateExpectedReturn: function(allocation, scenarioStates) {
        let totalReturn = 0;
        
        for (const [security, weight] of Object.entries(allocation)) {
            // Start with base return
            let securityReturn = this.baseReturns[security] || 0;
            
            // Add theme impacts
            for (let themeIdx = 0; themeIdx < 4; themeIdx++) {
                const state = scenarioStates[themeIdx];
                const stateIdx = state + 1; // Convert -1,0,1 to 0,1,2
                
                if (this.themeReturnImpacts[security] && this.themeReturnImpacts[security][themeIdx]) {
                    securityReturn += this.themeReturnImpacts[security][themeIdx][stateIdx];
                }
            }
            
            totalReturn += weight * securityReturn;
        }
        
        return totalReturn;
    },

    // ===== STEP 3: REGRET MATRIX =====
    calculateRegretMatrix: function(scenarioAllocations, selectedScenarios) {
        const regretMatrix = {};
        const returnMatrix = {};
        
        // Calculate returns for each portfolio in each scenario
        for (const [allocId, allocData] of Object.entries(scenarioAllocations)) {
            returnMatrix[allocId] = {};
            regretMatrix[allocId] = {};
            
            for (const scenario of selectedScenarios) {
                const expectedReturn = this.calculateExpectedReturn(allocData.allocation, scenario.states);
                returnMatrix[allocId][scenario.id] = expectedReturn;
            }
        }
        
        // Calculate regret
        for (const [allocId, allocData] of Object.entries(scenarioAllocations)) {
            for (const scenario of selectedScenarios) {
                const portfolioReturn = returnMatrix[allocId][scenario.id];
                const optimalReturn = returnMatrix[scenario.id][scenario.id];
                const regret = optimalReturn - portfolioReturn; // Positive regret = underperformance
                
                regretMatrix[allocId][scenario.id] = regret;
            }
        }
        
        // Calculate summary statistics
        const summary = {};
        for (const [allocId, regrets] of Object.entries(regretMatrix)) {
            const regretValues = Object.values(regrets);
            const maxRegret = Math.max(...regretValues);
            
            // Probability-weighted regret
            let weightedRegret = 0;
            for (const scenario of selectedScenarios) {
                weightedRegret += scenario.probability * regrets[scenario.id];
            }
            
            summary[allocId] = {
                maxRegret: maxRegret,
                weightedRegret: weightedRegret,
                regretRange: Math.max(...regretValues) - Math.min(...regretValues)
            };
        }
        
        if (this.config.debugMode) {
            console.log('Regret Matrix Summary:');
            const topEntries = Object.entries(summary).slice(0, 3);
            topEntries.forEach(([id, stats]) => {
                console.log(`  Portfolio ${id}: MaxRegret=${(stats.maxRegret * 100).toFixed(2)}%, WeightedRegret=${(stats.weightedRegret * 100).toFixed(2)}%`);
            });
        }
        
        return {
            regretMatrix: regretMatrix,
            returnMatrix: returnMatrix,
            summary: summary
        };
    },

    // ===== STEP 4: DUAL OPTIMIZATION =====
    runDualOptimization: function(regretAnalysis, selectedScenarios) {
        let bestResult = null;
        let bestScore = Infinity;
        
        for (const alpha of this.config.alphaRange) {
            for (const [allocId, summary] of Object.entries(regretAnalysis.summary)) {
                const dualScore = alpha * summary.maxRegret + (1 - alpha) * summary.weightedRegret;
                
                if (dualScore < bestScore) {
                    bestScore = dualScore;
                    bestResult = {
                        alpha: alpha,
                        portfolioId: allocId,
                        score: dualScore,
                        maxRegret: summary.maxRegret,
                        weightedRegret: summary.weightedRegret
                    };
                }
            }
        }
        
        console.log(`Best dual optimization: α=${bestResult.alpha}, Score=${(bestResult.score * 100).toFixed(3)}%`);
        console.log(`  Max Regret: ${(bestResult.maxRegret * 100).toFixed(2)}%`);
        console.log(`  Weighted Regret: ${(bestResult.weightedRegret * 100).toFixed(2)}%`);
        
        return bestResult;
    },

    // ===== STEP 5: SMART HEDGING =====
    applySmartHedging: function(dualOptResult, scenarioAllocations, selectedScenarios) {
        let allocation = scenarioAllocations[dualOptResult.portfolioId].allocation;
        const maxRegret = dualOptResult.maxRegret;
        
        // Assess portfolio correlation
        const correlation = this.assessPortfolioCorrelation(scenarioAllocations, selectedScenarios);
        
        let regretTolerance;
        if (correlation > 0.7) {
            regretTolerance = this.config.maxRegretTargets.high;
        } else if (correlation > 0.5) {
            regretTolerance = this.config.maxRegretTargets.medium;
        } else {
            regretTolerance = this.config.maxRegretTargets.low;
        }
        
        console.log(`Portfolio correlation: ${correlation.toFixed(3)}`);
        console.log(`Regret tolerance: ${(regretTolerance * 100).toFixed(1)}%`);
        console.log(`Current max regret: ${(maxRegret * 100).toFixed(2)}%`);
        
        let hedgingApplied = false;
        let hedgingDetails = {};
        
        if (maxRegret > regretTolerance) {
            console.log('Applying smart hedging...');
            
            // Determine hedging strategy
            const hedgeStrategy = this.determineHedgingStrategy(selectedScenarios, allocation);
            
            // Apply hedging
            allocation = this.applyHedge(allocation, hedgeStrategy);
            hedgingApplied = true;
            hedgingDetails = hedgeStrategy;
        }
        
        return {
            allocation: allocation,
            hedgingApplied: hedgingApplied,
            hedgingDetails: hedgingDetails,
            correlation: correlation,
            regretTolerance: regretTolerance
        };
    },

    // ===== STEP 6: FINAL VALIDATION =====
    validateFinalAllocation: function(allocation) {
        let validatedAllocation = {...allocation};
        
        // Apply PIMIX hold-only constraint
        if (validatedAllocation.PIMIX > 0.05) {
            console.log(`PIMIX constraint: ${(validatedAllocation.PIMIX * 100).toFixed(1)}% -> 5.0%`);
            validatedAllocation.PIMIX = 0.05;
        }
        
        // Ensure minimum cash
        if (validatedAllocation.SWVXX < this.config.minCashPosition) {
            validatedAllocation.SWVXX = this.config.minCashPosition;
        }
        
        // Remove negative allocations
        for (const security of Object.keys(validatedAllocation)) {
            if (validatedAllocation[security] < 0) {
                validatedAllocation[security] = 0;
            }
        }
        
        // Normalize
        validatedAllocation = this.normalizeAllocation(validatedAllocation);
        
        console.log('Final validation complete');
        
        return {
            allocation: validatedAllocation,
            valid: true,
            constraints: {
                pimixHoldOnly: true,
                minCash: this.config.minCashPosition
            }
        };
    },

    // ===== HELPER FUNCTIONS =====
    
    getStateName: function(state) {
        const names = {
            '-1': 'Weak/Low',
            '0': 'Neutral',
            '1': 'Strong/High'
        };
        return names[state.toString()] || 'Unknown';
    },
    
    applyConstraints: function(allocation) {
        let constrained = {...allocation};
        
        // PIMIX hold-only
        if (constrained.PIMIX > 0.05) {
            constrained.PIMIX = 0.05;
        }
        
        // Minimum cash
        if (constrained.SWVXX < this.config.minCashPosition) {
            constrained.SWVXX = this.config.minCashPosition;
        }
        
        // No negative allocations
        for (const security of Object.keys(constrained)) {
            if (constrained[security] < 0) {
                constrained[security] = 0;
            }
        }
        
        return constrained;
    },
    
    normalizeAllocation: function(allocation) {
        const total = Object.values(allocation).reduce((sum, weight) => sum + weight, 0);
        
        if (total === 0) {
            return {...this.baselineAllocation};
        }
        
        const normalized = {};
        for (const [security, weight] of Object.entries(allocation)) {
            normalized[security] = weight / total;
        }
        
        return normalized;
    },
    
    assessPortfolioCorrelation: function(scenarioAllocations, selectedScenarios) {
        const allocations = selectedScenarios.map(s => scenarioAllocations[s.id].allocation);
        const securities = Object.keys(this.securities);
        
        let totalCorrelation = 0;
        let pairCount = 0;
        
        for (let i = 0; i < allocations.length; i++) {
            for (let j = i + 1; j < allocations.length; j++) {
                const corr = this.calculateCorrelation(allocations[i], allocations[j], securities);
                totalCorrelation += corr;
                pairCount++;
            }
        }
        
        return pairCount > 0 ? totalCorrelation / pairCount : 0;
    },
    
    calculateCorrelation: function(alloc1, alloc2, securities) {
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
    
    determineHedgingStrategy: function(scenarios, allocation) {
        // Analyze scenario characteristics
        let volatilityCount = 0;
        let internationalCount = 0;
        
        for (const scenario of scenarios) {
            const states = scenario.states;
            // High volatility if valuation extreme or multiple extremes
            if (Math.abs(states[2]) === 1 || states.filter(s => Math.abs(s) === 1).length >= 3) {
                volatilityCount++;
            }
            // International if USD weak or US Leadership weak
            if (states[0] === -1 || states[3] === -1) {
                internationalCount++;
            }
        }
        
        const volatilityRatio = volatilityCount / scenarios.length;
        const internationalRatio = internationalCount / scenarios.length;
        
        if (volatilityRatio > 0.6) {
            return { type: 'volatility', hedge: 'DBMF', amount: 0.05, reason: 'High volatility scenarios' };
        } else if (internationalRatio > 0.5) {
            return { type: 'international', hedge: 'VEA', amount: 0.03, reason: 'International divergence' };
        } else {
            return { type: 'defensive', hedge: 'GLD', amount: 0.03, reason: 'General uncertainty' };
        }
    },
    
    applyHedge: function(allocation, hedgeStrategy) {
        const newAllocation = {...allocation};
        const hedgeAmount = hedgeStrategy.amount;
        const hedgeSecurity = hedgeStrategy.hedge;
        
        // Add hedge
        newAllocation[hedgeSecurity] = (newAllocation[hedgeSecurity] || 0) + hedgeAmount;
        
        // Reduce other positions proportionally
        const nonHedgeTotal = 1 - newAllocation[hedgeSecurity];
        const scaleFactor = (1 - hedgeAmount) / nonHedgeTotal;
        
        for (const [security, weight] of Object.entries(newAllocation)) {
            if (security !== hedgeSecurity) {
                newAllocation[security] = weight * scaleFactor;
            }
        }
        
        return this.normalizeAllocation(newAllocation);
    },
    
    formatAllocation: function(allocation) {
        const sorted = Object.entries(allocation)
            .filter(([_, weight]) => weight > 0.005)
            .sort(([, a], [, b]) => b - a);
        
        const formatted = {};
        sorted.forEach(([security, weight]) => {
            formatted[security] = `${(weight * 100).toFixed(1)}%`;
        });
        
        return formatted;
    },
    
    getTopAllocations: function(allocation, n = 5) {
        return Object.entries(allocation)
            .sort(([, a], [, b]) => b - a)
            .slice(0, n)
            .map(([security, weight]) => `${security}: ${(weight * 100).toFixed(1)}%`)
            .join(', ');
    },

    // ===== DISPLAY RESULTS WITH FULL TRANSPARENCY =====
    displayOptimizationResults: function(results, containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container not found:', containerId);
            return;
        }

        let html = `
            <div class="portfolio-optimization-v3">
                <h3>Portfolio Optimization Results v3.0</h3>
                <div class="optimization-meta">
                    <strong>Framework:</strong> ${results.framework} | 
                    <strong>Execution:</strong> ${results.performance.executionTimeMs}ms
                </div>
                
                <!-- Step-by-Step Transparency -->
                <div class="optimization-steps">
                    <h4>Optimization Process</h4>
                    
                    <!-- Step 0: Scenario Generation -->
                    <div class="step-detail">
                        <h5>Step 0: Generated ${results.steps.scenarioGeneration.totalScenarios} Scenarios</h5>
                        <div class="step-content">
                            Top scenarios:
                            ${results.steps.scenarioGeneration.topScenarios.map(s => 
                                `<div>[${s.states.join(',')}]: ${s.probability}</div>`
                            ).join('')}
                        </div>
                    </div>
                    
                    <!-- Step 1: Selection -->
                    <div class="step-detail">
                        <h5>Step 1: Selected ${results.optimization.selectedScenarios} Scenarios</h5>
                        <div class="step-content">
                            Cumulative probability: ${(results.optimization.cumulativeProbability * 100).toFixed(1)}%
                        </div>
                    </div>
                    
                    <!-- Step 3-4: Regret & Dual -->
                    <div class="step-detail">
                        <h5>Step 3-4: Regret Minimization</h5>
                        <div class="step-content">
                            Optimal α: ${results.optimization.optimalAlpha}<br>
                            Max Regret: ${(results.optimization.maxRegret * 100).toFixed(2)}%<br>
                            Weighted Regret: ${(results.optimization.weightedRegret * 100).toFixed(2)}%
                        </div>
                    </div>
                    
                    <!-- Step 5: Hedging -->
                    <div class="step-detail">
                        <h5>Step 5: Smart Hedging</h5>
                        <div class="step-content">
                            Hedging applied: ${results.optimization.hedgingApplied ? 'Yes' : 'No'}
                        </div>
                    </div>
                </div>
                
                <!-- Final Allocation -->
                <div class="final-allocation">
                    <h4>Final Portfolio Allocation</h4>
                    <div class="allocation-grid">
        `;
        
        // Display allocations
        const sorted = Object.entries(results.finalAllocation)
            .filter(([_, weight]) => weight > 0.005)
            .sort(([, a], [, b]) => b - a);
        
        for (const [security, weight] of sorted) {
            const securityInfo = this.securities[security];
            const percentage = (weight * 100).toFixed(1);
            const barWidth = Math.max(2, weight * 400);
            
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
                
                <!-- Sector Summary -->
                <div class="sector-summary">
                    <h4>Sector Allocation</h4>
                    <div class="sector-grid">
                        <div>Equity: <strong>${(this.calculateSectorWeight(results.finalAllocation, 'equity') * 100).toFixed(1)}%</strong></div>
                        <div>Income: <strong>${(this.calculateSectorWeight(results.finalAllocation, 'income') * 100).toFixed(1)}%</strong></div>
                        <div>Alternatives: <strong>${(this.calculateSectorWeight(results.finalAllocation, 'alternative') * 100).toFixed(1)}%</strong></div>
                        <div>Cash: <strong>${(this.calculateSectorWeight(results.finalAllocation, 'cash') * 100).toFixed(1)}%</strong></div>
                    </div>
                </div>
            </div>
            
            <style>
                .portfolio-optimization-v3 { font-family: -apple-system, sans-serif; max-width: 900px; }
                .optimization-meta { color: #666; font-size: 0.9em; margin-bottom: 20px; }
                .optimization-steps { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
                .step-detail { margin: 15px 0; padding: 10px; background: white; border-radius: 4px; }
                .step-detail h5 { margin: 0 0 10px 0; color: #333; }
                .step-content { color: #666; font-size: 0.9em; }
                .allocation-grid { margin-top: 10px; }
                .allocation-row { display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #eee; }
                .security-info { flex: 1; }
                .security-info strong { display: block; }
                .security-info small { color: #666; font-size: 0.85em; }
                .allocation-bar { display: flex; align-items: center; gap: 10px; min-width: 200px; }
                .bar-fill { height: 20px; border-radius: 3px; }
                .percentage { font-weight: bold; min-width: 50px; text-align: right; }
                .sector-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 10px 0; }
            </style>
        `;
        
        container.innerHTML = html;
    },
    
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
    
    getSecurityColor: function(type) {
        const colors = {
            equity: '#007bff',
            income: '#28a745',
            alternative: '#ffc107',
            cash: '#6c757d'
        };
        return colors[type] || '#dee2e6';
    }
};

// Export for use
if (typeof window !== 'undefined') {
    window.PortfolioOptimizer = PortfolioOptimizer;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PortfolioOptimizer;
}

console.log('PortfolioOptimizer v3.0 loaded - 81 Ternary Scenarios with Full Transparency');