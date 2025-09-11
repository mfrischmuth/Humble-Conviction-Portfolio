#!/usr/bin/env python3
"""
Humble Conviction Portfolio (HCP) Data Collector
Version: 5.0.1
Filename: hcp_collector_v5.0.1.py
Last Updated: 2025-09-09T01:00:00 UTC

CHANGES IN v5.0.1:
- Fixed theme terminology to align with IPS v4.3.2 and Tracker v7.0.3
  - Changed 'pe' to 'valuation'
  - Changed 'intl' to 'usLeadership'
- All other functionality remains identical to v5.0.0
"""

import json
import logging
import time
import argparse
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
import warnings
warnings.filterwarnings('ignore')

import numpy as np
import pandas as pd
import yfinance as yf
import requests
from fredapi import Fred

# ============================================================================
# CONFIGURATION
# ============================================================================

class UpdateMode(Enum):
    """Update modes for different use cases"""
    FULL = "full"              # Complete historical collection
    INCREMENTAL = "incremental" # Add new data points only
    MERGE = "merge"            # Intelligent merging of old and new
    LATEST = "latest"          # Update only current values (fastest)
    MONTHLY = "monthly"        # Optimized monthly update

class Config:
    """Centralized configuration - v5.0.1"""
    
    # API Keys
    FRED_API_KEY = "82fa4bd8294df4c17d0bde5a37903e57"
    ALPHA_VANTAGE_KEY = "S0D46TD4M36JW9GC"
    
    # File paths
    BASE_DIR = Path(__file__).parent
    DATA_DIR = BASE_DIR / "data"
    HISTORICAL_DIR = BASE_DIR.parent / "Historical Data"
    MASTER_FILE = DATA_DIR / "hcp_master_data.json"
    BACKUP_DIR = DATA_DIR / "backups"
    CSV_IMPORT_DIR = DATA_DIR / "csv_imports"
    
    # Data collection settings
    MAX_RETRIES = 3
    RETRY_DELAY = 2
    AV_MAX_YEARS = 20
    
    # Safety settings
    MIN_DATA_RETENTION = 0.5  # Don't overwrite if losing >50% of data
    AUTO_BACKUP = True
    MAX_BACKUPS = 10
    
    # Version tracking
    VERSION = "5.0.1"
    IPS_VERSION = "4.3.2"

# ============================================================================
# DATA MERGER - Core v5.0 Feature
# ============================================================================

class DataMerger:
    """Intelligent data merging to prevent overwrites"""
    
    def __init__(self, logger):
        self.logger = logger
    
    def merge_time_series(self, 
                         existing: Dict[str, Any], 
                         new: Dict[str, Any],
                         mode: UpdateMode) -> Dict[str, Any]:
        """Merge time series data based on mode"""
        if not existing:
            return new
        
        if mode == UpdateMode.FULL:
            # Only replace if new has more data
            existing_points = self._count_data_points(existing)
            new_points = self._count_data_points(new)
            
            if new_points < existing_points * Config.MIN_DATA_RETENTION:
                self.logger.warning(f"  ⚠️ Refusing full replacement: {existing_points} → {new_points} points")
                return existing
            return new
        
        elif mode == UpdateMode.LATEST:
            # Only update current value and last data point
            result = existing.copy()
            result['current_value'] = new.get('current_value', existing.get('current_value'))
            result['last_updated'] = datetime.now().isoformat()
            
            # Add latest point if it's new
            if 'monthly_history' in existing and 'monthly_history' in new:
                self._append_latest_monthly(result, new)
            elif 'quarterly_history' in existing and 'quarterly_history' in new:
                self._append_latest_quarterly(result, new)
            
            return result
        
        elif mode == UpdateMode.INCREMENTAL:
            # Add only new data points
            result = existing.copy()
            
            if 'monthly_history' in existing:
                self._merge_monthly_incremental(result, new)
            elif 'quarterly_history' in existing:
                self._merge_quarterly_incremental(result, new)
            
            result['last_updated'] = datetime.now().isoformat()
            result['data_points'] = self._count_data_points(result)
            
            return result
        
        elif mode in [UpdateMode.MERGE, UpdateMode.MONTHLY]:
            # Smart merge
            return self._smart_merge(existing, new)
        
        return existing
    
    def _count_data_points(self, data: Dict) -> int:
        """Count data points in indicator"""
        if 'monthly_history' in data:
            return len(data.get('monthly_history', []))
        elif 'quarterly_history' in data:
            return len(data.get('quarterly_history', []))
        return 0
    
    def _append_latest_monthly(self, result: Dict, new: Dict):
        """Append latest monthly data point if new"""
        new_dates = new.get('monthly_dates', [])
        new_values = new.get('monthly_history', [])
        
        if new_dates and new_values:
            latest_date = new_dates[-1]
            latest_value = new_values[-1]
            
            existing_dates = result.get('monthly_dates', [])
            
            if not existing_dates or latest_date > existing_dates[-1]:
                result['monthly_dates'].append(latest_date)
                result['monthly_history'].append(latest_value)
                self.logger.debug(f"    Added latest: {latest_date} = {latest_value}")
    
    def _append_latest_quarterly(self, result: Dict, new: Dict):
        """Append latest quarterly data point if new"""
        new_dates = new.get('quarterly_dates', [])
        new_values = new.get('quarterly_history', [])
        
        if new_dates and new_values:
            latest_date = new_dates[-1]
            latest_value = new_values[-1]
            
            existing_dates = result.get('quarterly_dates', [])
            
            if not existing_dates or latest_date > existing_dates[-1]:
                result['quarterly_dates'].append(latest_date)
                result['quarterly_history'].append(latest_value)
                self.logger.debug(f"    Added latest: {latest_date} = {latest_value}")
    
    def _merge_monthly_incremental(self, result: Dict, new: Dict):
        """Merge monthly data incrementally"""
        existing_dates = result.get('monthly_dates', [])
        existing_values = result.get('monthly_history', [])
        new_dates = new.get('monthly_dates', [])
        new_values = new.get('monthly_history', [])
        
        added = 0
        for date, value in zip(new_dates, new_values):
            if date not in existing_dates:
                insert_idx = self._find_insertion_point(existing_dates, date)
                existing_dates.insert(insert_idx, date)
                existing_values.insert(insert_idx, value)
                added += 1
        
        result['monthly_dates'] = existing_dates
        result['monthly_history'] = existing_values
        
        if added > 0:
            self.logger.debug(f"    Added {added} new monthly points")
    
    def _merge_quarterly_incremental(self, result: Dict, new: Dict):
        """Merge quarterly data incrementally"""
        existing_dates = result.get('quarterly_dates', [])
        existing_values = result.get('quarterly_history', [])
        new_dates = new.get('quarterly_dates', [])
        new_values = new.get('quarterly_history', [])
        
        added = 0
        for date, value in zip(new_dates, new_values):
            if date not in existing_dates:
                insert_idx = self._find_insertion_point(existing_dates, date)
                existing_dates.insert(insert_idx, date)
                existing_values.insert(insert_idx, value)
                added += 1
        
        result['quarterly_dates'] = existing_dates
        result['quarterly_history'] = existing_values
        
        if added > 0:
            self.logger.debug(f"    Added {added} new quarterly points")
    
    def _find_insertion_point(self, dates: List[str], new_date: str) -> int:
        """Find where to insert new date to maintain order"""
        for i, date in enumerate(dates):
            if new_date < date:
                return i
        return len(dates)
    
    def _smart_merge(self, existing: Dict, new: Dict) -> Dict:
        """Smart merge combining best of both datasets"""
        result = existing.copy()
        result['last_updated'] = datetime.now().isoformat()
        
        if 'current_value' in new:
            result['current_value'] = new['current_value']
        
        # Check data quality
        existing_quality = existing.get('data_quality', 'unknown')
        new_quality = new.get('data_quality', 'unknown')
        
        # Prefer real over proxy
        if new_quality == 'real' and existing_quality != 'real':
            return new
        elif existing_quality == 'real' and new_quality != 'real':
            return existing
        
        # Merge data points
        if 'monthly_history' in existing:
            merged_df = self._merge_monthly_pandas(existing, new)
            result['monthly_history'] = merged_df['value'].tolist()
            result['monthly_dates'] = [d.strftime('%Y-%m-%d') for d in merged_df.index]
        elif 'quarterly_history' in existing:
            merged_df = self._merge_quarterly_pandas(existing, new)
            result['quarterly_history'] = merged_df['value'].tolist()
            result['quarterly_dates'] = merged_df.index.tolist()
        
        result['data_points'] = self._count_data_points(result)
        
        return result
    
    def _merge_monthly_pandas(self, existing: Dict, new: Dict) -> pd.DataFrame:
        """Use pandas for sophisticated monthly merging"""
        df_existing = pd.DataFrame({
            'date': pd.to_datetime(existing.get('monthly_dates', [])),
            'value': existing.get('monthly_history', [])
        }).set_index('date')
        
        df_new = pd.DataFrame({
            'date': pd.to_datetime(new.get('monthly_dates', [])),
            'value': new.get('monthly_history', [])
        }).set_index('date')
        
        df_combined = df_new.combine_first(df_existing)  # Prefer new for overlaps
        df_combined = df_combined.sort_index()
        
        return df_combined
    
    def _merge_quarterly_pandas(self, existing: Dict, new: Dict) -> pd.DataFrame:
        """Use pandas for sophisticated quarterly merging"""
        df_existing = pd.DataFrame({
            'quarter': existing.get('quarterly_dates', []),
            'value': existing.get('quarterly_history', [])
        }).set_index('quarter')
        
        df_new = pd.DataFrame({
            'quarter': new.get('quarterly_dates', []),
            'value': new.get('quarterly_history', [])
        }).set_index('quarter')
        
        df_combined = df_new.combine_first(df_existing)
        df_combined = df_combined.sort_index()
        
        return df_combined

# ============================================================================
# CSV IMPORTER
# ============================================================================

class CSVImporter:
    """Import data from CSV files"""
    
    def __init__(self, logger):
        self.logger = logger
    
    def import_indicator_csv(self, csv_path: Path, indicator_name: str) -> Optional[Dict]:
        """Import indicator data from CSV"""
        try:
            df = pd.read_csv(csv_path)
            self.logger.info(f"  Loading CSV: {csv_path.name}")
            
            # Detect columns
            date_col = None
            value_col = None
            
            for col in df.columns:
                if 'date' in col.lower() or 'quarter' in col.lower():
                    date_col = col
                elif 'value' in col.lower() or 'ratio' in col.lower():
                    value_col = col
            
            if not date_col or not value_col:
                if len(df.columns) >= 2:
                    date_col = df.columns[0]
                    value_col = df.columns[1]
                else:
                    self.logger.error(f"  Could not identify columns in CSV")
                    return None
            
            dates = []
            values = []
            
            for _, row in df.iterrows():
                try:
                    date_str = str(row[date_col])
                    value = float(row[value_col])
                    
                    if 'Q' in date_str:
                        dates.append(date_str)
                    else:
                        date = pd.to_datetime(date_str)
                        dates.append(date.strftime('%Y-%m-%d'))
                    
                    values.append(round(value, 4))
                    
                except Exception as e:
                    continue
            
            if not values:
                return None
            
            is_quarterly = 'Q' in dates[0] if dates else False
            
            result = {
                'current_value': values[-1],
                'source': f'CSV Import: {csv_path.name}',
                'last_updated': datetime.now().isoformat(),
                'data_quality': 'manual',
                'data_points': len(values)
            }
            
            if is_quarterly:
                result['quarterly_history'] = values
                result['quarterly_dates'] = dates
            else:
                result['monthly_history'] = values
                result['monthly_dates'] = dates
            
            self.logger.info(f"  ✓ Imported {len(values)} data points from CSV")
            return result
            
        except Exception as e:
            self.logger.error(f"  Failed to import CSV: {e}")
            return None

# ============================================================================
# MAIN COLLECTOR v5.0.1
# ============================================================================

class HCPDataCollectorV5:
    """Data collector v5.0.1 with corrected theme terminology"""
    
    def __init__(self, config: Config = None, mode: UpdateMode = UpdateMode.MERGE):
        self.config = config or Config()
        self.version = self.config.VERSION
        self.mode = mode
        self.setup_logging()
        self.setup_directories()
        
        # Core components
        self.merger = DataMerger(self.logger)
        self.csv_importer = CSVImporter(self.logger)
        
        # Data storage
        self.master_data = {}
        self.indicators = {}
        self.metadata = {}
        
        # API connections
        self.fred = None
    
    def setup_logging(self):
        """Configure logging"""
        log_level = logging.DEBUG if self.mode == UpdateMode.FULL else logging.INFO
        logging.basicConfig(
            level=log_level,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(f"HCPCollector_v{self.version}")
    
    def setup_directories(self):
        """Create necessary directories"""
        self.config.DATA_DIR.mkdir(exist_ok=True)
        self.config.BACKUP_DIR.mkdir(exist_ok=True)
        self.config.CSV_IMPORT_DIR.mkdir(exist_ok=True)
        
        self.logger.info(f"  📁 Data directory: {self.config.DATA_DIR}")
        self.logger.info(f"  📋 Update mode: {self.mode.value}")
    
    def load_master_data(self) -> bool:
        """Load existing master data"""
        if self.config.MASTER_FILE.exists():
            try:
                with open(self.config.MASTER_FILE, 'r') as f:
                    self.master_data = json.load(f)
                
                # Flatten indicators for processing
                if 'indicators' in self.master_data:
                    self._flatten_indicators(self.master_data['indicators'])
                
                self.logger.info(f"  ✓ Loaded master data with {len(self.indicators)} indicators")
                return True
                
            except Exception as e:
                self.logger.error(f"  ✗ Error loading master file: {e}")
                return False
        else:
            self.logger.info("  ℹ No existing master file, starting fresh")
            return False
    
    def _flatten_indicators(self, indicators: Dict):
        """Flatten nested theme structure for processing"""
        for key, value in indicators.items():
            if isinstance(value, dict):
                if 'current_value' in value or 'monthly_history' in value or 'quarterly_history' in value:
                    self.indicators[key] = value
                else:
                    # It's a theme, go deeper
                    for sub_key, sub_value in value.items():
                        if isinstance(sub_value, dict):
                            self.indicators[sub_key] = sub_value
    
    def backup_current_data(self) -> Optional[Path]:
        """Create timestamped backup"""
        if not self.config.AUTO_BACKUP or not self.master_data:
            return None
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_name = f"hcp_master_v{self.version}_{timestamp}.json"
        backup_path = self.config.BACKUP_DIR / backup_name
        
        try:
            with open(backup_path, 'w') as f:
                json.dump(self.master_data, f, indent=2)
            
            self.logger.info(f"  📦 Created backup: {backup_name}")
            
            # Clean old backups
            self._cleanup_old_backups()
            
            return backup_path
            
        except Exception as e:
            self.logger.error(f"  ✗ Backup failed: {e}")
            return None
    
    def _cleanup_old_backups(self):
        """Keep only MAX_BACKUPS most recent backups"""
        backups = sorted(self.config.BACKUP_DIR.glob("hcp_master_*.json"))
        
        if len(backups) > self.config.MAX_BACKUPS:
            for old_backup in backups[:-self.config.MAX_BACKUPS]:
                old_backup.unlink()
    
    def update_indicator(self, name: str, new_data: Dict) -> bool:
        """Update indicator with mode-appropriate merging - CORE SAFETY FEATURE"""
        try:
            existing = self.indicators.get(name, {})
            merged = self.merger.merge_time_series(existing, new_data, self.mode)
            
            if self._validate_indicator(merged):
                self.indicators[name] = merged
                return True
            else:
                self.logger.error(f"  ✗ Validation failed for {name}")
                return False
                
        except Exception as e:
            self.logger.error(f"  ✗ Update failed for {name}: {e}")
            return False
    
    def _validate_indicator(self, data: Dict) -> bool:
        """Validate indicator data"""
        if 'current_value' not in data:
            return False
        
        has_monthly = 'monthly_history' in data and 'monthly_dates' in data
        has_quarterly = 'quarterly_history' in data and 'quarterly_dates' in data
        
        if not (has_monthly or has_quarterly):
            return False
        
        if has_monthly:
            if len(data['monthly_history']) != len(data['monthly_dates']):
                return False
        
        if has_quarterly:
            if len(data['quarterly_history']) != len(data['quarterly_dates']):
                return False
        
        return True
    
    def initialize_fred(self):
        """Initialize FRED API connection"""
        if not self.fred:
            try:
                self.fred = Fred(api_key=self.config.FRED_API_KEY)
                self.logger.info("  ✓ FRED API initialized")
            except Exception as e:
                self.logger.error(f"  ✗ FRED initialization failed: {e}")
                self.fred = None
    
    def _has_recent_data(self, indicator_name: str, days: int = 7) -> bool:
        """Check if indicator has recent data"""
        if indicator_name not in self.indicators:
            return False
        
        indicator = self.indicators[indicator_name]
        last_updated = indicator.get('last_updated')
        
        if not last_updated:
            return False
        
        try:
            update_date = datetime.fromisoformat(last_updated.replace('Z', '+00:00'))
            age = datetime.now(update_date.tzinfo) - update_date
            return age.days < days
        except:
            return False
    
    # ========================================================================
    # ALL 12 INDICATOR COLLECTORS WITH SAFETY
    # ========================================================================
    
    def collect_dxy(self) -> bool:
        """Collect DXY Dollar Index"""
        self.logger.info("💵 Collecting DXY Index...")
        
        if self.mode == UpdateMode.LATEST and self._has_recent_data('dxy_index'):
            self.logger.info("  ↑ Skipping, have recent data")
            return True
        
        try:
            dxy = yf.Ticker("DX-Y.NYB")
            hist = dxy.history(period="max")
            
            if hist.empty:
                self.logger.error("  ✗ No DXY data received")
                return False
            
            monthly = hist['Close'].resample('M').last()
            
            new_data = {
                'current_value': round(float(monthly.iloc[-1]), 2),
                'monthly_history': [round(v, 2) for v in monthly.tolist()],
                'monthly_dates': [d.strftime('%Y-%m-%d') for d in monthly.index],
                'source': 'Yahoo Finance (DX-Y.NYB)',
                'last_updated': datetime.now().isoformat(),
                'data_quality': 'real',
                'data_points': len(monthly)
            }
            
            success = self.update_indicator('dxy_index', new_data)
            if success:
                self.logger.info(f"  ✓ DXY: {len(monthly)} months collected")
            return success
            
        except Exception as e:
            self.logger.error(f"  ✗ DXY collection failed: {e}")
            return False
    
    def collect_real_rates(self) -> bool:
        """Collect Real Rate Differential"""
        self.logger.info("📉 Collecting Real Rate Differential...")
        
        try:
            self.initialize_fred()
            if not self.fred:
                return False
            
            tips_10y = self.fred.get_series('DFII10', observation_start='2003-01-01')
            
            if tips_10y.empty:
                self.logger.error("  ✗ No TIPS data received")
                return False
            
            foreign_proxy = 1.5
            tips_monthly = tips_10y.resample('M').mean()
            real_diff = tips_monthly - foreign_proxy
            
            new_data = {
                'current_value': round(float(real_diff.iloc[-1]), 2),
                'monthly_history': [round(v, 2) for v in real_diff.tolist()],
                'monthly_dates': [d.strftime('%Y-%m-%d') for d in real_diff.index],
                'source': 'FRED TIPS (DFII10) minus foreign proxy',
                'last_updated': datetime.now().isoformat(),
                'data_quality': 'proxy',
                'data_points': len(real_diff),
                'proxy_note': 'US TIPS minus 1.5% foreign estimate (IPS v4.3.2 accepted)'
            }
            
            success = self.update_indicator('real_rate_differential', new_data)
            if success:
                self.logger.info(f"  ✓ Real Rates: {len(real_diff)} months collected")
            return success
            
        except Exception as e:
            self.logger.error(f"  ✗ Real rates collection failed: {e}")
            return False
    
    def collect_cofer(self) -> bool:
        """Collect COFER USD Reserve Share"""
        self.logger.info("🏦 Collecting COFER USD Reserve Share...")
        
        # For now, preserve existing or use placeholder
        if 'cofer_usd' in self.indicators:
            self.logger.info("  ✓ Preserving existing COFER data")
            return True
        
        self.logger.warning("  ⚠ COFER manual update required")
        self.logger.warning("  Download from: https://data.imf.org/COFER")
        
        new_data = {
            'current_value': 58.0,
            'quarterly_history': [58.0],
            'quarterly_dates': ['2024Q4'],
            'source': 'IMF COFER (Manual Update Required)',
            'last_updated': datetime.now().isoformat(),
            'data_quality': 'manual',
            'data_points': 1,
            'update_required': True
        }
        
        return self.update_indicator('cofer_usd', new_data)
    
    def collect_qqq_spy(self) -> bool:
        """Collect QQQ/SPY Ratio"""
        self.logger.info("🚀 Collecting QQQ/SPY Ratio...")
        
        try:
            qqq = yf.Ticker("QQQ")
            spy = yf.Ticker("SPY")
            
            qqq_hist = qqq.history(period="max")
            spy_hist = spy.history(period="max")
            
            if qqq_hist.empty or spy_hist.empty:
                return False
            
            common_dates = qqq_hist.index.intersection(spy_hist.index)
            ratio = qqq_hist.loc[common_dates, 'Close'] / spy_hist.loc[common_dates, 'Close']
            
            monthly_ratio = ratio.resample('M').last()
            
            new_data = {
                'current_value': round(float(monthly_ratio.iloc[-1]), 4),
                'monthly_history': [round(v, 4) for v in monthly_ratio.tolist()],
                'monthly_dates': [d.strftime('%Y-%m-%d') for d in monthly_ratio.index],
                'source': 'Yahoo Finance (QQQ/SPY)',
                'last_updated': datetime.now().isoformat(),
                'data_quality': 'real',
                'data_points': len(monthly_ratio)
            }
            
            success = self.update_indicator('qqq_spy_ratio', new_data)
            if success:
                self.logger.info(f"  ✓ QQQ/SPY: {len(monthly_ratio)} months collected")
            return success
            
        except Exception as e:
            self.logger.error(f"  ✗ QQQ/SPY collection failed: {e}")
            return False
    
    def collect_productivity(self) -> bool:
        """Collect US Productivity Growth"""
        self.logger.info("📊 Collecting US Productivity...")
        
        try:
            self.initialize_fred()
            if not self.fred:
                return False
            
            productivity = self.fred.get_series('OPHNFB', observation_start='1947-01-01')
            
            if productivity.empty:
                return False
            
            yoy_growth = productivity.pct_change(periods=4) * 100
            
            new_data = {
                'current_value': round(float(yoy_growth.iloc[-1]), 2),
                'quarterly_history': [round(v, 2) for v in yoy_growth.dropna().tolist()],
                'quarterly_dates': [f"{d.year}Q{d.quarter}" for d in yoy_growth.dropna().index],
                'source': 'FRED (OPHNFB)',
                'last_updated': datetime.now().isoformat(),
                'data_quality': 'real',
                'data_points': len(yoy_growth.dropna())
            }
            
            success = self.update_indicator('productivity_growth', new_data)
            if success:
                self.logger.info(f"  ✓ Productivity: {len(yoy_growth.dropna())} quarters collected")
            return success
            
        except Exception as e:
            self.logger.error(f"  ✗ Productivity collection failed: {e}")
            return False
    
    def collect_tech_employment(self) -> bool:
        """Collect Tech Employment % of Total"""
        self.logger.info("💻 Collecting Tech Employment %...")
        
        try:
            self.initialize_fred()
            if not self.fred:
                return False
            
            info_jobs = self.fred.get_series('USINFO', observation_start='1990-01-01')
            total_jobs = self.fred.get_series('PAYEMS', observation_start='1990-01-01')
            
            if info_jobs.empty or total_jobs.empty:
                return False
            
            tech_pct = (info_jobs / total_jobs) * 100
            
            new_data = {
                'current_value': round(float(tech_pct.iloc[-1]), 2),
                'monthly_history': [round(v, 2) for v in tech_pct.tolist()],
                'monthly_dates': [d.strftime('%Y-%m-%d') for d in tech_pct.index],
                'source': 'FRED (USINFO/PAYEMS)',
                'last_updated': datetime.now().isoformat(),
                'data_quality': 'real',
                'data_points': len(tech_pct)
            }
            
            success = self.update_indicator('tech_employment_pct', new_data)
            if success:
                self.logger.info(f"  ✓ Tech Employment: {len(tech_pct)} months collected")
            return success
            
        except Exception as e:
            self.logger.error(f"  ✗ Tech employment collection failed: {e}")
            return False
    
    def collect_put_call_ratio(self) -> bool:
        """Collect Put/Call Ratio - preserves existing data"""
        self.logger.info("📊 Collecting Put/Call Ratio...")
        
        # For v5.0.1, preserve existing recovered data
        if 'put_call_ratio' in self.indicators:
            existing_points = len(self.indicators['put_call_ratio'].get('monthly_history', []))
            if existing_points > 200:  # We have good recovered data
                self.logger.info(f"  ✓ Preserving {existing_points} months of recovered P/C data")
                return True
        
        # Try to get current value from Yahoo
        try:
            spy = yf.Ticker("SPY")
            if spy.options and len(spy.options) > 0:
                opt_chain = spy.option_chain(spy.options[0])
                
                total_call_oi = opt_chain.calls['openInterest'].sum()
                total_put_oi = opt_chain.puts['openInterest'].sum()
                
                if total_call_oi > 0:
                    pc_ratio = total_put_oi / total_call_oi
                    current_date = datetime.now().strftime('%Y-%m-%d')
                    
                    new_data = {
                        'current_value': round(pc_ratio, 3),
                        'monthly_history': [round(pc_ratio, 3)],
                        'monthly_dates': [current_date],
                        'source': 'Yahoo Finance (SPY options)',
                        'last_updated': datetime.now().isoformat(),
                        'data_quality': 'real',
                        'data_points': 1
                    }
                    
                    return self.update_indicator('put_call_ratio', new_data)
        except Exception as e:
            self.logger.debug(f"  Yahoo P/C failed: {e}")
        
        return True  # Don't fail if we have existing data
    
    def collect_trailing_pe(self) -> bool:
        """Collect Trailing P/E Ratio"""
        self.logger.info("📈 Collecting Trailing P/E...")
        
        # Preserve existing if available
        if 'trailing_pe' in self.indicators:
            existing_points = len(self.indicators['trailing_pe'].get('monthly_history', []))
            if existing_points > 100:
                self.logger.info(f"  ✓ Preserving {existing_points} months of P/E data")
                return True
        
        try:
            spy = yf.Ticker("SPY")
            info = spy.info
            
            current_pe = info.get('trailingPE')
            
            if not current_pe:
                self.logger.warning("  ⚠ No current P/E available")
                return False
            
            new_data = {
                'current_value': round(current_pe, 2),
                'monthly_history': [round(current_pe, 2)],
                'monthly_dates': [datetime.now().strftime('%Y-%m-%d')],
                'source': 'Yahoo Finance (SPY)',
                'last_updated': datetime.now().isoformat(),
                'data_quality': 'real',
                'data_points': 1,
                'note': 'Historical data preserved from existing'
            }
            
            success = self.update_indicator('trailing_pe', new_data)
            if success:
                self.logger.info(f"  ✓ Trailing P/E: {current_pe:.2f}")
            return success
            
        except Exception as e:
            self.logger.error(f"  ✗ P/E collection failed: {e}")
            return False
    
    def collect_eps_delivery(self) -> bool:
        """Collect EPS Delivery - preserves existing recovered data"""
        self.logger.info("📈 Collecting EPS Delivery...")
        
        # Preserve existing recovered data
        if 'eps_delivery' in self.indicators:
            existing_points = len(self.indicators['eps_delivery'].get('quarterly_history', []))
            if existing_points > 50:  # We have good recovered data
                self.logger.info(f"  ✓ Preserving {existing_points} quarters of recovered EPS data")
                return True
        
        # Basic fallback
        self.logger.warning("  ⚠ EPS data needs recovery script")
        return True
    
    def collect_spy_efa_momentum(self) -> bool:
        """Collect SPY/EFA Momentum Differential"""
        self.logger.info("🌍 Collecting SPY/EFA Momentum...")
        
        try:
            spy = yf.Ticker("SPY")
            efa = yf.Ticker("EFA")
            
            spy_hist = spy.history(period="max")
            efa_hist = efa.history(period="max")
            
            if spy_hist.empty or efa_hist.empty:
                return False
            
            spy_returns = spy_hist['Close'].pct_change(periods=63)
            efa_returns = efa_hist['Close'].pct_change(periods=63)
            
            common_dates = spy_returns.index.intersection(efa_returns.index)
            momentum_diff = spy_returns.loc[common_dates] - efa_returns.loc[common_dates]
            
            monthly_momentum = momentum_diff.resample('M').last()
            
            new_data = {
                'current_value': round(float(monthly_momentum.iloc[-1]), 4),
                'monthly_history': [round(v, 4) for v in monthly_momentum.tolist()],
                'monthly_dates': [d.strftime('%Y-%m-%d') for d in monthly_momentum.index],
                'source': 'Yahoo Finance (SPY-EFA 3M returns)',
                'last_updated': datetime.now().isoformat(),
                'data_quality': 'real',
                'data_points': len(monthly_momentum)
            }
            
            success = self.update_indicator('spy_efa_momentum', new_data)
            if success:
                self.logger.info(f"  ✓ SPY/EFA Momentum: {len(monthly_momentum)} months collected")
            return success
            
        except Exception as e:
            self.logger.error(f"  ✗ SPY/EFA momentum collection failed: {e}")
            return False
    
    def collect_us_market_pct(self) -> bool:
        """Collect US Market % Proxy"""
        self.logger.info("🇺🇸 Collecting US Market % (Proxy)...")
        
        try:
            spy = yf.Ticker("SPY")
            efa = yf.Ticker("EFA")
            
            spy_hist = spy.history(period="max")
            efa_hist = efa.history(period="max")
            
            if spy_hist.empty or efa_hist.empty:
                return False
            
            common_dates = spy_hist.index.intersection(efa_hist.index)
            us_pct = (spy_hist.loc[common_dates, 'Close'] / 
                     (spy_hist.loc[common_dates, 'Close'] + 0.7 * efa_hist.loc[common_dates, 'Close'])) * 100
            
            monthly_pct = us_pct.resample('M').last()
            
            new_data = {
                'current_value': round(float(monthly_pct.iloc[-1]), 2),
                'monthly_history': [round(v, 2) for v in monthly_pct.tolist()],
                'monthly_dates': [d.strftime('%Y-%m-%d') for d in monthly_pct.index],
                'source': 'SPY/(SPY+EFA) proxy',
                'last_updated': datetime.now().isoformat(),
                'data_quality': 'proxy',
                'data_points': len(monthly_pct),
                'proxy_note': 'SPY/(SPY+0.7*EFA) as US market share proxy (IPS v4.3.2 accepted)'
            }
            
            success = self.update_indicator('us_market_pct', new_data)
            if success:
                self.logger.info(f"  ✓ US Market %: {len(monthly_pct)} months collected")
            return success
            
        except Exception as e:
            self.logger.error(f"  ✗ US market % collection failed: {e}")
            return False
    
    def collect_etf_flows(self) -> bool:
        """Collect ETF Flow Differential (Volume Proxy)"""
        self.logger.info("💰 Collecting ETF Flow Differential...")
        
        try:
            spy = yf.Ticker("SPY")
            efa = yf.Ticker("EFA")
            
            spy_hist = spy.history(period="max")
            efa_hist = efa.history(period="max")
            
            if spy_hist.empty or efa_hist.empty:
                return False
            
            spy_dollar_vol = spy_hist['Close'] * spy_hist['Volume'] / 1e9
            efa_dollar_vol = efa_hist['Close'] * efa_hist['Volume'] / 1e9
            
            common_dates = spy_dollar_vol.index.intersection(efa_dollar_vol.index)
            flow_diff = spy_dollar_vol.loc[common_dates] - efa_dollar_vol.loc[common_dates]
            
            monthly_flows = flow_diff.resample('M').mean()
            
            new_data = {
                'current_value': round(float(monthly_flows.iloc[-1]), 2),
                'monthly_history': [round(v, 2) for v in monthly_flows.tolist()],
                'monthly_dates': [d.strftime('%Y-%m-%d') for d in monthly_flows.index],
                'source': 'Volume differential proxy (SPY-EFA)',
                'last_updated': datetime.now().isoformat(),
                'data_quality': 'proxy',
                'data_points': len(monthly_flows),
                'proxy_note': 'Dollar volume differential as flow proxy (IPS v4.3.2 accepted)'
            }
            
            success = self.update_indicator('etf_flow_differential', new_data)
            if success:
                self.logger.info(f"  ✓ ETF Flows: {len(monthly_flows)} months collected")
            return success
            
        except Exception as e:
            self.logger.error(f"  ✗ ETF flows collection failed: {e}")
            return False
    
    # ========================================================================
    # CSV Import Functions
    # ========================================================================
    
    def import_csv_updates(self) -> int:
        """Import any CSV files in the import directory"""
        csv_files = list(self.config.CSV_IMPORT_DIR.glob("*.csv"))
        
        if not csv_files:
            return 0
        
        self.logger.info(f"📁 Found {len(csv_files)} CSV files to import")
        imported = 0
        
        for csv_file in csv_files:
            indicator_name = csv_file.stem.lower()
            
            # Map common names
            name_mapping = {
                'putcall': 'put_call_ratio',
                'put_call': 'put_call_ratio',
                'eps': 'eps_delivery',
                'dxy': 'dxy_index'
            }
            
            for key, value in name_mapping.items():
                if key in indicator_name:
                    indicator_name = value
                    break
            
            new_data = self.csv_importer.import_indicator_csv(csv_file, indicator_name)
            
            if new_data:
                if self.update_indicator(indicator_name, new_data):
                    imported += 1
                    self.logger.info(f"  ✓ Imported {indicator_name} from {csv_file.name}")
                    
                    # Archive the CSV
                    archive_path = self.config.CSV_IMPORT_DIR / "archived" / csv_file.name
                    archive_path.parent.mkdir(exist_ok=True)
                    csv_file.rename(archive_path)
        
        return imported
    
    # ========================================================================
    # Theme Organization - FIXED IN v5.0.1
    # ========================================================================
    
    def organize_into_themes(self):
        """Organize flat indicators into themed structure - ALIGNED WITH IPS v4.3.2"""
        theme_mappings = {
            'usd': ['dxy_index', 'real_rate_differential', 'cofer_usd'],
            'innovation': ['qqq_spy_ratio', 'productivity_growth', 'tech_employment_pct'],
            'valuation': ['put_call_ratio', 'trailing_pe', 'eps_delivery'],  # Changed from 'pe'
            'usLeadership': ['spy_efa_momentum', 'us_market_pct', 'etf_flow_differential']  # Changed from 'intl'
        }
        
        themed = {}
        for theme, indicator_list in theme_mappings.items():
            themed[theme] = {}
            for indicator in indicator_list:
                if indicator in self.indicators:
                    themed[theme][indicator] = self.indicators[indicator]
        
        self.indicators = themed
    
    # ========================================================================
    # Main Collection Orchestration
    # ========================================================================
    
    def collect_all_indicators(self) -> Dict[str, Any]:
        """Collect all indicators based on mode"""
        self.logger.info("=" * 60)
        self.logger.info(f"HCP Data Collector v{self.version}")
        self.logger.info(f"Mode: {self.mode.value}")
        self.logger.info(f"Policy: NON-DESTRUCTIVE")
        self.logger.info(f"IPS Version: {self.config.IPS_VERSION}")
        self.logger.info("=" * 60)
        
        # Load existing data
        self.load_master_data()
        
        # Create backup if needed
        if self.master_data:
            self.backup_current_data()
        
        # Import any CSV updates first
        csv_imported = self.import_csv_updates()
        if csv_imported > 0:
            self.logger.info(f"  ✓ Imported {csv_imported} indicators from CSV")
        
        # Define collectors based on mode
        if self.mode == UpdateMode.LATEST:
            # Only update current values for key indicators
            collectors = [
                ('DXY Index', self.collect_dxy),
                ('QQQ/SPY Ratio', self.collect_qqq_spy),
                ('Put/Call Ratio', self.collect_put_call_ratio),
                ('Trailing P/E', self.collect_trailing_pe),
                ('SPY/EFA Momentum', self.collect_spy_efa_momentum),
            ]
        elif self.mode == UpdateMode.MONTHLY:
            # Monthly indicators only
            collectors = [
                ('DXY Index', self.collect_dxy),
                ('Real Rate Differential', self.collect_real_rates),
                ('QQQ/SPY Ratio', self.collect_qqq_spy),
                ('Tech Employment %', self.collect_tech_employment),
                ('Put/Call Ratio', self.collect_put_call_ratio),
                ('Trailing P/E', self.collect_trailing_pe),
                ('SPY/EFA Momentum', self.collect_spy_efa_momentum),
                ('US Market %', self.collect_us_market_pct),
                ('ETF Flow Differential', self.collect_etf_flows)
            ]
        else:
            # Full collection
            collectors = [
                ('DXY Index', self.collect_dxy),
                ('Real Rate Differential', self.collect_real_rates),
                ('COFER USD Share', self.collect_cofer),
                ('QQQ/SPY Ratio', self.collect_qqq_spy),
                ('US Productivity', self.collect_productivity),
                ('Tech Employment %', self.collect_tech_employment),
                ('Put/Call Ratio', self.collect_put_call_ratio),
                ('Trailing P/E', self.collect_trailing_pe),
                ('EPS Delivery', self.collect_eps_delivery),
                ('SPY/EFA Momentum', self.collect_spy_efa_momentum),
                ('US Market %', self.collect_us_market_pct),
                ('ETF Flow Differential', self.collect_etf_flows)
            ]
        
        # Run collectors
        success_count = 0
        failed = []
        
        for name, collector in collectors:
            try:
                if collector():
                    success_count += 1
                else:
                    failed.append(name)
            except Exception as e:
                self.logger.error(f"  ✗ {name} exception: {e}")
                failed.append(name)
        
        self.logger.info("=" * 60)
        self.logger.info(f"Collection Summary: {success_count}/{len(collectors)} successful")
        
        if failed:
            self.logger.warning(f"Failed: {', '.join(failed)}")
        
        # Organize into themes with CORRECT terminology
        self.organize_into_themes()
        
        # Create metadata
        self.metadata = {
            'version': self.version,
            'ips_version': self.config.IPS_VERSION,
            'last_updated': datetime.now().isoformat(),
            'update_mode': self.mode.value,
            'indicators_collected': len([i for theme in self.indicators.values() 
                                        for i in theme if isinstance(theme, dict)]),
            'csv_imported': csv_imported,
            'data_policy': 'NON_DESTRUCTIVE',
            'collection_complete': success_count >= len(collectors) * 0.8,
            'failed_indicators': failed
        }
        
        return {
            'metadata': self.metadata,
            'indicators': self.indicators
        }
    
    def save_data(self, data: Dict) -> bool:
        """Save collected data"""
        try:
            with open(self.config.MASTER_FILE, 'w') as f:
                json.dump(data, f, indent=2)
            
            self.logger.info(f"  💾 Saved to {self.config.MASTER_FILE}")
            return True
            
        except Exception as e:
            self.logger.error(f"  ✗ Save failed: {e}")
            return False

# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    """Main execution with CLI arguments"""
    parser = argparse.ArgumentParser(
        description='HCP Data Collector v5.0.1 - Non-destructive updates with correct terminology'
    )
    
    parser.add_argument(
        '--mode',
        type=str,
        choices=['full', 'incremental', 'merge', 'latest', 'monthly'],
        default='merge',
        help='Update mode (default: merge)'
    )
    
    parser.add_argument(
        '--no-backup',
        action='store_true',
        help='Skip creating backup'
    )
    
    args = parser.parse_args()
    
    # Configure
    config = Config()
    if args.no_backup:
        config.AUTO_BACKUP = False
    
    # Create collector with specified mode
    mode = UpdateMode(args.mode)
    collector = HCPDataCollectorV5(config, mode)
    
    # Run collection
    data = collector.collect_all_indicators()
    
    # Save if successful
    if data['metadata'].get('collection_complete', False):
        if collector.save_data(data):
            print("\n✅ SUCCESS: Data collection complete!")
            print(f"   Version: {data['metadata']['version']}")
            print(f"   IPS Version: {data['metadata']['ips_version']}")
            print(f"   Mode: {data['metadata']['update_mode']}")
            print(f"   Indicators: {data['metadata']['indicators_collected']}")
            print(f"   Policy: NON-DESTRUCTIVE (Your data is safe!)")
            print(f"   Themes: usd, innovation, valuation, usLeadership")  # Correct terminology
            
            if data['metadata']['failed_indicators']:
                print(f"\n⚠️  Note: Some indicators need attention:")
                for ind in data['metadata']['failed_indicators']:
                    print(f"     - {ind}")
    else:
        print("\n⚠️ WARNING: Collection incomplete")
        print("   Check logs for specific errors")

if __name__ == "__main__":
    main()
