# Investment Policy Statement (IPS) Framework
## Version 3.9
**Last Updated:** August 25, 2025, 11:30 AM PST  
**Status:** Macro Environment Calibration Advancing
**Filename:** IPS_v3.9_MA_Comparison_Framework.md

## Executive Summary

This Investment Policy Statement outlines a systematic, probability-weighted approach to portfolio management based on macro regime analysis. The framework monitors 13 indicators across 4 themes to determine scenario probabilities and optimize allocation accordingly.

**Core Innovation**: Rather than static allocation, the portfolio dynamically adjusts based on the probability-weighted expected outcomes across 16 possible macro scenarios, with risk minimization to protect against scenario divergence.

**Version 3.7 Enhancement**: Transition probabilities now incorporate distance-to-trigger calculations, preventing premature regime change signals when indicators show momentum but remain far from their moving average crossing points.

**Version 3.8 Philosophy**: Default to adaptive MA comparisons over fixed thresholds for more responsive regime detection. Implemented three-tier signal liquidity framework for balanced early warning and confirmation.

## Philosophical Framework for Indicator Design (v3.8)

### Core Principle: Adaptive MA Comparisons
The framework defaults to comparing moving averages of different periods rather than fixed thresholds. This creates adaptive triggers that adjust to changing market regimes.

**Use MA Comparisons When:**
- The indicator measures continuous market dynamics
- Historical "normal" levels change over time
- Relative change matters more than absolute level
- Both numerator and denominator are raw values

**Use Fixed Thresholds Only When:**
- Denominator already contains long-term smoothing (e.g., CAPE = Price/10Y Earnings)
- Zero represents a fundamental boundary (e.g., TIC flows direction)
- Psychological levels have proven statistical significance

### Signal Liquidity Framework (NEW v3.8)

Indicators are classified into three tiers based on update frequency and responsiveness:

#### Canary Indicators (30-35% theme weight)
- **Purpose**: Early warning signals with daily liquidity
- **Update**: Daily, real-time
- **Characteristics**: Liquid markets, minimal lag, some noise acceptable
- **Examples**: DXY Index, QQQ/SPY, Equity Risk Premium, ACWX/SPY

#### Primary Indicators (35-50% theme weight)  
- **Purpose**: Core theme measurement with balanced signal quality
- **Update**: Weekly to monthly
- **Characteristics**: Reliable data, moderate smoothing, main theme drivers
- **Examples**: Forward P/E, Productivity, Net Margins, CAPE

#### Structural Indicators (20-30% theme weight)
- **Purpose**: Long-term confirmation, whipsaw reduction
- **Update**: Quarterly or with significant lag
- **Characteristics**: Slow-moving, high confidence, regime confirmation
- **Examples**: USD Reserve Share, Central Bank Gold, Yuan SWIFT Share

This tiered approach balances early detection with false signal reduction.

### Core Beliefs
1. **Markets are regime-dependent** - Different macro environments require different exposures
2. **Diversification across scenarios** beats diversification within a single scenario
3. **Risk management** should focus on avoiding catastrophic outcomes in any probable scenario
4. **Systematic beats discretionary** - Rules-based approach removes emotional bias
5. **Probability-weighted optimization** captures uncertainty better than point forecasts

### Investment Objectives
- **Primary**: Achieve 8-12% annual returns across market cycles
- **Secondary**: Limit maximum drawdown to 15% in any 12-month period
- **Tertiary**: Maintain liquidity for opportunistic investments

## Asset Allocation Framework

### Security Universe
**Equity Exposures:**
- VTI (US Total Market)
- VEA (Developed International) 
- VWO (Emerging Markets)
- SMH (Semiconductors)
- SRVR (Infrastructure/Data Centers)

**Income Exposures:**
- PIMIX (PIMCO Income Fund)
- PYLD (PIMCO Yield Opportunities)

**Alternative Exposures:**
- GLD (Gold)
- COM (Commodities)
- IGF (Global Infrastructure)
- DBMF (Managed Futures)

**Cash:**
- SWVXX (Money Market)

### Scenario-Based Framework

The portfolio recognizes 16 scenarios based on 4 binary themes evaluated through 13 indicators:
- **USD Dominance** (weak/strong) - 4 indicators
- **AI Productivity Boom** (yes/no) - 3 indicators  
- **P/E Mean Reversion** (yes/no) - 3 indicators
- **International Outperformance** (yes/no) - 4 indicators (including new ACWX/SPY)

Note: Reduced from 14 to 13 indicators in v3.8 by removing DXY Level duplication.

Each scenario has optimal allocations determined through mean-variance optimization with specific tilts based on theme expressions.

## Rebalancing Methodology

### Quarterly Full Optimization
**Schedule:** Third Friday of March, June, September, December

**Process:**
1. Update all 13 macro indicators
2. Calculate theme momentums and probabilities
3. Determine scenario probabilities
4. Run portfolio optimization
5. Apply risk minimization
6. Execute trades over 5 days

### Monthly Drift Check
**Schedule:** First Friday of each month

**Triggers:**
- Any position > 3% drift from target
- Total portfolio drift > 10%
- Theme probability change > 20%

## Risk Management

### Position Limits
- Maximum single position: 35%
- Maximum sector concentration: 50%
- Minimum cash position: 1%
- Maximum alternatives: 30%

### Scenario Risk Limits
- Maximum regret in any scenario: -8%
- Minimum upside capture: 70%
- Maximum correlation to any single factor: 0.7

## Macro Environment Monitoring

### Current Operational Framework (v3.9 - 13 Indicators)

The portfolio monitors 13 indicators across 4 themes using adaptive MA comparisons (except TIC flows which uses zero boundary).

#### Comprehensive Indicator Specifications

| Theme | Indicator | Calculation Method | Signal Tier | Update Freq | Status | Trigger Rate |
|-------|-----------|-------------------|-------------|-------------|---------|--------------|
| **USD** | DXY Index | 200D MA vs 400D MA | Canary | Daily | Pending | TBD |
| | USD Reserve Share | YoY change < -0.5% | Structural | Quarterly | Pending | TBD |
| | Yuan SWIFT Share | 12M MA vs 36M MA | Primary | Monthly | Pending | TBD |
| | Central Bank Gold | 4Q MA vs 12Q MA | Structural | Quarterly | Pending | TBD |
| **AI** | Productivity Growth | 2Q MA > 6Q MA | Structural | Quarterly | ✅ Calibrated | 47.7% |
| | QQQ/SPY Ratio | 50D MA vs 200D MA | Canary | Daily | Pending | TBD |
| | S&P Net Margins | TTM > 3Y MA + 0.5% | Primary | Quarterly | Pending | TBD |
| **P/E** | Forward P/E | 1Y MA > 3Y MA | Primary | Weekly | ✅ Calibrated | 49.4% |
| | Shiller CAPE | Current vs 20Y MA | Primary | Monthly | Pending | TBD |
| | Equity Risk Premium | 6M MA vs 18M MA | Canary | Daily | Pending | TBD |
| **INTL** | ACWX/SPY Relative | 30D MA vs 90D MA | Canary | Daily | Pending | TBD |
| | S&P vs MSCI World | 6M relative < -2% | Primary | Weekly | Pending | TBD |
| | US % of ACWI | 12M MA vs 36M MA | Structural | Monthly | Pending | TBD |
| | TIC Net Flows | 12M sum < 0 (fixed) | Structural | 2M lag | Pending | TBD |

#### Theme Weight Distribution by Signal Tier

| Theme | Canary (30-35%) | Primary (35-50%) | Structural (20-30%) |
|-------|-----------------|------------------|---------------------|
| USD | DXY Index | Yuan SWIFT | Reserves, Gold |
| AI | QQQ/SPY | Net Margins | Productivity |
| P/E | Risk Premium | Forward P/E, CAPE | - |
| INTL | ACWX/SPY | S&P vs World | US %, TIC |

#### Key Changes in v3.9
- **Philosophical Shift**: 12 of 13 indicators now use MA comparisons (only TIC flows uses fixed zero boundary)
- **DXY Duplication Removed**: Eliminated DXY Level to reduce USD/INTL correlation
- **ACWX/SPY Added**: New liquid canary for international momentum
- **All thresholds adaptive**: MA comparisons naturally adjust to regime changes

## Enhanced Transition Probability Framework (v3.7)

### Three-Component Model for Regime Change Probability

The framework now incorporates three factors to calculate realistic transition probabilities:

1. **Current State**: Binary determination of which side of MA trigger (determines current scenario)
2. **Momentum**: Rate and direction of change (continuous, -1 to +1 range)
3. **Distance to Trigger**: How far from MA crossing point (continuous, percentage)

### Why Distance Matters

**Problem with Momentum-Only**: An indicator falling from extreme levels (e.g., P/E from 35 to 30) shows "strong momentum toward reversion" but remains far above its trigger (e.g., MA at 22). Without distance consideration, the system assigns high transition probability despite being months or years from actual regime change.

**Solution**: Physics-based time-to-trigger estimation that realistically models when an indicator might cross its moving average threshold.

### Edge Case Guidance

**Near-Trigger Oscillation** (Distance < 5% of MA)
- Minimum 30% transition probability
- High sensitivity to momentum changes
- Frequent scenario flips expected and acceptable

**Strong Momentum, Far from Trigger** (Distance > 30%, Momentum > 0.5)
- Capped at 20% probability
- Recognizes improvement but maintains realism
- Prevents premature portfolio adjustments

**Weak Momentum, Close to Trigger** (Distance < 10%, Momentum < 0.2)
- Medium probability (20-40%)
- Random walk could trigger crossing
- Heightened monitoring warranted

**Moving Away from Trigger** (Negative momentum relative to trigger)
- Probability reduced by 70%
- Base rate assumptions only
- Requires momentum reversal first

### Example Calculation Matrix

| Current P/E | MA Trigger | Distance | Momentum | Months to Trigger | Probability |
|------------|------------|----------|----------|-------------------|-------------|
| 30         | 22         | +36%     | -0.5     | ~36               | 10%         |
| 24         | 22         | +9%      | -0.3     | ~15               | 15%         |
| 23         | 22         | +4.5%    | -0.4     | ~6                | 40%         |
| 22.5       | 22         | +2.3%    | -0.2     | ~6                | 40%         |
| 21         | 22         | -4.5%    | +0.3     | ~8                | 25%         |

### Backward Compatibility

This enhancement is fully backward compatible. Existing momentum calculations remain unchanged. The distance component acts as a reality check that prevents unrealistic probability estimates for indicators far from their triggers.

## Critical Priority: Macro Environment Calibration

### Overview
We are undertaking a comprehensive recalibration of all macro environment indicators to validate and refine the provisional 50% trigger thresholds currently in use. Each indicator's moving average period and trigger threshold must be backtested against historical data to ensure proper trigger frequency and signal quality.

### Methodology
1. **Base Rate Target**: Each indicator should trigger approximately 50% of the time to create balanced, adaptive scenarios
2. **Cycle Matching**: MA periods must respect the natural rhythm of each economic phenomenon
3. **Backtesting Requirement**: All changes must be validated with historical data before implementation
4. **Threshold Definition**: Each indicator needs explicit trigger rules

**Rationale for 50% Base Rate**: Rather than treating momentum as "normal" (70% of time with 20% triggers), we now treat all market regimes as equally valid. This creates more balanced scenario probabilities and enables earlier regime recognition.

### Calibration Status Summary

| Indicator | Current Method | Threshold | Status | Trigger Rate |
|-----------|----------------|-----------|---------|--------------|
| **Productivity Growth** | 2Q MA > 6Q MA | 0% | ✅ Calibrated | 47.7% |
| **Forward P/E** | 1Y MA > 3Y MA | ~21-22 | ✅ Calibrated | 49.4% |
| **DXY Index** | 200D vs 400D MA | Crossover | Pending | TBD |
| **S&P Net Margins** | TTM vs 3Y avg | +0.5% | Pending | TBD |
| **QQQ/SPY Ratio** | 50D vs 200D MA | Crossover | Pending | TBD |
| **Equity Risk Premium** | 6M vs 18M MA | Crossover | Pending | TBD |
| **USD Reserve Share** | YoY change | < -0.5% | Pending | TBD |
| **Shiller CAPE** | Current vs 20Y MA | Crossover | Pending | TBD |
| **Yuan SWIFT Share** | 12M vs 36M MA | Crossover | Pending | TBD |
| **Central Bank Gold** | 4Q vs 12Q MA | Crossover | Pending | TBD |
| **ACWX/SPY Relative** | 30D vs 90D MA | Crossover | Pending | TBD |
| **S&P vs MSCI World** | 6M relative | < -2% | Pending | TBD |
| **US % of ACWI** | 12M vs 36M MA | Crossover | Pending | TBD |
| **TIC Net Flows** | 12M sum | < 0 | Pending | TBD |

### Critical Next Steps
1. **IMMEDIATE**: Complete calibration of remaining 11 indicators
2. **WEEK 1**: Calibrate all Canary indicators (highest responsiveness needed)
3. **WEEK 2**: Complete Primary indicator calibration
4. **WEEK 3**: Validate Structural indicators
5. **ONGOING**: Monitor calibrated indicators (Productivity 47.7%, Forward P/E 49.4%)
6. **ONGOING**: Validate distance-to-trigger predictions against actual crossings

## Future Enhancement: Three-State Scenario Cube Framework

### Concept Overview
Evolution from binary (triggered/not triggered) to three-state system for each indicator:
- **-1**: Below normal range (potentially bullish signal)
- **0**: Within normal range  
- **+1**: Above normal range (potentially bearish signal)

### Implementation Method
For each indicator:
1. Calculate long-term mean and standard deviation
2. Define thresholds using standard deviations:
   - Below (mean - 0.5σ): State = -1 (~30% of observations)
   - Between ±0.5σ: State = 0 (~40% of observations)
   - Above (mean + 0.5σ): State = +1 (~30% of observations)

### Benefits Over Binary System
- **Directional Information**: Distinguishes between "too hot" vs "too cold"
- **Richer Signal Set**: 3^13 possible states vs 2^13
- **Natural Risk Scaling**: Sum of states creates spectrum from -13 to +13
- **Pattern Recognition**: Different configurations tell different stories

### Development Roadmap
1. Complete binary system calibration with 50% triggers (current project)
2. Gather statistical parameters (mean, σ) for all indicators
3. Backtest three-state thresholds
4. Develop pattern recognition rules
5. Test portfolio performance under three-state vs binary framework
6. Implementation target: IPS v5.0 (2026)

## Appendices

### Appendix A: Security Selection Criteria
- Minimum AUM: $1B
- Maximum expense ratio: 1.0%
- Minimum daily volume: $10M
- Listed on major US exchange

### Appendix B: Tax Considerations
- Harvest losses in November-December
- Avoid wash sales across correlated ETFs
- PIMIX distributions require special handling
- Prefer ETFs over mutual funds in taxable accounts

### Appendix C: Emergency Protocols
**Market Crisis (>20% decline):**
- Suspend rebalancing
- Maintain current positions
- Document but don't act on indicator changes
- Resume normal operations after 30 days

**Data System Failure:**
- Use last known good values
- Apply defensive tilt (+10% bonds)
- Manual calculation backup procedures
- Daily monitoring until resolved

### Appendix D: Quarterly Review Template
1. Performance vs benchmarks
2. Scenario prediction accuracy
3. Indicator momentum analysis
4. Risk metrics review
5. Lessons learned
6. Adjustments for next quarter

### Appendix E: Trading Execution Framework
- PIMIX: Hold-only (never generate BUY orders)
- PYLD: Primary vehicle for income increases
- VTI/VEA/VWO: Core positions, trade in $1000 increments
- Alternatives: Maintain minimum 1% positions when held
- Use limit orders for positions > $10,000

### Appendix F: Data Quality Standards
**Green Light (Full Trading):**
- At least 12 of 13 indicators fresh
- All 4 themes have 2+ fresh indicators
- No theme fully missing

**Yellow Light (Provisional):**
- 10-11 indicators fresh
- Document quality issues
- Proceed with caution

**Red Light (Trading Halt):**
- Fewer than 10 indicators fresh
- Any theme fully missing
- Use carry-forward with defensive tilt

### Appendix G: Data Collection Methodology

#### Dual-Source Approach for Forward P/E
- **Historical Calibration**: Yardeni Research PDF (1979-present)
  - Used for initial threshold calibration
  - Consensus-based (I/B/E/S via Refinitiv)
  - Monthly historical data points
- **Monthly Updates**: FactSet Earnings Insight
  - Weekly reports, use month-end value
  - Professional consensus estimates
  - More frequent updates available
- **Note**: ~1-2 point discrepancy may exist between sources due to methodology differences

#### Data Quality Assurance
- Document source for each data point
- Note any methodology changes
- Validate against multiple sources when possible
- Maintain version control for data updates
- Flag any significant discrepancies between sources

#### Priority Data Sources by Indicator
1. **Productivity**: BLS (primary), FRED (backup)
2. **Forward P/E**: Yardeni (historical), FactSet (ongoing)
3. **DXY**: FRED (authoritative)
4. **CAPE**: Shiller website (original source)
5. **Margins**: S&P/Compustat (ideal), estimated if needed

### Appendix H: Enhanced Transition Probability Methodology (v3.7/v3.8)

#### Overview
The portfolio uses a three-component model to calculate realistic transition probabilities:
1. **Momentum**: Rate and direction of indicator change
2. **Distance**: How far indicator is from MA trigger
3. **Time**: Physics-based estimate of crossing time

#### Enhanced Calculation

```python
def calculate_enhanced_transition_probability(indicator):
    # Get position relative to MA trigger (from IPS 3.9 MA specifications)
    current_value = indicator.current
    ma_trigger = indicator.moving_average
    distance_to_trigger = (current_value - ma_trigger) / ma_trigger  # Percentage distance
    
    # Calculate existing momentum
    momentum = calculate_momentum(indicator)  # -1 to +1 range from current methodology
    
    # Physics-based time estimate
    # Assumes momentum of 1.0 = ~2% monthly change
    if abs(momentum) > 0.01:
        months_to_trigger = abs(distance_to_trigger) / (abs(momentum) * 0.02)
    else:
        months_to_trigger = 999  # Effectively infinite for near-zero momentum
    
    # Time-based probability decay function
    if months_to_trigger < 3:
        base_probability = 0.70  # Likely within quarter
    elif months_to_trigger < 6:
        base_probability = 0.40  # Likely within 2 quarters
    elif months_to_trigger < 12:
        base_probability = 0.20  # Possible within year
    elif months_to_trigger < 24:
        base_probability = 0.10  # Unlikely but possible
    else:
        base_probability = 0.05  # Base rate for distant events
    
    # Direction adjustment
    moving_toward_trigger = (distance_to_trigger > 0 and momentum < 0) or \
                           (distance_to_trigger < 0 and momentum > 0)
    
    if moving_toward_trigger:
        final_probability = base_probability
    else:
        # Moving away from trigger - substantially reduce probability
        final_probability = base_probability * 0.3
    
    # Boundary conditions
    # Near trigger override - if within 5% of MA, minimum 30% probability
    if abs(distance_to_trigger) < 0.05:
        final_probability = max(final_probability, 0.30)
    
    # Far from trigger cap - if beyond 30% from MA, maximum 20% probability
    if abs(distance_to_trigger) > 0.30:
        final_probability = min(final_probability, 0.20)
    
    # Extreme momentum override - very strong momentum adds probability
    if abs(momentum) > 0.8 and moving_toward_trigger:
        final_probability = min(0.95, final_probability + 0.20)
    
    return min(0.95, max(0.05, final_probability))
```

#### Theme Probability Aggregation

```python
def calculate_theme_probability_enhanced(theme_indicators):
    """Aggregate indicator probabilities to theme level"""
    weighted_probabilities = []
    
    for indicator, weight in theme_indicators.items():
        # Calculate enhanced probability for each indicator
        prob = calculate_enhanced_transition_probability(indicator)
        weighted_probabilities.append(prob * weight)
    
    # Weighted average of enhanced probabilities
    theme_probability = sum(weighted_probabilities) / sum(weights)
    
    return max(0.05, min(0.95, theme_probability))
```

#### Validation Requirements

1. **Near-Trigger Validation**: Indicators within 5% of MA should show 30%+ probability
2. **Distant Indicator Check**: Indicators beyond 30% from MA should show <20% probability
3. **Time Estimate Accuracy**: Historical crossing times should match predictions ±50%
4. **Momentum Direction**: Verify probability drops 70% when moving away from trigger

#### Migration from v3.6

Existing implementations should:
1. Add distance calculation to current momentum framework
2. Implement time-to-trigger physics model
3. Apply boundary conditions for extreme cases
4. Maintain backward compatibility with pure momentum fallback

## Version History

### Version 3.9 (August 25, 2025, 11:30 AM)
- **MAJOR PHILOSOPHICAL SHIFT**: Converted 12 of 13 indicators to MA comparisons (only TIC flows uses fixed threshold)
- **Universal Adaptivity**: Indicators now self-adjust to regime changes, maintaining ~50% frequency naturally
- **Calibrations Complete**: 
  - Forward P/E: 1Y MA vs 3Y MA (49.4% trigger rate) 
  - Productivity: 2Q MA vs 6Q MA (47.7% trigger rate)
- **Signal Liquidity Framework**: Three-tier system (Canary/Primary/Structural) for balanced detection
- **Indicator Changes**:
  - Removed DXY Level (redundant with DXY Index)
  - Added ACWX/SPY as international canary indicator
  - Reduced from 14 to 13 total indicators
- **MA Comparison Conversions**:
  - DXY Index: 200D vs 400D MA
  - QQQ/SPY: 50D vs 200D MA
  - Yuan SWIFT: 12M vs 36M MA  
  - Central Bank Gold: 4Q vs 12Q MA
  - Equity Risk Premium: 6M vs 18M MA
  - CAPE: Current vs 20Y MA (converted from > 28)
  - US % ACWI: 12M vs 36M MA (converted from > 60%)
- **Maintained**: Distance-to-trigger framework from v3.7

### Version 3.8 (August 25, 2025, 10:30 AM)
- Initial framework for MA comparisons
- Preliminary signal liquidity tiers
- Forward P/E and Productivity calibration documentation

### Version 3.7 (August 25, 2025, 9:00 AM)
- **Data Collection Enhancement**: Implemented dual-source methodology for Forward P/E indicator
- **Productivity Calibration Complete**: Confirmed 2Q MA > 6Q MA threshold (47.7% trigger rate)
- **Established Data Framework**: Yardeni Research (historical) + FactSet (ongoing) for P/E data
- **Critical Enhancement**: Added distance-to-trigger component to transition probability calculations
- **Problem Solved**: Fixed "context blindness" where strong momentum ignored actual distance from triggers
- **New Framework**: Three-component model (Current State, Momentum, Distance) for realistic probabilities
- **Implementation**: Enhanced calculation in Appendix H with physics-based time-to-trigger estimates
- **Testing Requirements**: Validate near-trigger (>30% prob), distant (<20% prob), and time estimates

### Version 3.6 (August 24, 2025)
- **Added complete provisional indicator specifications** currently in use by Tracker
- **Elevated calibration to Priority #1** with accelerated 4-week timeline
- Documented all 14 indicator trigger thresholds targeting 50% frequency
- Major philosophical shift: Changed from 20% to 50% trigger targets for all indicators
- Rationale: Creates balanced adaptive scenarios (25% momentum/60% neutral/15% defensive) vs momentum-biased (68%/31%/1%)
- Documented methodology for matching MA periods to natural cycle lengths
- Completed initial analysis for productivity growth and forward P/E (needs revision for 50% target)
- Added three-state Markov Chain framework as future enhancement
- Established framework for systematic indicator optimization

### Previous Versions (v1.0 - v3.5)
See document for complete version history.

---

*End of Investment Policy Statement v3.9*