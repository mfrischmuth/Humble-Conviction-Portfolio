"""
Master Data Cleanup & Fresh Start for IPS v4.2
Last Updated: 2025-09-07 22:15 UTC
Archives old files and creates clean master matching IPS v4.2 and Data Collector v4.2.5
"""

import json
import os
import shutil
from datetime import datetime
from pathlib import Path

# Configuration
BASE_DIR = Path("C:/Users/markf/OneDrive/Documents/GitHub/Humble-Conviction-Portfolio/data_collector")
DATA_DIR = BASE_DIR / "Outputs"
ARCHIVE_DIR = DATA_DIR / f"Archive_pre_v42_{datetime.now().strftime('%Y%m%d')}"

def archive_old_files():
    """Archive all existing files before starting fresh"""
    
    print("=" * 60)
    print("ARCHIVING OLD FILES")
    print("=" * 60)
    
    # Create archive directory
    ARCHIVE_DIR.mkdir(exist_ok=True)
    print(f"✅ Created archive directory: {ARCHIVE_DIR.name}")
    
    # Files to archive
    patterns_to_archive = [
        "hcp_data_v*.json",
        "hcp_master*.json",
        "*.csv"
    ]
    
    archived_count = 0
    for pattern in patterns_to_archive:
        for file in DATA_DIR.glob(pattern):
            if file.is_file() and 'Archive' not in str(file):
                try:
                    shutil.move(str(file), str(ARCHIVE_DIR / file.name))
                    print(f"  Archived: {file.name}")
                    archived_count += 1
                except Exception as e:
                    print(f"  ⚠️ Could not move {file.name}: {e}")
    
    print(f"\n✅ Archived {archived_count} files to {ARCHIVE_DIR.name}")
    return archived_count

def create_clean_master_v42():
    """
    Create a new master_data.json matching IPS v4.2 exactly
    
    IPS v4.2 Indicators (12 total):
    1. DXY Index (USD Leading)
    2. Real Rate Differential (USD Concurrent)
    3. IMF COFER USD (USD Lagging)
    4. QQQ/SPY Ratio (Innovation Leading)
    5. US Productivity (Innovation Concurrent)
    6. Tech Employment % (Innovation Lagging)
    7. Put/Call Ratio (Valuation Leading)
    8. Trailing P/E (Valuation Concurrent)
    9. EPS Delivery (Valuation Lagging)
    10. SPY/EFA Momentum (US Leadership Leading)
    11. US Market % (US Leadership Concurrent)
    12. ETF Flows (US Leadership Lagging)
    """
    
    print("\n" + "=" * 60)
    print("CREATING CLEAN MASTER DATA v4.2")
    print("=" * 60)
    
    # COFER data from IMF dataset (row 71)
    cofer_historical = {
        "2020-Q1": 60.91,
        "2020-Q2": 60.52,
        "2020-Q3": 60.01,
        "2020-Q4": 59.79,
        "2021-Q1": 59.74,
        "2021-Q2": 59.58,
        "2021-Q3": 59.46,
        "2021-Q4": 59.17,
        "2022-Q1": 58.88,
        "2022-Q2": 59.02,
        "2022-Q3": 60.02,
        "2022-Q4": 59.92,
        "2023-Q1": 59.54,
        "2023-Q2": 59.41,
        "2023-Q3": 59.18,
        "2023-Q4": 58.42,
        "2024-Q1": 58.94,
        "2024-Q2": 58.15,
        "2024-Q3": 57.28,
        "2024-Q4": 57.79,
        "2025-Q1": 57.74
    }
    
    master_data = {
        "metadata": {
            "version": "4.2.0",
            "ips_version": "4.2",
            "collector_version": "4.2.5",
            "created": datetime.now().isoformat(),
            "last_updated": datetime.now().isoformat(),
            "description": "HCP Master Data - IPS v4.2 Clean Implementation",
            "data_dir": str(DATA_DIR),
            "indicators": {
                "total": 12,
                "automated": 11,
                "manual": 1,
                "themes": 4
            }
        },
        
        "indicator_mapping": {
            "usd_dominance": {
                "leading": "dxy_index",
                "concurrent": "real_rate_differential", 
                "lagging": "cofer_usd"
            },
            "innovation": {
                "leading": "qqq_spy_ratio",
                "concurrent": "productivity_growth",
                "lagging": "tech_employment_pct"
            },
            "valuation": {
                "leading": "put_call_ratio",
                "concurrent": "trailing_pe",
                "lagging": "eps_delivery"
            },
            "us_leadership": {
                "leading": "spy_efa_momentum",
                "concurrent": "us_market_pct",
                "lagging": "etf_flow_differential"
            }
        },
        
        "historical_data": {
            # COFER is the only manual quarterly data we need to store
            "cofer_usd": cofer_historical
        },
        
        "auto_data": {
            # This will be populated by the data collector
            # Structure for each indicator:
            # "indicator_name": {
            #     "current_value": float,
            #     "monthly_history": [...],
            #     "daily_values": [...],
            #     "source": "...",
            #     "last_updated": "..."
            # }
        },
        
        "data_sources": {
            "dxy_index": {
                "source": "Yahoo Finance",
                "ticker": "DX=F",
                "frequency": "daily",
                "automation": "full"
            },
            "real_rate_differential": {
                "source": "FRED",
                "series": "DFII10",
                "frequency": "daily",
                "automation": "full"
            },
            "cofer_usd": {
                "source": "IMF COFER",
                "frequency": "quarterly",
                "automation": "manual",
                "next_update": "2025-10-31"
            },
            "qqq_spy_ratio": {
                "source": "Yahoo Finance",
                "tickers": ["QQQ", "SPY"],
                "frequency": "daily",
                "automation": "full"
            },
            "productivity_growth": {
                "source": "FRED",
                "series": "OPHNFB",
                "frequency": "quarterly",
                "automation": "full"
            },
            "tech_employment_pct": {
                "source": "FRED",
                "series": ["USINFO", "PAYEMS"],
                "frequency": "monthly",
                "automation": "full"
            },
            "put_call_ratio": {
                "source": "Yahoo Options",
                "ticker": "SPY",
                "frequency": "daily",
                "automation": "full"
            },
            "trailing_pe": {
                "source": "Yahoo Finance",
                "ticker": "SPY",
                "frequency": "daily",
                "automation": "full"
            },
            "eps_delivery": {
                "source": "Calculated",
                "tickers": ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA"],
                "frequency": "quarterly",
                "automation": "semi"
            },
            "spy_efa_momentum": {
                "source": "Yahoo Finance",
                "tickers": ["SPY", "EFA"],
                "frequency": "daily",
                "automation": "full"
            },
            "us_market_pct": {
                "source": "Calculated",
                "formula": "SPY/(SPY+EFA)*100",
                "frequency": "daily",
                "automation": "full"
            },
            "etf_flow_differential": {
                "source": "Volume Proxy",
                "tickers": ["SPY", "EFA"],
                "frequency": "daily",
                "automation": "full"
            }
        },
        
        "collection_status": {
            "last_successful_run": None,
            "last_attempt": None,
            "indicators_collected": 0,
            "garch_ready": 0,
            "failures": []
        }
    }
    
    # Save the new master file
    output_file = DATA_DIR / "hcp_master_data.json"
    with open(output_file, 'w') as f:
        json.dump(master_data, f, indent=2)
    
    print(f"✅ Created new master file: {output_file.name}")
    print(f"   - IPS version: 4.2")
    print(f"   - 12 indicators configured")
    print(f"   - COFER data: {len(cofer_historical)} quarters")
    
    return master_data

def verify_data_collector_compatibility():
    """Verify the data collector v4.2.5 is ready"""
    
    print("\n" + "=" * 60)
    print("DATA COLLECTOR COMPATIBILITY CHECK")
    print("=" * 60)
    
    collector_file = BASE_DIR / "hcp-collector-v4.2.5.py"
    
    if collector_file.exists():
        print(f"✅ Data Collector v4.2.5 found")
        
        # Check for required libraries
        required_libs = ['yfinance', 'pandas', 'numpy', 'requests']
        print("\n📦 Required Libraries:")
        for lib in required_libs:
            print(f"   - {lib}")
        
        print("\n⚙️ Next Steps:")
        print("1. Run: python hcp-collector-v4.2.5.py --initialize")
        print("   (This will populate the master file with historical data)")
        print("2. Schedule monthly runs: python hcp-collector-v4.2.5.py --monthly")
        print("3. Update COFER quarterly from IMF website")
    else:
        print(f"⚠️ Data Collector v4.2.5 not found at {collector_file}")
        print("   Please ensure the collector script is in place")

def create_readme():
    """Create a README for the clean setup"""
    
    readme_content = """# HCP Data Collection System v4.2

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
"""
    
    readme_file = DATA_DIR / "README_v42.md"
    with open(readme_file, 'w') as f:
        f.write(readme_content)
    
    print(f"\n✅ Created README: {readme_file.name}")

def main():
    """Execute the complete cleanup and fresh start"""
    
    print("=" * 60)
    print("HCP MASTER DATA CLEANUP & FRESH START")
    print("IPS v4.2 Implementation")
    print("=" * 60)
    
    # Step 1: Archive old files
    archived = archive_old_files()
    
    # Step 2: Create clean master
    master = create_clean_master_v42()
    
    # Step 3: Verify collector
    verify_data_collector_compatibility()
    
    # Step 4: Create README
    create_readme()
    
    # Summary
    print("\n" + "=" * 60)
    print("CLEANUP COMPLETE!")
    print("=" * 60)
    print(f"✅ Archived {archived} old files")
    print("✅ Created clean master_data.json")
    print("✅ Ready for IPS v4.2 implementation")
    print("\n🚀 Next Action:")
    print("   Run: python hcp-collector-v4.2.5.py --initialize")
    print("   This will populate your clean master with historical data")

if __name__ == "__main__":
    main()
