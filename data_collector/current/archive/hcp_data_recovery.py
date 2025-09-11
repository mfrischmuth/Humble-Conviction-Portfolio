#!/usr/bin/env python3
"""
HCP Data Recovery Script
Version: 1.0
Filename: hcp_data_recovery_v1.0.py
Last Updated: 2025-09-08T10:30:00 UTC

PURPOSE: Recover and merge Put/Call and EPS data without destructive overwrites
This is a band-aid fix until the main collector is properly refactored.
"""

import json
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
import shutil
import yfinance as yf
import time
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("HCP_Recovery")

class HCPDataRecovery:
    """Emergency data recovery and enhancement for HCP indicators"""
    
    def __init__(self):
        self.base_dir = Path(__file__).parent
        self.data_dir = self.base_dir / "data"
        self.historical_dir = self.base_dir.parent / "Historical Data"
        self.master_file = self.data_dir / "hcp_master_data.json"
        self.data = None
        
    def load_master_data(self):
        """Load current master data file"""
        if not self.master_file.exists():
            logger.error(f"Master file not found: {self.master_file}")
            return False
            
        with open(self.master_file, 'r') as f:
            self.data = json.load(f)
        logger.info(f"Loaded master data from {self.master_file}")
        return True
    
    def backup_current_data(self):
        """Create timestamped backup before any changes"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_name = f"hcp_master_data_backup_{timestamp}.json"
        backup_path = self.data_dir / backup_name
        
        shutil.copy(self.master_file, backup_path)
        logger.info(f"Created backup: {backup_name}")
        return backup_path
    
    def recover_put_call_ratio(self):
        """Recover Put/Call ratio from historical files and CSV"""
        logger.info("=" * 60)
        logger.info("RECOVERING PUT/CALL RATIO DATA")
        logger.info("=" * 60)
        
        all_dates = []
        all_values = []
        
        # Step 1: Try to load CBOE historical file (2006-2019)
        cboe_file = self.historical_dir / "CBOE 20062019_total_pc.csv"
        if cboe_file.exists():
            try:
                df = pd.read_csv(cboe_file)
                logger.info(f"Found historical CBOE file with {len(df)} rows")
                
                # Find columns flexibly
                date_col = None
                pc_col = None
                
                for col in df.columns:
                    if 'date' in col.lower():
                        date_col = col
                    if any(x in col.lower() for x in ['ratio', 'put/call', 'p/c', 'pc', 'put_call']):
                        pc_col = col
                
                if date_col and pc_col:
                    df['Date'] = pd.to_datetime(df[date_col])
                    df = df.sort_values('Date')
                    df.set_index('Date', inplace=True)
                    
                    # Resample to monthly
                    monthly = df[pc_col].resample('M').mean()
                    
                    for date, value in monthly.items():
                        if not pd.isna(value):
                            all_dates.append(date.strftime('%Y-%m-%d'))
                            all_values.append(round(float(value), 3))
                    
                    logger.info(f"  ✓ Loaded {len(monthly)} months from historical CBOE (2006-2019)")
            except Exception as e:
                logger.warning(f"  ⚠ Could not parse historical CBOE: {e}")
        else:
            logger.warning(f"  ⚠ Historical CBOE file not found")
        
        # Step 2: Load your manual monthly file (2020-2025)
        monthly_file = self.historical_dir / "cboe_monthly_2020_2025.csv"
        if monthly_file.exists():
            try:
                df = pd.read_csv(monthly_file)
                logger.info(f"Found manual monthly file with {len(df)} rows")
                
                # Process each row
                added_count = 0
                for _, row in df.iterrows():
                    try:
                        # Handle date - try multiple formats
                        date_val = row.get('Date', row.get('date', None))
                        if pd.notna(date_val):
                            date = pd.to_datetime(date_val)
                            date_str = date.strftime('%Y-%m-%d')
                            
                            # Get P/C value
                            pc_val = row.get('Put/Call Ratio', row.get('Ratio', row.get('P/C', None)))
                            if pd.notna(pc_val):
                                # Check if this date already exists
                                if date_str not in all_dates:
                                    all_dates.append(date_str)
                                    all_values.append(round(float(pc_val), 3))
                                    added_count += 1
                    except Exception as e:
                        logger.debug(f"Skipping row: {e}")
                
                logger.info(f"  ✓ Added {added_count} months from manual file (2020-2025)")
                
            except Exception as e:
                logger.error(f"  ✗ Could not parse manual monthly file: {e}")
        else:
            logger.error(f"  ✗ Manual monthly file not found at {monthly_file}")
        
        # Step 3: Sort by date
        if all_dates and all_values:
            # Create DataFrame for easier sorting
            df_combined = pd.DataFrame({'date': pd.to_datetime(all_dates), 'value': all_values})
            df_combined = df_combined.sort_values('date')
            
            all_dates = [d.strftime('%Y-%m-%d') for d in df_combined['date']]
            all_values = df_combined['value'].tolist()
        
        # Step 4: Try to get current value from Yahoo
        try:
            spy = yf.Ticker("SPY")
            if spy.options and len(spy.options) > 0:
                opt_chain = spy.option_chain(spy.options[0])
                
                total_call_oi = opt_chain.calls['openInterest'].sum()
                total_put_oi = opt_chain.puts['openInterest'].sum()
                
                if total_call_oi > 0:
                    pc_ratio = total_put_oi / total_call_oi
                    current_date = datetime.now().strftime('%Y-%m-%d')
                    
                    # Only add if it's a new month
                    if not all_dates or current_date[:7] > all_dates[-1][:7]:
                        all_dates.append(current_date)
                        all_values.append(round(pc_ratio, 3))
                        logger.info(f"  ✓ Added current P/C from Yahoo: {pc_ratio:.3f}")
        except Exception as e:
            logger.debug(f"  Could not get current from Yahoo: {e}")
        
        # Update the data structure
        if all_values:
            self.data['indicators']['put_call_ratio'] = {
                'current_value': all_values[-1],
                'monthly_history': all_values,
                'monthly_dates': all_dates,
                'source': 'CBOE Historical + Manual Updates + Yahoo',
                'last_updated': datetime.now().isoformat(),
                'data_quality': 'real',
                'data_points': len(all_values),
                'data_note': 'Recovered from multiple sources'
            }
            logger.info(f"  ✅ RECOVERED {len(all_values)} months of Put/Call data")
            logger.info(f"     Date range: {all_dates[0]} to {all_dates[-1]}")
        else:
            logger.error("  ✗ No Put/Call data recovered")
    
    def enhance_eps_delivery(self):
        """Enhance EPS delivery data - try to get more history"""
        logger.info("=" * 60)
        logger.info("ENHANCING EPS DELIVERY DATA")
        logger.info("=" * 60)
        
        # Get current EPS data
        current_eps = self.data['indicators'].get('eps_delivery', {})
        current_history = current_eps.get('quarterly_history', [])
        current_dates = current_eps.get('quarterly_dates', [])
        
        logger.info(f"Current EPS data: {len(current_history)} quarters")
        
        # Try to collect more data from Yahoo
        symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA']  # Added more for diversity
        quarterly_delivery = {}
        
        for symbol in symbols:
            logger.info(f"  Fetching {symbol} earnings...")
            try:
                stock = yf.Ticker(symbol)
                
                # Try to get earnings history
                if hasattr(stock, 'earnings_history'):
                    earnings = stock.earnings_history
                    if earnings is not None and not earnings.empty:
                        for _, row in earnings.iterrows():
                            try:
                                if 'epsActual' in row and 'epsEstimate' in row:
                                    actual = row['epsActual']
                                    estimate = row['epsEstimate']
                                    
                                    if estimate and actual and estimate != 0:
                                        delivery = actual / estimate
                                        
                                        # Sanity check
                                        if 0.5 < delivery < 2.0:
                                            # Get quarter
                                            date = pd.to_datetime(row.name)
                                            q_key = f"{date.year}Q{date.quarter}"
                                            
                                            if q_key not in quarterly_delivery:
                                                quarterly_delivery[q_key] = []
                                            quarterly_delivery[q_key].append(delivery)
                            except:
                                continue
                        
                        logger.info(f"    ✓ Got data from {symbol}")
                
                # Also try quarterly earnings
                if hasattr(stock, 'quarterly_earnings'):
                    q_earnings = stock.quarterly_earnings
                    if q_earnings is not None and not q_earnings.empty:
                        # Process if available
                        pass
                
                time.sleep(1)  # Be nice to Yahoo
                
            except Exception as e:
                logger.debug(f"    Could not get {symbol}: {e}")
        
        # Calculate averages for quarters we have data for
        if quarterly_delivery:
            sorted_quarters = sorted(quarterly_delivery.keys())
            
            # Merge with existing data
            for quarter in sorted_quarters:
                if quarter not in current_dates and quarterly_delivery[quarter]:
                    avg_delivery = np.mean(quarterly_delivery[quarter])
                    current_dates.append(quarter)
                    current_history.append(round(avg_delivery, 3))
            
            # Sort by date
            if current_dates and current_history:
                # Create temporary DataFrame for sorting
                df_temp = pd.DataFrame({'quarter': current_dates, 'value': current_history})
                df_temp = df_temp.drop_duplicates(subset=['quarter'])
                df_temp = df_temp.sort_values('quarter')
                
                final_dates = df_temp['quarter'].tolist()
                final_values = df_temp['value'].tolist()
                
                # Update data
                self.data['indicators']['eps_delivery'] = {
                    'current_value': final_values[-1] if final_values else 1.0,
                    'quarterly_history': final_values,
                    'quarterly_dates': final_dates,
                    'source': 'Yahoo Finance (Tech Leaders Average)',
                    'last_updated': datetime.now().isoformat(),
                    'data_quality': 'proxy',
                    'data_points': len(final_values),
                    'data_note': 'Tech sector proxy - broader data needed'
                }
                
                logger.info(f"  ✅ ENHANCED EPS data to {len(final_values)} quarters")
                logger.info(f"     Quarters: {final_dates[0] if final_dates else 'N/A'} to {final_dates[-1] if final_dates else 'N/A'}")
        else:
            logger.warning("  ⚠ Could not enhance EPS data - keeping existing")
    
    def validate_all_indicators(self):
        """Quick validation of all indicators"""
        logger.info("=" * 60)
        logger.info("VALIDATING ALL INDICATORS")
        logger.info("=" * 60)
        
        for indicator_name, indicator_data in self.data['indicators'].items():
            if isinstance(indicator_data, dict):
                history_field = None
                if 'monthly_history' in indicator_data:
                    history_field = 'monthly_history'
                elif 'quarterly_history' in indicator_data:
                    history_field = 'quarterly_history'
                
                if history_field:
                    points = len(indicator_data[history_field])
                    current = indicator_data.get('current_value', 'N/A')
                    logger.info(f"  {indicator_name:25} {points:4} points, current: {current}")
    
    def save_recovered_data(self):
        """Save the recovered data to master file"""
        with open(self.master_file, 'w') as f:
            json.dump(self.data, f, indent=2)
        logger.info(f"✅ Saved recovered data to {self.master_file}")
    
    def run_recovery(self):
        """Main recovery process"""
        logger.info("\n" + "=" * 60)
        logger.info("HCP DATA RECOVERY PROCESS")
        logger.info("=" * 60 + "\n")
        
        # Load current data
        if not self.load_master_data():
            return False
        
        # Create backup
        backup_path = self.backup_current_data()
        
        # Recover Put/Call ratio
        self.recover_put_call_ratio()
        
        # Enhance EPS delivery
        self.enhance_eps_delivery()
        
        # Validate all indicators
        self.validate_all_indicators()
        
        # Save recovered data
        self.save_recovered_data()
        
        logger.info("\n" + "=" * 60)
        logger.info("RECOVERY COMPLETE!")
        logger.info(f"Backup saved at: {backup_path}")
        logger.info("=" * 60)
        
        return True

def main():
    """Run the recovery process"""
    recovery = HCPDataRecovery()
    recovery.run_recovery()

if __name__ == "__main__":
    main()
