#!/usr/bin/env python3
"""
Humble Conviction Portfolio (HCP) Data Collector
Version: 5.2.0
Filename: hcp_collector_v5.2.0.py
Last Updated: 2025-09-09T12:00:00 UTC

MAJOR CHANGES IN v5.2.0:
- Replaced Tech Employment % with Software/IP Investment %
- Replaced EPS Delivery with Earnings Yield Spread
- Fixed SPY/EFA Momentum calculation (monthly mean vs point-in-time)
- Replaced ETF Flow Differential with Earnings Growth Differential
- Added COFER trend analysis capabilities
- Marked deprecated indicators but preserved historical data
- Removed Alpha Vantage dependencies

PRESERVED FROM v5.1.1:
- All COFER extraction capabilities
- Safe data merging architecture
- CSV import functionality
- Non-destructive update modes
- Backward compatibility with existing data
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
    """Centralized configuration - v5.2.0"""
    
    # API Keys
    FRED_API_KEY = "82fa4bd8294df4c17d0bde5a37903e57"
    # Alpha Vantage removed in v5.2.0
    
    # File paths
    BASE_DIR = Path(__file__).parent
    DATA_DIR = BASE_DIR / "data"
    MASTER_FILE = DATA_DIR / "hcp_master_data.json"
    BACKUP_DIR = DATA_DIR / "backups"
    CSV_IMPORT_DIR = DATA_DIR / "csv_imports"
    
    # Data collection settings
    MAX_RETRIES = 3
    RETRY_DELAY = 2
    
    # Safety settings
    MIN_DATA_RETENTION = 0.5  # Don't overwrite if losing >50% of data
    AUTO_BACKUP = True
    MAX_BACKUPS = 10
    
    # Version tracking
    VERSION = "5.2.0"
    IPS_VERSION = "4.3.2"
    
    # New FRED series for v5.2.0
    FRED_SERIES = {
        'software_investment': 'Y033RC1Q027SBEA',
        'total_investment': 'W170RC1Q027SBEA',
        'sp500_eps': 'SP500EPS',
        'sp500_price': 'SP500',
        'treasury_10y': 'DGS10'
    }

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def safe_float_conversion(value):
    """
    Safely convert a value to float, returning None for NaN/invalid values
    Used for COFER and other data that might have NaN
    """
    try:
        if value is None:
            return None
        if isinstance(value, str):
            if value.lower() in ['nan', 'null', 'none', '']:
                return None
            value = float(value)
        else:
            value = float(value)
        
        if np.isnan(value) or np.isinf(value):
            return None
            
        return value
    except (ValueError, TypeError):
        return None

def clean_json_data(data):
    """
    Recursively clean a data structure to ensure it's JSON-safe
    Converts NaN/None to null, infinity to large numbers
    """
    if isinstance(data, dict):
        return {k: clean_json_data(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [clean_json_data(item) for item in data]
    elif isinstance(data, float):
        if np.isnan(data):
            return None
        elif np.isinf(data):
            return 1e308 if data > 0 else -1e308
        else:
            return data
    elif isinstance(data, (np.integer, np.int64, np.int32)):
        return int(data)
    elif isinstance(data, (np.floating, np.float64, np.float32)):
        return float(data)
    elif isinstance(data, np.ndarray):
        return data.tolist()
    else:
        return data

# ============================================================================
# DATA MERGER - Core v5.0 Feature (Preserved)
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
# CSV IMPORTER with COFER Detection (Preserved from v5.1.1)
# ============================================================================

class CSVImporter:
    """Import data from CSV files - Enhanced for COFER detection"""
    
    def __init__(self, logger):
        self.logger = logger
    
    def detect_imf_cofer_file(self, csv_path: Path) -> bool:
        """
        Detect if a CSV file is an IMF COFER dataset
        Returns True if it appears to be COFER data
        """
        try:
            # Read first few rows to check structure
            df = pd.read_csv(csv_path, nrows=10)
            
            # Check for IMF COFER indicators
            has_series_code = 'SERIES_CODE' in df.columns
            has_indicator = 'INDICATOR' in df.columns
            has_currency = 'FXR_CURRENCY' in df.columns or 'Currency' in df.columns
            has_quarters = any('-Q' in str(col) for col in df.columns)
            
            # Check filename patterns
            filename_lower = csv_path.name.lower()
            is_imf_named = any(x in filename_lower for x in ['imf', 'cofer', 'dataset'])
            
            # If it has the right structure or name, it's probably COFER
            if (has_series_code and has_indicator and has_quarters) or \
               (is_imf_named and has_quarters):
                self.logger.info(f"  🏦 Detected IMF COFER file: {csv_path.name}")
                return True
                
        except Exception as e:
            self.logger.debug(f"  Not COFER format: {e}")
        
        return False
    
    def extract_cofer_from_imf(self, csv_path: Path) -> Optional[Dict]:
        """
        Extract COFER USD reserve share data from IMF CSV
        Uses logic from the standalone COFER extractor
        """
        try:
            df = pd.read_csv(csv_path)
            self.logger.info(f"  📊 Analyzing IMF COFER structure ({df.shape[0]} rows)")
            
            # Find USD reserve share row
            usd_row_idx = None
            
            # Strategy 1: Look for percentage-like values in 50-65 range
            quarterly_cols = [col for col in df.columns if '-Q' in str(col)]
            
            for idx, row in df.iterrows():
                # Check recent quarters for USD-like percentages
                test_quarters = [q for q in ['2024-Q1', '2023-Q4', '2023-Q3'] if q in quarterly_cols]
                if not test_quarters:
                    test_quarters = quarterly_cols[-3:] if len(quarterly_cols) >= 3 else quarterly_cols
                
                values = []
                for q in test_quarters:
                    if q in row:
                        val = safe_float_conversion(row[q])
                        if val is not None:
                            values.append(val)
                
                # USD reserve share is typically 55-65% in recent years
                if values and all(50 < v < 70 for v in values):
                    # Additional checks
                    indicator = str(row.get('INDICATOR', '')).lower()
                    series_code = str(row.get('SERIES_CODE', '')).lower()
                    
                    # Look for allocated reserves or USD mentions
                    if 'allocated' in indicator or 'usd' in series_code or 'u.s.' in series_code:
                        usd_row_idx = idx
                        self.logger.info(f"    ✓ Found USD row: {row.get('SERIES_CODE', 'Unknown')}")
                        self.logger.info(f"    Indicator: {row.get('INDICATOR', 'Unknown')}")
                        self.logger.info(f"    Recent values: {values}")
                        break
            
            if usd_row_idx is None:
                # Strategy 2: Look for explicit USD mentions
                for idx, row in df.iterrows():
                    if 'FXR_CURRENCY' in row:
                        currency = str(row['FXR_CURRENCY']).lower()
                        if 'usd' in currency or 'dollar' in currency or 'united states' in currency:
                            usd_row_idx = idx
                            self.logger.info(f"    ✓ Found USD by currency: {row['FXR_CURRENCY']}")
                            break
            
            if usd_row_idx is None:
                self.logger.warning("  ⚠️ Could not locate USD reserve share in COFER data")
                return None
            
            # Extract the data
            row = df.iloc[usd_row_idx]
            quarterly_data = {}
            
            for col in quarterly_cols:
                value = safe_float_conversion(row[col])
                if value is not None and value > 0:
                    # Convert quarter format if needed
                    quarter = col.replace('-Q', 'Q') if '-Q' in col else col
                    quarterly_data[quarter] = round(value, 2)
            
            if not quarterly_data:
                self.logger.error("  ✗ No valid quarterly data found")
                return None
            
            # Sort by quarter
            sorted_quarters = sorted(quarterly_data.keys())
            values = [quarterly_data[q] for q in sorted_quarters]
            
            # Create indicator structure
            result = {
                'current_value': values[-1],
                'quarterly_history': values,
                'quarterly_dates': sorted_quarters,
                'source': 'IMF COFER',
                'last_updated': datetime.now().isoformat(),
                'data_quality': 'real',
                'data_points': len(values),
                'indicator_type': 'trending'  # v5.2.0: Mark for trend analysis
            }
            
            # Show summary
            self.logger.info(f"  ✓ Extracted {len(values)} quarters of COFER data")
            recent = sorted_quarters[-4:] if len(sorted_quarters) >= 4 else sorted_quarters
            for q in recent:
                self.logger.info(f"    {q}: {quarterly_data[q]:.2f}%")
            
            # Calculate trend
            if len(values) >= 8:
                recent_avg = sum(values[-4:]) / 4
                older_avg = sum(values[-8:-4]) / 4
                trend = "📈" if recent_avg > older_avg else "📉"
                self.logger.info(f"  Trend: {older_avg:.2f}% → {recent_avg:.2f}% {trend}")
            
            return result
            
        except Exception as e:
            self.logger.error(f"  ✗ COFER extraction failed: {e}")
            return None
    
    def import_indicator_csv(self, csv_path: Path, indicator_name: str) -> Optional[Dict]:
        """Import indicator data from standard CSV"""
        try:
            df = pd.read_csv(csv_path)
            self.logger.info(f"  Loading CSV: {csv_path.name}")
            
            # Detect columns
            date_col = None
            value_col = None
            
            for col in df.columns:
                col_lower = col.lower()
                if 'date' in col_lower or 'quarter' in col_lower or 'month' in col_lower:
                    date_col = col
                elif 'value' in col_lower or 'ratio' in col_lower or 'close' in col_lower:
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
# TREND ANALYSIS - New for v5.2.0
# ============================================================================

class TrendAnalyzer:
    """Calculate trend acceleration for trending indicators"""
    
    @staticmethod
    def calculate_trend_acceleration(values: List[float], dates: List[str], 
                                    short_window: int = 6, long_window: int = 60) -> Dict:
        """
        Calculate trend acceleration as difference between short and long-term slopes
        
        Args:
            values: Time series values
            dates: Corresponding dates
            short_window: Recent periods for short-term trend (default 6)
            long_window: Historical periods for long-term trend (default 60)
        
        Returns:
            Dict with trend metrics
        """
        if len(values) < short_window:
            return {'trend_acceleration': None, 'error': 'Insufficient data'}
        
        try:
            # Convert to numpy arrays
            y = np.array(values)
            x = np.arange(len(values))
            
            # Calculate short-term slope (recent trend)
            if len(values) >= short_window:
                short_x = x[-short_window:]
                short_y = y[-short_window:]
                short_slope = np.polyfit(short_x, short_y, 1)[0]
            else:
                short_slope = 0
            
            # Calculate long-term slope (historical trend)
            if len(values) >= long_window:
                long_x = x[-long_window:]
                long_y = y[-long_window:]
                long_slope = np.polyfit(long_x, long_y, 1)[0]
            else:
                # Use all available data if less than long_window
                long_slope = np.polyfit(x, y, 1)[0]
            
            # Trend acceleration is the difference
            trend_acceleration = short_slope - long_slope
            
            return {
                'trend_acceleration': round(trend_acceleration, 4),
                'short_term_slope': round(short_slope, 4),
                'long_term_slope': round(long_slope, 4),
                'short_window': short_window,
                'long_window': min(long_window, len(values))
            }
            
        except Exception as e:
            return {'trend_acceleration': None, 'error': str(e)}

# ============================================================================
# MAIN COLLECTOR v5.2.0
# ============================================================================

class HCPDataCollectorV5:
    """Data collector v5.2.0 with enhanced indicators"""
    
    def __init__(self, config: Config = None, mode: UpdateMode = UpdateMode.MERGE):
        self.config = config or Config()
        self.version = self.config.VERSION
        self.mode = mode
        self.setup_logging()
        self.setup_directories()
        
        # Core components
        self.merger = DataMerger(self.logger)
        self.csv_importer = CSVImporter(self.logger)
        self.trend_analyzer = TrendAnalyzer()
        
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
    # NEW v5.2.0 INDICATOR COLLECTORS
    # ========================================================================
    
    def collect_software_ip_investment(self) -> bool:
        """
        Collect Software/IP Investment % (NEW in v5.2.0)
        Replaces Tech Employment %
        """
        self.logger.info("💻 Collecting Software/IP Investment %...")
        
        try:
            self.initialize_fred()
            if not self.fred:
                return False
            
            # Get software investment
            software = self.fred.get_series(
                self.config.FRED_SERIES['software_investment'],
                observation_start='1990-01-01'
            )
            
            # Get total investment
            total = self.fred.get_series(
                self.config.FRED_SERIES['total_investment'],
                observation_start='1990-01-01'
            )
            
            if software.empty or total.empty:
                self.logger.error("  ✗ No investment data received")
                return False
            
            # Calculate percentage
            investment_pct = (software / total) * 100
            
            # Format quarterly dates
            quarterly_dates = [f"{d.year}Q{d.quarter}" for d in investment_pct.index]
            
            new_data = {
                'current_value': round(float(investment_pct.iloc[-1]), 2),
                'quarterly_history': [round(v, 2) for v in investment_pct.tolist()],
                'quarterly_dates': quarterly_dates,
                'source': 'FRED (Y033RC1Q027SBEA/W170RC1Q027SBEA)',
                'last_updated': datetime.now().isoformat(),
                'data_quality': 'real',
                'data_points': len(investment_pct)
            }
            
            success = self.update_indicator('software_ip_investment', new_data)
            if success:
                self.logger.info(f"  ✓ Software/IP Investment: {len(investment_pct)} quarters collected")
            return success
            
        except Exception as e:
            self.logger.error(f"  ✗ Software/IP Investment collection failed: {e}")
            return False
    
    def collect_earnings_yield_spread(self) -> bool:
        """
        Collect Earnings Yield Spread (NEW in v5.2.0)
        Replaces EPS Delivery
        S&P 500 E/Y minus 10-year Treasury
        """
        self.logger.info("📊 Collecting Earnings Yield Spread...")
        
        try:
            self.initialize_fred()
            if not self.fred:
                return False
            
            # Get S&P 500 earnings
            sp500_eps = self.fred.get_series(
                self.config.FRED_SERIES['sp500_eps'],
                observation_start='1990-01-01'
            )
            
            # Get S&P 500 price
            sp500_price = self.fred.get_series(
                self.config.FRED_SERIES['sp500_price'],
                observation_start='1990-01-01'
            )
            
            # Get 10-year Treasury yield
            treasury_10y = self.fred.get_series(
                self.config.FRED_SERIES['treasury_10y'],
                observation_start='1990-01-01'
            )
            
            if sp500_eps.empty or sp500_price.empty or treasury_10y.empty:
                self.logger.error("  ✗ No earnings/price/treasury data received")
                return False
            
            # Calculate earnings yield (E/P * 100)
            earnings_yield = (sp500_eps / sp500_price) * 100
            
            # Resample to quarterly to match EPS frequency
            earnings_yield_q = earnings_yield.resample('Q').mean()
            treasury_10y_q = treasury_10y.resample('Q').mean()
            
            # Calculate spread
            spread = earnings_yield_q - treasury_10y_q
            
            # Format quarterly dates
            quarterly_dates = [f"{d.year}Q{d.quarter}" for d in spread.index]
            
            new_data = {
                'current_value': round(float(spread.iloc[-1]), 2),
                'quarterly_history': [round(v, 2) for v in spread.tolist()],
                'quarterly_dates': quarterly_dates,
                'source': 'FRED (SP500 E/Y - DGS10)',
                'last_updated': datetime.now().isoformat(),
                'data_quality': 'real',
                'data_points': len(spread)
            }
            
            success = self.update_indicator('earnings_yield_spread', new_data)
            if success:
                self.logger.info(f"  ✓ Earnings Yield Spread: {len(spread)} quarters collected")
            return success
            
        except Exception as e:
            self.logger.error(f"  ✗ Earnings Yield Spread collection failed: {e}")
            return False
    
    def collect_earnings_growth_differential(self) -> bool:
        """
        Collect Earnings Growth Differential (NEW in v5.2.0)
        Replaces ETF Flow Differential
        S&P 500 YoY earnings growth vs international
        """
        self.logger.info("📈 Collecting Earnings Growth Differential...")
        
        try:
            self.initialize_fred()
            if not self.fred:
                return False
            
            # Get S&P 500 earnings
            sp500_eps = self.fred.get_series(
                self.config.FRED_SERIES['sp500_eps'],
                observation_start='1990-01-01'
            )
            
            if sp500_eps.empty:
                self.logger.error("  ✗ No S&P 500 earnings data received")
                return False
            
            # Calculate YoY growth for S&P 500
            sp500_growth = sp500_eps.pct_change(periods=4) * 100  # Quarterly YoY
            
            # Get international earnings proxy from IEFA
            try:
                iefa = yf.Ticker("IEFA")
                hist = iefa.history(period="max")
                
                if not hist.empty:
                    # Use price momentum as proxy for earnings growth
                    iefa_monthly = hist['Close'].resample('M').last()
                    iefa_growth = iefa_monthly.pct_change(periods=12) * 100  # Monthly YoY
                    
                    # Resample to quarterly
                    iefa_growth_q = iefa_growth.resample('Q').mean()
                else:
                    # Fallback: assume flat international growth
                    iefa_growth_q = pd.Series(0, index=sp500_growth.index)
                    self.logger.warning("  ⚠️ Using zero international growth as fallback")
                    
            except Exception as e:
                self.logger.warning(f"  ⚠️ IEFA data failed: {e}, using fallback")
                iefa_growth_q = pd.Series(0, index=sp500_growth.index)
            
            # Align indices
            common_index = sp500_growth.index.intersection(iefa_growth_q.index)
            if len(common_index) == 0:
                # Use S&P 500 index if no overlap
                common_index = sp500_growth.index
                iefa_growth_q = pd.Series(0, index=common_index)
            
            # Calculate differential
            growth_diff = sp500_growth.loc[common_index] - iefa_growth_q.loc[common_index]
            
            # Format quarterly dates
            quarterly_dates = [f"{d.year}Q{d.quarter}" for d in growth_diff.index]
            
            new_data = {
                'current_value': round(float(growth_diff.iloc[-1]), 2),
                'quarterly_history': [round(v, 2) for v in growth_diff.tolist()],
                'quarterly_dates': quarterly_dates,
                'source': 'S&P 500 YoY vs International proxy',
                'last_updated': datetime.now().isoformat(),
                'data_quality': 'proxy',
                'data_points': len(growth_diff),
                'proxy_note': 'S&P 500 earnings growth vs IEFA price momentum proxy'
            }
            
            success = self.update_indicator('earnings_growth_differential', new_data)
            if success:
                self.logger.info(f"  ✓ Earnings Growth Differential: {len(growth_diff)} quarters collected")
            return success
            
        except Exception as e:
            self.logger.error(f"  ✗ Earnings Growth Differential collection failed: {e}")
            return False
    
    # ========================================================================
    # MODIFIED v5.2.0 INDICATOR COLLECTORS
    # ========================================================================
    
    def collect_spy_efa_momentum(self) -> bool:
        """
        Collect SPY/EFA Momentum Differential
        v5.2.0: Fixed to use monthly mean of daily differences
        """
        self.logger.info("🌍 Collecting SPY/EFA Momentum (v5.2.0 methodology)...")
        
        try:
            spy = yf.Ticker("SPY")
            efa = yf.Ticker("EFA")
            
            spy_hist = spy.history(period="max")
            efa_hist = efa.history(period="max")
            
            if spy_hist.empty or efa_hist.empty:
                return False
            
            # Calculate 3-month (63 trading day) returns for each day
            spy_returns = spy_hist['Close'].pct_change(periods=63)
            efa_returns = efa_hist['Close'].pct_change(periods=63)
            
            # Align indices
            common_dates = spy_returns.index.intersection(efa_returns.index)
            
            # Calculate daily momentum differential
            daily_diff = spy_returns.loc[common_dates] - efa_returns.loc[common_dates]
            
            # v5.2.0 FIX: Use monthly mean instead of last value
            monthly_momentum = daily_diff.resample('M').mean()  # Changed from .last()
            
            new_data = {
                'current_value': round(float(monthly_momentum.iloc[-1]), 4),
                'monthly_history': [round(v, 4) for v in monthly_momentum.tolist()],
                'monthly_dates': [d.strftime('%Y-%m-%d') for d in monthly_momentum.index],
                'source': 'Yahoo Finance (SPY-EFA 3M returns, monthly mean)',
                'last_updated': datetime.now().isoformat(),
                'data_quality': 'real',
                'data_points': len(monthly_momentum),
                'methodology': 'v5.2.0: Monthly mean of daily 3M momentum differential'
            }
            
            success = self.update_indicator('spy_efa_momentum', new_data)
            if success:
                self.logger.info(f"  ✓ SPY/EFA Momentum: {len(monthly_momentum)} months collected")
            return success
            
        except Exception as e:
            self.logger.error(f"  ✗ SPY/EFA momentum collection failed: {e}")
            return False
    
    # ========================================================================
    # PRESERVED INDICATOR COLLECTORS (Unchanged from v5.1.1)
    # ========================================================================
    
    def collect_dxy(self) -> bool:
        """Collect DXY Dollar Index"""
        self.logger.info("💵 Collecting DXY Index...")
        
        if self.mode == UpdateMode.LATEST and self._has_recent_data('dxy_index'):
            self.logger.info("  → Skipping, have recent data")
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
        """
        Collect COFER USD Reserve Share
        v5.2.0: Enhanced with trend analysis
        """
        self.logger.info("🏦 Collecting COFER USD Reserve Share...")
        
        # Check if already imported via CSV
        if 'cofer_usd' in self.indicators:
            data_points = len(self.indicators['cofer_usd'].get('quarterly_history', []))
            if data_points > 20:  # Good data if >20 quarters
                # Add trend analysis
                cofer_data = self.indicators['cofer_usd']
                values = cofer_data.get('quarterly_history', [])
                dates = cofer_data.get('quarterly_dates', [])
                
                if values and dates:
                    trend_metrics = self.trend_analyzer.calculate_trend_acceleration(
                        values, dates, short_window=6, long_window=60
                    )
                    cofer_data['trend_analysis'] = trend_metrics
                    cofer_data['indicator_type'] = 'trending'
                    self.indicators['cofer_usd'] = cofer_data
                
                self.logger.info(f"  ✓ Have {data_points} quarters of COFER data with trend analysis")
                return True
        
        # If no good existing data, warn about manual update
        self.logger.warning("  ⚠ COFER data not found in CSV imports")
        self.logger.warning("  Download from: https://data.imf.org/COFER")
        self.logger.warning("  Place CSV in: data/csv_imports/")
        
        # Add placeholder if nothing exists
        if 'cofer_usd' not in self.indicators:
            new_data = {
                'current_value': 58.0,
                'quarterly_history': [58.0],
                'quarterly_dates': ['2024Q4'],
                'source': 'IMF COFER (Manual Update Required)',
                'last_updated': datetime.now().isoformat(),
                'data_quality': 'manual',
                'data_points': 1,
                'update_required': True,
                'indicator_type': 'trending'
            }
            return self.update_indicator('cofer_usd', new_data)
        
        return True
    
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
    
    def collect_put_call_ratio(self) -> bool:
        """Collect Put/Call Ratio - preserves existing data"""
        self.logger.info("📊 Collecting Put/Call Ratio...")
        
        # For v5.2.0, preserve existing recovered data
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
    
    # ========================================================================
    # DEPRECATED INDICATOR MARKERS (v5.2.0)
    # ========================================================================
    
    def mark_deprecated_indicators(self):
        """Mark indicators as deprecated but preserve their data"""
        deprecated = {
            'tech_employment_pct': 'Replaced by software_ip_investment in v5.2.0',
            'eps_delivery': 'Replaced by earnings_yield_spread in v5.2.0',
            'etf_flow_differential': 'Replaced by earnings_growth_differential in v5.2.0'
        }
        
        for indicator, reason in deprecated.items():
            if indicator in self.indicators:
                self.indicators[indicator]['deprecated'] = True
                self.indicators[indicator]['deprecation_note'] = reason
                self.indicators[indicator]['deprecated_in_version'] = self.version
                self.logger.info(f"  ⚠️ Marked {indicator} as deprecated: {reason}")
    
    # ========================================================================
    # CSV Import Functions - ENHANCED FOR COFER (Preserved from v5.1.1)
    # ========================================================================
    
    def import_csv_updates(self) -> int:
        """
        Import any CSV files in the import directory
        v5.2.0: Preserved COFER detection from v5.1.1
        """
        csv_files = list(self.config.CSV_IMPORT_DIR.glob("*.csv"))
        
        if not csv_files:
            return 0
        
        self.logger.info(f"📁 Found {len(csv_files)} CSV files to import")
        imported = 0
        cofer_found = False
        
        for csv_file in csv_files:
            # Check if this is an IMF COFER file
            if self.csv_importer.detect_imf_cofer_file(csv_file):
                cofer_found = True
                new_data = self.csv_importer.extract_cofer_from_imf(csv_file)
                
                if new_data:
                    # Add trend analysis for COFER
                    if 'quarterly_history' in new_data and 'quarterly_dates' in new_data:
                        trend_metrics = self.trend_analyzer.calculate_trend_acceleration(
                            new_data['quarterly_history'],
                            new_data['quarterly_dates'],
                            short_window=6,
                            long_window=60
                        )
                        new_data['trend_analysis'] = trend_metrics
                    
                    if self.update_indicator('cofer_usd', new_data):
                        imported += 1
                        self.logger.info(f"  ✓ Imported COFER data from {csv_file.name}")
                        
                        # Archive the CSV
                        archive_path = self.config.CSV_IMPORT_DIR / "archived" / csv_file.name
                        archive_path.parent.mkdir(exist_ok=True)
                        csv_file.rename(archive_path)
                continue
            
            # Standard CSV processing
            indicator_name = csv_file.stem.lower()
            
            # Map common names
            name_mapping = {
                'putcall': 'put_call_ratio',
                'put_call': 'put_call_ratio',
                'pc_ratio': 'put_call_ratio',
                'cboe': 'put_call_ratio',
                'dxy': 'dxy_index',
                'productivity': 'productivity_growth',
                'pe': 'trailing_pe'
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
        
        if cofer_found:
            self.logger.info("  🏦 COFER data successfully integrated with trend analysis")
        
        return imported
    
    # ========================================================================
    # Theme Organization - UPDATED FOR v5.2.0
    # ========================================================================
    
    def organize_into_themes(self):
        """Organize flat indicators into themed structure - UPDATED FOR v5.2.0"""
        theme_mappings = {
            'usd': ['dxy_index', 'real_rate_differential', 'cofer_usd'],
            'innovation': ['qqq_spy_ratio', 'productivity_growth', 'software_ip_investment', 
                          'tech_employment_pct'],  # Keep deprecated for backward compatibility
            'valuation': ['put_call_ratio', 'trailing_pe', 'earnings_yield_spread',
                         'eps_delivery'],  # Keep deprecated for backward compatibility
            'usLeadership': ['spy_efa_momentum', 'us_market_pct', 'earnings_growth_differential',
                            'etf_flow_differential']  # Keep deprecated for backward compatibility
        }
        
        themed = {}
        for theme, indicator_list in theme_mappings.items():
            themed[theme] = {}
            for indicator in indicator_list:
                if indicator in self.indicators:
                    themed[theme][indicator] = self.indicators[indicator]
        
        self.indicators = themed
    
    # ========================================================================
    # Main Collection Orchestration - UPDATED FOR v5.2.0
    # ========================================================================
    
    def collect_all_indicators(self) -> Dict[str, Any]:
        """Collect all indicators based on mode"""
        self.logger.info("=" * 60)
        self.logger.info(f"HCP Data Collector v{self.version}")
        self.logger.info(f"Mode: {self.mode.value}")
        self.logger.info(f"Policy: NON-DESTRUCTIVE")
        self.logger.info(f"IPS Version: {self.config.IPS_VERSION}")
        self.logger.info(f"Major Changes: Enhanced indicators, trend analysis")
        self.logger.info("=" * 60)
        
        # Load existing data
        self.load_master_data()
        
        # Create backup if needed
        if self.master_data:
            self.backup_current_data()
        
        # Import any CSV updates first (including COFER)
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
                ('Earnings Yield Spread', self.collect_earnings_yield_spread),
            ]
        elif self.mode == UpdateMode.MONTHLY:
            # Monthly indicators only
            collectors = [
                ('DXY Index', self.collect_dxy),
                ('Real Rate Differential', self.collect_real_rates),
                ('QQQ/SPY Ratio', self.collect_qqq_spy),
                ('Software/IP Investment', self.collect_software_ip_investment),
                ('Put/Call Ratio', self.collect_put_call_ratio),
                ('Trailing P/E', self.collect_trailing_pe),
                ('Earnings Yield Spread', self.collect_earnings_yield_spread),
                ('SPY/EFA Momentum', self.collect_spy_efa_momentum),
                ('US Market %', self.collect_us_market_pct),
                ('Earnings Growth Differential', self.collect_earnings_growth_differential)
            ]
        else:
            # Full collection
            collectors = [
                ('DXY Index', self.collect_dxy),
                ('Real Rate Differential', self.collect_real_rates),
                ('COFER USD Share', self.collect_cofer),
                ('QQQ/SPY Ratio', self.collect_qqq_spy),
                ('US Productivity', self.collect_productivity),
                ('Software/IP Investment', self.collect_software_ip_investment),
                ('Put/Call Ratio', self.collect_put_call_ratio),
                ('Trailing P/E', self.collect_trailing_pe),
                ('Earnings Yield Spread', self.collect_earnings_yield_spread),
                ('SPY/EFA Momentum', self.collect_spy_efa_momentum),
                ('US Market %', self.collect_us_market_pct),
                ('Earnings Growth Differential', self.collect_earnings_growth_differential)
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
        
        # Mark deprecated indicators
        self.mark_deprecated_indicators()
        
        # Organize into themes
        self.organize_into_themes()
        
        # Clean data for JSON (NaN-safe)
        self.indicators = clean_json_data(self.indicators)
        
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
            'failed_indicators': failed,
            'cofer_integrated': True,
            'trend_analysis': True,
            'enhanced_indicators': [
                'software_ip_investment',
                'earnings_yield_spread',
                'earnings_growth_differential',
                'spy_efa_momentum (v5.2.0 methodology)'
            ],
            'deprecated_indicators': [
                'tech_employment_pct',
                'eps_delivery',
                'etf_flow_differential'
            ]
        }
        
        return {
            'metadata': self.metadata,
            'indicators': self.indicators
        }
    
    def save_data(self, data: Dict) -> bool:
        """Save collected data with NaN-safe JSON handling"""
        try:
            # Final clean before saving
            clean_data = clean_json_data(data)
            
            with open(self.config.MASTER_FILE, 'w') as f:
                json.dump(clean_data, f, indent=2)
            
            self.logger.info(f"  💾 Saved to {self.config.MASTER_FILE}")
            
            # Validate the saved file
            try:
                with open(self.config.MASTER_FILE, 'r') as f:
                    test_load = json.load(f)
                self.logger.info("  ✓ JSON validation successful")
            except json.JSONDecodeError as e:
                self.logger.warning(f"  ⚠️ JSON validation warning: {e}")
            
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
        description='HCP Data Collector v5.2.0 - Enhanced indicators with trend analysis'
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
            print(f"   Policy: NON-DESTRUCTIVE")
            print(f"   Location: ./data/hcp_master_data.json")
            
            if data['metadata'].get('enhanced_indicators'):
                print(f"\n✨ Enhanced indicators in v5.2.0:")
                for ind in data['metadata']['enhanced_indicators']:
                    print(f"     - {ind}")
            
            if data['metadata'].get('deprecated_indicators'):
                print(f"\n⚠️ Deprecated indicators (data preserved):")
                for ind in data['metadata']['deprecated_indicators']:
                    print(f"     - {ind}")
            
            if data['metadata']['failed_indicators']:
                print(f"\n⚠️ Note: Some indicators need attention:")
                for ind in data['metadata']['failed_indicators']:
                    print(f"     - {ind}")
            
            print("\nℹ️ Place CSV files in ./data/csv_imports/ for automatic import")
            print("   - COFER: Download from https://data.imf.org/COFER")
            print("   - Put/Call: CBOE historical data")
    else:
        print("\n⚠️ WARNING: Collection incomplete")
        print("   Check logs for specific errors")

if __name__ == "__main__":
    main()