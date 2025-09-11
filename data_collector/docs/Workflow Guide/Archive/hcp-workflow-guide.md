# HCP Data Collection Workflow Guide v4.2.2
**Last Updated:** September 6, 2025  
**Purpose:** Streamlined process for initial setup and monthly updates

---

## Overview

The HCP Data Collector uses a **hybrid approach**:
- **Automated**: Market data (Yahoo), economic indicators (FRED), IMF data (SDMX)
- **Manual**: Yuan SWIFT (PDFs), R&D/Revenue (earnings reports)
- **Master File**: Persistent storage of all historical data

---

## Initial Setup (One-Time Process)

### Step 1: Prepare Directory Structure
```
C:/Users/markf/OneDrive/Desktop/
├── hcp_unified_collector_v4.2.2.py
├── data_output/
│   └── hcp_master_data.json (will be created)
├── pdfs/
│   └── [SWIFT RMB Tracker PDFs go here]
└── logs/
```

### Step 2: Download Historical PDFs
1. Go to [SWIFT RMB Tracker](https://www.swift.com/our-solutions/compliance-and-shared-services/business-intelligence/renminbi/rmb-tracker/document-centre)
2. Download all available monthly PDFs (last 2 years ideal)
3. Save to `C:/Users/markf/OneDrive/Desktop/pdfs/`
4. Naming doesn't matter - parser reads content, not filename

### Step 3: Run Initial Collection
```bash
python hcp_unified_collector_v4.2.2.py --initialize
```

This will:
- Fetch 20 years of market data (where available)
- Parse all PDFs in the pdfs/ folder
- Query IMF SDMX API for COFER data
- Create `hcp_master_data.json` with all historical data
- Generate `hcp_manual_update.csv` for missing data

### Step 4: Add Missing Historical Data
1. Open `hcp_manual_update.csv`
2. Fill in any missing columns:
   - **COFER_USD**: From IMF website if API didn't have all quarters
   - **R&D_Revenue**: From S&P earnings reports
   - **Yuan_SWIFT**: Should be populated from PDFs
3. Save the CSV

### Step 5: Import Manual Data
```bash
python hcp_unified_collector_v4.2.2.py --import-csv hcp_manual_update.csv
```

**Result:** Complete `hcp_master_data.json` with all historical data

---

## Monthly Update Process

### Step 1: Download New Month's PDF
1. Download latest SWIFT RMB Tracker PDF
2. Add to `pdfs/` folder

### Step 2: Run Monthly Update
```bash
python hcp_unified_collector_v4.2.2.py --monthly
```

This will:
- Load existing `hcp_master_data.json`
- Fetch current market data (automatic)
- Parse new PDF for Yuan data (automatic)
- Check IMF API for new COFER data (automatic)
- Generate `hcp_monthly_update_YYYYMM.csv`

### Step 3: Review and Complete Manual Data
Open the generated CSV file:

```csv
Date,       DXY,   QQQ/SPY, Forward_PE, Yuan_SWIFT, COFER_USD, R&D_Revenue
2025-09,    97.73, 0.890,   26.6,       4.61,       ,          
```

Fill in missing values:
- **COFER_USD**: Only if new quarter (Q3 starts in July)
- **R&D_Revenue**: From quarterly earnings (if available)

### Step 4: Import Updates
```bash
python hcp_unified_collector_v4.2.2.py --import-csv hcp_monthly_update_202509.csv
```

### Step 5: Generate Tracker Input
```bash
python hcp_unified_collector_v4.2.2.py --export-tracker
```

Creates `hcp_tracker_input_YYYYMMDD.json` ready for the HCP Tracker.

---

## Data Sources Reference

### Automatic Data (No Action Needed)

| Indicator | Source | Method |
|-----------|--------|--------|
| DXY | Yahoo Finance | API |
| QQQ, SPY, EFA | Yahoo Finance | API |
| Productivity | FRED | API |
| Real Rates | FRED (TIPS) | API |
| Put/Call Ratio | Yahoo Options | Calculated |
| Forward P/E | Multiple sites | Web scraping |
| SPY/EFA Momentum | Yahoo Finance | Calculated |

### Semi-Automatic (PDF/API)

| Indicator | Source | Your Action |
|-----------|--------|-------------|
| Yuan SWIFT | SWIFT PDFs | Download monthly PDF to pdfs/ |
| COFER USD | IMF SDMX API | Verify quarterly, manual if needed |

### Manual Entry Required

| Indicator | Source | Frequency | Where to Find |
|-----------|--------|-----------|---------------|
| R&D/Revenue | S&P Earnings | Quarterly | FactSet, Bloomberg, or 10-Q filings |
| Central Bank Gold | World Gold Council | Quarterly | [WGC Statistics](https://www.gold.org/goldhub/data/monthly-central-bank-statistics) |

---

## Master Data File Structure

The system maintains `hcp_master_data.json`:

```json
{
  "metadata": {
    "version": "4.2.2",
    "last_updated": "2025-09-06",
    "data_points": {
      "dxy": 240,
      "yuan_swift": 24,
      "cofer_usd": 8
    }
  },
  "historical_data": {
    "yuan_swift": {
      "2023-01": 2.85,
      "2023-02": 2.91,
      // ... continues
    },
    "cofer_usd": {
      "2023-Q1": 60.5,
      "2023-Q2": 60.2,
      // ... quarterly
    },
    "rd_revenue": {
      "2023-Q1": 3.2,
      // ... quarterly
    }
  },
  "auto_data": {
    // Updated automatically each run
  }
}
```

---

## IMF SDMX API Details

For COFER USD Reserve Share:

**Endpoint:**
```
https://sdmxcentral.imf.org/ws/public/sdmxapi/rest/data/COFER/Q.USD
```

**What we're looking for:**
- Series: "Claims in U.S. Dollars"
- Frequency: Quarterly
- Value: Percentage of total reserves

The collector will automatically query this and parse the results.

---

## Troubleshooting

### "No PDFs found"
- Check `pdfs/` folder exists at `C:/Users/markf/OneDrive/Desktop/pdfs/`
- Ensure PDFs are saved there (any SWIFT RMB Tracker format works)

### "Forward P/E unavailable"
- The collector tries multiple sources
- May fall back to trailing P/E with a warning
- Manual override possible in CSV

### "COFER data missing"
- IMF releases quarterly with 1-quarter lag
- Q2 2025 data available in September 2025
- Check IMF website for latest: [IMF COFER](https://data.imf.org/regular.aspx?key=41175)

### Master file corrupted
- Backup stored as `hcp_master_data_backup.json` after each update
- Can restore from backup if needed

---

## Quick Command Reference

```bash
# First time setup
python hcp_unified_collector_v4.2.2.py --initialize

# Monthly update
python hcp_unified_collector_v4.2.2.py --monthly

# Import manual data
python hcp_unified_collector_v4.2.2.py --import-csv [filename]

# Export for tracker
python hcp_unified_collector_v4.2.2.py --export-tracker

# Validate data quality
python hcp_unified_collector_v4.2.2.py --validate

# Show current status
python hcp_unified_collector_v4.2.2.py --status
```

---

## Monthly Checklist

- [ ] Download latest SWIFT RMB Tracker PDF
- [ ] Run `--monthly` command
- [ ] Review generated CSV
- [ ] Add any missing manual data
- [ ] Import CSV updates
- [ ] Export for tracker
- [ ] Verify data quality

---

## Notes

- **Data Persistence**: Master file preserves all historical data
- **No Estimates**: System only uses real data, never estimates
- **Audit Trail**: Logs show data sources and collection dates
- **Backup**: Automatic backup before each update
- **Time Required**: ~5 minutes monthly after initial setup