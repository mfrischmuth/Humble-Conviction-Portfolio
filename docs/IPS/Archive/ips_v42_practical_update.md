# Investment Policy Statement (IPS) Framework
## Version 4.2 - Practical Implementation Alignment
**Last Updated:** September 7, 2025, 22:00:00 UTC  
**Status:** Production - Aligned with Data Collector v4.2.5
**Filename:** IPS_v4.2_Practical_Implementation.md

## Executive Summary

Version 4.2 aligns the IPS with the practical realities of data collection as implemented in Data Collector v4.2.5, while preserving all methodological advances from v4.1. This update maintains the extended history capabilities (19+ years minimum) while substituting indicators based on actual data availability and automation capabilities.

**Key Principle**: Let the statistical models (GARCH and percentile transformations) handle normalization. No arbitrary calibrations needed.

**Removed from v4.1**: All arbitrary volatility multipliers and scaling factors. The GARCH model and percentile rankings handle cross-indicator comparability without manual adjustments.

## Version 4.2 Changes from v4.1

### Indicator Substitutions Based on Data Reality

| Theme | IPS v4.1 Ideal | IPS v4.2 Reality | Data History | Rationale |
|-------|----------------|------------------|--------------|-----------|
| **Innovation** | Corporate R&D/Revenue | **Tech Employment %** | 1990+ (35 years) | FRED provides reliable monthly data vs quarterly manual |
| **Valuation** | Forward P/E | **Trailing P/E** | Continuous | Yahoo provides real-time vs weekly manual updates |
| **US Leadership** | MSCI US % of Global | **SPY/(SPY+EFA) Proxy** | 2001+ (24 years) | Calculable from ETF prices vs subscription data |
| **USD Dominance** | IMF COFER (API) | **COFER (Quarterly Manual)** | 1999+ (26 years) | API broken, requires quarterly CSV updates |

### Removed Unnecessary Calibrations

Previous versions included arbitrary calibration factors that are unnecessary given our statistical framework:
- ~~Volatility multipliers (0.7 for QQQ/SPY, 1.05 for SPY/EFA, etc.)~~ - REMOVED
- ~~ARKK to QQQ scaling factors~~ - REMOVED  
- ~~Fixed foreign real rate assumptions~~ - REMOVED

**Why removed**: GARCH models each series independently, and percentile transformations normalize across indicators. Adding calibrations corrupts the actual historical relationships.

### Preserved from v4.1: Extended History Benefits

All v4.1 improvements in historical data coverage are maintained:
- QQQ/SPY provides 26+ years (since 1999) vs 11 years for ARKK/SPY
- SPY/EFA provides 24+ years (since 2001) vs 14 years for SPY/VXUS
- Minimum data history across all indicators: 19+ years (was 11 in v4.0)

## GARCH Configuration (Preserved from v4.1)

With 19+ years minimum history across all indicators:

```
GARCH Configuration v4.2:
- Trend Lookback: 24 months
- GARCH Lookback: 180 months (15 years)
- Percentile Calculation: 180 months (15 years)
- Minimum History Required: 60 months (5 years)
- No calibration adjustments - each series modeled independently
```

### Comprehensive Regime Coverage (Preserved from v4.1)

The extended history includes:
- Dot-com bust (2000-2002)
- Global Financial Crisis (2007-2009)
- European debt crisis (2011-2012)
- Taper tantrum (2013)
- COVID crash (2020)
- Multiple rate cycles

This comprehensive regime coverage eliminates the need for volatility floors. The model relies entirely on data-driven volatility estimates from the 15-year GARCH lookback.

## Macro Theme Framework - v4.2 Practical

### Theme 1: USD Dominance Environment

**Indicators**:
- **Leading**: DXY Index
  - Source: Yahoo Finance (DX=F)
  - Update: Daily
  - History: 1967+ (58 years available)
  
- **Concurrent**: Real Rate Differential
  - Source: FRED TIPS (DFII10) minus weighted foreign rates
  - Update: Daily
  - History: 2003+ (22 years)
  - Calculation: US 10Y TIPS - DXY-weighted foreign real rates (when available)
  - Fallback: US 10Y TIPS - ECB/BOJ average (or simplified proxy if unavailable)
  
- **Lagging**: IMF COFER USD Reserve Share
  - Source: IMF quarterly CSV download
  - Update: Quarterly with 3-month lag
  - History: 1999+ (26 years)
  - Status: **Manual update required**
  - Next update: October 2025 for Q2 2024 data

### Theme 2: Innovation Environment

**Indicators**:
- **Leading**: QQQ/SPY Ratio
  - Source: Yahoo Finance
  - Update: Daily
  - History: 1999+ (26 years)
  - Calculation: QQQ close / SPY close
  - 20-day smoothing optional for display only
  
- **Concurrent**: US Productivity Growth
  - Source: FRED (OPHNFB)
  - Update: Quarterly
  - History: 1947+ (78 years)
  - Calculation: YoY % change
  
- **Lagging**: Tech Employment % of Total
  - Source: FRED (USINFO / PAYEMS)
  - Update: Monthly
  - History: 1990+ (35 years)
  - Calculation: Information services employment / Total nonfarm employment * 100

### Theme 3: Valuation Dynamics

**Indicators**:
- **Leading**: Put/Call Ratio
  - Source: Yahoo Options Chain (SPY)
  - Update: Daily
  - History: 2006+ (19 years)
  - Calculation: Put OI / Call OI for near-term expiry
  
- **Concurrent**: Trailing P/E
  - Source: Yahoo Finance (SPY)
  - Update: Daily
  - History: Continuous point-in-time
  - Direct fetch from SPY.info['trailingPE']
  
- **Lagging**: EPS Delivery Rate
  - Source: Calculated from top S&P components
  - Update: Quarterly
  - History: 1990s+ (35 years)
  - Calculation: Average(Actual EPS / Estimated EPS) for AAPL, MSFT, GOOGL, AMZN, NVDA

### Theme 4: US Market Leadership

**Indicators**:
- **Leading**: SPY/EFA Momentum
  - Source: Yahoo Finance
  - Update: Daily
  - History: 2001+ (24 years)
  - Calculation: (SPY_3M_return - EFA_3M_return)
  
- **Concurrent**: US Market % (Proxy)
  - Source: Calculated from SPY and EFA prices
  - Update: Daily
  - History: 2001+ (24 years)
  - Calculation: SPY / (SPY + EFA) * 100
  - Note: Represents US % of developed markets (~85-87% typical range)
  
- **Lagging**: ETF Flow Differential
  - Source: Volume proxy from Yahoo Finance
  - Update: Daily
  - History: 2003+ (22 years)
  - Calculation: (SPY $ volume - EFA $ volume) / 1e9

## Implementation Notes

### Data Migration from Previous Versions

For systems running v4.1 or v4.0:

1. **Direct data usage**:
   - Use QQQ/SPY historical data as-is (no scaling)
   - Use SPY/EFA historical data as-is (no adjustments)
   - Each indicator's history stands on its own

2. **No mapping between different indicators**:
   - ARKK/SPY and QQQ/SPY are different indicators - don't map between them
   - If switching indicators, start fresh with the new indicator's history

3. **New v4.2 indicators**:
   - Tech Employment % starts fresh (not mapped from R&D/Revenue)
   - Trailing P/E starts fresh (not mapped from Forward P/E)
   - SPY/(SPY+EFA) calculation starts fresh

### Statistical Processing

**The framework handles all normalization:**
1. Each indicator gets its own GARCH model fitted to its own history
2. Percentile rankings (0-100) normalize across different scales
3. No manual calibrations or adjustments needed
4. The model adapts to each indicator's natural volatility

### Percentile Calculation

With extended history:
- Calculate percentiles using full available history (up to 15 years)
- No adjustments for "expected" ranges
- Let the data define its own distribution
- Tercile boundaries at 33rd and 67th percentiles (or adjust based on empirical results)

## Risk Management Updates

### Volatility Estimation

With 19+ years minimum history across all indicators, the GARCH model captures sufficient regime variation to estimate volatility without artificial floors or calibrations. Each indicator's volatility is modeled independently based on its own historical behavior.

### Data Quality Monitoring

The system tracks:
- Collection success rate (target: >10/12 indicators)
- GARCH readiness (target: >6 indicators with 60+ months)
- Failure logging for manual intervention
- Automatic fallbacks for missing data
- Manual update schedule for COFER

### Manual Update Schedule

**COFER USD Reserve Share**:
- Frequency: Quarterly
- Release lag: 3 months
- Schedule:
  - Q1 data: Available end of July
  - Q2 data: Available end of October
  - Q3 data: Available end of January
  - Q4 data: Available end of April
- Source: https://data.imf.org/COFER

## Data Collection Architecture

### Fully Automated (9/12)
- DXY, QQQ/SPY, SPY/EFA via Yahoo Finance
- Real Rates, Productivity via FRED
- Tech Employment % via FRED
- Put/Call via Yahoo Options
- Trailing P/E via Yahoo Finance
- US Market %, ETF Flows calculated

### Semi-Automated (2/12)
- EPS Delivery (quarterly calculation from earnings)
- Real Rate Differential (requires foreign rate data or proxy)

### Manual Updates (1/12)
- COFER USD Reserve Share (quarterly CSV from IMF)

## Benefits (Combined v4.1 + v4.2)

### From v4.1 (Preserved):
1. **Superior Regime Coverage**: 19+ years captures multiple market cycles
2. **Robust GARCH Estimation**: 180-month lookback provides stable volatility estimates
3. **Reduced Model Uncertainty**: No arbitrary calibrations or floors
4. **Backtesting Capability**: Can backtest strategies to 2005 with full indicator set

### New in v4.2:
5. **Clean Statistical Framework**: No arbitrary calibrations to maintain or justify
6. **Actually Works**: All 12 indicators can be reliably collected
7. **Mostly Automated**: 11/12 indicators update automatically
8. **Timely Updates**: Tech Employment % monthly vs R&D quarterly
9. **No Paywalls**: Avoids expensive data subscriptions
10. **Transparent**: All calculations are explicit and reproducible

## Appendix: Indicator Availability Summary

| Indicator | Start Date | Years Available | Min for 15yr GARCH | v4.2 Status |
|-----------|------------|-----------------|-------------------|-------------|
| DXY Index | 1967 | 58 | ✓ | ✅ Automated |
| Real Rate Differential | 2003 | 22 | ✓ | ✅ Automated |
| IMF COFER | 1999 | 26 | ✓ | ⚠️ Manual Quarterly |
| QQQ/SPY Ratio | 1999 | 26 | ✓ | ✅ Automated |
| US Productivity | 1947 | 78 | ✓ | ✅ Automated |
| Tech Employment % | 1990 | 35 | ✓ | ✅ Automated |
| Put/Call Ratio | 2006 | 19 | ✓ | ✅ Automated |
| Trailing P/E | Continuous | N/A | Point-in-time | ✅ Automated |
| EPS Delivery | 1990s | 35 | ✓ | 🟡 Semi-Auto |
| SPY/EFA Momentum | 2001 | 24 | ✓ | ✅ Automated |
| US Market % (Proxy) | 2001 | 24 | ✓ | ✅ Automated |
| ETF Flows | 2003 | 22 | ✓ | ✅ Automated |

**Minimum: 19 years (Put/Call Ratio)**

## Version History

### Version 4.2 (September 7, 2025, 22:00 UTC)
**Practical implementation with clean statistical framework:**
- Replaced R&D/Revenue with Tech Employment % (better data availability)
- Replaced Forward P/E with Trailing P/E (automated collection)
- Replaced MSCI data with SPY/(SPY+EFA) proxy (calculable)
- Documented COFER manual update requirement (API broken)
- **Removed all arbitrary calibrations** - GARCH and percentiles handle normalization
- Aligned with Data Collector v4.2.5 implementation
- Maintained minimum 19-year history across indicators

### Version 4.1 (September 5, 2025, 18:00 UTC)
**Indicator optimization for extended history:**
- Replaced ARKK/SPY with QQQ/SPY (Innovation theme, leading indicator)
- Replaced SPY/VXUS with SPY/EFA (US Leadership theme, leading indicator)
- Increased minimum data history from 11 to 19 years
- Enabled 15-year GARCH lookback (was limited to 7 years)
- Included calibration adjustments (removed in v4.2)

### Version 4.0 (Previous)
- Original framework with ARKK/SPY and SPY/VXUS
- Limited to 11 years minimum history

---

**End of IPS v4.2 - Practical Implementation with Clean Statistical Framework**