#!/usr/bin/env python3
"""
EPS Alpha Vantage Data Fetcher
Version: 1.0
Filename: eps_alpha_vantage_fix_v1.0.py
Last Updated: 2025-09-08T22:30:00 UTC

PURPOSE: Aggressively fetch EPS data from Alpha Vantage with multiple retries
and better error handling to fix the -1.000 EPS Delivery issue.
"""

import json
import time
import requests
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("EPS_Fix")

class EPSAlphaVantageFetcher:
    """Dedicated Alpha Vantage EPS fetcher with robust error handling"""
    
    def __init__(self):
        self.api_key = "S0D46TD4M36JW9GC"  # Your existing key
        self.base_url = "https://www.alphavantage.co/query"
        self.symbols = ['SPY', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'JPM']
        self.master_file = Path("data/hcp_master_data.json")
        self.data = None
        
    def load_current_data(self):
        """Load current master data"""
        if self.master_file.exists():
            with open(self.master_file, 'r') as f:
                self.data = json.load(f)
                logger.info("Loaded current master data")
                return True
        return False
    
    def fetch_earnings_for_symbol(self, symbol):
        """Fetch earnings data for a single symbol with retries"""
        logger.info(f"Fetching {symbol} from Alpha Vantage...")
        
        max_retries = 3
        for attempt in range(max_retries):
            try:
                params = {
                    'function': 'EARNINGS',
                    'symbol': symbol,
                    'apikey': self.api_key
                }
                
                response = requests.get(self.base_url, params=params, timeout=30)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Check for rate limit message
                    if 'Note' in data:
                        logger.warning(f"  Rate limit hit, waiting 60 seconds...")
                        time.sleep(60)
                        continue
                    
                    if 'Error Message' in data:
                        logger.error(f"  API Error: {data['Error Message']}")
                        return {}
                    
                    if 'quarterlyEarnings' in data:
                        earnings = data['quarterlyEarnings']
                        logger.info(f"  ✓ Got {len(earnings)} quarters for {symbol}")
                        
                        # Process earnings
                        result = {}
                        for quarter in earnings[:80]:  # Limit to 20 years
                            try:
                                date_str = quarter.get('fiscalDateEnding')
                                reported = quarter.get('reportedEPS', 'None')
                                estimated = quarter.get('estimatedEPS', 'None')
                                surprise = quarter.get('surprise', 'None')
                                surprise_pct = quarter.get('surprisePercentage', 'None')
                                
                                # Try multiple ways to calculate delivery ratio
                                delivery = None
                                
                                # Method 1: Direct calculation
                                if reported != 'None' and estimated != 'None':
                                    try:
                                        rep_float = float(reported)
                                        est_float = float(estimated)
                                        if est_float != 0 and rep_float != 0:
                                            delivery = rep_float / est_float
                                    except:
                                        pass
                                
                                # Method 2: Use surprise percentage
                                if delivery is None and surprise_pct != 'None':
                                    try:
                                        surprise_val = float(surprise_pct)
                                        delivery = 1 + (surprise_val / 100)
                                    except:
                                        pass
                                
                                # Store if we got valid delivery
                                if delivery and 0.5 < delivery < 2.0:
                                    q_date = pd.to_datetime(date_str)
                                    q_key = f"{q_date.year}Q{q_date.quarter}"
                                    result[q_key] = delivery
                                    
                            except Exception as e:
                                logger.debug(f"    Skipping quarter: {e}")
                                continue
                        
                        return result
                    else:
                        logger.warning(f"  No quarterly earnings in response")
                        return {}
                        
                else:
                    logger.error(f"  HTTP {response.status_code}")
                    
            except requests.exceptions.Timeout:
                logger.warning(f"  Timeout on attempt {attempt + 1}")
            except Exception as e:
                logger.error(f"  Error on attempt {attempt + 1}: {e}")
            
            if attempt < max_retries - 1:
                time.sleep(5)
        
        return {}
    
    def fetch_all_eps_data(self):
        """Fetch EPS data from all symbols"""
        logger.info("=" * 60)
        logger.info("FETCHING EPS DATA FROM ALPHA VANTAGE")
        logger.info("=" * 60)
        
        all_quarters = {}
        successful_symbols = []
        
        for i, symbol in enumerate(self.symbols):
            # Rate limiting: 5 calls per minute for free tier
            if i > 0:
                wait_time = 15  # 15 seconds between calls to be safe
                logger.info(f"Waiting {wait_time} seconds (rate limit)...")
                time.sleep(wait_time)
            
            earnings = self.fetch_earnings_for_symbol(symbol)
            
            if earnings:
                successful_symbols.append(symbol)
                # Aggregate by quarter
                for quarter, delivery in earnings.items():
                    if quarter not in all_quarters:
                        all_quarters[quarter] = []
                    all_quarters[quarter].append(delivery)
            
            # Stop if we're getting rate limited too much
            if i >= 4 and not successful_symbols:
                logger.error("No successful fetches after 5 attempts, stopping")
                break
        
        logger.info(f"\nSuccessfully fetched: {successful_symbols}")
        logger.info(f"Total unique quarters: {len(all_quarters)}")
        
        return all_quarters
    
    def calculate_eps_delivery_series(self, quarters_data):
        """Calculate average EPS delivery by quarter"""
        if not quarters_data:
            return [], []
        
        # Sort quarters chronologically
        sorted_quarters = sorted(quarters_data.keys())
        
        dates = []
        values = []
        
        for quarter in sorted_quarters:
            if quarters_data[quarter]:  # Has data for this quarter
                avg_delivery = np.mean(quarters_data[quarter])
                dates.append(quarter)
                values.append(round(avg_delivery, 3))
        
        logger.info(f"Calculated {len(values)} quarters of EPS delivery")
        if values:
            logger.info(f"Range: {dates[0]} to {dates[-1]}")
            logger.info(f"Recent values: {values[-5:]}")
        
        return dates, values
    
    def update_master_file(self, dates, values):
        """Update master file with new EPS data"""
        if not self.data:
            logger.error("No master data loaded")
            return False
        
        if not values:
            logger.error("No EPS values to update")
            return False
        
        # Backup current
        backup_name = f"hcp_master_backup_eps_{datetime.now():%Y%m%d_%H%M%S}.json"
        backup_path = Path("data") / backup_name
        with open(backup_path, 'w') as f:
            json.dump(self.data, f, indent=2)
        logger.info(f"Created backup: {backup_name}")
        
        # Update EPS delivery
        self.data['indicators']['eps_delivery'] = {
            'current_value': values[-1],
            'quarterly_history': values,
            'quarterly_dates': dates,
            'source': 'Alpha Vantage (S&P 500 components)',
            'last_updated': datetime.now().isoformat(),
            'data_quality': 'real',
            'data_points': len(values),
            'calculation': 'Average delivery ratio across major stocks',
            'symbols_used': ', '.join(self.symbols[:5])  # List main symbols
        }
        
        # Save updated data
        with open(self.master_file, 'w') as f:
            json.dump(self.data, f, indent=2)
        
        logger.info(f"✅ Updated master file with {len(values)} quarters of EPS data")
        return True
    
    def validate_current_eps(self):
        """Check current EPS data quality"""
        if not self.data:
            return
        
        eps = self.data['indicators'].get('eps_delivery', {})
        current = eps.get('current_value', 'N/A')
        points = len(eps.get('quarterly_history', []))
        
        logger.info("\nCurrent EPS Status:")
        logger.info(f"  Current value: {current}")
        logger.info(f"  Data points: {points}")
        
        if current == -1.0 or current == -1.000:
            logger.error("  ⚠️ ERROR: Current value is -1.000 (calculation failure)")
        elif current < 0.5 or current > 2.0:
            logger.warning(f"  ⚠️ WARNING: Current value {current} seems unrealistic")
        else:
            logger.info(f"  ✓ Current value {current} is reasonable")
    
    def run(self):
        """Main execution"""
        logger.info("\n" + "=" * 60)
        logger.info("EPS DATA FIX - ALPHA VANTAGE")
        logger.info("=" * 60 + "\n")
        
        # Load current data
        if not self.load_current_data():
            logger.error("Could not load master data")
            return False
        
        # Check current status
        self.validate_current_eps()
        
        # Fetch new data
        quarters_data = self.fetch_all_eps_data()
        
        if not quarters_data:
            logger.error("\n❌ No data fetched from Alpha Vantage")
            logger.info("\nPossible issues:")
            logger.info("1. API key may be rate limited (wait 1 minute)")
            logger.info("2. API key may be invalid")
            logger.info("3. Network issues")
            logger.info("\nTry again in a few minutes.")
            return False
        
        # Calculate series
        dates, values = self.calculate_eps_delivery_series(quarters_data)
        
        if not values:
            logger.error("No valid EPS delivery values calculated")
            return False
        
        # Update master file
        if self.update_master_file(dates, values):
            logger.info("\n" + "=" * 60)
            logger.info("SUCCESS! EPS DATA FIXED")
            logger.info(f"Updated with {len(values)} quarters")
            logger.info(f"Current EPS Delivery: {values[-1]}")
            logger.info("=" * 60)
            return True
        
        return False

def main():
    """Run the EPS fix"""
    fetcher = EPSAlphaVantageFetcher()
    success = fetcher.run()
    
    if not success:
        logger.info("\n" + "=" * 60)
        logger.info("ALTERNATIVE: Create Manual CSV")
        logger.info("=" * 60)
        logger.info("\nIf Alpha Vantage continues to fail, create:")
        logger.info("  'sp500_eps_delivery.csv' with columns:")
        logger.info("  Quarter, Delivery_Ratio")
        logger.info("\nExample:")
        logger.info("  2024Q1, 1.082")
        logger.info("  2024Q2, 1.095")
        logger.info("\nSources for S&P 500 earnings beats:")
        logger.info("  - FactSet Earnings Insight (weekly PDF)")
        logger.info("  - Refinitiv I/B/E/S data")
        logger.info("  - earnings.com aggregates")

if __name__ == "__main__":
    main()
