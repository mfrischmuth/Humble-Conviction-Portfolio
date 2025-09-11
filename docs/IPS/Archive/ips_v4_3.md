# Investment Policy Statement (IPS) Framework
## Version 4.3 - Unified Data and Portfolio Framework
**Last Updated:** September 08, 2025, 00:00:00 UTC  
**Status:** Framework Definition - Details Under Refinement
**Filename:** IPS_v4.3_Unified_Framework.md

## Executive Summary

Version 4.3 unifies the data collection framework from IPS v4.2 with the portfolio construction methodology from IPS v3.11, adapted for a richer 81-scenario framework based on ternary theme states.

**Key Innovation**: Instead of 16 binary scenarios (themes either on/off), the framework now models 81 scenarios where each theme can be weak (-1), neutral (0), or strong (+1), providing more nuanced portfolio optimization while preserving the sophisticated regret minimization approach.

**Core Principle**: Let statistical models handle complexity without arbitrary calibrations. Pure GARCH estimation, percentile-based normalization, and data-driven theme state determination replace manual adjustments.

## Part I: Data Collection and Theme Framework (from v4.2)

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

## Part II: Portfolio Construction Framework (adapted from v3.11)

### Investment Objectives

**Primary:** Achieve 8-12% annual returns across market cycles  
**Secondary:** Limit maximum drawdown to 15% in any 12-month period  
**Tertiary:** Maintain liquidity for opportunistic investments

### Security Universe (12 Assets)

**Equity Exposures (5):**
- VTI: US Total Market (core domestic)
- VEA: Developed International (core international)
- VWO: Emerging Markets (emerging exposure)
- SMH: Semiconductors (innovation theme expression)
- SRVR: Infrastructure/Data Centers (innovation infrastructure)

**Income Exposures (2):**
- PIMIX: PIMCO Income Fund (hold-only, no new purchases)
- PYLD: PIMCO Yield Opportunities (primary income vehicle)

**Alternative Exposures (4):**
- GLD: Gold (USD hedge, crisis protection)
- COM: Commodities (real asset exposure)
- IGF: Global Infrastructure (inflation protection)
- DBMF: Managed Futures (crisis alpha, hedging)

**Cash (1):**
- SWVXX: Money Market (liquidity, defensive)

### Portfolio Optimization Methodology

#### Step 1: Scenario Selection
From 81 possible scenarios:
1. Sort by probability (highest first)
2. Include until cumulative probability ≥ 85%
3. Minimum 3 scenarios, maximum 6
4. Include any scenario ≥ 10% probability regardless

#### Step 2: Individual Scenario Optimization
For each selected scenario, create optimal allocation:
1. Start with baseline allocation (neutral scenario)
2. Apply theme tilts based on theme states (-1, 0, +1)
3. Normalize to sum to 100%

**Theme Tilt Framework (Conceptual - Details Under Refinement):**

*USD Dominance:*
- Strong (+1): Favor USD assets (VTI, SWVXX)
- Neutral (0): Baseline allocation
- Weak (-1): Favor non-USD assets (VEA, VWO, GLD, COM)

*Innovation Environment:*
- Strong (+1): Favor tech/growth (SMH, SRVR, tech-heavy VTI)
- Neutral (0): Baseline allocation
- Weak (-1): Reduce tech exposure

*Valuation Dynamics:*
- High (+1): Defensive positioning (PYLD, GLD, SWVXX)
- Neutral (0): Baseline allocation
- Low (-1): Risk-on positioning (equities, reduce defensive)

*US Market Leadership:*
- Strong (+1): Favor US assets (VTI, reduce VEA/VWO)
- Neutral (0): Baseline allocation
- Weak (-1): Favor international (VEA, VWO, IGF)

#### Step 3: Regret Matrix Calculation
Calculate regret for each portfolio in each scenario:
```
Regret(Portfolio_A, Scenario_B) = Return(Portfolio_A, Scenario_B) - Return(Optimal_B, Scenario_B)
```

#### Step 4: Dual Optimization
Minimize combined objective:
```
α × Max_Regret + (1-α) × Probability_Weighted_Regret
```
Where α ∈ [0.3, 0.7] balances worst-case protection vs expected outcome

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

## Part III: Implementation Status

### Currently Implemented
- ✅ Data collection framework (IPS v4.2)
- ✅ 12 indicators with automated collection
- ✅ GARCH volatility estimation (15-year lookback)
- ✅ Theme state calculation (ternary: -1, 0, +1)
- ✅ 81-scenario generation

### Under Development
- 🔄 Portfolio optimization for 81 scenarios
- 🔄 Theme tilt calibration for ternary states
- 🔄 Expected return modeling
- 🔄 Regret matrix calculations

### Design Decisions Pending
- Exact tilt magnitudes for each theme state
- Expected return assumptions by scenario
- Integration of theme probabilities with scenario selection
- Position limit enforcement strategy

## Appendices

### Appendix A: Migration from Previous Versions

**From IPS v3.11 (16 binary scenarios):**
- Scenarios expanded from 16 to 81
- Binary theme states → Ternary states
- Theme tilts now gradual rather than on/off
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

**Future Refinements (v4.3.x):**
- v4.3.1: Theme tilt calibration
- v4.3.2: Expected return modeling
- v4.3.3: Position limit decisions
- v4.3.4: Backtest validation

## Version History

### Version 4.3 (September 08, 2025, 00:00:00 UTC)
**UNIFIED FRAMEWORK:**
- Merged IPS v4.2 data framework with v3.11 portfolio methodology
- Adapted for 81 ternary scenarios (was 16 binary)
- Preserved regret minimization approach
- Updated all theme names to v4.2 standard
- Left implementation details flexible for refinement

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

**End of Investment Policy Statement v4.3 - Unified Framework**