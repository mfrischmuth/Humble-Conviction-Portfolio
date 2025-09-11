# Investment Policy Statement (IPS) Framework
**Version 3.11 - Rebalancing Implementation Focus**  
**Last Updated:** September 02, 2025, 23:00:00 UTC  
**Status:** Production Ready - Surgical Updates for Steps 6-7 Implementation  
**Filename:** IPS_v3.11_Rebalancing_Focus.md

## Executive Summary

This Investment Policy Statement outlines a systematic, probability-weighted approach to portfolio management based on macro regime analysis. The framework monitors 13 indicators across 4 themes to determine scenario probabilities and optimize allocation accordingly using sophisticated regret minimization techniques.

**Core Innovation:** Rather than static allocation, the portfolio dynamically adjusts based on the probability-weighted expected outcomes across 16 possible macro scenarios, with dual optimization minimizing both maximum regret and probability-weighted regret across likely scenarios.

**Version 3.11 Enhancement:** Surgical updates for Steps 6-7 rebalancing implementation. Position limits marked as "under consideration" to evaluate regret minimization effectiveness. Tax optimization and complex trade execution marked as "out of scope for current implementation" while preserving full specifications for future enhancement.

## Philosophical Framework

### Core Beliefs

1. Markets are regime-dependent - Different macro environments require different exposures
2. Diversification across scenarios beats diversification within a single scenario
3. Risk management should focus on avoiding catastrophic outcomes in any probable scenario
4. Systematic beats discretionary - Rules-based approach removes emotional bias
5. Probability-weighted optimization captures uncertainty better than point forecasts

### Investment Objectives

**Primary:** Achieve 8-12% annual returns across market cycles  
**Secondary:** Limit maximum drawdown to 15% in any 12-month period  
**Tertiary:** Maintain liquidity for opportunistic investments

## Asset Allocation Framework

### Security Universe

**Equity Exposures:**
- VTI (US Total Market) - Core domestic equity
- VEA (Developed International) - Core international developed
- VWO (Emerging Markets) - International emerging exposure
- SMH (Semiconductors) - AI theme expression
- SRVR (Infrastructure/Data Centers) - AI infrastructure play

**Income Exposures:**
- PIMIX (PIMCO Income Fund) - Hold-only position, never generate BUY orders
- PYLD (PIMCO Yield Opportunities) - Primary vehicle for income increases

**Alternative Exposures:**
- GLD (Gold) - USD decline and crisis hedge
- COM (Commodities) - Real asset exposure
- IGF (Global Infrastructure) - Inflation protection
- DBMF (Managed Futures) - Crisis alpha and regret minimization

**Cash:**
- SWVXX (Money Market) - Liquidity and defensive positioning

### Scenario-Based Framework

The portfolio recognizes 16 scenarios based on 4 binary themes evaluated through 13 indicators:

- USD Dominance Decline (active/inactive) - 4 indicators
- AI Productivity Boom (active/inactive) - 3 indicators
- P/E Mean Reversion (active/inactive) - 3 indicators
- International Outperformance (active/inactive) - 3 indicators

Each scenario has optimal allocations determined through mean-variance optimization with specific tilts based on theme expressions, followed by regret minimization across likely scenarios.

## Portfolio Optimization Methodology

### Step 1: Scenario Selection

**Scenario Inclusion Criteria:**
1. Sort scenarios by probability (highest first)
2. Include until cumulative probability ≥ 85%
3. Minimum 3 scenarios
4. Maximum 6 scenarios
5. Include any scenario ≥ 10% probability regardless

### Step 2: Individual Scenario Optimization

For each selected scenario, create optimal allocation using mean-variance optimization with theme-specific tilts:

**USD Decline Theme Tilts:**
- Increase: VEA, VWO, GLD, COM
- Decrease: VTI, SWVXX

**AI Productivity Theme Tilts:**
- Increase: SMH, SRVR, VTI (tech-heavy)
- Decrease: Traditional value sectors

**P/E Reversion Theme Tilts:**
- Increase: PYLD, GLD, SWVXX (defensive)
- Decrease: High-multiple equities

**International Outperformance Theme Tilts:**
- Increase: VEA, VWO, IGF
- Decrease: VTI relative weight

### Step 3: Regret Matrix Calculation

Test each scenario-optimized allocation across all likely scenarios. Calculate regret for each combination:

```
Regret(Portfolio_A, Scenario_B) = Return(Portfolio_A, Scenario_B) - Return(Optimal_B, Scenario_B)
```

### Step 4: Dual Optimization Framework

**Objective Function:**
```
Minimize: α × Max_Regret + (1-α) × Probability_Weighted_Regret
```

Where:
- Max_Regret = worst regret across all likely scenarios
- Probability_Weighted_Regret = Σ(P(scenario) × Regret(scenario))
- α = risk tolerance parameter (0.3 to 0.7)

**α Parameter Selection:**
- α = 0.3: More focused on expected outcomes
- α = 0.5: Balanced approach (default)
- α = 0.7: More focused on worst-case protection

### Step 5: Smart Hedging Protocol

If maximum regret exceeds tolerance after dual optimization:

**Divergence Assessment:**
- Portfolio correlation > 0.7: Target 5% max regret
- Portfolio correlation 0.5-0.7: Target 6% max regret
- Portfolio correlation < 0.5: Target 8% max regret

**Hedging Strategy:**
- Geographic divergence: Add 2-5% international index
- Asset class divergence: Add 2-5% infrastructure
- Volatility divergence: Add 2-5% DBMF
- Irreconcilable scenarios: Accept regret or add 2-5% cash

**Hedging Constraints:**
- Maximum DBMF addition: 10%
- Combined hedge additions: <15%
- If regret still >10%: Document and accept

### Step 6: Final Validation

**🔄 UNDER CONSIDERATION - Position Limits:**
*The following position limits are preserved for future consideration but are not currently enforced in Steps 5-7 to evaluate the effectiveness of regret minimization in naturally preventing overconcentration.*

- Maximum single position: 35%
- Maximum sector concentration: 50%
- Minimum cash position: 1%
- Maximum alternatives: 30%

**Active Scenario Risk Limits:**
- Maximum regret in any scenario: -8%
- Minimum upside capture: 70%
- Maximum correlation to any single factor: 0.7

## Macro Environment Monitoring

### Current Operational Framework (v3.11 - 13 Indicators)

The portfolio monitors 13 indicators across 4 themes using adaptive MA comparisons (except TIC flows which uses zero boundary).

### Comprehensive Indicator Specifications

| Theme | Indicator | Calculation Method | Signal Tier | Update Freq | Status | Trigger Rate |
|-------|-----------|-------------------|-------------|-------------|---------|-------------|
| USD | DXY Index | 200D MA vs 400D MA | Canary | Daily | Pending | TBD |
| USD | Reserve Share | YoY change < -0.5% | Structural | Quarterly | Pending | TBD |
| USD | Yuan SWIFT Share | 12M MA vs 36M MA | Primary | Monthly | Pending | TBD |
| USD | Central Bank Gold | 4Q MA vs 12Q MA | Structural | Quarterly | Pending | TBD |
| AI | Productivity Growth | 2Q MA > 6Q MA | Structural | Quarterly | ✅ Calibrated | 47.7% |
| AI | QQQ/SPY Ratio | 50D MA vs 200D MA | Canary | Daily | Pending | TBD |
| AI | S&P Net Margins | TTM > 3Y MA + 0.5% | Primary | Quarterly | Pending | TBD |
| P/E | Forward P/E | 1Y MA > 3Y MA | Primary | Weekly | ✅ Calibrated | 49.4% |
| P/E | Shiller CAPE | Current vs 20Y MA | Primary | Monthly | Pending | TBD |
| P/E | Equity Risk Premium | 6M MA vs 18M MA | Canary | Daily | Pending | TBD |
| INTL | ACWX/SPY Relative | 30D MA vs 90D MA | Canary | Daily | Pending | TBD |
| INTL | S&P vs MSCI World | 6M relative < -2% | Primary | Weekly | Pending | TBD |
| INTL | TIC Net Flows | 12M sum < 0 (fixed) | Structural | 2M lag | Pending | TBD |

### Signal Liquidity Framework

**Canary Indicators (30-35% theme weight)**
- Purpose: Early warning signals with daily liquidity
- Update: Daily, real-time
- Characteristics: Liquid markets, minimal lag, some noise acceptable
- Examples: DXY Index, QQQ/SPY, Equity Risk Premium, ACWX/SPY

**Primary Indicators (35-50% theme weight)**
- Purpose: Core theme measurement with balanced signal quality
- Update: Weekly to monthly
- Characteristics: Reliable data, moderate smoothing, main theme drivers
- Examples: Forward P/E, Productivity, Net Margins, CAPE

**Structural Indicators (20-30% theme weight)**
- Purpose: Long-term confirmation, whipsaw reduction
- Update: Quarterly or with significant lag
- Characteristics: Slow-moving, high confidence, regime confirmation
- Examples: USD Reserve Share, Central Bank Gold, Yuan SWIFT Share

## Enhanced Theme Strength Probability Framework (v3.11)

### CRITICAL CONCEPTUAL CORRECTION (v3.10)

**Previous Error (v3.9):** The framework calculated regime transition probabilities (likelihood of crossing triggers) which produced inverted results for portfolio allocation.

**Corrected Approach (v3.10-3.11):** Calculate theme strength probabilities directly representing current thematic conditions, not transition likelihoods.

### Mathematical Framework

**For triggered indicators (already past threshold):**
```python
base_probability = 0.70  # Higher baseline for active themes
distance_bonus = min(0.30, abs(distance_to_trigger) * 3)
momentum_boost = favorable_momentum * 0.25
result = base_probability + distance_bonus + momentum_boost
```

**For non-triggered indicators:**
```python
months_to_trigger = abs(distance_to_trigger) / momentum_rate
base_probability = time_decay_function(months_to_trigger)
direction_adjustment = momentum_direction_factor
result = base_probability * direction_adjustment
```

### Boundary Conditions

- Near trigger (±5%): High sensitivity to momentum
- Far from trigger (>30%): Cap maximum confidence
- Extreme momentum: Boost confidence for very strong trends

### Example Calculation Matrix

**Tech Boom Scenario - QQQ/SPY Analysis:**

| Current | MA Trigger | Distance | Momentum | Triggered | Direction | Theme Confidence |
|---------|------------|----------|----------|-----------|-----------|-----------------|
| 0.82 | 0.81 | +1.2% | +0.17 | YES | Away from trigger | 75% |
| 0.79 | 0.81 | -2.5% | +0.20 | NO | Toward trigger | 65% |
| 0.76 | 0.81 | -6.2% | +0.15 | NO | Toward trigger | 35% |
| 0.85 | 0.81 | +4.9% | -0.10 | YES | Toward trigger | 25% |

**Key Changes from v3.9:**
- Row 1: QQQ/SPY at 0.82 (triggered + strengthening) now produces 75% instead of 5%
- Correction eliminates inverted probability assignments

## Rebalancing Methodology

### Quarterly Full Optimization

**Schedule:** Third Friday of March, June, September, December

**Process:**
1. Update all 13 macro indicators
2. Calculate theme probabilities using v3.11 framework
3. Determine scenario probabilities (16 scenarios)
4. Select scenarios for optimization (≥85% cumulative)
5. Run individual scenario optimizations
6. Calculate regret matrix across likely scenarios
7. Execute dual optimization (α × Max_Regret + (1-α) × Weighted_Regret)
8. Apply smart hedging if maximum regret exceeds tolerance
9. ~~Validate against position and risk limits~~ *[UNDER CONSIDERATION: Position limit validation removed to evaluate regret minimization effectiveness]*
10. Execute trades using simplified execution framework

### Monthly Drift Check

**Schedule:** First Friday of each month

**Triggers:**
- Any position > 3% drift from target
- Total portfolio drift > 10%
- Theme probability change > 20%

**Action:** If triggered, execute mid-quarter rebalancing

### Data Quality Gates

**Green Light (Full Trading):**
- At least 12 of 13 indicators fresh
- All 4 themes have 2+ fresh indicators
- No theme fully missing

**Yellow Light (Provisional Trading):**
- 10-11 indicators fresh
- Document quality issues in optimization notes
- Proceed with increased monitoring

**Red Light (Trading Halt):**
- Fewer than 10 indicators fresh
- Any theme fully missing data
- Use carry-forward methodology with defensive tilt (+10% bonds)

## Trading Execution Framework

### Security-Specific Rules

**PIMIX (Hold-Only):**
- Never generate BUY orders for PIMIX
- Only SELL orders permitted
- When reducing income allocation, sell PIMIX first

**PYLD (Primary Income Vehicle):**
- Primary vehicle for income allocation increases
- All income BUY orders go to PYLD
- Trade in minimum $500 increments

**Core Equity (VTI/VEA/VWO):**
- Trade in $1000 increments minimum
- ~~Use limit orders for positions > $10,000~~ *[OUT OF SCOPE: Order type specifications]*
- ~~Execute over 2-3 days for large trades~~ *[OUT OF SCOPE: Complex execution timing]*

**Alternatives (SMH/SRVR/GLD/COM/IGF/DBMF):**
- Maintain minimum 1% positions when held
- ~~Use market orders for small positions (<$5000)~~ *[OUT OF SCOPE: Order type specifications]*
- ~~Limit orders for large positions~~ *[OUT OF SCOPE: Order type specifications]*

**Cash (SWVXX):**
- Residual balancing account
- Minimum 1% allocation always maintained

### Order Management - Simplified Framework

**Current Implementation Scope:**
- Generate buy/sell quantities to move from current to target allocation
- Apply PIMIX/PYLD trading rules
- Ignore drifts < 1% unless avoiding them would create negative cash position
- Execute all trades as simple buy/sell instructions

**📋 OUT OF SCOPE FOR CURRENT IMPLEMENTATION:**
*The following features are preserved for future enhancement but not implemented in Steps 6-7:*

- ~~Market Orders: Positions < $5,000~~
- ~~Limit Orders: Positions > $10,000~~
- ~~Execution Period: Spread large trades over 5 days~~
- ~~Priority: Execute highest-drift positions first~~

## Risk Management

### 🔄 UNDER CONSIDERATION - Position Limits
*These limits are preserved but not enforced in current implementation to evaluate regret minimization effectiveness:*

- Maximum single position: 35%
- Maximum sector concentration: 50%
- Minimum cash position: 1%
- Maximum alternatives combined: 30%
- DBMF maximum (hedging): 15%
- Combined income maximum: 30%

### Active Scenario Risk Limits

- Maximum regret in any likely scenario: -8%
- Minimum upside capture: 70%
- Maximum correlation to any single factor: 0.7

### Emergency Protocols

**Market Crisis (>20% decline in 30 days):**
- Suspend all rebalancing activities
- Maintain current positions
- Document indicator changes but do not act
- Resume normal operations after 30 days of stability

**Data System Failure:**
- Use last known good indicator values
- Apply defensive portfolio tilt (+10% bonds, +5% cash)
- Implement manual calculation backup procedures
- Monitor daily until data systems restored

**Extreme Scenario Divergence (Max regret >15%):**
- Document the scenario causing extreme regret
- Consider emergency hedge allocation (max 5% DBMF)
- Alert for manual review within 24 hours
- May require temporary suspension of optimization

## 📋 OUT OF SCOPE FOR CURRENT IMPLEMENTATION - Tax Optimization

*The following comprehensive tax optimization framework is preserved for future implementation but marked as out of scope for Steps 6-7:*

### Loss Harvesting
- Systematic loss harvesting in November-December
- Avoid wash sales across correlated ETFs:
  - VTI ↔ VOO, ITOT, SPTM
  - VEA ↔ VT, VTIAX, FTIHX
  - VWO ↔ VTIAX, VEMAX
- Harvest losses only if >$500 and >30 days to reestablish

### Distribution Management
- PIMIX distributions require special tax handling
- Monthly distribution reinvestment only if allocation is underweight
- Document all distribution elections in trade notes

### Account Optimization
- Prefer ETFs over mutual funds in taxable accounts
- Hold tax-inefficient positions (PIMIX, PYLD) in tax-deferred accounts when possible
- Coordinate rebalancing across account types

## Historical Tracking and Performance Attribution

### Quarterly Review Template

1. **Performance vs Benchmarks**
   - Absolute return vs target (8-12%)
   - Relative performance vs 60/40 benchmark
   - Risk-adjusted returns (Sharpe, max drawdown)

2. **Scenario Prediction Accuracy**
   - Which scenario actually occurred (retroactive assessment)
   - Theme probability accuracy vs realized outcomes
   - Indicator performance (false signals, missed signals)

3. **Portfolio Optimization Effectiveness**
   - Realized regret vs predicted regret
   - Hedging effectiveness (DBMF, defensive positions)
   - Trade execution quality

4. **Risk Management Review**
   - Position drift patterns
   - Correlation analysis
   - Stress test results

5. **Lessons Learned and Adjustments**
   - Indicator threshold adjustments
   - Risk parameter modifications
   - Process improvements

### Data Retention

- **State Snapshots:** Monthly portfolio state and indicator values
- **Trade Records:** All transactions with reasoning and priority scores
- **Performance History:** Monthly returns attributed to themes and scenarios
- **Optimization History:** Regret matrices and dual optimization parameters

## Appendices

### Appendix A: Security Selection Criteria

- Minimum AUM: $1B for ETFs, $500M for mutual funds
- Maximum expense ratio: 1.0% for active funds, 0.5% for passive
- Minimum daily volume: $10M average
- Listed on major US exchange
- Track record: Minimum 3 years operational history

### Appendix B: Backtesting Framework

**Historical Validation Requirements:**
- Test optimization framework on 10+ years historical data
- Validate regret minimization vs simple mean-variance
- Confirm indicator trigger frequencies (target: 50% each)
- Stress test during major market events (2008, 2020, etc.)

**Performance Benchmarks:**
- Primary: 60/40 Stock/Bond portfolio
- Secondary: All-Weather portfolio
- Tertiary: Target volatility strategies

### Appendix C: Technology Infrastructure

**Data Sources:**
- Primary: Direct API feeds from brokers/data vendors
- Backup: Manual data collection procedures
- Validation: Cross-reference multiple sources

**Calculation Engine:**
- Primary: HCP Tracker application (Steps 1-7)
- Backup: Excel-based calculation templates
- Validation: Independent calculation verification

**State Management:**
- Primary: Local browser storage
- Backup: JSON export/import procedures
- Archive: Quarterly state snapshots

### Appendix D: Regulatory and Compliance

**Fiduciary Considerations:**
- Document all optimization decisions and rationale
- Maintain audit trail of indicator data and sources
- Record deviations from standard procedures

**📋 OUT OF SCOPE FOR CURRENT IMPLEMENTATION - Tax Reporting:**
*Preserved for future implementation:*
- Detailed transaction records with cost basis
- Distribution tracking and reinvestment elections
- Wash sale monitoring and documentation

**Risk Disclosure:**
- Scenario-based optimization may underperform in unprecedented conditions
- Regret minimization does not guarantee positive returns
- Indicator-based triggers may produce false signals

### Appendix E: Implementation Checklist

**Initial Setup:**
- Configure all 13 indicator data sources
- Validate indicator trigger calculations
- Implement regret optimization algorithm
- Test dual optimization framework
- Configure simplified trade execution rules

**Ongoing Operations:**
- Monthly indicator data updates
- Quarterly full optimization
- Trade execution using simplified framework
- Performance attribution analysis
- Risk limit monitoring (without enforcement)

**Exception Handling:**
- Data quality failure procedures
- Market crisis protocols
- Emergency override procedures
- Manual calculation backup systems

### Appendix F: Document Integrity Controls

**CRITICAL IMPLEMENTATION SECTIONS - NEVER REMOVE:**

The following sections contain essential implementation details required for portfolio management. Any IPS version that removes or substantially reduces these sections is incomplete and unsuitable for production use:

1. **Security Universe (Section: Asset Allocation Framework)**
   - All 12 securities with exact tickers
   - PIMIX hold-only rule, PYLD primary income rule
   - Trading increment specifications

2. **Portfolio Optimization Methodology (Complete section)**
   - 6-step regret minimization process
   - Dual optimization formula: α × Max_Regret + (1-α) × Weighted_Regret
   - Smart hedging protocols

3. **Trading Execution Framework (Complete section)**
   - Security-specific rules for each asset
   - Simplified order management procedures
   - Current implementation scope clearly marked

4. **Risk Management (Complete section)**
   - Position limits (marked as under consideration)
   - Scenario risk limits and emergency protocols

5. **All Appendices A-E**
   - Implementation checklists, regulatory procedures, technology specs

**MANDATORY VERSION CONTROL REQUIREMENTS:**

Any person updating this IPS must:

1. **Pre-Update Documentation:**
   - Create section-by-section comparison table
   - Document word count of current version
   - List all securities, rules, and limits in current version

2. **Post-Update Validation:**
   - Verify all Critical Implementation Sections preserved
   - Confirm no trading rules or position limits removed
   - Validate that someone could implement the portfolio system using only this document

3. **Change Documentation:**
   - Include version comparison table showing additions/removals
   - Justify any content reduction with explicit rationale
   - Obtain review from portfolio implementation team

**VERSION NUMBERING:**
- Major (X.0): Framework changes affecting implementation
- Minor (X.Y): Enhancements preserving all implementation details  
- Patch (X.Y.Z): Calibration updates, minor corrections only

**REGRESSION RECOVERY:** If any version is discovered to be missing critical implementation details:
1. Immediately revert to last complete version
2. Merge new improvements with complete implementation framework
3. Re-release as corrected version with full validation

*Violation of these controls has previously resulted in loss of critical portfolio implementation details. These requirements prevent regression and ensure investment operations continuity.*

## Version History

### Version 3.11 (September 02, 2025, 23:00:00)
**SURGICAL UPDATES FOR REBALANCING IMPLEMENTATION:**
- **POSITION LIMITS:** Marked as "UNDER CONSIDERATION" in Steps 5-7 to evaluate regret minimization effectiveness
- **TAX OPTIMIZATION:** Marked complete framework as "OUT OF SCOPE FOR CURRENT IMPLEMENTATION"
- **ORDER TYPES:** Simplified execution framework, marked complex order management as out of scope
- **TRADE EXECUTION:** Streamlined to essential buy/sell generation with PIMIX/PYLD rules
- **COMPLETE PRESERVATION:** All existing implementation details maintained with clear scope annotations
- **ZERO REGRESSION:** No content removed, all features marked for future consideration/implementation

### Version 3.10 (September 02, 2025, 20:00:00)
**COMPREHENSIVE UPDATE:** Merged all valuable content from v3.9 with v3.10 indicator improvements

**CRITICAL CORRECTION:** Fixed Enhanced Theme Strength Probability Framework calculation logic

**COMPLETE PRESERVATION:** Restored all missing sections from v3.9:
- Complete 12-asset security universe
- PIMIX/PYLD trading rules and constraints
- Sophisticated regret minimization portfolio optimization
- Dual optimization framework (α × Max_Regret + (1-α) × Weighted_Regret)
- Smart hedging protocols
- Quarterly rebalancing methodology
- Data quality gates and emergency protocols
- Trading execution framework with security-specific rules
- Risk management and position limits
- Tax optimization procedures
- Complete appendices A-E

**ENHANCED FRAMEWORK:** All 13 indicators use adaptive MA comparisons (except TIC flows)

**VALIDATED CALIBRATIONS:** Productivity (47.7%) and Forward P/E (49.4%) trigger rates confirmed

### Version 3.9 (August 25, 2025, 11:30 AM)
- Major philosophical shift to MA comparisons
- Signal liquidity framework implementation
- Complete calibration framework established

### Previous Versions (v1.0 - v3.8)
See previous documentation for complete version history.

---

**End of Investment Policy Statement v3.11 - Rebalancing Implementation Focus**