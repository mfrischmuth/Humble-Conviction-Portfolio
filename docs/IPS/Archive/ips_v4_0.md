# Investment Policy Statement (IPS) Framework
## Version 4.0 - Three-State Regime Framework
**Last Updated:** December 13, 2024, 14:00:00 UTC  
**Status:** Production Ready - Major Architecture Revision
**Filename:** IPS_v4.0_Three_State_Framework.md

## Executive Summary

This Investment Policy Statement outlines a systematic, probability-weighted approach to portfolio management based on macro regime analysis. The framework monitors 12 indicators across 4 themes to determine scenario probabilities and optimize allocation accordingly using sophisticated regret minimization techniques.

**Core Innovation**: The portfolio dynamically adjusts based on transition probabilities across 81 possible macro scenarios, using three-state indicator classification (-1/0/+1) to capture regime nuance beyond simple binary triggers. Dual optimization minimizes both maximum regret and probability-weighted regret across likely scenarios.

**Version 4.0 Revolution**: Complete architectural redesign moving from binary to three-state framework, with balanced temporal indicator coverage (leading/concurrent/lagging) for each theme. Monthly rebalancing with 6-month transition probability horizons enables responsive positioning while maintaining strategic perspective.

## Key Changes in Version 4.0

- **Three-State Classification**: Indicators classified as -1 (bottom tercile), 0 (middle tercile), +1 (top tercile)
- **81 Scenarios**: Expanded from 16 binary scenarios to 81 three-state scenarios (3^4 themes)
- **Balanced Indicators**: 12 total indicators with 3 per theme (leading, concurrent, lagging)
- **Monthly Rebalancing**: Increased frequency from quarterly for enhanced responsiveness
- **Transition Probabilities**: 6-month forward-looking horizon using vector extrapolation
- **Cleaner Data**: All indicators from mainstream sources (FRED, Yahoo, Bloomberg)
- **Theme Refinement**: "International" reframed as "US Market Leadership"

## Philosophical Framework

### Core Beliefs
1. **Markets are regime-dependent** - Different macro environments require different exposures
2. **Regimes exist on a spectrum** - Three states capture nuance better than binary classification
3. **Diversification across scenarios** beats diversification within a single scenario
4. **Temporal balance matters** - Leading, concurrent, and lagging signals provide complete picture
5. **Systematic beats discretionary** - Rules-based approach removes emotional bias
6. **Responsiveness with stability** - Monthly rebalancing with 6-month horizons balances both needs

### Investment Principles
- **Regret minimization** over return maximization
- **Scenario robustness** over point forecasts
- **Adaptive positioning** based on transition probabilities
- **Risk management** through avoiding catastrophic outcomes in any probable scenario

## Three-State Indicator Framework

### Methodology
Each indicator is classified into three states based on historical percentiles:
- **-1**: Bottom tercile (0-33rd percentile)
- **0**: Middle tercile (33rd-67th percentile)
- **+1**: Top tercile (67th-100th percentile)

Percentiles calculated using 15-year rolling windows, updated monthly.

### Temporal Classification
Each theme includes three indicators:
- **Leading (30% weight)**: Early warning signals, forward-looking markets
- **Concurrent (40% weight)**: Current state confirmation, real-time conditions
- **Lagging (30% weight)**: Structural confirmation, regime validation

## Macro Theme Framework

### Theme 1: USD Reserve Currency Status
**Question**: Is the dollar's global reserve role strengthening or weakening?

**Indicators**:
- **Leading**: DXY Index (FX market expectations)
- **Concurrent**: Real Rate Differential (US 10yr real - G10 average)
- **Lagging**: IMF COFER Reserve Share (central bank allocations)

**Interpretation**:
- **+1 State**: Dollar strengthening, reserve status secure
- **0 State**: Stable dollar regime, no major shifts
- **-1 State**: Dollar weakening, reserve status eroding

### Theme 2: Innovation Environment
**Question**: Is the economy experiencing innovation-driven productivity growth?

**Indicators**:
- **Leading**: ARKK/SPY Ratio (innovation sentiment)
- **Concurrent**: US Productivity Growth (actual efficiency gains)
- **Lagging**: Corporate R&D/Revenue (innovation investment)

**Interpretation**:
- **+1 State**: Innovation boom, productivity acceleration
- **0 State**: Normal innovation, steady productivity
- **-1 State**: Innovation drought, productivity stagnation

### Theme 3: P/E Valuation Regime
**Question**: Are equity valuations extended or compressed?

**Indicators**:
- **Leading**: Equity Put/Call Ratio (options positioning)
- **Concurrent**: S&P 500 Forward P/E (current valuation)
- **Lagging**: 12M Forward EPS Delivery Rate (earnings reality)

**Interpretation**:
- **+1 State**: Valuations extended, euphoria present
- **0 State**: Normal valuations, balanced sentiment
- **-1 State**: Valuations compressed, fear dominant

### Theme 4: US Market Leadership
**Question**: Is the US maintaining or losing equity market leadership?

**Indicators**:
- **Leading**: SPY/VXUS Momentum (3-month relative performance)
- **Concurrent**: US Market Cap % of Global (dominance measure)
- **Lagging**: Cumulative ETF Flows US vs Intl (12M investment flows)

**Interpretation**:
- **+1 State**: US dominance strengthening
- **0 State**: Balanced global performance
- **-1 State**: US losing leadership to international

## Transition Probability Methodology

### Vector Extrapolation Framework
For each theme's continuous value (-1.0 to +1.0):
1. **Trend Fitting**: Linear regression through last 6 monthly observations
2. **Forward Projection**: Extend trend 6 months forward
3. **Volatility Bands**: Calculate using GARCH(1,1) model
4. **Boundary Crossing**: Probability of crossing -0.33 or +0.33 thresholds
5. **Transition Matrix**: Populate 81×81 probability matrix

### Mathematical Specification
```
P(transition) = Φ((boundary - μ_projected) / σ_GARCH)
Where:
- Φ = cumulative normal distribution
- μ_projected = trend-based 6-month forecast
- σ_GARCH = volatility from GARCH model
```

### Scenario Transition Rules
- **Single theme transitions**: Direct probability calculation
- **Multiple theme transitions**: Product of individual probabilities
- **Correlation emergence**: Natural through aligned momentum vectors

## Security Universe

### Core Holdings (12 Assets)

**Global Equity (5)**
- VT: Total World Stock
- VOO: S&P 500
- VTIAX: Total International Stock
- VWO: Emerging Markets
- VXUS: Total International Stock (ex-US)

**Sector/Style (3)**
- SMH: Semiconductors
- ARKK: Innovation Companies
- VTV: Value Stocks

**Fixed Income (2)**
- PIMIX: PIMCO Income Fund
- PYLD: PIMCO Dynamic Income Strategy

**Real Assets (2)**
- GLD: Gold
- DJP: Commodities

### Trading Rules

**PIMIX/PYLD Constraints**:
- Maximum combined allocation: 40%
- Minimum individual allocation if held: 5%
- Rebalance between them to maintain equal weight when both held
- No wash sale restrictions (mutual funds)

**ETF Trading**:
- Standard market orders during regular hours
- No minimum holding periods
- Tax loss harvesting permitted with 30-day wash sale observance

## Portfolio Optimization Methodology

### Scenario-Based Optimization Process

**Step 1: Scenario Definition**
- Calculate current position across 81 scenarios
- Generate 6-month transition probabilities
- Select scenarios with cumulative probability ≥ 85%

**Step 2: Individual Optimizations**
- Run mean-variance optimization for each selected scenario
- Apply security-specific constraints
- Generate optimal allocation per scenario

**Step 3: Regret Calculation**
- For each allocation, calculate regret in every scenario
- Regret = Optimal Return (scenario) - Actual Return (allocation, scenario)
- Build complete regret matrix

**Step 4: Dual Optimization**
```
Minimize: α × Max_Regret + (1-α) × Weighted_Regret
Where:
- α = 0.3 (weight on worst-case)
- Max_Regret = Maximum regret across all scenarios
- Weighted_Regret = Probability-weighted average regret
```

**Step 5: Smart Hedging**
If maximum regret exceeds 8% annually:
- Identify scenario causing maximum regret
- Add 10-20% allocation toward that scenario's optimal portfolio
- Reduce position sizes proportionally

**Step 6: Final Validation**
- Verify all position limits
- Confirm minimum cash position (1%)
- Validate no negative positions

## Risk Management

### Position Limits

**Single Security**:
- Maximum: 35% (under consideration for removal)
- Exception: PIMIX/PYLD combined up to 40%

**Sector Concentration**:
- Maximum technology: 50% (VOO + SMH + ARKK)
- Maximum alternatives: 30% (GLD + DJP)

**Minimum Positions**:
- Cash equivalent: 1% minimum
- Any held position: 2% minimum (except during exit)

### Scenario Risk Limits
- Maximum regret in any single scenario: 8% (triggers hedging)
- Minimum upside capture: 70% in favorable scenarios
- Maximum correlation to any single factor: 0.7

## Rebalancing Framework

### Monthly Rebalancing Protocol

**Schedule**: First trading day of each month

**Process**:
1. **Update Indicators**: Refresh all 12 indicators with latest data
2. **Calculate States**: Determine tercile positions for each indicator
3. **Aggregate Themes**: Weight indicators to determine theme values
4. **Identify Scenario**: Current position in 81-scenario framework
5. **Transition Probabilities**: 6-month forward probabilities using vector extrapolation
6. **Optimize Allocation**: Run dual optimization across probable scenarios
7. **Generate Trades**: Calculate required position changes
8. **Execute**: Place trades maintaining PIMIX/PYLD rules
9. **Document**: Record rationale and expected regret

### Rebalancing Triggers
- **Mandatory**: Monthly on schedule
- **Optional Skip**: If all position drifts < 2% and no state changes
- **Emergency**: 20% market decline triggers review (but not automatic action)

## Data Management

### Data Sources
- **Daily**: Yahoo Finance (DXY, equity ratios, ETF prices)
- **Daily**: FRED (real rates, yield curves)
- **Monthly**: Bloomberg (market cap percentages, P/E ratios)
- **Monthly**: ETF.com (fund flows)
- **Quarterly**: BLS/FRED (productivity)
- **Quarterly**: S&P (R&D ratios, EPS delivery)
- **Quarterly**: IMF (COFER reserve data)

### Data Quality Requirements
- Minimum 10 of 12 indicators updated for rebalancing
- Leading indicators must be current (within 5 days)
- Quarterly data acceptable up to 45 days stale
- Missing data: Use last known value with decay factor

## Tax Optimization

**Tax Loss Harvesting** (Taxable Accounts):
- Systematic harvesting when losses exceed $500
- Respect 30-day wash sale rule for ETFs
- No restrictions on PIMIX/PYLD (mutual fund exemption)
- Coordinate across correlated holdings

**Tax Lot Management**:
- Specific identification for all sales
- Prioritize lots with losses
- Consider holding period for LTCG qualification

## Emergency Protocols

### Market Crisis (20% decline in 30 days)
- Document indicator changes but do not act automatically
- Maintain current positions unless regime change confirmed
- Resume normal rebalancing after 30 days stability

### Data System Failure
- Use last known good indicator values
- Apply defensive tilt (+10% bonds, +5% cash)
- Implement manual calculations if needed
- Document all manual overrides

### Extreme Scenario Divergence
- If realized scenario has <1% ex-ante probability:
  - Document the "black swan" event
  - Consider tactical hedges (up to 10% allocation)
  - Schedule comprehensive review within 5 days
  - Do not abandon systematic framework

## Performance Measurement

### Key Metrics
- **Realized Regret**: Actual vs optimal performance by scenario
- **Transition Accuracy**: Predicted vs actual regime changes
- **Risk-Adjusted Return**: Sharpe and Sortino ratios
- **Maximum Drawdown**: Peak-to-trough decline
- **Regime Attribution**: Performance by scenario realized

### Reporting Schedule
- **Monthly**: Position changes and rationale
- **Quarterly**: Comprehensive performance review
- **Annually**: Framework assessment and calibration

## Appendix A: Implementation Checklist

### Initial Setup
- [ ] Establish data feeds for all 12 indicators
- [ ] Calculate 15-year historical percentiles
- [ ] Initialize GARCH models for each theme
- [ ] Code transition probability calculations
- [ ] Implement 81-scenario optimization engine
- [ ] Set up monthly rebalancing automation

### Monthly Rebalancing
- [ ] Update all indicator values
- [ ] Recalculate percentile positions
- [ ] Determine current scenario
- [ ] Generate transition probabilities
- [ ] Run optimization
- [ ] Execute trades
- [ ] Document decisions

## Appendix B: Scenario Interpretation Guide

### Scenario Notation
Each scenario represented as [Theme1, Theme2, Theme3, Theme4] where values are -1, 0, or +1.

### Example Interpretations
- **[+1,+1,+1,+1]**: Dollar strong, Innovation boom, Valuations extended, US dominant
  - "Risk-on US exceptionalism"
  - Allocation: Heavy US growth, minimal bonds/international
  
- **[-1,-1,-1,-1]**: Dollar weak, Innovation drought, Valuations compressed, US lagging
  - "Risk-off deglobalization"
  - Allocation: International value, commodities, gold

- **[0,0,0,0]**: All themes neutral
  - "Balanced regime"
  - Allocation: Diversified global portfolio

## Appendix C: Technology Stack

### Required Systems
- **Data Pipeline**: Python/pandas for indicator calculation
- **Statistical Models**: GARCH implementation (Python statsmodels)
- **Optimization Engine**: CVXPY or similar convex optimizer
- **Execution Platform**: Broker API for automated trading
- **State Management**: Database for historical tracking

### Backup Procedures
- **Primary**: Automated Python environment
- **Secondary**: Excel-based calculations
- **Tertiary**: Manual calculation templates

## Appendix D: Indicator Specifications

### Detailed Calculation Methods

**DXY Index**: Direct feed from Yahoo Finance (symbol: DX-Y.NYB)

**Real Rate Differential**: 
- US 10yr TIPS yield (FRED: DFII10)
- G10 average: Equal weight of comparable inflation-protected securities
- Calculation: US - G10 average

**IMF COFER Reserve Share**:
- Quarterly publication with 3-month lag
- USD percentage of allocated reserves
- Source: IMF Statistics Department

**ARKK/SPY Ratio**:
- Daily closing prices from Yahoo
- 20-day smoothing to reduce noise
- Calculation: ARKK/SPY × 100

**US Productivity Growth**:
- Nonfarm business sector output per hour (FRED: OPHNFB)
- Year-over-year percentage change
- Quarterly frequency with 45-day lag

**Corporate R&D/Revenue**:
- S&P 500 aggregate R&D spending / aggregate revenue
- Quarterly from company filings
- 60-day publication lag typical

**Equity Put/Call Ratio**:
- CBOE total put/call ratio (symbol: PCALL)
- 5-day moving average for smoothing
- Inverse indicator (high = fear = -1 state)

**S&P 500 Forward P/E**:
- 12-month forward earnings estimates
- Source: Bloomberg or Refinitiv
- Weekly updates aggregated monthly

**12M Forward EPS Delivery Rate**:
- Actual EPS / Forward estimate from 12 months prior
- Calculated monthly for S&P 500
- Values >1.0 indicate conservative estimates

**SPY/VXUS Momentum**:
- 3-month total return differential
- Calculation: (SPY_3M_return - VXUS_3M_return)
- Monthly observation of 3-month window

**US Market Cap % of Global**:
- US equity market cap / Global equity market cap
- Source: Bloomberg World Exchange Market Cap
- Monthly updates

**Cumulative ETF Flows**:
- 12-month cumulative flows: US-focused vs International
- Source: ETF.com flow data
- Monthly aggregation

## Appendix E: Governance and Review

### Framework Review Schedule
- **Quarterly**: Indicator performance and calibration
- **Semi-Annually**: Percentile boundaries and time windows
- **Annually**: Complete framework assessment
- **Ad-Hoc**: After any 3-standard-deviation event

### Decision Authority
- **Tactical Decisions**: Within framework rules - Portfolio Manager
- **Parameter Adjustments**: Indicator weights, horizons - Investment Committee
- **Framework Changes**: New indicators, methodology - Full documentation required

### Documentation Requirements
All changes must include:
- Rationale with supporting data
- Backtesting results
- Impact on existing positions
- Implementation timeline

## Risk Disclosures

- **Model Risk**: Historical relationships may not persist
- **Transition Risk**: Regime changes may occur faster than monthly rebalancing captures
- **Data Risk**: Indicator revisions or feed disruptions may impact signals
- **Execution Risk**: Market impact and timing differences from model assumptions
- **Scenario Risk**: True scenario may not be among the 81 modeled

## Version Control Requirements

### Documentation Standards
**Pre-Change**: Document complete framework state
**Change Tracking**: Detailed log of all modifications
**Post-Change**: Validate no implementation details lost
**Regression Testing**: Confirm system produces expected outputs

### Version Numbering
- **Major (X.0)**: Framework architecture changes
- **Minor (X.Y)**: Indicator or parameter adjustments
- **Patch (X.Y.Z)**: Calibration updates, corrections

## Version History

### Version 4.0 (September 5, 2025)
**COMPLETE ARCHITECTURAL REVISION:**
- Three-state indicator framework (-1/0/+1) replacing binary
- 81 scenarios replacing 16 scenarios
- 12 balanced indicators (3 per theme) replacing 13 indicators
- Monthly rebalancing replacing quarterly
- 6-month transition probabilities using vector extrapolation
- Natural correlation emergence through momentum alignment
- Theme reframing: "US Market Leadership" replacing "International"
- All mainstream data sources for improved reliability

**PRESERVED FROM v3.11:**
- Complete 12-asset security universe
- PIMIX/PYLD trading rules and constraints
- Sophisticated regret minimization portfolio optimization
- Dual optimization framework
- Smart hedging protocols
- Risk management framework
- Tax optimization procedures
- Emergency protocols
- All appendices with updated specifications

### Version 3.11 (September 2, 2025)
- Position limits marked "under consideration"
- Tax optimization framework preserved for future implementation
- Surgical updates for rebalancing implementation

### Previous Versions (v1.0 - v3.10)
See historical documentation for complete version progression.

---

**End of Investment Policy Statement v4.0 - Three-State Regime Framework**