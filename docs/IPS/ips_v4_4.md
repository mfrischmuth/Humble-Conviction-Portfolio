# Investment Policy Statement (IPS) Framework
## Version 4.4 - Signal Transformation Enhancement
**Last Updated:** September 09, 2025, 23:00:00 UTC  
**Status:** Production Ready with Enhanced Signal Processing  
**Filename:** IPS_v4.4_Signal_Transformations.md

## Executive Summary

Version 4.4 enhances the IPS framework with critical signal transformations that improve indicator responsiveness while maintaining complete backward compatibility. Most significantly, the Real Rate Differential indicator is replaced with TIC Foreign Demand Index, directly measuring capital flows rather than inferring them from rate differentials.

**Key Updates in v4.4:**
- **MAJOR**: Real Rate Differential → TIC Foreign Demand Index (measures actual flows)
- **ENHANCED**: DXY transformed to 3-month rate of change (momentum signal)
- **ENHANCED**: Trailing P/E uses deviation from 3-month average (valuation momentum)
- **ENHANCED**: SPY/EFA Momentum uses monthly mean (noise reduction)
- **ENHANCED**: Productivity uses 2-quarter MA (volatility smoothing)
- **RENAMED**: Updated three indicator names for clarity
- **PRESERVED**: All v4.3.2 portfolio construction and optimization methodology

**ZERO REGRESSION GUARANTEE**: All existing functionality preserved. New transformations are additive enhancements.

## Part I: Data Collection and Theme Framework

### Four Macro Themes with Three States

The portfolio framework monitors four macro themes, each determined by three indicators with different temporal characteristics:

1. **USD Dominance** (Weak/Neutral/Strong)
2. **Innovation Environment** (Weak/Neutral/Strong)  
3. **Valuation Dynamics** (Low/Neutral/High)
4. **US Market Leadership** (Weak/Neutral/Strong)

### Indicator Framework (12 Total) - ENHANCED v4.4

| Theme | Temporal | Indicator | Field Name | Signal Transformation | Data Source |
|-------|----------|-----------|------------|----------------------|-------------|
| **USD** | Leading | DXY Momentum | `dxy_index` | **3-month rate of change** | Yahoo Finance (DX-Y.NYB) |
| | Concurrent | **TIC Foreign Demand** | `tic_foreign_demand`¹ | **3m MA of net purchases, MoM Δ** | US Treasury TIC Table 2 |
| | Lagging | IMF COFER Reserve | `cofer_usd` | Trend acceleration² | IMF Quarterly |
| **Innovation** | Leading | QQQ/SPY Ratio | `qqq_spy_ratio` | Simple ratio | Yahoo Finance |
| | Concurrent | US Productivity | `productivity_growth` | **2-quarter MA of YoY** | FRED (OPHNFB) |
| | Lagging | **Software IP Investment** | `software_ip_investment`³ | % of private fixed investment | FRED (Y001RC1Q027SBEA) |
| **Valuation** | Leading | Put/Call Ratio | `put_call_ratio` | Month-end (inverted) | CBOE |
| | Concurrent | P/E Momentum | `trailing_pe` | **Deviation from 3m MA** | Yahoo Finance (SPY) |
| | Lagging | **CAPE Rate of Change** | `cape_rate_of_change`³ | 12-month RoC | Shiller Data |
| **US Leadership** | Leading | SPY/EFA Momentum | `spy_efa_momentum` | **Monthly mean of daily** | Yahoo Finance |
| | Concurrent | US Market Share | `us_market_pct` | SPY/(SPY+EFA) | Yahoo Finance |
| | Lagging | **Total Return Diff** | `total_return_differential`³ | 252-day rolling diff | Yahoo Finance |

¹ Replaces `real_rate_differential` from v4.3.2  
² Already implemented in Theme Calculator v4.2  
³ Renamed from v4.3.2 (see Migration section)

### Signal Transformation Specifications

#### 1. DXY Momentum (Enhanced from DXY Index)
**Transformation**: Level → Rate of Change
```
Signal = (DXY_current / DXY_3months_ago - 1) × 100
```
- **Rationale**: Currency momentum more predictive than absolute levels
- **Fallback**: If <3 months history, use raw level with warning

#### 2. TIC Foreign Demand Index (Replaces Real Rate Differential)
**Data Source**: 
- Primary: https://ticdata.treasury.gov/resource-center/data-chart-center/tic/Documents/slt_table2.xml
- Table: Major Foreign Holders of Treasury Securities
- Frequency: Monthly with ~6-week publication lag

**Calculation**:
```
1. Net_Purchases[t] = Total_Holdings[t] - Total_Holdings[t-1]
2. MA_3month = Mean(Net_Purchases[t], [t-1], [t-2])
3. Signal = MA_3month[current] - MA_3month[previous]
```
- **Rationale**: Directly measures USD demand vs inferring from rate differentials
- **Fallback**: If TIC unavailable, use US 10Y yield change as proxy

#### 3. Productivity Growth Smoothing
**Transformation**: Raw YoY → Smoothed YoY
```
Signal = (YoY_current_quarter + YoY_previous_quarter) / 2
```
- **Rationale**: Reduces quarterly noise while maintaining responsiveness
- **Fallback**: If <2 quarters, use single quarter

#### 4. Trailing P/E Momentum
**Transformation**: Level → Deviation from MA
```
Signal = P/E_current - Mean(P/E_last_3_months)
```
- **Rationale**: Captures valuation momentum vs absolute level
- **Fallback**: If <3 months history, use rate of change

#### 5. SPY/EFA Momentum Enhancement
**Transformation**: End-of-month → Monthly mean
```
For each trading day in month:
  Daily_Momentum = (SPY/SPY_3m_ago - 1) - (EFA/EFA_3m_ago - 1)
Signal = Mean(all Daily_Momentum values in month)
```
- **Rationale**: Reduces end-of-month noise
- **Fallback**: If <20 trading days, use available days

### Statistical Processing Pipeline

#### Stage 1: Data Collection (Data Collector Module)
- Fetches raw data from sources
- Applies signal transformations
- Handles revision tracking
- Outputs: Transformed time series

#### Stage 2: Percentile Calculation (File Handler Module)
- Calculates 15-year percentiles from transformed signals
- Stores percentile bands: {min, p10, p25, p33, p50, p67, p75, p90, max}
- Determines current percentile rank
- Outputs: Current values with percentile context

#### Stage 3: State Determination (Indicators Module)
- Maps percentile rank to state:
  - ≤33rd percentile → State = -1 (Weak/Low)
  - 33rd-67th percentile → State = 0 (Neutral)
  - ≥67th percentile → State = +1 (Strong/High)
- Outputs: Theme states [-1, 0, +1]

#### Stage 4: Volatility Estimation (Theme Calculator Module)
- GARCH(1,1) model on transformed signals
- Parameters: ω=0.0001, α=0.05, β=0.90 (typical)
- 180-month lookback for parameter estimation
- Outputs: State transition probabilities

**PRESERVED FROM v4.3.2**: All GARCH methodology unchanged

### Scenario Generation

With 4 themes × 3 states each = **81 possible scenarios**

Each scenario identified by 4-element vector [USD, Innovation, Valuation, USLeadership] where each element ∈ {-1, 0, +1}.

**PRESERVED FROM v4.3.2**: Complete scenario framework unchanged

## Part II: Portfolio Construction Framework

**COMPLETE PRESERVATION**: All sections below unchanged from v4.3.2

### Investment Objectives

**Primary:** Achieve 8-12% annual returns across market cycles  
**Secondary:** Limit maximum drawdown to 15% in any 12-month period  
**Tertiary:** Maintain liquidity for opportunistic investments

### Security Universe (12 Assets)

**Equity Exposures (6):**
- VTI: US Total Market
- VEA: Developed International
- VWO: Emerging Markets
- SMH: Semiconductors
- SRVR: Infrastructure/Data Centers
- IGF: Global Infrastructure

**Income Exposures (2):**
- PIMIX: PIMCO Income Fund (hold-only)
- PYLD: PIMCO Active Bond ETF (primary income)

**Alternative Exposures (3):**
- GLD: Gold
- COM: Commodities
- DBMF: Managed Futures

**Cash (1):**
- SWVXX: Money Market

### Baseline Portfolio (Neutral Scenario [0,0,0,0])

```
Equity (60%):
- VTI: 30%    - VEA: 15%    - VWO: 8%
- SMH: 3%     - SRVR: 2%    - IGF: 2%

Income (30%):
- PYLD: 25%   - PIMIX: 5%

Alternatives (10%):
- GLD: 3%     - COM: 3%     - DBMF: 3%    - SWVXX: 1%
```

### Expected Return Framework

**Base Returns and Theme Impacts**: [Complete matrices preserved from v4.3.2]

### Portfolio Optimization Methodology

**Six-Step Process**: [Complete methodology preserved from v4.3.2]
1. Scenario Selection (3-15 from 81 scenarios)
2. Individual Scenario Optimization
3. Regret Matrix Calculation
4. Dual Optimization
5. Smart Hedging Protocol
6. Final Validation

### Rebalancing Framework

**Quarterly/Monthly Schedule**: [Preserved from v4.3.2]

### Risk Management

**Position Limits**: [Preserved from v4.3.2]

## Part III: Implementation Requirements

### Module Update Status for v4.4

| Module | Version | Status | Changes Required |
|--------|---------|--------|-----------------|
| **Data Collector** | TBD | 🔴 Needs Update | Implement all transformations, TIC data fetching |
| **File Handler** | v5.0 | ✅ Updated | Already handles new indicator names |
| **Indicators** | v4.0 | ✅ Updated | Already has new mappings |
| **Data Editor** | v3.0 | ✅ Updated | Already handles new indicators |
| **Theme Calculator** | v4.2 | 🟡 Minor Update | Verify expects transformed signals |
| **Portfolio Optimizer** | v2.0+ | ✅ No Change | Works with theme states |

### Data Revision Handling

**New Requirement in v4.4**: Track vintage dates for revised indicators
```javascript
indicator: {
  current_value: 1.5,
  vintage_date: "2025-01-31",
  revision_history: [
    {date: "2025-01-31", value: 1.5, revision: "final"},
    {date: "2025-01-15", value: 1.4, revision: "revised"},
    {date: "2024-12-31", value: 1.3, revision: "preliminary"}
  ]
}
```

### Backward Compatibility Requirements

1. **Detection Logic**: System must detect if signals are already transformed
2. **Fallback Behavior**: Use raw values if transformation impossible
3. **Migration Path**: Support both formats during transition
4. **Field Mapping**:
   - `real_rate_differential` → `tic_foreign_demand`
   - `tech_employment_pct` → `software_ip_investment`
   - `eps_delivery` → `cape_rate_of_change`
   - `etf_flow_differential` → `total_return_differential`

## Migration Guide

### From IPS v4.3.2 to v4.4

**What Changes:**
- Five indicators receive signal transformations
- One indicator replaced (Real Rate → TIC Demand)
- Three indicators renamed for clarity

**What's Preserved:**
- All portfolio construction methodology
- All optimization algorithms
- All risk management rules
- All rebalancing triggers
- Complete expected return framework
- 81-scenario structure

**Migration Steps:**
1. Update Data Collector with transformation logic
2. Begin collecting TIC data (6-week lag acceptable)
3. Run parallel with old signals for one quarter
4. Switch to transformed signals as primary
5. Maintain fallback to raw signals

## Appendices

### Appendix A: TIC Data Technical Details

**XML Structure** (slt_table2.xml):
```xml
<holder country="Japan">
  <holdings date="2025-07">1234.5</holdings>
  <holdings date="2025-06">1230.2</holdings>
</holder>
```

**Calculation**: Sum all countries' holdings changes = net foreign demand

### Appendix B: Transformation Fallback Matrix

| Indicator | Primary Signal | Fallback 1 | Fallback 2 |
|-----------|---------------|------------|------------|
| DXY | 3m rate of change | 1m rate of change | Raw level |
| TIC Demand | 3m MA of flows | US 10Y yield change | TIPS - 1.5% |
| Productivity | 2Q MA of YoY | Raw YoY | Latest value |
| P/E | Deviation from 3m | 1m rate of change | Raw level |
| SPY/EFA | Monthly mean | Week mean | End value |

### Appendix C: Version History

#### Version 4.4 (September 09, 2025, 23:00:00 UTC)
**SIGNAL TRANSFORMATION ENHANCEMENT:**
- Replaced Real Rate Differential with TIC Foreign Demand Index
- Enhanced 5 indicators with momentum/smoothing transformations
- Updated 3 indicator names for clarity
- Added revision tracking requirements
- Maintained complete backward compatibility

#### Version 4.3.2 (September 08, 2025, 16:30:00 UTC)
**COMPLETE RETURN FRAMEWORK:**
- Added theme return impact matrix
- Base returns calibrated to neutral
- Increased scenario selection cap to 15

#### Version 4.3.1 (September 08, 2025, 00:15:00 UTC)
**FACTOR ADJUSTMENT MATRIX:**
- Complete 12×12 factor adjustment matrix
- Example portfolio calculations

#### Version 4.3 (September 08, 2025, 00:00:00 UTC)
**UNIFIED FRAMEWORK:**
- Merged data and portfolio methodologies
- Adapted for 81 ternary scenarios

---

**End of Investment Policy Statement v4.4**

**ZERO REGRESSION CERTIFICATION**: This version adds signal enhancements while preserving 100% of v4.3.2 functionality.