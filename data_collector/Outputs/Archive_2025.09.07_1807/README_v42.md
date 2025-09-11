# HCP Data Collection System v4.2

## Clean Start - September 7, 2025

This directory has been cleaned and restructured to match IPS v4.2.

## Structure

- `hcp_master_data.json` - Master data file with all indicator configurations
- `hcp-collector-v4.2.5.py` - Data collection script
- `ips_v4.2.md` - Investment Policy Statement
- `Archive_pre_v42_*/` - Old files archived here

## Indicators (12 Total)

### USD Dominance
1. DXY Index (automated)
2. Real Rate Differential (automated)
3. IMF COFER USD Reserve % (manual quarterly)

### Innovation
4. QQQ/SPY Ratio (automated)
5. US Productivity Growth (automated)
6. Tech Employment % (automated)

### Valuation
7. Put/Call Ratio (automated)
8. Trailing P/E (automated)
9. EPS Delivery (automated)

### US Leadership
10. SPY/EFA Momentum (automated)
11. US Market % (automated)
12. ETF Flow Differential (automated)

## Usage

### Initial Setup
```bash
python hcp-collector-v4.2.5.py --initialize
```

### Monthly Update
```bash
python hcp-collector-v4.2.5.py --monthly
```

### Quarterly Manual Update
- Visit https://data.imf.org/COFER
- Download latest COFER data
- Update `historical_data.cofer_usd` in master file

## Key Changes from Previous Versions

- Removed yuan_swift, central_bank_gold, tech_employment raw count
- Replaced forward P/E with trailing P/E
- Replaced R&D/Revenue with Tech Employment %
- No calibrations or scaling factors - let GARCH handle normalization

## Data Quality Targets

- Minimum 10/12 indicators collected
- Minimum 6 indicators GARCH-ready (60+ months history)
- COFER updated quarterly
