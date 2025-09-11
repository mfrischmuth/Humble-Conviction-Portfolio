HCP Tracker PRD v3.2 - MA Comparison Framework.md
7.94 KB •260 lines
•
Formatting may be inconsistent from source

# HCP Tracker Product Requirements Document
**Version:** 3.2  
**File:** hcp_tracker_prd_v3.2.md  
**Last Updated:** 2025-08-25 12:30:00 UTC  
**Status:** MA Comparison Framework with Fixed Tier Weights
**Current Code Version:** v6.2 (transitioning to v6.3)

---

## 1. Executive Summary

### 1.1 Product Vision
The HCP Tracker is a browser-based portfolio optimization tool implementing the Humble Conviction Portfolio (HCP) Investment Policy Statement. It provides a guided 10-step workflow with ALL calculations performed client-side, using moving average comparisons for signal generation.

### 1.2 Key Changes in v3.2
- **ALL calculations in Tracker**: Data Collector provides raw data only
- **MA Comparison Framework**: Short MA vs Long MA for most indicators (not fixed thresholds)
- **Fixed Tier Weights**: 35% canary, 40% primary, 25% structural (not ranges)
- **Enhanced ACWX/SPY**: 30-day relative performance calculation with MA crossover
- **Specific MA Periods**: Defined periods for each indicator comparison
- **Sample Data Generator**: Built-in test data generation

### 1.3 Previous Features (Retained)
- 13 unique indicators across 4 themes
- Three-tier signal framework
- Dual-file data architecture
- Steps 1-3 fully functional

---

## 2. Calculation Framework

### 2.1 MA Comparison Approach
Most indicators now use MA comparisons instead of fixed thresholds:

```javascript
const maComparisons = {
  'dxy': {short: 200, long: 400},           // 200D vs 400D MA
  'qqqSpy': {short: 150, long: 300},        // 150D vs 300D MA
  'yuanSwift': {short: 12, long: 36},       // 12M vs 36M MA
  'goldPurchases': {short: 4, long: 12},    // 4Q vs 12Q MA
  'cape': {short: 'current', long: 240},    // Current vs 20Y MA
  'riskPremium': {short: 6, long: 18},      // 6M vs 18M MA
  'usAcwi': {short: 12, long: 36},          // 12M vs 36M MA
  'productivity': {short: 2, long: 8},      // 2Q vs 8Q MA
  'netMargins': {short: 4, long: 12},       // 4Q vs 12Q MA
  'reserveShare': {short: 4, long: 8},      // 4Q vs 8Q MA
  'spVsWorld': {short: 6, long: 12}         // 6M vs 12M MA
};

// Fixed threshold exceptions:
// - TIC Flows: Fixed at 0 (12-month sum)
// - Forward P/E: 1Y vs 3Y MA (special calculation)
```

### 2.2 ACWX/SPY Calculation
```javascript
function calculateAcwxSpySignal(acwxData, spyData) {
  // Calculate 30-day relative performance
  const acwx30dReturn = (acwxData.current / acwxData.history[29]) - 1;
  const spy30dReturn = (spyData.current / spyData.history[29]) - 1;
  const relativePerf = acwx30dReturn - spy30dReturn;
  
  // Calculate MA of relative performance
  const shortMA = calculateMA(relativePerformanceHistory, 30);
  const longMA = calculateMA(relativePerformanceHistory, 90);
  
  return {
    triggered: shortMA > longMA,
    relativePerformance: relativePerf,
    distance: (shortMA - longMA) / longMA
  };
}
```

---

## 3. Three-Tier Signal Framework

### 3.1 Fixed Tier Weights
- **Canary**: 35% (early warning)
- **Primary**: 40% (core signals)
- **Structural**: 25% (confirmation)

### 3.2 Indicator Classification

| Tier | Indicators | Weight |
|------|-----------|---------|
| **Canary** | DXY, QQQ/SPY, Risk Premium, ACWX/SPY | 35% |
| **Primary** | Forward P/E, Net Margins, Yuan SWIFT, CAPE | 40% |
| **Structural** | Productivity, Reserve Share, Gold Purchases, TIC Flows | 25% |

### 3.3 Theme Probability Calculation
```javascript
function calculateThemeProbability(themeIndicators) {
  let weightedSum = 0;
  let totalWeight = 0;
  
  for (const [indicator, data] of themeIndicators) {
    const tier = getTierForIndicator(indicator);
    const tierWeight = signalTiers[tier].weight;
    const indicatorWeight = 1 / countIndicatorsInTier(tier);
    const finalWeight = tierWeight * indicatorWeight;
    
    weightedSum += data.probability * finalWeight;
    totalWeight += finalWeight;
  }
  
  return weightedSum / totalWeight;
}
```

---

## 4. Indicator Assignments by Theme

### 4.1 USD Theme (4 indicators)
- **DXY** (Canary): 200D vs 400D MA
- **Gold Purchases** (Structural): 4Q vs 12Q MA
- **Yuan SWIFT** (Primary): 12M vs 36M MA
- **Reserve Share** (Structural): 4Q vs 8Q MA

### 4.2 Innovation Theme (3 indicators)
- **QQQ/SPY** (Canary): 150D vs 300D MA
- **Productivity** (Structural): 2Q vs 8Q MA
- **Net Margins** (Primary): 4Q vs 12Q MA

### 4.3 P/E Theme (3 indicators)
- **Risk Premium** (Canary): 6M vs 18M MA
- **Forward P/E** (Primary): 1Y vs 3Y MA
- **CAPE** (Primary): Current vs 20Y MA

### 4.4 International Theme (3 indicators)
- **ACWX/SPY** (Canary): 30D vs 90D relative performance
- **S&P vs World** (Primary): 6M vs 12M MA
- **TIC Flows** (Structural): 12M sum vs 0

---

## 5. UI Display Requirements

### 5.1 Indicator Display Elements
Each indicator card must show:
- **MA Comparison**: "200D > 400D ✓" or "200D < 400D ✗"
- **Tier Badge**: 🚨 Canary, 📊 Primary, 🏛️ Structural
- **Current Value**: Latest data point
- **Signal Status**: Triggered/Not Triggered
- **Distance**: Percentage between short and long MA

### 5.2 Theme Organization
- Group indicators by tier within each theme
- Show tier contribution to theme probability
- Display weighted probability calculation

### 5.3 Visual Indicators
```
🚨 Canary (35%) - Early Warning
📊 Primary (40%) - Core Signals  
🏛️ Structural (25%) - Confirmation
```

---

## 6. Data Requirements

### 6.1 Data Collector Provides
- Raw price/value data only
- 30+ days of daily history for daily indicators
- 36+ months of monthly history for monthly indicators
- 12+ quarters for quarterly indicators

### 6.2 Tracker Calculates
- ALL moving averages
- ALL signal comparisons
- ALL probabilities
- ALL tier weightings

---

## 7. Implementation Priorities

### Phase 1: Core MA Framework (PRIORITY)
- Implement MA comparison calculations
- Update from fixed thresholds to MA comparisons
- Add specific MA period configurations

### Phase 2: ACWX/SPY Enhancement
- Implement 30-day relative performance
- Add relative performance MA calculations
- Update International theme display

### Phase 3: UI Updates
- Add MA comparison displays
- Update tier badges to emoji format
- Group indicators by tier

### Phase 4: Testing & Validation
- Verify MA calculations with sample data
- Test tier weighting calculations
- Validate probability aggregation

---

## 8. Key Differences from v3.1

| Aspect | v3.1 (Previous) | v3.2 (Current) |
|--------|-----------------|----------------|
| Calculations | Distance-to-trigger | MA comparisons |
| Thresholds | Fixed values | MA crossovers |
| Tier Weights | Ranges (30-35%) | Fixed (35/40/25) |
| ACWX/SPY | Simple ratio | Relative performance |
| Data Processing | Shared with Collector | ALL in Tracker |

---

## 9. Success Metrics

### 9.1 Technical Metrics
- MA calculations accurate within 0.1%
- Tier weightings sum to exactly 100%
- Signal generation consistent with MA crossovers
- All 13 indicators properly classified

### 9.2 User Experience Metrics
- Clear display of MA comparisons
- Intuitive tier grouping
- Transparent probability calculations
- Easy understanding of signal status

---

## Appendices

### Appendix A: Complete MA Period Specifications
[Detailed table of all MA periods for each indicator]

### Appendix B: Calculation Formulas
[Mathematical specifications for all calculations]

### Appendix C: Version History
- v3.2 (2025-08-25): MA comparison framework
- v3.1 (2025-08-25): Three-tier framework with IPS 3.8
- v3.0 (2025-08-25): Enhanced probability framework
- v2.2 (2025-08-24): Initial implementation

---

## NOTES FOR REVIEW:

### Flags for Discussion:
1. **Gold Purchases** - Changed from "gold" (holdings) to "goldPurchases" (central bank activity)
2. **US % ACWI removed** - Not in the prompt's indicator list
3. **Forward P/E** - Special case with 1Y vs 3Y MA instead of standard comparison
4. **Some tier assignments differ** from our previous PRD (e.g., Yuan SWIFT now Primary, not Structural)

These changes represent a significant shift from the IPS 3.7 distance-to-trigger approach to a pure MA comparison framework.

---

*End of Product Requirements Document v3.2*