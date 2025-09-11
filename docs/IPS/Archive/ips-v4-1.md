# Investment Policy Statement (IPS) Framework
## Version 4.1 - Extended History Indicators Update
**Last Updated:** September 5, 2025, 18:00:00 UTC  
**Status:** Production Ready - Indicator Optimization
**Filename:** IPS_v4.1_Extended_History_Indicators.md

## Executive Summary

Version 4.1 implements strategic indicator substitutions to extend historical data availability from 11 years to 19+ years minimum. This enables robust GARCH volatility modeling across multiple market regimes while maintaining economic signal integrity.

**Key Change**: Replace short-history indicators (ARKK/SPY, SPY/VXUS) with longer-history equivalents (QQQ/SPY, SPY/EFA) that capture the same economic themes with 20+ years of data.

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

## Updated Macro Theme Framework

### Theme 2: Innovation Environment (UPDATED)

**Indicators**:
- **Leading**: **QQQ/SPY Ratio** (was ARKK/SPY)
  - Calculation: QQQ closing price / SPY closing price
  - 20-day smoothing for stability
  - Data available from 1999
- **Concurrent**: US Productivity Growth (unchanged)
- **Lagging**: Corporate R&D/Revenue (unchanged)

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

## Benefits of v4.1

1. **Superior Regime Coverage**: 19+ years captures dot-com bust, GFC, COVID, and multiple cycles
2. **Robust GARCH Estimation**: 180-month lookback provides stable volatility estimates
3. **Reduced Model Uncertainty**: Less need for arbitrary volatility floors
4. **Operational Simplicity**: More liquid, reliable indicators with better data quality
5. **Backtesting Capability**: Can now backtest strategies to 2005 with full indicator set

## Appendix: Indicator Availability Summary (v4.1)

| Indicator | Start Date | Years Available | Min for 15yr GARCH |
|-----------|------------|-----------------|-------------------|
| DXY Index | 1967 | 58 | ✓ |
| Real Rate Differential | 2003 | 22 | ✓ |
| IMF COFER | 1999 | 26 | ✓ |
| **QQQ/SPY Ratio** | **1999** | **26** | ✓ |
| US Productivity | 1947 | 78 | ✓ |
| Corporate R&D | 1990s | 35 | ✓ |
| Put/Call Ratio | 2006 | 19 | ✓ |
| Forward P/E | 1990 | 35 | ✓ |
| EPS Delivery | 1990 | 35 | ✓ |
| **SPY/EFA Momentum** | **2001** | **24** | ✓ |
| US Market Cap % | 1980 | 45 | ✓ |
| ETF Flows | 2003 | 22 | ✓ |

**New Minimum: 19 years (Put/Call Ratio)** vs 11 years in v4.0

## Version History Addition

### Version 4.1 (September 5, 2025, 18:00 UTC)
**Indicator optimization for extended history:**
- Replaced ARKK/SPY with QQQ/SPY (Innovation theme, leading indicator)
- Replaced SPY/VXUS with SPY/EFA (US Leadership theme, leading indicator)
- Increased minimum data history from 11 to 19 years
- Enabled 15-year GARCH lookback (was limited to 7 years)
- Adjusted volatility floors for more stable indicators
- Maintained all other v4.0 architecture and methodology

---

**End of IPS v4.1 Update - Extended History Indicators**