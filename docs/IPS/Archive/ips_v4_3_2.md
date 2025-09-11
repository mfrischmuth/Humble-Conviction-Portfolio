# Investment Policy Statement (IPS) Framework
## Version 4.3.2 - Complete Framework with Return Modeling
**Last Updated:** September 08, 2025, 16:30:00 UTC  
**Status:** Production Ready with Full Return Framework
**Filename:** IPS_v4.3.2_Complete_Framework.md

## Executive Summary

Version 4.3.2 completes the unified framework by adding the expected return modeling system and incorporating lessons from historical performance analysis. All 12 securities remain in the universe with return expectations calibrated to neutral [0,0,0,0] baseline.

**Key Updates in v4.3.2:**
- Complete theme return impact matrix for all 12 securities
- Base return framework calibrated to neutral scenario
- Increased scenario selection cap (3-15 vs 3-6) for 81-scenario framework
- Removed redundant mean reversion penalties
- Validated historical performance adjustments (±20% from original estimates)

## Part I: Data Collection and Theme Framework

### Four Macro Themes with Three States

The portfolio framework monitors four macro themes, each determined by three indicators with different temporal characteristics:

1. **USD Dominance** (Weak/Neutral/Strong)
2. **Innovation Environment** (Weak/Neutral/Strong)  
3. **Valuation Dynamics** (Low/Neutral/High)
4. **US Market Leadership** (Weak/Neutral/Strong)

### Indicator Framework (12 Total)

| Theme | Temporal | Indicator | Field Name | Source |
|-------|----------|-----------|------------|--------|
| **USD** | Leading | DXY Index | `dxy_index` | Yahoo Finance |
| | Concurrent | Real Rate Differential | `real_rate_differential` | FRED |
| | Lagging | IMF COFER Reserve Share | `cofer_usd` | IMF Quarterly |
| **Innovation** | Leading | QQQ/SPY Ratio | `qqq_spy_ratio` | Yahoo Finance |
| | Concurrent | US Productivity Growth | `productivity_growth` | FRED |
| | Lagging | Tech Employment % | `tech_employment_pct` | FRED |
| **Valuation** | Leading | Put/Call Ratio | `put_call_ratio` | CBOE |
| | Concurrent | Trailing P/E | `trailing_pe` | Yahoo Finance |
| | Lagging | EPS Delivery Rate | `eps_delivery` | Calculated |
| **US Leadership** | Leading | SPY/EFA Momentum | `spy_efa_momentum` | Yahoo Finance |
| | Concurrent | US Market % of Global | `us_market_pct` | Calculated |
| | Lagging | ETF Flow Differential | `etf_flow_differential` | Volume Proxy |

### Statistical Processing

**GARCH Configuration:**
- Trend Lookback: 24 months
- GARCH Lookback: 180 months (15 years)
- Percentile Calculation: 180 months
- Minimum History Required: 60 months

**Theme State Determination:**
- Bottom tercile (≤33rd percentile): State = -1 (Weak/Low)
- Middle tercile (33rd-67th percentile): State = 0 (Neutral)
- Top tercile (≥67th percentile): State = +1 (Strong/High)

**NO arbitrary calibrations** - GARCH models and percentile transformations handle all normalization.

### Scenario Generation

With 4 themes × 3 states each = **81 possible scenarios**

Each scenario is identified by a 4-element vector [USD, Innovation, Valuation, USLeadership] where each element ∈ {-1, 0, +1}.

Example scenarios:
- [0, 0, 0, 0]: All themes neutral (baseline scenario)
- [+1, +1, -1, -1]: USD strong, Innovation strong, Valuation low, US Leadership weak
- [-1, 0, +1, +1]: USD weak, Innovation neutral, Valuation high, US Leadership strong

## Part II: Portfolio Construction Framework

### Investment Objectives

**Primary:** Achieve 8-12% annual returns across market cycles  
**Secondary:** Limit maximum drawdown to 15% in any 12-month period  
**Tertiary:** Maintain liquidity for opportunistic investments

### Security Universe (12 Assets)

**Equity Exposures (6):**
- VTI: US Total Market (core domestic)
- VEA: Developed International (core international)
- VWO: Emerging Markets (emerging exposure)
- SMH: Semiconductors (innovation theme expression)
- SRVR: Infrastructure/Data Centers (innovation infrastructure)
- IGF: Global Infrastructure (classified as equity)

**Income Exposures (2):**
- PIMIX: PIMCO Income Fund (hold-only, no new purchases)
- PYLD: PIMCO Yield Opportunities (primary income vehicle)

**Alternative Exposures (3):**
- GLD: Gold (USD hedge, crisis protection)
- COM: Commodities (real asset exposure)
- DBMF: Managed Futures (crisis alpha, hedging)

**Cash (1):**
- SWVXX: Money Market (liquidity, defensive)

### Baseline Portfolio (Neutral Scenario [0,0,0,0])

**Updated allocation based on historical performance review:**

```
Equity (60%):
- VTI: 30%   (Core US equity)
- VEA: 15%   (International developed)
- VWO: 8%    (Emerging markets)
- SMH: 3%    (Semiconductors - reduced from 5%)
- SRVR: 2%   (Data infrastructure - reduced from 3%)
- IGF: 2%    (Global infrastructure)

Income (30%):
- PYLD: 25%  (Primary income vehicle)
- PIMIX: 5%  (Hold-only legacy position)

Alternatives (10%):
- GLD: 3%    (Gold hedge)
- COM: 3%    (Commodities)
- DBMF: 3%   (Managed futures)
- SWVXX: 1%  (Cash/liquidity)
```

### Expected Return Framework

#### Base Returns (Neutral Scenario [0,0,0,0])

```javascript
// Calibrated to neutral scenario with ±20% adjustments from original estimates
const baseReturns = {
    // Equity
    VTI:   0.100,  // 10.0% - US total market
    VEA:   0.095,  // 9.5%  - International developed
    VWO:   0.085,  // 8.5%  - Emerging markets
    SMH:   0.115,  // 11.5% - Semiconductors (capped from historical 29%)
    SRVR:  0.080,  // 8.0%  - Data infrastructure REITs
    IGF:   0.080,  // 8.0%  - Global infrastructure
    
    // Income
    PYLD:  0.065,  // 6.5%  - Multi-sector bond
    PIMIX: 0.060,  // 6.0%  - Income fund
    
    // Alternatives
    GLD:   0.045,  // 4.5%  - Gold
    COM:   0.055,  // 5.5%  - Commodities
    DBMF:  0.055,  // 5.5%  - Managed futures
    
    // Cash
    SWVXX: 0.045   // 4.5%  - Money market
};
```

#### Theme Return Impact Matrix

Annual return adjustments based on theme states (additive across themes):

```javascript
const themeReturnImpacts = {
    //         USD States           Innovation States      Valuation States       US Leadership States
    //         Weak  Neut Strong   Weak  Neut Strong      Low   Neut High       Weak  Neut Strong
    VTI:    [-0.02, 0.00, +0.01,  -0.03, 0.00, +0.04,   +0.06, 0.00, -0.04,   -0.05, 0.00, +0.03],
    VEA:    [+0.04, 0.00, -0.03,  -0.01, 0.00, +0.01,   +0.04, 0.00, -0.03,   +0.06, 0.00, -0.04],
    VWO:    [+0.06, 0.00, -0.05,  -0.02, 0.00, -0.01,   +0.05, 0.00, -0.04,   +0.08, 0.00, -0.06],
    
    SMH:    [-0.01, 0.00, +0.01,  -0.08, 0.00, +0.12,   +0.10, 0.00, -0.08,   -0.03, 0.00, +0.02],
    SRVR:   [-0.01, 0.00, +0.01,  -0.05, 0.00, +0.08,   +0.07, 0.00, -0.05,   -0.02, 0.00, +0.02],
    IGF:    [+0.02, 0.00, -0.02,  -0.01, 0.00, +0.02,   +0.03, 0.00, -0.02,   +0.04, 0.00, -0.03],
    
    PYLD:   [+0.01, 0.00, -0.01,  +0.02, 0.00, -0.03,   -0.04, 0.00, +0.05,   +0.01, 0.00, -0.01],
    PIMIX:  [+0.01, 0.00, -0.01,  +0.01, 0.00, -0.02,   -0.03, 0.00, +0.04,   +0.01, 0.00, -0.01],
    
    GLD:    [+0.12, 0.00, -0.08,  +0.02, 0.00, -0.03,   -0.05, 0.00, +0.08,   +0.03, 0.00, -0.02],
    COM:    [+0.08, 0.00, -0.06,  +0.00, 0.00, +0.00,   -0.02, 0.00, +0.03,   +0.02, 0.00, -0.02],
    DBMF:   [+0.03, 0.00, -0.02,  +0.02, 0.00, -0.02,   -0.03, 0.00, +0.06,   +0.02, 0.00, -0.02],
    
    SWVXX:  [-0.01, 0.00, +0.02,  +0.00, 0.00, +0.00,   -0.02, 0.00, +0.03,   +0.00, 0.00, +0.00]
};
```

#### Expected Return Calculation

```javascript
function calculateExpectedReturn(portfolio, scenario) {
    let totalReturn = 0;
    
    for (const [security, weight] of Object.entries(portfolio)) {
        // Start with base return at neutral
        let securityReturn = baseReturns[security];
        
        // Add theme impacts (additive)
        const [usd, innovation, valuation, usLeadership] = scenario;
        
        // Map scenario states to impact indices (shift by 1 for array indexing)
        securityReturn += themeReturnImpacts[security][0][usd + 1];      
        securityReturn += themeReturnImpacts[security][1][innovation + 1]; 
        securityReturn += themeReturnImpacts[security][2][valuation + 1];  
        securityReturn += themeReturnImpacts[security][3][usLeadership + 1];
        
        totalReturn += weight * securityReturn;
    }
    
    return totalReturn;
}
```

### Portfolio Optimization Methodology

#### Step 1: Scenario Selection (Updated for 81 scenarios)
From 81 possible scenarios:
1. Sort by probability (highest first)
2. Include until cumulative probability ≥ 85%
3. **Minimum 3 scenarios, maximum 15** (increased from 6)
4. Include any scenario ≥ 10% probability regardless

#### Step 2: Individual Scenario Optimization

**Factor Adjustment Matrix:**

Each security receives adjustments based on the state of each theme. Adjustments are additive across themes.

```
Factor Adjustments (% allocation change):
           USD States           Innovation States      Valuation States       US Leadership States
           Weak  Neut Strong   Weak  Neut Strong      Low   Neut High       Weak  Neut Strong
VTI:     [-0.10, 0.00, +0.05] [-0.05, 0.00, +0.10] [+0.15, 0.00, -0.10] [-0.15, 0.00, +0.10]
VEA:     [+0.10, 0.00, -0.08] [-0.02, 0.00, +0.02] [+0.08, 0.00, -0.05] [+0.12, 0.00, -0.10]
VWO:     [+0.12, 0.00, -0.10] [-0.03, 0.00, -0.02] [+0.10, 0.00, -0.08] [+0.15, 0.00, -0.12]
SMH:     [-0.02, 0.00, +0.02] [-0.15, 0.00, +0.20] [+0.20, 0.00, -0.15] [-0.05, 0.00, +0.05]
SRVR:    [-0.03, 0.00, +0.03] [-0.10, 0.00, +0.15] [+0.15, 0.00, -0.12] [-0.04, 0.00, +0.04]
IGF:     [+0.04, 0.00, -0.03] [-0.02, 0.00, +0.03] [+0.02, 0.00, -0.02] [+0.08, 0.00, -0.06]
PYLD:    [+0.02, 0.00, -0.02] [+0.05, 0.00, -0.08] [-0.10, 0.00, +0.12] [+0.02, 0.00, -0.02]
PIMIX:   [ 0.00, 0.00,  0.00] [+0.02, 0.00, -0.03] [-0.05, 0.00, +0.08] [ 0.00, 0.00,  0.00]
GLD:     [+0.15, 0.00, -0.12] [+0.03, 0.00, -0.05] [-0.08, 0.00, +0.15] [+0.05, 0.00, -0.03]
COM:     [+0.08, 0.00, -0.06] [ 0.00, 0.00,  0.00] [-0.03, 0.00, +0.05] [+0.03, 0.00, -0.02]
DBMF:    [+0.02, 0.00, -0.02] [+0.02, 0.00, -0.02] [-0.05, 0.00, +0.10] [+0.02, 0.00, -0.02]
SWVXX:   [-0.05, 0.00, +0.08] [+0.03, 0.00, -0.02] [-0.12, 0.00, +0.15] [-0.02, 0.00, +0.02]
```

**Portfolio Construction Process:**
1. Start with baseline allocation
2. Apply factor adjustments based on scenario states
3. Sum adjustments across all four themes
4. Normalize to 100%

#### Step 3: Regret Matrix Calculation
Calculate regret for each portfolio in each scenario:
```
Regret(Portfolio_A, Scenario_B) = Return(Optimal_B, Scenario_B) - Return(Portfolio_A, Scenario_B)
```

#### Step 4: Dual Optimization
Minimize combined objective:
```
α × Max_Regret + (1-α) × Probability_Weighted_Regret
```
Where:
- α ∈ [0.3, 0.7] balances worst-case protection vs expected outcome
- Default α = 0.5 for balanced approach

#### Step 5: Smart Hedging Protocol
If maximum regret exceeds tolerance:
- Assess portfolio correlation across scenarios
- Add hedging based on divergence type
- Maximum hedge additions: 15% of portfolio

#### Step 6: Final Validation
- Apply security-specific rules (PIMIX hold-only, PYLD primary income)
- Ensure minimum cash position (1%)
- Position limits under consideration (not currently enforced)

### Rebalancing Framework

**Quarterly Full Optimization:** Third Friday of March, June, September, December

**Monthly Drift Check:** First Friday of each month
- Trigger if any position >3% drift or total >10% drift

**Security-Specific Rules:**
- PIMIX: Hold-only (never generate BUY orders)
- PYLD: Primary vehicle for income allocation increases
- Minimum cash: 1% always maintained

### Risk Management

**Position Limits (Under Consideration):**
- Maximum single position: 35%
- Maximum sector concentration: 50%
- Maximum alternatives: 30%

**Active Risk Limits:**
- Maximum regret in any likely scenario: -8%
- Minimum upside capture: 70%

### Historical Context Note

**Recent market environment (2019-2024):**
- Scenario approximation: [+1, +1, +1, +1]
- USD strong, Innovation boom, Valuations high, US outperformance
- Explains: SMH +29% annual, VTI outperformance, GLD underperformance

**Return expectations assume reversion toward neutral [0,0,0,0] scenario.**

## Part III: Implementation Status

### Completed in v4.3.2
- ✅ Complete expected return framework
- ✅ Theme return impact matrix
- ✅ Base returns calibrated to neutral scenario
- ✅ Scenario selection adapted for 81 scenarios
- ✅ Historical performance validation

### Ready for Implementation
- Portfolio Optimizer v3.0 with 81-scenario framework
- Full regret minimization engine
- Dynamic scenario selection (3-15 scenarios)

## Example Portfolio Calculation

**Scenario:** [-1, +1, +1, 0] (Weak USD, Strong Innovation, High Valuation, Neutral US Leadership)

Starting from baseline and applying factor adjustments:
- VTI: 30% → -10% +10% -10% +0% = 20% raw → **11.5%** normalized
- VEA: 15% → +10% +2% -5% +0% = 22% raw → **12.6%** normalized
- GLD: 3% → +15% -5% +15% +0% = 28% raw → **16.1%** normalized
- PYLD: 25% → +2% -8% +12% +0% = 31% raw → **17.8%** normalized

Final portfolio emphasizes defensive positioning (high GLD, PYLD) appropriate for weak dollar and high valuation environment.

## Appendices

### Appendix A: Migration from Previous Versions

**From IPS v3.11 (16 binary scenarios):**
- Scenarios expanded from 16 to 81
- Binary theme states → Ternary states
- Theme tilts now gradual via factor matrix
- Core regret minimization preserved

**From IPS v4.2 (data framework only):**
- Added complete portfolio construction methodology
- Integrated with 81-scenario framework
- Preserved statistical purity (no calibrations)

### Appendix B: Technical Implementation

**Module Architecture:**
- File Handler v3.1: Data loading and structure
- Indicators v3.0: Theme definitions and state calculation
- Theme Calculator v4.0: GARCH and probability estimation
- Portfolio Optimizer v3.0: 81-scenario optimization (pending)
- Data Editor v2.0: Manual override interface

### Appendix C: Version Control

**Version Numbering:**
- Major (X.0): Framework changes
- Minor (X.Y): Methodology refinements
- Patch (X.Y.Z): Parameter adjustments

## Version History

### Version 4.3.2 (September 08, 2025, 16:30:00 UTC)
**COMPLETE RETURN FRAMEWORK:**
- Added theme return impact matrix
- Added base returns at neutral scenario
- Increased scenario selection cap to 15
- Incorporated historical performance analysis
- Removed redundant mean reversion penalties

### Version 4.3.1 (September 08, 2025, 00:15:00 UTC)
**FACTOR ADJUSTMENT MATRIX ADDED:**
- Added complete 12x12 factor adjustment matrix
- Included example portfolio calculation
- Specified baseline portfolio (60/30/10)

### Version 4.3 (September 08, 2025, 00:00:00 UTC)
**UNIFIED FRAMEWORK:**
- Merged IPS v4.2 data framework with v3.11 portfolio methodology
- Adapted for 81 ternary scenarios (was 16 binary)
- Preserved regret minimization approach
- Updated all theme names to v4.2 standard

### Version 4.2 (September 07, 2025, 22:00:00 UTC)
**Practical implementation with clean statistical framework**
- Focus on data collection and indicators
- Removed all arbitrary calibrations
- 12 indicators aligned with automated collection

### Version 3.11 (September 02, 2025, 23:00:00 UTC)
**Complete portfolio methodology for 16 binary scenarios**
- Full regret minimization framework
- 12-asset security universe
- Position limits under consideration

---

**End of Investment Policy Statement v4.3.2 - Complete Framework**