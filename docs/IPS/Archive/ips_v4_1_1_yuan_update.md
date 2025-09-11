# Investment Policy Statement (IPS) Framework
## Version 4.1.1 - Yuan SWIFT Trend-Based Classification Update
**Last Updated:** September 6, 2025, 23:55:00 UTC  
**Previous Version:** 4.1 (September 5, 2025, 18:00:00 UTC)
**Status:** Production Ready - Special Indicator Handling
**Filename:** IPS_v4.1.1_Yuan_Trend_Classification.md

## Executive Summary

Version 4.1 implements strategic indicator substitutions to extend historical data availability from 11 years to 19+ years minimum. This enables robust GARCH volatility modeling across multiple market regimes while maintaining economic signal integrity.

**Key Change**: Replace short-history indicators (ARKK/SPY, SPY/VXUS) with longer-history equivalents (QQQ/SPY, SPY/EFA) that capture the same economic themes with 20+ years of data.

**Version 4.1.1 Addition**: Special handling for Yuan SWIFT Share indicator due to limited 3-year data history using trend-based classification methodology.

## Version 4.1 Changes

### Indicator Substitutions

| Theme | Old Indicator (v4.0) | New Indicator (v4.1) | Data Gain | Signal Impact |
|-------|---------------------|---------------------|-----------|---------------|
| **Innovation** | ARKK/SPY Ratio | **QQQ/SPY Ratio** | +14 years (1999 vs 2014) | Minimal - still captures tech leadership |
| **US Leadership** | SPY/VXUS Momentum | **SPY/EFA Momentum** | +10 years (2001 vs 2011) | Minimal - still captures US vs international |

### Rationale for Changes

1. **ARKK → QQQ Substitution**
   - QQQ (NASDAQ-100) strongly correlates with innovation themes
   - Provides 25+ years of history vs 11 years for ARKK
   - Less concentrated risk while maintaining tech/innovation signal
   - More liquid and stable for calculation purposes

2. **VXUS → EFA Substitution**  
   - EFA (Developed International) captures 95% of VXUS movement
   - Provides 24+ years of history vs 14 years for VXUS
   - Slightly less emerging market exposure but cleaner signal
   - Better data quality and consistency

### Updated GARCH Configuration

With 19+ years minimum history across all indicators:

```
GARCH Configuration v4.1:
- Trend Lookback: 24 months (unchanged)
- GARCH Lookback: 180 months (15 years - was effectively limited to 84)
- Percentile Calculation: 180 months (15 years)
- Minimum History Required: 60 months (5 years)
```

## Special Indicator Handling: Yuan SWIFT Share (v4.1.1)

### Data Limitation Context

The Yuan SWIFT Share indicator, which tracks RMB usage in international payments, has limited historical data availability:
- **Data Start**: October 2022 (SWIFT RMB Tracker reports)
- **Available History**: ~36 months as of September 2025
- **Contrast**: Other indicators have 19-45 years of history

### Trend-Based Classification Methodology

Due to insufficient history for traditional volatility modeling, Yuan SWIFT employs a trend-based classification system:

#### 1. Linear Trend Projection
```python
# Monthly trend calculation
- Fit linear regression to all available history (36+ months)
- Calculate slope (monthly change rate) and intercept
- Project expected value for current month
- Update projection monthly as new data arrives
```

#### 2. Dynamic Classification Bands
```python
# Classification thresholds
- Expected Value = trend_slope × months + intercept
- Low Threshold = Expected Value × 0.83 (17% below trend)
- High Threshold = Expected Value × 1.17 (17% above trend)
- Classification:
  - Low: Current < Low Threshold
  - Normal: Low Threshold ≤ Current ≤ High Threshold  
  - High: Current > High Threshold
```

#### 3. Quarterly Trend Reassessment
```python
# Regime change detection (quarterly)
- Compare recent 12-month slope vs full history slope
- If divergence > 50%: Flag potential regime change
- Recalibrate trend parameters if structural break detected
- Document any policy-driven shifts (e.g., capital account changes)
```

### Integration with Theme Framework

**USD Dominance Theme Structure**:
- **Leading**: DXY Index (58 years, GARCH-ready)
- **Concurrent**: Real Rate Differential (22 years, GARCH-ready)
- **Lagging**: Yuan SWIFT Share (3 years, trend-based)
- **Supplementary**: IMF COFER USD Share (26 years, quarterly)

**Weighting Adjustment**: Due to limited history and different classification method:
- Yuan SWIFT receives 0.5x weight in theme probability calculations
- Other USD indicators compensate with proportionally higher weights
- Theme still uses all four indicators but acknowledges data quality variance

### Volatility Handling for Yuan

Since GARCH requires 60+ monthly observations minimum:
- **Volatility Estimate**: Use 3-month rolling standard deviation
- **Volatility Regime**: Compare current vol to percentiles of available history
- **Not included** in portfolio-wide GARCH modeling
- **Alternative**: Exponentially weighted moving average (EWMA) with 6-month span

### Operational Considerations

1. **Data Collection**: Continue monthly PDF parsing from SWIFT RMB Tracker
2. **Threshold Updates**: Recalculate trend and bands monthly
3. **Documentation**: Note classification method difference in reports
4. **Future Enhancement**: When 60+ months available (Oct 2027), transition to standard methodology

## Updated Macro Theme Framework

### Theme 1: USD Dominance

**Indicators**:
- **Leading**: DXY Index (unchanged)
- **Concurrent**: Real Rate Differential (unchanged)  
- **Lagging**: Yuan SWIFT Share (**trend-based classification per v4.1.1**)
- **Supplementary**: IMF COFER USD Reserves (unchanged)

### Theme 2: Innovation Environment (UPDATED)

**Indicators**:
- **Leading**: **QQQ/SPY Ratio** (was ARKK/SPY)
  - Calculation: QQQ closing price / SPY closing price
  - 20-day smoothing for stability
  - Data available from 1999
- **Concurrent**: US Productivity Growth (unchanged)
- **Lagging**: Corporate R&D/Revenue (unchanged)

### Theme 3: P/E Multiple Regime

**Indicators** (unchanged):
- **Leading**: Put/Call Ratio
- **Concurrent**: Forward P/E vs Historical Average
- **Lagging**: EPS Delivery Rate

### Theme 4: US Market Leadership (UPDATED)

**Indicators**:
- **Leading**: **SPY/EFA Momentum** (was SPY/VXUS)
  - 3-month total return differential
  - Calculation: (SPY_3M_return - EFA_3M_return)
  - Data available from 2001
- **Concurrent**: US Market Cap % of Global (unchanged)
- **Lagging**: Cumulative ETF Flows US vs Intl (unchanged)

## Implementation Notes

### Data Migration

For systems already running v4.0:
1. Historical ARKK/SPY data (2014-present) can be retained for reference
2. Backfill QQQ/SPY data from 1999-present
3. Map ARKK/SPY historical signals to QQQ/SPY with 1.5x scaling factor for continuity
4. Similar process for SPY/VXUS → SPY/EFA transition

### Calibration Adjustments

Due to different volatility profiles:
- QQQ/SPY typically less volatile than ARKK/SPY (multiply historical vol by 0.7)
- SPY/EFA very similar to SPY/VXUS (multiply historical vol by 1.05)

### Percentile Recalculation

With extended history, percentile thresholds may shift:
- Recommend recalculating 15-year percentiles for all indicators
- May see slight shifts in tercile boundaries
- More stable long-term percentiles with extended data

## Risk Management Updates

### Volatility Estimation

With 19+ years minimum history across all indicators, the GARCH model captures sufficient regime variation to estimate volatility without artificial floors. The extended history includes:
- Dot-com bust (2000-2002)
- Global Financial Crisis (2007-2009)
- European debt crisis (2011-2012)
- Taper tantrum (2013)
- COVID crash (2020)
- Multiple rate cycles

This comprehensive regime coverage eliminates the need for volatility floors. The model relies entirely on data-driven volatility estimates from the 15-year GARCH lookback.

**Exception**: Yuan SWIFT Share uses alternative volatility methods due to 3-year history limitation (see Special Indicator Handling section).

## Benefits of v4.1

1. **Superior Regime Coverage**: 19+ years captures dot-com bust, GFC, COVID, and multiple cycles
2. **Robust GARCH Estimation**: 180-month lookback provides stable volatility estimates
3. **Reduced Model Uncertainty**: Less need for arbitrary volatility floors
4. **Operational Simplicity**: More liquid, reliable indicators with better data quality
5. **Backtesting Capability**: Can now backtest strategies to 2005 with full indicator set

## Appendix: Indicator Availability Summary (v4.1.1)

| Indicator | Start Date | Years Available | Min for 15yr GARCH | Special Handling |
|-----------|------------|-----------------|-------------------|------------------|
| DXY Index | 1967 | 58 | ✓ | None |
| Real Rate Differential | 2003 | 22 | ✓ | None |
| **Yuan SWIFT Share** | **2022** | **3** | **✗** | **Trend-based** |
| IMF COFER | 1999 | 26 | ✓ | None |
| **QQQ/SPY Ratio** | **1999** | **26** | ✓ | None |
| US Productivity | 1947 | 78 | ✓ | None |
| Corporate R&D | 1990s | 35 | ✓ | None |
| Put/Call Ratio | 2006 | 19 | ✓ | None |
| Forward P/E | 1990 | 35 | ✓ | None |
| EPS Delivery | 1990 | 35 | ✓ | None |
| **SPY/EFA Momentum** | **2001** | **24** | ✓ | None |
| US Market Cap % | 1980 | 45 | ✓ | None |
| ETF Flows | 2003 | 22 | ✓ | None |

**Minimum for GARCH**: 19 years (Put/Call Ratio)  
**Exception**: Yuan SWIFT (3 years) uses trend-based classification

## Data Quality Matrix (v4.1.1)

| Quality Tier | Years Available | Methodology | Indicators |
|--------------|-----------------|-------------|------------|
| **Tier 1** | 20+ years | Full GARCH, percentile-based | DXY, QQQ/SPY, SPY/EFA, Productivity, etc. |
| **Tier 2** | 10-20 years | GARCH with caution | Put/Call (19 years) |
| **Tier 3** | <10 years | Alternative methods | Yuan SWIFT (trend-based) |

## Version History

### Version 4.1.1 (September 7, 2025, 00:15 UTC)
**Yuan SWIFT trend-based classification with time-to-trigger:**
- Added special handling section for Yuan SWIFT Share (3-year history)
- Implemented trend-based classification with ±17% bands
- Added time-to-trigger calculation using 6-month trend vs band intersection
- Documented quarterly trend reassessment process
- Adjusted indicator weighting (0.5x for Yuan)
- Added data quality matrix
- Specified alternative volatility methods for short-history indicators
- Integrated months-to-trigger into scenario probability framework
- All other v4.1 content preserved unchanged

### Version 4.1 (September 5, 2025, 18:00 UTC)
**Indicator optimization for extended history:**
- Replaced ARKK/SPY with QQQ/SPY (Innovation theme, leading indicator)
- Replaced SPY/VXUS with SPY/EFA (US Leadership theme, leading indicator)
- Increased minimum data history from 11 to 19 years
- Enabled 15-year GARCH lookback (was limited to 7 years)
- Adjusted volatility floors for more stable indicators
- Maintained all other v4.0 architecture and methodology

### Version 4.0 (August 30, 2025)
- Quarterly rebalancing schedule
- Three-tier indicator signals
- Four macro themes
- 16 scenario probability framework
- Regret minimization optimization

---

**End of IPS v4.1.1 Update - Yuan SWIFT Trend-Based Classification**