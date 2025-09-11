# Product Requirements Document: HCP Data Collector
**Version:** 5.5  
**File:** hcp_data_collector_prd_v5.5.md  
**Last Updated:** 2025-09-05 20:15:00 UTC  
**Status:** Architecture Update - Pragmatic Unified Approach  
**IPS Version:** v4.1

---

## ARCHITECTURAL UPDATE IN v5.5

### Previous Architecture (v5.4)
- **Data Collector**: Raw data only (no calculations)
- **HCP Tracker**: All calculations
- **Issue**: File Handler expects pre-calculated indicators, creating workflow friction

### New Architecture (v5.5) - Pragmatic Unified Approach
- **Unified Data Collector**: Fetches raw data AND calculates indicators
- **Output Format**: File Handler-compatible JSON with both raw and calculated values
- **Benefits**: Two-step workflow, maintains data transparency, single source of truth

### Rationale for Change
1. **Workflow Simplification**: Reduces monthly process from 3 steps to 2
2. **File Handler Compatibility**: Direct integration without intermediate processing
3. **Data Preservation**: Raw values included for audit/recalculation needs
4. **Maintainability**: Single Python script instead of multiple tools

---

## Updated Indicator Configuration (12 Total - IPS v4.1)

### Indicator List with Calculation Requirements

| Theme | Leading | Concurrent | Lagging |
|-------|---------|------------|---------|
| **USD** | DXY (direct) | Real Rate Diff (calculated) | COFER USD Share (direct) |
| **Innovation** | QQQ/SPY Ratio (calculated) | Productivity YoY (calculated) | R&D/Revenue (direct) |
| **P/E** | Put/Call Ratio (direct/estimated) | Forward P/E (direct) | EPS Delivery (direct) |
| **US Leadership** | SPY/EFA Momentum (calculated) | US Market Cap % (direct) | ETF Flow Diff (estimated) |

### Data Collection & Calculation Requirements

| Indicator | Raw Data Collected | Calculation Performed | History Required |
|-----------|-------------------|----------------------|------------------|
| **USD Theme** |
| DXY | Daily closing prices | None (direct value) | 400 days (init) / 100 days (monthly) |
| Real Rate Diff | TNX yields, TLT prices | US real rate - Intl real rate | 250 days |
| COFER USD | Quarterly percentages | None (direct value) | 12 quarters |
| **Innovation Theme** |
| QQQ/SPY | QQQ & SPY prices separately | Ratio calculation + MAs | 300 days each |
| Productivity | Quarterly index values | YoY % change | 24 quarters |
| R&D/Revenue | Quarterly percentages | None (direct value) | 12 quarters |
| **P/E Theme** |
| Put/Call | Market sentiment data | Inversion if needed | 30 days |
| Forward P/E | Consensus estimates | None (direct value) | 36 months |
| EPS Delivery | Actual vs Expected | None (direct value) | 8 quarters |
| **US Leadership Theme** |
| SPY/EFA Momentum | SPY & EFA prices | 6-month relative return | 300 days each |
| US Market Cap % | Monthly percentages | None (direct value) | 24 months |
| ETF Flow Diff | Flow data or estimates | Net calculation | 12 months |

---

## Output Format Specification

### JSON Structure
```json
{
  "metadata": {
    "version": "4.1",
    "framework": "IPS v4.1",
    "mode": "initialize|monthly",
    "generated": "2025-09-05T20:00:00Z",
    "description": "Unified data with raw values and calculated indicators"
  },
  
  "indicators": {
    "qqq_spy": {
      "value": 1.12,              // Current calculated ratio
      "percentiles": {             // For File Handler compatibility
        "min": 0.85,
        "p33": 0.98,
        "p67": 1.18,
        "max": 1.35
      },
      "lastUpdated": "2025-09-05T20:00:00Z",
      "source": "calculated",
      "ma_50": 1.10,               // Additional calculations
      "ma_200": 1.08
    }
    // ... other 11 indicators
  },
  
  "raw_data": {                    // Preserved for transparency
    "qqq": {
      "values": [485.23, 484.91, ...],
      "dates": ["2025-09-05", ...],
      "source": "Yahoo Finance",
      "ticker": "QQQ"
    },
    "spy": {
      "values": [561.47, 560.89, ...],
      "dates": ["2025-09-05", ...],
      "source": "Yahoo Finance", 
      "ticker": "SPY"
    }
    // ... other raw data
  },
  
  "data_quality": {
    "indicators_collected": 12,
    "indicators_expected": 12,
    "completion_rate": 100.0,
    "overall": "GOOD",
    "critical_indicators": "4/4"
  }
}
```

---

## Implementation Workflow

### Monthly Process (2 Steps)

1. **Run Unified Data Collector**
   ```bash
   python hcp_unified_collector_v4.1.py --mode monthly
   ```
   - Fetches all current and historical data
   - Calculates required indicators
   - Outputs single JSON file

2. **Load into HCP Tracker**
   - Open HCP Tracker in browser
   - Use File Handler to load JSON
   - File Handler auto-detects format
   - Tracker performs analysis

### Initialization Process

1. **Run Unified Data Collector**
   ```bash
   python hcp_unified_collector_v4.1.py --mode initialize
   ```
   - Fetches extended historical data
   - Provides baseline for all MAs
   - Same output format, more history

---

## Migration Path

### From v5.4 to v5.5

1. **Replace Multiple Collectors**: Remove v3.8.2 and workbook collector
2. **Deploy Unified Collector**: Single hcp_unified_collector_v4.1.py
3. **Update File Handler**: Ensure v2.1+ for format compatibility
4. **Verify Output**: Check both raw_data and indicators populated

### Backward Compatibility

- File Handler v2.1+ can handle both old and new formats
- Migration function in File Handler converts legacy data
- Raw data preservation allows recalculation if needed

---

## Benefits of v5.5 Architecture

1. **Simplified Workflow**: 2-step process instead of 3
2. **Single Source of Truth**: One collector for all data
3. **Transparency**: Raw data preserved alongside calculations
4. **Flexibility**: Can recalculate from raw if methodologies change
5. **File Handler Compatible**: Direct integration without modifications
6. **Maintainable**: One codebase instead of multiple tools

---

## Version History

### v5.5 (2025-09-05 20:15)
- **MAJOR**: Unified architecture with calculated indicators
- Pragmatic approach balancing clean architecture with workflow needs
- Maintains raw data for transparency
- File Handler compatible output

### v5.4 (2025-08-25)
- Raw data only architecture (superseded by v5.5)
- Required separate calculation step

### Earlier versions
- See previous PRD versions for details

---

*End of Product Requirements Document v5.5 - HCP Data Collector*