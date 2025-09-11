/**
 * HCP Rebalancing Module v1.0 - Steps 6-7 Implementation
 * File: rebalancing_module_v1_0.js
 * Based on: IPS v3.11, Technical Spec v1.3, Implementation Guide v1.4
 * Last Updated: 2025-09-02 23:45:00 UTC
 * 
 * IMPLEMENTS STEPS 6-7 REBALANCING WORKFLOW:
 * - Step 6: Current position input and drift calculation
 * - Step 7: Trade generation with PIMIX/PYLD constraints
 * - Simplified execution framework (no tax optimization, order types)
 * - Position limits under consideration (not enforced)
 * - CRITICAL: PIMIX hold-only and PYLD primary income enforcement
 */

const RebalancingModule = {
    version: '1.0',
    framework: 'IPS v3.11 Simplified Rebalancing',
    lastUpdated: '2025-09-02T23:45:00.000Z',
    
    // IPS v3.11 Complete Security Universe (12 Assets)
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

    // Trading Constraints (IPS v3.11 Specifications)
    constraints: {
        // 🔄 UNDER CONSIDERATION - Position limits preserved but not enforced
        maxSinglePosition: 0.35,        // 35% maximum single position
        maxSectorConcentration: 0.50,   // 50% maximum sector concentration
        maxAlternatives: 0.30,          // 30% maximum alternatives combined
        maxDBMF: 0.15,                  // 15% maximum DBMF (hedging limit)
        maxIncome: 0.30,                // 30% maximum combined income
        
        // ACTIVE CONSTRAINTS - Currently enforced
        minCashPosition: 0.01,          // 1% minimum cash
        driftThreshold: 0.01,           // 1% minimum drift to trigger trade
        pimixHoldOnly: true,            // CRITICAL: PIMIX hold-only rule
        pyldPrimaryIncome: true,        // CRITICAL: PYLD primary income rule
        
        // Trade Size Guidelines (simplified)
        minTradeIncrement: {
            PYLD: 500,                  // $500 minimum for PYLD
            default: 100                // $100 minimum for others
        }
    },

    /**
     * STEP 6: POSITION INPUT AND DRIFT CALCULATION
     * Validates user position input and calculates drift from optimal allocation
     */
    validatePositionInput: function(positionInputs, totalPortfolioValue) {
        console.log('=== RebalancingModule v1.0: Validating Position Input ===');
        
        const validation = {
            isValid: true,
            errors: [],
            warnings: [],
            normalizedPositions: {},
            totalValue: totalPortfolioValue || 0
        };
        
        // Validate total portfolio value
        if (!totalPortfolioValue || totalPortfolioValue <= 0) {
            validation.errors.push('Total portfolio value must be greater than zero');
            validation.isValid = false;
            return validation;
        }
        
        let calculatedTotal = 0;
        
        // Validate each position
        for (const [security, position] of Object.entries(positionInputs)) {
            if (!this.securities[security]) {
                validation.warnings.push(`Unknown security: ${security}`);
                continue;
            }
            
            // Validate position structure
            if (typeof position !== 'object') {
                validation.errors.push(`Invalid position format for ${security}`);
                continue;
            }
            
            // Validate numeric values
            const shares = parseFloat(position.shares) || 0;
            const value = parseFloat(position.value) || 0;
            
            if (shares < 0 || value < 0) {
                validation.errors.push(`${security}: Negative values not allowed`);
                validation.isValid = false;
                continue;
            }
            
            // Calculate percentage
            const percentage = value / totalPortfolioValue;
            
            // Store normalized position
            validation.normalizedPositions[security] = {
                shares: shares,
                value: value,
                percentage: percentage
            };
            
            calculatedTotal += value;
        }
        
        // Check if calculated total matches declared total (within 5% tolerance)
        const totalDiscrepancy = Math.abs(calculatedTotal - totalPortfolioValue) / totalPortfolioValue;
        if (totalDiscrepancy > 0.05) {
            validation.warnings.push(
                `Position values sum to $${calculatedTotal.toFixed(0)} but total declared as $${totalPortfolioValue.toFixed(0)} (${(totalDiscrepancy*100).toFixed(1)}% discrepancy)`
            );
        }
        
        // Ensure all securities represented (even if zero)
        for (const security of Object.keys(this.securities)) {
            if (!validation.normalizedPositions[security]) {
                validation.normalizedPositions[security] = {
                    shares: 0,
                    value: 0,
                    percentage: 0
                };
            }
        }
        
        console.log(`Position validation: ${validation.isValid ? 'PASSED' : 'FAILED'}`);
        if (validation.errors.length > 0) {
            console.log('Validation errors:', validation.errors);
        }
        if (validation.warnings.length > 0) {
            console.log('Validation warnings:', validation.warnings);
        }
        
        return validation;
    },

    /**
     * Calculate drift between current positions and target allocation
     */
    calculateDrift: function(currentPositions, targetAllocation, totalPortfolioValue) {
        console.log('=== RebalancingModule v1.0: Calculating Portfolio Drift ===');
        
        const driftAnalysis = {
            totalValue: totalPortfolioValue,
            positions: {},
            summary: {
                totalDriftPercent: 0,
                totalDriftDollar: 0,
                positionsRequiringAction: 0,
                largestDrift: { security: null, percent: 0, dollar: 0 }
            }
        };
        
        let totalAbsoluteDrift = 0;
        let maxDriftPercent = 0;
        let maxDriftSecurity = null;
        
        // Calculate drift for each security
        for (const security of Object.keys(this.securities)) {
            const currentPercent = currentPositions[security]?.percentage || 0;
            const targetPercent = targetAllocation[security] || 0;
            const driftPercent = currentPercent - targetPercent;
            const driftDollar = driftPercent * totalPortfolioValue;
            const absDriftPercent = Math.abs(driftPercent);
            
            // Determine required action
            let action = 'HOLD';
            let requiresAction = false;
            
            if (absDriftPercent > this.constraints.driftThreshold) {
                action = driftPercent > 0 ? 'SELL' : 'BUY';
                requiresAction = true;
            }
            
            driftAnalysis.positions[security] = {
                current: {
                    shares: currentPositions[security]?.shares || 0,
                    value: currentPositions[security]?.value || 0,
                    percentage: currentPercent
                },
                target: {
                    percentage: targetPercent,
                    value: targetPercent * totalPortfolioValue
                },
                drift: {
                    percentage: driftPercent,
                    dollar: driftDollar,
                    absolute: absDriftPercent
                },
                action: action,
                requiresAction: requiresAction,
                priority: this.calculateTradePriority(absDriftPercent, driftDollar)
            };
            
            // Update summary statistics
            totalAbsoluteDrift += absDriftPercent;
            if (requiresAction) {
                driftAnalysis.summary.positionsRequiringAction++;
            }
            
            if (absDriftPercent > maxDriftPercent) {
                maxDriftPercent = absDriftPercent;
                maxDriftSecurity = security;
                driftAnalysis.summary.largestDrift = {
                    security: security,
                    percent: driftPercent,
                    dollar: driftDollar
                };
            }
        }
        
        driftAnalysis.summary.totalDriftPercent = totalAbsoluteDrift;
        driftAnalysis.summary.totalDriftDollar = Object.values(driftAnalysis.positions)
            .reduce((sum, pos) => sum + Math.abs(pos.drift.dollar), 0);
        
        console.log(`Drift analysis complete: ${driftAnalysis.summary.positionsRequiringAction} positions requiring action`);
        console.log(`Largest drift: ${maxDriftSecurity} ${(maxDriftPercent*100).toFixed(2)}%`);
        
        return driftAnalysis;
    },

    /**
     * Calculate trade priority based on drift magnitude
     */
    calculateTradePriority: function(driftPercent, driftDollar) {
        if (driftPercent > 0.10 || Math.abs(driftDollar) > 10000) {
            return 'HIGH';
        } else if (driftPercent > 0.05 || Math.abs(driftDollar) > 5000) {
            return 'MEDIUM';
        } else {
            return 'LOW';
        }
    },

    /**
     * STEP 7: TRADE GENERATION
     * Generate specific trades to reach optimal allocation with constraint enforcement
     */
    generateTrades: function(driftAnalysis, options = {}) {
        console.log('=== RebalancingModule v1.0: Generating Rebalancing Trades ===');
        
        const trades = [];
        const tradeAnalysis = {
            version: this.version,
            timestamp: new Date().toISOString(),
            framework: 'Simplified Rebalancing - No Tax Optimization',
            constraints: {
                pimixHoldOnly: true,
                pyldPrimaryIncome: true,
                positionLimits: 'UNDER_CONSIDERATION'
            },
            trades: [],
            summary: {
                totalTrades: 0,
                buyTrades: 0,
                sellTrades: 0,
                constraintViolations: [],
                netCashImpact: 0
            }
        };
        
        // Phase 1: Apply PIMIX hold-only constraint (SELL only)
        const pimixPosition = driftAnalysis.positions.PIMIX;
        if (pimixPosition && pimixPosition.drift.percentage > this.constraints.driftThreshold) {
            const sellAmount = Math.abs(pimixPosition.drift.dollar);
            
            trades.push({
                security: 'PIMIX',
                action: 'SELL',
                dollarAmount: sellAmount,
                shares: Math.floor(sellAmount / (pimixPosition.current.value / pimixPosition.current.shares || 100)),
                reason: 'Reduce income allocation (PIMIX hold-only constraint)',
                priority: this.calculateTradePriority(pimixPosition.drift.absolute, pimixPosition.drift.dollar),
                constraints: ['PIMIX_HOLD_ONLY'],
                ruleEnforced: 'Never generate PIMIX BUY orders'
            });
            
            console.log(`Generated PIMIX SELL: $${sellAmount.toFixed(0)} (hold-only constraint)`);
        }
        
        // Phase 2: Calculate total income needs and route to PYLD
        let totalIncomeNeeded = 0;
        const incomeSecurities = ['PIMIX', 'PYLD'];
        
        for (const security of incomeSecurities) {
            const position = driftAnalysis.positions[security];
            if (position && position.action === 'BUY') {
                totalIncomeNeeded += Math.abs(position.drift.dollar);
            }
        }
        
        // Apply PYLD primary income constraint
        if (totalIncomeNeeded > 0) {
            // Check minimum increment
            const minIncrement = this.constraints.minTradeIncrement.PYLD;
            const adjustedAmount = Math.max(totalIncomeNeeded, minIncrement);
            
            trades.push({
                security: 'PYLD',
                action: 'BUY',
                dollarAmount: adjustedAmount,
                shares: Math.floor(adjustedAmount / 50), // Assume ~$50 per share for calculation
                reason: 'Increase income allocation (PYLD primary income constraint)',
                priority: 'MEDIUM',
                constraints: ['PYLD_PRIMARY_INCOME'],
                ruleEnforced: 'Route all income increases through PYLD'
            });
            
            console.log(`Generated PYLD BUY: $${adjustedAmount.toFixed(0)} (primary income constraint)`);
        }
        
        // Phase 3: Generate trades for other securities
        for (const [security, position] of Object.entries(driftAnalysis.positions)) {
            // Skip securities already handled or below threshold
            if (incomeSecurities.includes(security) || !position.requiresAction) {
                continue;
            }
            
            // Skip very small drifts unless they would cause cash position issues
            if (position.drift.absolute < this.constraints.driftThreshold) {
                const wouldCauseCashIssue = this.wouldCauseCashPositionIssue(
                    driftAnalysis, security, position.drift.dollar
                );
                
                if (!wouldCauseCashIssue) {
                    console.log(`Ignoring ${security} drift ${(position.drift.percentage*100).toFixed(2)}% (below 1% threshold)`);
                    continue;
                }
            }
            
            const trade = {
                security: security,
                action: position.action,
                dollarAmount: Math.abs(position.drift.dollar),
                shares: this.calculateShareQuantity(security, position),
                reason: this.generateTradeReason(security, position),
                priority: position.priority,
                constraints: [],
                securityInfo: this.securities[security]
            };
            
            // Apply minimum trade increments
            const minIncrement = this.constraints.minTradeIncrement.default;
            if (trade.dollarAmount < minIncrement) {
                trade.constraints.push('BELOW_MIN_INCREMENT');
                trade.reason += ` (Below $${minIncrement} minimum - executed for portfolio balance)`;
            }
            
            trades.push(trade);
            console.log(`Generated ${trade.action} ${security}: $${trade.dollarAmount.toFixed(0)} - ${trade.reason}`);
        }
        
        // Phase 4: Ensure cash balance
        const cashTrade = this.generateCashBalancingTrade(trades, driftAnalysis);
        if (cashTrade) {
            trades.push(cashTrade);
            console.log(`Generated cash balancing trade: ${cashTrade.action} $${cashTrade.dollarAmount.toFixed(0)}`);
        }
        
        // Phase 5: Validation and constraint checking
        this.validateTrades(trades, tradeAnalysis);
        
        // Final summary
        tradeAnalysis.trades = trades;
        tradeAnalysis.summary = {
            totalTrades: trades.length,
            buyTrades: trades.filter(t => t.action === 'BUY').length,
            sellTrades: trades.filter(t => t.action === 'SELL').length,
            constraintViolations: this.checkConstraintViolations(trades),
            netCashImpact: this.calculateNetCashImpact(trades),
            pimixBuysGenerated: trades.filter(t => t.security === 'PIMIX' && t.action === 'BUY').length,
            pyldIncomeRouting: trades.filter(t => t.security === 'PYLD' && t.action === 'BUY').length > 0
        };
        
        console.log('=== Trade Generation Summary ===');
        console.log(`Total trades: ${tradeAnalysis.summary.totalTrades}`);
        console.log(`BUY trades: ${tradeAnalysis.summary.buyTrades}, SELL trades: ${tradeAnalysis.summary.sellTrades}`);
        console.log(`PIMIX BUY orders: ${tradeAnalysis.summary.pimixBuysGenerated} (MUST BE ZERO)`);
        console.log(`PYLD income routing: ${tradeAnalysis.summary.pyldIncomeRouting ? 'ACTIVE' : 'INACTIVE'}`);
        console.log(`Net cash impact: $${tradeAnalysis.summary.netCashImpact.toFixed(0)}`);
        
        if (tradeAnalysis.summary.constraintViolations.length > 0) {
            console.error('CONSTRAINT VIOLATIONS DETECTED:', tradeAnalysis.summary.constraintViolations);
        }
        
        return tradeAnalysis;
    },

    /**
     * Check if ignoring a small drift would cause cash position issues
     */
    wouldCauseCashPositionIssue: function(driftAnalysis, security, driftDollar) {
        const currentCashPercent = driftAnalysis.positions.SWVXX?.current.percentage || 0;
        const driftImpactPercent = Math.abs(driftDollar) / driftAnalysis.totalValue;
        
        // Would ignoring this drift cause cash to drop below 1% minimum?
        if (currentCashPercent - driftImpactPercent < this.constraints.minCashPosition) {
            return true;
        }
        
        return false;
    },

    /**
     * Calculate share quantity for trade (simplified calculation)
     */
    calculateShareQuantity: function(security, position) {
        if (position.current.shares > 0 && position.current.value > 0) {
            const pricePerShare = position.current.value / position.current.shares;
            return Math.floor(Math.abs(position.drift.dollar) / pricePerShare);
        }
        
        // Fallback assumption for price per share
        const assumedPrices = {
            VTI: 250, VEA: 50, VWO: 45, SMH: 180, SRVR: 170,
            PIMIX: 100, PYLD: 50,
            GLD: 190, COM: 55, IGF: 60, DBMF: 25,
            SWVXX: 1
        };
        
        const assumedPrice = assumedPrices[security] || 100;
        return Math.floor(Math.abs(position.drift.dollar) / assumedPrice);
    },

    /**
     * Generate human-readable reason for trade
     */
    generateTradeReason: function(security, position) {
        const securityInfo = this.securities[security];
        const driftPercent = (position.drift.percentage * 100).toFixed(1);
        const direction = position.drift.percentage > 0 ? 'overweight' : 'underweight';
        
        return `Rebalance ${securityInfo.name} (${direction} by ${Math.abs(driftPercent)}%)`;
    },

    /**
     * Generate cash balancing trade if needed
     */
    generateCashBalancingTrade: function(trades, driftAnalysis) {
        // Calculate net cash impact of all trades
        let netCashFlow = 0;
        trades.forEach(trade => {
            if (trade.action === 'SELL') {
                netCashFlow += trade.dollarAmount;
            } else if (trade.action === 'BUY') {
                netCashFlow -= trade.dollarAmount;
            }
        });
        
        // Calculate final cash position
        const currentCashPercent = driftAnalysis.positions.SWVXX?.current.percentage || 0;
        const currentCashValue = currentCashPercent * driftAnalysis.totalValue;
        const finalCashValue = currentCashValue + netCashFlow;
        const finalCashPercent = finalCashValue / driftAnalysis.totalValue;
        
        // Check if we need cash adjustment to maintain minimum
        if (finalCashPercent < this.constraints.minCashPosition) {
            const neededCash = (this.constraints.minCashPosition * driftAnalysis.totalValue) - finalCashValue;
            
            return {
                security: 'SWVXX',
                action: 'BUY',
                dollarAmount: neededCash,
                shares: Math.floor(neededCash), // SWVXX assumed $1 per share
                reason: 'Maintain minimum 1% cash position',
                priority: 'HIGH',
                constraints: ['MIN_CASH_POSITION'],
                ruleEnforced: 'Ensure minimum cash balance maintained'
            };
        }
        
        return null;
    },

    /**
     * Validate trades against all constraints
     */
    validateTrades: function(trades, tradeAnalysis) {
        const violations = [];
        
        // CRITICAL: Check for PIMIX BUY orders (MUST BE ZERO)
        const pimixBuys = trades.filter(t => t.security === 'PIMIX' && t.action === 'BUY');
        if (pimixBuys.length > 0) {
            violations.push({
                severity: 'CRITICAL',
                constraint: 'PIMIX_HOLD_ONLY',
                violation: 'Generated PIMIX BUY orders',
                count: pimixBuys.length,
                message: 'PIMIX is hold-only - BUY orders are never permitted'
            });
            console.error('CRITICAL VIOLATION: Generated PIMIX BUY orders');
        }
        
        // Check PYLD primary income routing
        const incomeBuys = trades.filter(t => ['PIMIX', 'PYLD'].includes(t.security) && t.action === 'BUY');
        const nonPyldIncomeBuys = incomeBuys.filter(t => t.security !== 'PYLD');
        if (nonPyldIncomeBuys.length > 0) {
            violations.push({
                severity: 'HIGH',
                constraint: 'PYLD_PRIMARY_INCOME',
                violation: 'Income increases not routed to PYLD',
                count: nonPyldIncomeBuys.length,
                message: 'All income allocation increases must go through PYLD'
            });
        }
        
        tradeAnalysis.summary.constraintViolations = violations;
        return violations;
    },

    /**
     * Check for constraint violations in trade list
     */
    checkConstraintViolations: function(trades) {
        const violations = [];
        
        // Check PIMIX hold-only
        const pimixBuys = trades.filter(t => t.security === 'PIMIX' && t.action === 'BUY');
        if (pimixBuys.length > 0) {
            violations.push('PIMIX BUY orders generated (violates hold-only rule)');
        }
        
        // Check PYLD primary income
        const incomeBuys = trades.filter(t => ['PIMIX', 'PYLD'].includes(t.security) && t.action === 'BUY');
        const nonPyldIncomeBuys = incomeBuys.filter(t => t.security !== 'PYLD');
        if (nonPyldIncomeBuys.length > 0) {
            violations.push('Income increases not routed through PYLD');
        }
        
        return violations;
    },

    /**
     * Calculate net cash impact of all trades
     */
    calculateNetCashImpact: function(trades) {
        return trades.reduce((net, trade) => {
            if (trade.action === 'SELL') {
                return net + trade.dollarAmount;
            } else if (trade.action === 'BUY') {
                return net - trade.dollarAmount;
            }
            return net;
        }, 0);
    },

    /**
     * DISPLAY FUNCTIONS FOR UI INTEGRATION
     */

    /**
     * Display position input interface for Step 6
     */
    displayPositionInputInterface: function(containerId, existingPositions = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Position input container not found:', containerId);
            return;
        }
        
        let html = `
            <div class="position-input-interface">
                <h3>Step 6: Current Portfolio Positions</h3>
                <div class="input-instructions">
                    <p>Enter your current portfolio positions. Leave fields blank or enter 0 for securities you don't own.</p>
                    <p><strong>Total Portfolio Value:</strong> Will be calculated automatically from position values.</p>
                </div>
                
                <div class="portfolio-total-section">
                    <label for="total-portfolio-value">Total Portfolio Value ($):</label>
                    <input type="number" id="total-portfolio-value" step="0.01" min="0" 
                           placeholder="Enter total portfolio value" style="font-size: 1.2em; font-weight: bold;">
                </div>
                
                <div class="position-input-grid">
                    <div class="grid-header">
                        <div>Security</div>
                        <div>Current Shares</div>
                        <div>Current Value ($)</div>
                        <div>% of Portfolio</div>
                    </div>
        `;
        
        // Generate input rows for each security
        const securityOrder = ['VTI', 'VEA', 'VWO', 'SMH', 'SRVR', 'PIMIX', 'PYLD', 'GLD', 'COM', 'IGF', 'DBMF', 'SWVXX'];
        
        for (const security of securityOrder) {
            const securityInfo = this.securities[security];
            const existing = existingPositions[security] || { shares: '', value: '', percentage: 0 };
            const typeColor = this.getSecurityTypeColor(securityInfo.type);
            
            html += `
                <div class="position-input-row" data-security="${security}">
                    <div class="security-info">
                        <strong style="color: ${typeColor};">${security}</strong>
                        <small>${securityInfo.name}</small>
                        ${securityInfo.holdOnly ? '<span class="constraint-badge hold-only">Hold-Only</span>' : ''}
                        ${securityInfo.primaryIncome ? '<span class="constraint-badge primary-income">Primary Income</span>' : ''}
                    </div>
                    <div class="input-field">
                        <input type="number" id="shares-${security}" step="0.001" min="0" 
                               value="${existing.shares}" placeholder="0"
                               onchange="RebalancingModule.updatePositionCalculation('${security}')">
                    </div>
                    <div class="input-field">
                        <input type="number" id="value-${security}" step="0.01" min="0" 
                               value="${existing.value}" placeholder="0.00"
                               onchange="RebalancingModule.updatePositionCalculation('${security}')">
                    </div>
                    <div class="percentage-display" id="percent-${security}">
                        ${(existing.percentage * 100).toFixed(1)}%
                    </div>
                </div>
            `;
        }
        
        html += `
                </div>
                
                <div class="position-summary" id="position-summary">
                    <div class="summary-row">
                        <strong>Total Calculated Value: $<span id="calculated-total">0.00</span></strong>
                    </div>
                </div>
                
                <div class="action-buttons">
                    <button class="nav-button" onclick="RebalancingModule.validateAndCalculateDrift()">
                        Calculate Portfolio Drift
                    </button>
                    <button class="nav-button secondary" onclick="RebalancingModule.clearPositionInputs()">
                        Clear All
                    </button>
                </div>
            </div>
            
            <style>
                .position-input-interface { max-width: 1000px; margin: 0 auto; font-family: -apple-system, sans-serif; }
                .input-instructions { background: #e7f1ff; border: 1px solid #b3d9ff; border-radius: 8px; padding: 15px; margin: 15px 0; }
                .portfolio-total-section { margin: 20px 0; text-align: center; }
                .portfolio-total-section input { width: 200px; padding: 10px; border: 2px solid #667eea; border-radius: 6px; }
                .position-input-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 10px; margin: 20px 0; }
                .grid-header { display: contents; font-weight: bold; color: #333; }
                .grid-header > div { padding: 10px; background: #f8f9fa; border-radius: 4px; text-align: center; }
                .position-input-row { display: contents; }
                .security-info { padding: 10px; border-radius: 4px; background: white; border: 1px solid #dee2e6; }
                .security-info strong { display: block; }
                .security-info small { color: #666; font-size: 0.85em; }
                .constraint-badge { font-size: 0.7em; padding: 2px 6px; border-radius: 3px; margin-left: 5px; }
                .constraint-badge.hold-only { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
                .constraint-badge.primary-income { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
                .input-field { padding: 5px; }
                .input-field input { width: 100%; padding: 8px; border: 1px solid #dee2e6; border-radius: 4px; }
                .percentage-display { padding: 10px; text-align: center; font-weight: bold; background: #f8f9fa; border-radius: 4px; }
                .position-summary { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; }
                .action-buttons { text-align: center; margin: 20px 0; }
                .nav-button { background: #667eea; color: white; border: none; padding: 12px 24px; border-radius: 6px; margin: 0 10px; cursor: pointer; font-size: 16px; }
                .nav-button.secondary { background: #6c757d; }
                .nav-button:hover { opacity: 0.9; }
            </style>
        `;
        
        container.innerHTML = html;
        console.log('Position input interface displayed');
    },

    /**
     * Update position calculation when user enters values
     */
    updatePositionCalculation: function(security) {
        const sharesInput = document.getElementById(`shares-${security}`);
        const valueInput = document.getElementById(`value-${security}`);
        const percentDisplay = document.getElementById(`percent-${security}`);
        const totalValueInput = document.getElementById('total-portfolio-value');
        
        if (!sharesInput || !valueInput || !percentDisplay) return;
        
        const value = parseFloat(valueInput.value) || 0;
        const totalValue = parseFloat(totalValueInput.value) || 0;
        
        if (totalValue > 0) {
            const percentage = (value / totalValue) * 100;
            percentDisplay.textContent = `${percentage.toFixed(1)}%`;
            
            // Update color based on percentage
            if (percentage > 35) {
                percentDisplay.style.background = '#f8d7da';
                percentDisplay.style.color = '#721c24';
            } else if (percentage > 25) {
                percentDisplay.style.background = '#fff3cd';
                percentDisplay.style.color = '#856404';
            } else {
                percentDisplay.style.background = '#f8f9fa';
                percentDisplay.style.color = '#333';
            }
        }
        
        // Update calculated total
        this.updateCalculatedTotal();
    },

    /**
     * Update calculated total from all position values
     */
    updateCalculatedTotal: function() {
        let calculatedTotal = 0;
        
        for (const security of Object.keys(this.securities)) {
            const valueInput = document.getElementById(`value-${security}`);
            if (valueInput) {
                calculatedTotal += parseFloat(valueInput.value) || 0;
            }
        }
        
        const calculatedDisplay = document.getElementById('calculated-total');
        if (calculatedDisplay) {
            calculatedDisplay.textContent = calculatedTotal.toFixed(2);
        }
    },

    /**
     * Clear all position inputs
     */
    clearPositionInputs: function() {
        for (const security of Object.keys(this.securities)) {
            const sharesInput = document.getElementById(`shares-${security}`);
            const valueInput = document.getElementById(`value-${security}`);
            const percentDisplay = document.getElementById(`percent-${security}`);
            
            if (sharesInput) sharesInput.value = '';
            if (valueInput) valueInput.value = '';
            if (percentDisplay) {
                percentDisplay.textContent = '0.0%';
                percentDisplay.style.background = '#f8f9fa';
                percentDisplay.style.color = '#333';
            }
        }
        
        const totalValueInput = document.getElementById('total-portfolio-value');
        if (totalValueInput) totalValueInput.value = '';
        
        this.updateCalculatedTotal();
    },

    /**
     * Validate positions and calculate drift (called by UI)
     */
    validateAndCalculateDrift: function() {
        // Get position inputs from UI
        const positionInputs = {};
        const totalValueInput = document.getElementById('total-portfolio-value');
        const totalValue = parseFloat(totalValueInput.value) || 0;
        
        if (totalValue <= 0) {
            alert('Please enter a valid total portfolio value');
            return;
        }
        
        for (const security of Object.keys(this.securities)) {
            const sharesInput = document.getElementById(`shares-${security}`);
            const valueInput = document.getElementById(`value-${security}`);
            
            if (sharesInput && valueInput) {
                const shares = parseFloat(sharesInput.value) || 0;
                const value = parseFloat(valueInput.value) || 0;
                
                if (shares > 0 || value > 0) {
                    positionInputs[security] = { shares, value };
                }
            }
        }
        
        // Validate positions
        const validation = this.validatePositionInput(positionInputs, totalValue);
        
        if (!validation.isValid) {
            alert('Position validation failed:\n' + validation.errors.join('\n'));
            return;
        }
        
        if (validation.warnings.length > 0) {
            const proceed = confirm('Validation warnings:\n' + validation.warnings.join('\n') + '\n\nProceed anyway?');
            if (!proceed) return;
        }
        
        // Get target allocation from TrackerCore state
        const targetAllocation = TrackerCore.state.optimizedAllocation;
        if (!targetAllocation) {
            alert('No target allocation found. Please complete portfolio optimization first (Step 5).');
            return;
        }
        
        // Calculate drift
        const driftAnalysis = this.calculateDrift(validation.normalizedPositions, targetAllocation, totalValue);
        
        // Store in TrackerCore state
        TrackerCore.state.currentPositions = validation.normalizedPositions;
        TrackerCore.state.driftAnalysis = driftAnalysis;
        
        // Display drift analysis
        this.displayDriftAnalysis('drift-analysis-container', driftAnalysis, targetAllocation);
        
        // Mark Step 6 as complete and enable Step 7
        if (!TrackerCore.completedSteps.includes(6)) {
            TrackerCore.completedSteps.push(6);
        }
        TrackerCore.updateStepIndicators();
        TrackerCore.updateNavigation();
        TrackerCore.saveState();
        
        console.log('Position validation and drift calculation completed successfully');
    },

    /**
     * Display drift analysis for Step 6
     */
    displayDriftAnalysis: function(containerId, driftAnalysis, targetAllocation) {
        const container = document.getElementById(containerId) || document.createElement('div');
        container.id = containerId;
        
        let html = `
            <div class="drift-analysis-display">
                <h3>Portfolio Drift Analysis</h3>
                <div class="drift-summary">
                    <div class="summary-stats">
                        <div class="stat-item">
                            <strong>Positions Requiring Action:</strong> ${driftAnalysis.summary.positionsRequiringAction}
                        </div>
                        <div class="stat-item">
                            <strong>Largest Drift:</strong> ${driftAnalysis.summary.largestDrift.security} 
                            (${(driftAnalysis.summary.largestDrift.percent*100).toFixed(2)}%)
                        </div>
                        <div class="stat-item">
                            <strong>Total Drift Amount:</strong> $${Math.abs(driftAnalysis.summary.totalDriftDollar).toFixed(0)}
                        </div>
                    </div>
                </div>
                
                <div class="drift-table">
                    <div class="drift-header">
                        <div>Security</div>
                        <div>Current %</div>
                        <div>Target %</div>
                        <div>Drift %</div>
                        <div>Drift $</div>
                        <div>Action</div>
                        <div>Priority</div>
                    </div>
        `;
        
        // Sort positions by drift magnitude (largest first)
        const sortedPositions = Object.entries(driftAnalysis.positions)
            .sort(([,a], [,b]) => b.drift.absolute - a.drift.absolute);
        
        for (const [security, position] of sortedPositions) {
            const securityInfo = this.securities[security];
            const driftClass = this.getDriftClass(position.drift.percentage);
            const typeColor = this.getSecurityTypeColor(securityInfo.type);
            
            html += `
                <div class="drift-row ${driftClass}" data-security="${security}">
                    <div class="security-cell">
                        <strong style="color: ${typeColor};">${security}</strong>
                        <small>${securityInfo.name}</small>
                    </div>
                    <div class="percentage-cell">${(position.current.percentage*100).toFixed(1)}%</div>
                    <div class="percentage-cell">${(position.target.percentage*100).toFixed(1)}%</div>
                    <div class="drift-percentage ${driftClass}">
                        ${(position.drift.percentage > 0 ? '+' : '')}${(position.drift.percentage*100).toFixed(1)}%
                    </div>
                    <div class="drift-dollar ${driftClass}">
                        ${(position.drift.dollar > 0 ? '+$' : '-$')}${Math.abs(position.drift.dollar).toFixed(0)}
                    </div>
                    <div class="action-cell action-${position.action.toLowerCase()}">
                        ${position.action}
                    </div>
                    <div class="priority-cell priority-${position.priority.toLowerCase()}">
                        ${position.priority}
                    </div>
                </div>
            `;
        }
        
        html += `
                </div>
                
                <div class="drift-actions">
                    <button class="nav-button" onclick="RebalancingModule.proceedToTradeGeneration()">
                        Generate Rebalancing Trades
                    </button>
                    <button class="nav-button secondary" onclick="RebalancingModule.recalculateDrift()">
                        Recalculate Drift
                    </button>
                </div>
            </div>
            
            <style>
                .drift-analysis-display { max-width: 1200px; margin: 20px auto; font-family: -apple-system, sans-serif; }
                .drift-summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .summary-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
                .stat-item { text-align: center; }
                .drift-table { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr 1fr; gap: 8px; margin: 20px 0; }
                .drift-header { display: contents; font-weight: bold; }
                .drift-header > div { padding: 12px 8px; background: #667eea; color: white; text-align: center; border-radius: 4px; }
                .drift-row { display: contents; }
                .drift-row > div { padding: 10px 8px; border-bottom: 1px solid #dee2e6; text-align: center; }
                .security-cell { text-align: left !important; }
                .security-cell strong { display: block; }
                .security-cell small { color: #666; font-size: 0.85em; }
                
                .drift-positive { background-color: #f8d7da; color: #721c24; }
                .drift-negative { background-color: #d4edda; color: #155724; }
                .drift-minimal { background-color: #e2e3e5; color: #6c757d; }
                
                .action-buy { color: #155724; font-weight: bold; }
                .action-sell { color: #721c24; font-weight: bold; }
                .action-hold { color: #6c757d; }
                
                .priority-high { color: #721c24; font-weight: bold; }
                .priority-medium { color: #856404; font-weight: bold; }
                .priority-low { color: #6c757d; }
                
                .drift-actions { text-align: center; margin: 30px 0; }
                .nav-button { background: #667eea; color: white; border: none; padding: 12px 24px; border-radius: 6px; margin: 0 10px; cursor: pointer; font-size: 16px; }
                .nav-button.secondary { background: #6c757d; }
                .nav-button:hover { opacity: 0.9; }
            </style>
        `;
        
        container.innerHTML = html;
        
        // Ensure container is visible and positioned correctly
        if (!document.getElementById(containerId)) {
            const positionContainer = document.getElementById('position-input-container');
            if (positionContainer) {
                positionContainer.appendChild(container);
            } else {
                document.body.appendChild(container);
            }
        }
        
        console.log('Drift analysis displayed successfully');
    },

    /**
     * Proceed to trade generation (Step 7)
     */
    proceedToTradeGeneration: function() {
        if (!TrackerCore.state.driftAnalysis) {
            alert('No drift analysis found. Please calculate drift first.');
            return;
        }
        
        // Navigate to Step 7
        if (TrackerCore.navigateToStep(7)) {
            // Generate trades
            const tradeAnalysis = this.generateTrades(TrackerCore.state.driftAnalysis);
            
            // Store in state
            TrackerCore.state.rebalancingTrades = tradeAnalysis.trades;
            TrackerCore.state.tradeAnalysis = tradeAnalysis;
            
            // Display trade recommendations
            this.displayTradeRecommendations('trade-recommendations-container', tradeAnalysis);
            
            // Mark Step 7 as complete
            if (!TrackerCore.completedSteps.includes(7)) {
                TrackerCore.completedSteps.push(7);
            }
            TrackerCore.updateStepIndicators();
            TrackerCore.updateNavigation();
            TrackerCore.saveState();
            
            console.log('Trade generation completed and Step 7 activated');
        }
    },

    /**
     * Display trade recommendations for Step 7
     */
    displayTradeRecommendations: function(containerId, tradeAnalysis) {
        const container = document.getElementById(containerId) || document.createElement('div');
        container.id = containerId;
        
        const trades = tradeAnalysis.trades;
        const summary = tradeAnalysis.summary;
        
        let html = `
            <div class="trade-recommendations-display">
                <h3>Step 7: Rebalancing Trade Recommendations</h3>
                
                <div class="trade-summary">
                    <div class="summary-header">
                        <h4>Trade Summary</h4>
                        <div class="framework-info">Framework: ${tradeAnalysis.framework}</div>
                    </div>
                    <div class="summary-grid">
                        <div class="summary-stat">
                            <div class="stat-value">${summary.totalTrades}</div>
                            <div class="stat-label">Total Trades</div>
                        </div>
                        <div class="summary-stat">
                            <div class="stat-value">${summary.buyTrades}</div>
                            <div class="stat-label">BUY Orders</div>
                        </div>
                        <div class="summary-stat">
                            <div class="stat-value">${summary.sellTrades}</div>
                            <div class="stat-label">SELL Orders</div>
                        </div>
                        <div class="summary-stat">
                            <div class="stat-value">${(summary.netCashImpact > 0 ? '+$' : '-$')}${Math.abs(summary.netCashImpact).toFixed(0)}</div>
                            <div class="stat-label">Net Cash Impact</div>
                        </div>
                    </div>
                </div>
                
                <div class="constraint-status">
                    <h4>Constraint Enforcement Status</h4>
                    <div class="constraint-grid">
                        <div class="constraint-item ${summary.pimixBuysGenerated === 0 ? 'constraint-ok' : 'constraint-violation'}">
                            <strong>PIMIX Hold-Only:</strong> 
                            ${summary.pimixBuysGenerated === 0 ? '✅ ENFORCED' : '❌ VIOLATED'} 
                            (${summary.pimixBuysGenerated} BUY orders generated)
                        </div>
                        <div class="constraint-item ${summary.pyldIncomeRouting ? 'constraint-ok' : 'constraint-info'}">
                            <strong>PYLD Primary Income:</strong> 
                            ${summary.pyldIncomeRouting ? '✅ ACTIVE' : 'ℹ️ NOT NEEDED'} 
                            (Income routing ${summary.pyldIncomeRouting ? 'applied' : 'not required'})
                        </div>
                        <div class="constraint-item constraint-info">
                            <strong>Position Limits:</strong> 🔄 UNDER CONSIDERATION (Not enforced)
                        </div>
                        <div class="constraint-item constraint-ok">
                            <strong>Tax Optimization:</strong> 📋 OUT OF SCOPE (Not implemented)
                        </div>
                    </div>
                </div>
        `;
        
        if (summary.constraintViolations.length > 0) {
            html += `
                <div class="violations-alert">
                    <h4>⚠️ Constraint Violations Detected</h4>
                    <ul>
            `;
            summary.constraintViolations.forEach(violation => {
                html += `<li class="violation-${violation.severity.toLowerCase()}">${violation}</li>`;
            });
            html += '</ul></div>';
        }
        
        html += `
                <div class="trade-list">
                    <h4>Recommended Trades</h4>
                    <div class="trade-table">
                        <div class="trade-header">
                            <div>Security</div>
                            <div>Action</div>
                            <div>Shares</div>
                            <div>Amount</div>
                            <div>Priority</div>
                            <div>Reason</div>
                            <div>Constraints</div>
                        </div>
        `;
        
        // Sort trades by priority (HIGH, MEDIUM, LOW)
        const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        const sortedTrades = [...trades].sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
        
        for (const trade of sortedTrades) {
            const securityInfo = this.securities[trade.security];
            const typeColor = this.getSecurityTypeColor(securityInfo.type);
            const priorityClass = `priority-${trade.priority.toLowerCase()}`;
            const actionClass = `action-${trade.action.toLowerCase()}`;
            
            html += `
                <div class="trade-row ${priorityClass}">
                    <div class="security-cell">
                        <strong style="color: ${typeColor};">${trade.security}</strong>
                        <small>${securityInfo.name}</small>
                    </div>
                    <div class="action-cell ${actionClass}">
                        <strong>${trade.action}</strong>
                    </div>
                    <div class="shares-cell">
                        ${trade.shares.toLocaleString()}
                    </div>
                    <div class="amount-cell">
                        $${trade.dollarAmount.toLocaleString()}
                    </div>
                    <div class="priority-cell ${priorityClass}">
                        ${trade.priority}
                    </div>
                    <div class="reason-cell">
                        ${trade.reason}
                    </div>
                    <div class="constraints-cell">
                        ${trade.constraints.map(c => `<span class="constraint-badge">${c}</span>`).join(' ')}
                    </div>
                </div>
            `;
        }
        
        html += `
                    </div>
                </div>
                
                <div class="trade-actions">
                    <div class="action-note">
                        <p><strong>Next Steps:</strong> Review the trade recommendations above and execute them through your broker. 
                        These trades will bring your portfolio in line with the optimized allocation from Step 5.</p>
                    </div>
                    <div class="action-buttons">
                        <button class="nav-button" onclick="RebalancingModule.exportTrades()">
                            Export Trade List
                        </button>
                        <button class="nav-button secondary" onclick="RebalancingModule.regenerateTrades()">
                            Regenerate Trades
                        </button>
                    </div>
                </div>
            </div>
            
            <style>
                .trade-recommendations-display { max-width: 1400px; margin: 20px auto; font-family: -apple-system, sans-serif; }
                .trade-summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .summary-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
                .framework-info { color: #666; font-size: 0.9em; }
                .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; }
                .summary-stat { text-align: center; }
                .stat-value { font-size: 1.5em; font-weight: bold; color: #667eea; }
                .stat-label { color: #666; font-size: 0.9em; margin-top: 5px; }
                
                .constraint-status { background: #e7f1ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .constraint-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px; margin-top: 15px; }
                .constraint-item { padding: 10px; border-radius: 6px; }
                .constraint-ok { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
                .constraint-violation { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
                .constraint-info { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
                
                .violations-alert { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 8px; margin: 20px 0; }
                .violations-alert h4 { color: #721c24; margin-bottom: 10px; }
                .violation-critical { color: #721c24; font-weight: bold; }
                .violation-high { color: #dc3545; }
                
                .trade-list { margin: 30px 0; }
                .trade-table { display: grid; grid-template-columns: 1.5fr 0.8fr 0.8fr 1fr 0.8fr 2fr 1fr; gap: 8px; }
                .trade-header { display: contents; font-weight: bold; }
                .trade-header > div { padding: 12px 8px; background: #667eea; color: white; text-align: center; border-radius: 4px; }
                .trade-row { display: contents; }
                .trade-row > div { padding: 10px 8px; border-bottom: 1px solid #dee2e6; }
                
                .security-cell { text-align: left; }
                .security-cell strong { display: block; }
                .security-cell small { color: #666; font-size: 0.85em; }
                
                .action-buy { color: #155724; font-weight: bold; }
                .action-sell { color: #721c24; font-weight: bold; }
                
                .priority-high { background-color: #f8d7da; }
                .priority-medium { background-color: #fff3cd; }
                .priority-low { background-color: #e2e3e5; }
                
                .constraint-badge { font-size: 0.7em; padding: 2px 6px; border-radius: 3px; background: #e9ecef; color: #495057; margin-right: 4px; }
                
                .trade-actions { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center; }
                .action-note { margin-bottom: 20px; }
                .action-note p { color: #495057; line-height: 1.5; }
                .nav-button { background: #667eea; color: white; border: none; padding: 12px 24px; border-radius: 6px; margin: 0 10px; cursor: pointer; font-size: 16px; }
                .nav-button.secondary { background: #6c757d; }
                .nav-button:hover { opacity: 0.9; }
            </style>
        `;
        
        container.innerHTML = html;
        
        // Ensure container is visible and positioned correctly
        if (!document.getElementById(containerId)) {
            const stepContainer = document.getElementById('step-7');
            if (stepContainer) {
                stepContainer.appendChild(container);
            } else {
                document.body.appendChild(container);
            }
        }
        
        console.log('Trade recommendations displayed successfully');
    },

    /**
     * Get drift CSS class based on drift percentage
     */
    getDriftClass: function(driftPercent) {
        if (Math.abs(driftPercent) < 0.01) {
            return 'drift-minimal';
        } else if (driftPercent > 0) {
            return 'drift-positive'; // Overweight
        } else {
            return 'drift-negative'; // Underweight
        }
    },

    /**
     * Get color for security type
     */
    getSecurityTypeColor: function(type) {
        const colors = {
            equity: '#007bff',      // Blue
            income: '#28a745',      // Green  
            alternative: '#ffc107', // Yellow
            cash: '#6c757d'         // Gray
        };
        return colors[type] || '#495057';
    },

    /**
     * Export trades to CSV format
     */
    exportTrades: function() {
        const tradeAnalysis = TrackerCore.state.tradeAnalysis;
        if (!tradeAnalysis || !tradeAnalysis.trades) {
            alert('No trades to export');
            return;
        }
        
        const trades = tradeAnalysis.trades;
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        
        // Create CSV content
        let csvContent = 'Security,Action,Shares,Dollar Amount,Priority,Reason,Constraints\n';
        
        trades.forEach(trade => {
            const constraints = trade.constraints.join('; ');
            csvContent += `${trade.security},${trade.action},${trade.shares},"$${trade.dollarAmount.toFixed(2)}",${trade.priority},"${trade.reason}","${constraints}"\n`;
        });
        
        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `hcp_rebalancing_trades_${timestamp}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('Trade list exported successfully');
    },

    /**
     * Regenerate trades (recalculate from current drift analysis)
     */
    regenerateTrades: function() {
        if (!TrackerCore.state.driftAnalysis) {
            alert('No drift analysis found. Please return to Step 6 and recalculate.');
            return;
        }
        
        const tradeAnalysis = this.generateTrades(TrackerCore.state.driftAnalysis);
        TrackerCore.state.rebalancingTrades = tradeAnalysis.trades;
        TrackerCore.state.tradeAnalysis = tradeAnalysis;
        
        this.displayTradeRecommendations('trade-recommendations-container', tradeAnalysis);
        TrackerCore.saveState();
        
        console.log('Trades regenerated successfully');
    },

    /**
     * Recalculate drift (return to Step 6 calculations)
     */
    recalculateDrift: function() {
        this.validateAndCalculateDrift();
    }
};

// Export for use in integration tests and tracker
if (typeof window !== 'undefined') {
    window.RebalancingModule = RebalancingModule;
}

console.log('RebalancingModule v1.0 loaded - Steps 6-7 Implementation ready');