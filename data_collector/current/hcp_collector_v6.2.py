"""
Humble Conviction Portfolio (HCP) Data Collector
Version: 6.2.1
Filename: hcp_collector_v6.2.1.py
Last Updated: 2025-09-10T21:00:00 UTC

CHANGES IN v6.2.1:
- Fixed field name: treasury_foreign_demand → tic_foreign_demand (IPS v4.4 compliance)
- Enhanced P/E collector to directly import from CSV when available
- Added debug logging for P/E data import verification
- Improved handling of pre-calculated deviation values

CHANGES IN v6.2.0:
- Simplified P/E collector for CSV-based workflow
- Removed unnecessary Yahoo API calls when CSV data exists
- Fixed P/E transformation to properly use CSV deviation values
- Achieving 100% indicator collection with transformations

CHANGES IN v6.1.0:
- Fixed Put/Call ratio CSV merging to combine multiple CBOE files
- Fixed Trailing P/E transformation to apply to existing CSV data
- Both indicators now properly process and transform data

MAJOR FEATURES FROM v6.0.0:
- Implemented all IPS v4.4 signal transformations
- DXY: Added 3-month rate of change transformation
- TIC Foreign Demand: Replaced real rate differential with TIC flows
- Productivity: Added 2-quarter moving average
- P/E: Added deviation from 3-month average (percentage)
- SPY/EFA: Completed monthly mean implementation
- Dual storage: Maintains both raw and transformed values
- 15-year rolling percentile rankings where applicable

TRANSFORMATION SUMMARY:
1. DXY Index → 3-Month Rate of Change
2. Real Rate Differential → TIC Foreign Demand Index (3-month MA of flows)
3. Productivity Growth → 2-Quarter Moving Average
4. Trailing P/E → % Deviation from 3-Month Average
5. SPY/EFA Momentum → Monthly Mean (already in v5.2.0)

PRESERVED FEATURES:
- All existing indicators continue to work
- CSV import functionality
- COFER extraction capabilities
- Non-destructive update modes
- CAPE Rate of Change from v5.5.0
- Total Return Differential from v5.3.0
"""

import json
import logging
import time
import argparse
import xml.etree.ElementTree as ET
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
    """Centralized configuration - v6.2.1"""
    
    # API Keys
    FRED_API_KEY = "82fa4bd8294df4c17d0bde5a37903e57"
    
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
    VERSION = "6.2.1"
    IPS_VERSION = "4.4"
    
    # Transformation settings
    PERCENTILE_WINDOW_YEARS = 15  # Rolling window for percentile rankings
    TIC_MA_WINDOW = 3  # Months for TIC moving average
    PRODUCTIVITY_MA_QUARTERS = 2  # Quarters for productivity MA
    PE_MA_MONTHS = 3  # Months for P/E average
    
    # TIC Data sources
    TIC_XML_URL = "https://ticdata.treasury.gov/resource-center/data-chart-center/tic/Documents/slt_table2.xml"
    TIC_API_URL = "https://api.treasury.gov/tic/"  # Fallback
    TIC_MANUAL_URL = "https://home.treasury.gov/data/treasury-international-capital-tic-system"
    
    # FRED series
    FRED_SERIES = {
        'software_investment': 'Y033RC1Q027SBEA',
        'total_investment': 'W170RC1Q027SBEA',
        'treasury_10y': 'DGS10',
        'tips_10y': 'DFII10',
        'productivity': 'OPHNFB',
        'tic_foreign_holdings': 'FDHBFIN'  # Foreign holdings of US Treasury securities
    }

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def safe_float_conversion(value):
    """Safely convert a value to float, returning None for NaN/invalid values"""
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
    """Recursively clean a data structure to ensure it's JSON-safe"""
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

def calculate_rolling_percentile(values: List[float], window_years: int = 15) -> float:
    """
    Calculate percentile rank of the last value within a rolling window
    
    Args:
        values: Time series values
        window_years: Years to look back for percentile calculation
    
    Returns:
        Percentile rank (0-100) of the most recent value
    """
    if not values or len(values) < 12:  # Need at least 1 year of monthly data
        return None
    
    # Calculate window size (assuming monthly data)
    window_size = min(window_years * 12, len(values))
    
    # Get the window of values
    window_values = values[-window_size:]
    current_value = values[-1]
    
    # Calculate percentile using numpy
    # Count how many values are less than or equal to current value
    count_below = np.sum(np.array(window_values) <= current_value)
    percentile = (count_below / len(window_values)) * 100
    
    return round(percentile, 2)

# ============================================================================
# SIGNAL TRANSFORMATIONS
# ============================================================================

class SignalTransformer:
    """Handles all indicator transformations for v6.2.1"""
    
    def __init__(self, logger, config: Config):
        self.logger = logger
        self.config = config
    
    def transform_dxy_rate_of_change(self, raw_values: List[float], dates: List[str]) -> Dict:
        """
        Transform DXY raw index to 3-month rate of change
        
        Returns both raw and transformed values
        """
        if len(raw_values) < 3:
            return None
        
        # Convert to pandas series for easier calculation
        df = pd.DataFrame({
            'date': pd.to_datetime(dates),
            'value': raw_values
        }).set_index('date')
        
        # Calculate 3-month rate of change (percentage)
        roc_3m = df['value'].pct_change(periods=3) * 100
        
        # Drop NaN values
        roc_3m = roc_3m.dropna()
        
        # Calculate 15-year rolling percentile
        roc_values = roc_3m.tolist()
        percentile_rank = calculate_rolling_percentile(roc_values, self.config.PERCENTILE_WINDOW_YEARS)
        
        return {
            'transformed_values': [round(v, 2) for v in roc_values],
            'transformed_dates': [d.strftime('%Y-%m-%d') for d in roc_3m.index],
            'current_transformed': round(roc_values[-1], 2) if roc_values else None,
            'percentile_rank': percentile_rank,
            'transformation': '3-month rate of change (%)',
            'raw_values': raw_values,
            'raw_dates': dates,
            'current_raw': raw_values[-1] if raw_values else None
        }
    
    def transform_productivity_2q_ma(self, quarterly_values: List[float], quarterly_dates: List[str]) -> Dict:
        """
        Transform productivity YoY growth to 2-quarter moving average
        """
        if len(quarterly_values) < 2:
            return None
        
        # Calculate 2-quarter moving average
        ma_values = []
        ma_dates = []
        
        for i in range(1, len(quarterly_values)):
            ma_value = (quarterly_values[i-1] + quarterly_values[i]) / 2
            ma_values.append(round(ma_value, 2))
            ma_dates.append(quarterly_dates[i])
        
        return {
            'transformed_values': ma_values,
            'transformed_dates': ma_dates,
            'current_transformed': ma_values[-1] if ma_values else None,
            'transformation': '2-quarter moving average',
            'raw_values': quarterly_values,
            'raw_dates': quarterly_dates,
            'current_raw': quarterly_values[-1] if quarterly_values else None
        }
    
    def transform_pe_deviation(self, raw_values: List[float], dates: List[str]) -> Dict:
        """
        Transform P/E to percentage deviation from 3-month average
        """
        if len(raw_values) < 3:
            return None
        
        # Convert to pandas series
        df = pd.DataFrame({
            'date': pd.to_datetime(dates),
            'value': raw_values
        }).set_index('date')
        
        # Calculate 3-month rolling average
        ma_3m = df['value'].rolling(window=3, min_periods=3).mean()
        
        # Calculate percentage deviation
        deviation_pct = ((df['value'] / ma_3m) - 1) * 100
        
        # Drop NaN values
        deviation_pct = deviation_pct.dropna()
        
        return {
            'transformed_values': [round(v, 2) for v in deviation_pct.tolist()],
            'transformed_dates': [d.strftime('%Y-%m-%d') for d in deviation_pct.index],
            'current_transformed': round(deviation_pct.iloc[-1], 2) if not deviation_pct.empty else None,
            'transformation': '% deviation from 3-month average',
            'raw_values': raw_values,
            'raw_dates': dates,
            'current_raw': raw_values[-1] if raw_values else None
        }
    
    def calculate_tic_foreign_demand(self, tic_data: Dict) -> Dict:
        """
        Calculate TIC Foreign Demand Index from raw TIC data
        3-month MA of net foreign Treasury purchases, MoM change
        """
        if not tic_data or 'monthly_net_purchases' not in tic_data:
            return None
        
        purchases = tic_data['monthly_net_purchases']
        dates = tic_data['dates']
        
        if len(purchases) < 4:  # Need at least 4 months for MoM of 3-month MA
            return None
        
        # Convert to pandas
        df = pd.DataFrame({
            'date': pd.to_datetime(dates),
            'purchases': purchases
        }).set_index('date')
        
        # Calculate 3-month moving average
        ma_3m = df['purchases'].rolling(window=3, min_periods=3).mean()
        
        # Calculate month-on-month change of the MA
        ma_mom_change = ma_3m.diff()
        
        # Drop NaN values
        ma_mom_change = ma_mom_change.dropna()
        
        # Calculate 15-year percentile ranking
        values_list = ma_mom_change.tolist()
        percentile_rank = calculate_rolling_percentile(values_list, self.config.PERCENTILE_WINDOW_YEARS)
        
        return {
            'transformed_values': [round(v, 2) for v in values_list],
            'transformed_dates': [d.strftime('%Y-%m-%d') for d in ma_mom_change.index],
            'current_transformed': round(values_list[-1], 2) if values_list else None,
            'percentile_rank': percentile_rank,
            'transformation': 'TIC 3-month MA MoM change',
            'raw_values': purchases,
            'raw_dates': dates,
            'current_raw': purchases[-1] if purchases else None,
            'publication_lag': '~6 weeks',
            'data_staleness_warning': self._check_tic_staleness(dates[-1] if dates else None)
        }
    
    def _check_tic_staleness(self, latest_date_str: str) -> Optional[str]:
        """Check if TIC data is stale"""
        if not latest_date_str:
            return "No data available"
        
        latest_date = pd.to_datetime(latest_date_str)
        age_days = (datetime.now() - latest_date).days
        
        if age_days > 60:  # More than 2 months old
            return f"WARNING: Data is {age_days} days old (expected ~45 days lag)"
        elif age_days > 45:
            return f"Data is {age_days} days old (normal lag)"
        else:
            return None

# ============================================================================
# TIC DATA FETCHER
# ============================================================================

class TICDataFetcher:
    """Fetches Treasury International Capital (TIC) data"""
    
    def __init__(self, logger, config: Config):
        self.logger = logger
        self.config = config
    
    def fetch_tic_data(self) -> Optional[Dict]:
        """
        Fetch TIC data from Treasury sources
        
        Returns:
            Dict with monthly_net_purchases and dates
        """
        # Try XML source first
        xml_data = self._fetch_from_xml()
        if xml_data:
            return xml_data
        
        # Try API fallback
        api_data = self._fetch_from_api()
        if api_data:
            return api_data
        
        # Manual fallback message
        self.logger.warning(f"  ⚠️ TIC data unavailable from automated sources")
        self.logger.warning(f"  📊 Download manually from: {self.config.TIC_MANUAL_URL}")
        self.logger.warning(f"  💡 Place 'tic_data.csv' in: {self.config.CSV_IMPORT_DIR}")
        
        return None
    
    def _fetch_from_xml(self) -> Optional[Dict]:
        """Fetch TIC data from Treasury XML feed"""
        try:
            self.logger.info("  🌐 Fetching TIC data from Treasury XML...")
            
            response = requests.get(self.config.TIC_XML_URL, timeout=30)
            if response.status_code != 200:
                self.logger.error(f"  ✗ XML fetch failed: HTTP {response.status_code}")
                return None
            
            # Parse XML
            root = ET.fromstring(response.content)
            
            # Extract data (structure depends on actual XML format)
            # This is a template - actual parsing depends on XML structure
            monthly_data = {}
            
            # Find all monthly entries
            for entry in root.findall('.//monthly_data'):
                date_str = entry.find('date').text
                net_purchases = float(entry.find('net_purchases').text)
                monthly_data[date_str] = net_purchases
            
            if not monthly_data:
                # Try alternative XML structure
                for row in root.findall('.//row'):
                    date_elem = row.find('date')
                    value_elem = row.find('value')
                    if date_elem is not None and value_elem is not None:
                        monthly_data[date_elem.text] = float(value_elem.text)
            
            if monthly_data:
                sorted_dates = sorted(monthly_data.keys())
                return {
                    'monthly_net_purchases': [monthly_data[d] for d in sorted_dates],
                    'dates': sorted_dates,
                    'source': 'Treasury TIC XML Feed'
                }
            
            self.logger.warning("  ⚠️ No data found in XML response")
            return None
            
        except Exception as e:
            self.logger.error(f"  ✗ XML parsing error: {e}")
            return None
    
    def _fetch_from_api(self) -> Optional[Dict]:
        """Fetch TIC data from Treasury API"""
        try:
            self.logger.info("  🌐 Trying TIC API fallback...")
            
            # This is a template - actual API endpoint may vary
            response = requests.get(
                self.config.TIC_API_URL,
                params={'series': 'foreign_holdings', 'format': 'json'},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Extract monthly data (structure depends on API response)
                if 'data' in data:
                    monthly_data = {}
                    for entry in data['data']:
                        date_str = entry.get('date')
                        value = entry.get('net_purchases')
                        if date_str and value:
                            monthly_data[date_str] = float(value)
                    
                    if monthly_data:
                        sorted_dates = sorted(monthly_data.keys())
                        return {
                            'monthly_net_purchases': [monthly_data[d] for d in sorted_dates],
                            'dates': sorted_dates,
                            'source': 'Treasury TIC API'
                        }
            
            return None
            
        except Exception as e:
            self.logger.error(f"  ✗ API fetch error: {e}")
            return None

# ============================================================================
# DATA MERGER
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
            
            # Update transformed values if present
            if 'current_transformed' in new:
                result['current_transformed'] = new['current_transformed']
            
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
        elif 'transformed_values' in data:
            return len(data.get('transformed_values', []))
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
        
        # Update current values
        if 'current_value' in new:
            result['current_value'] = new['current_value']
        if 'current_transformed' in new:
            result['current_transformed'] = new['current_transformed']
        
        # Merge transformation data if present
        if 'transformed_values' in new:
            result['transformed_values'] = new['transformed_values']
            result['transformed_dates'] = new['transformed_dates']
            result['transformation'] = new.get('transformation')
        
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
        
        df_combined = df_new.combine_first(df_existing)
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
    
    def detect_imf_cofer_file(self, csv_path: Path) -> bool:
        """Detect if a CSV file is an IMF COFER dataset"""
        try:
            df = pd.read_csv(csv_path, nrows=10)
            
            has_series_code = 'SERIES_CODE' in df.columns
            has_indicator = 'INDICATOR' in df.columns
            has_currency = 'FXR_CURRENCY' in df.columns or 'Currency' in df.columns
            has_quarters = any('-Q' in str(col) for col in df.columns)
            
            filename_lower = csv_path.name.lower()
            is_imf_named = any(x in filename_lower for x in ['imf', 'cofer', 'dataset'])
            
            if (has_series_code and has_indicator and has_quarters) or \
               (is_imf_named and has_quarters):
                self.logger.info(f"  🏦 Detected IMF COFER file: {csv_path.name}")
                return True
                
        except Exception as e:
            self.logger.debug(f"  Not COFER format: {e}")
        
        return False
    
    def detect_tic_file(self, csv_path: Path) -> bool:
        """Detect if a CSV file contains TIC data"""
        try:
            filename_lower = csv_path.name.lower()
            if any(x in filename_lower for x in ['tic', 'treasury', 'foreign', 'holdings']):
                df = pd.read_csv(csv_path, nrows=5)
                # Check for date and value columns
                has_date = any('date' in col.lower() or 'month' in col.lower() for col in df.columns)
                has_value = any('purchase' in col.lower() or 'holding' in col.lower() or 
                              'value' in col.lower() for col in df.columns)
                if has_date and has_value:
                    self.logger.info(f"  💵 Detected TIC data file: {csv_path.name}")
                    return True
        except:
            pass
        return False
    
    def extract_tic_from_csv(self, csv_path: Path) -> Optional[Dict]:
        """Extract TIC data from CSV file - handles various Treasury formats"""
        try:
            df = pd.read_csv(csv_path)
            self.logger.info(f"  📊 Processing TIC data from {csv_path.name}")
            
            # Check for MFH table format (Major Foreign Holders)
            if 'Grand Total' in df.values.ravel().tolist() or 'Total' in df.iloc[:, 0].str.lower().tolist():
                # This is likely an MFH table
                self.logger.info("  Detected MFH table format")
                
                # Find the Grand Total or Total row
                total_row = None
                for idx, row in df.iterrows():
                    first_col = str(row.iloc[0]).lower()
                    if 'grand total' in first_col or first_col == 'total':
                        total_row = idx
                        break
                
                if total_row is not None:
                    # Extract monthly holdings from the total row
                    dates = []
                    holdings = []
                    
                    # Columns should be dates (like 'Dec 2023', '2023-12', etc.)
                    for col in df.columns[1:]:  # Skip first column (country name)
                        try:
                            # Try to parse the column name as a date
                            date = pd.to_datetime(col)
                            value = float(df.iloc[total_row][col])
                            dates.append(date.strftime('%Y-%m-%d'))
                            holdings.append(value)
                        except:
                            continue
                    
                    if holdings and dates:
                        # Calculate net purchases (month-to-month change)
                        net_purchases = [0]  # First month has no change
                        for i in range(1, len(holdings)):
                            net_purchases.append(holdings[i] - holdings[i-1])
                        
                        self.logger.info(f"  ✔ Extracted {len(holdings)} months of TIC holdings")
                        return {
                            'monthly_net_purchases': net_purchases[1:],  # Skip first 0
                            'dates': dates[1:],  # Align with net purchases
                            'source': f'Treasury MFH Table ({csv_path.name})'
                        }
            
            # Try standard format with date and value columns
            date_col = None
            value_col = None
            
            for col in df.columns:
                col_lower = col.lower()
                if 'date' in col_lower or 'month' in col_lower:
                    date_col = col
                elif 'purchase' in col_lower or 'net' in col_lower or 'holding' in col_lower or 'value' in col_lower:
                    value_col = col
            
            # If we found holdings but not purchases, calculate net purchases
            if date_col and value_col and 'holding' in value_col.lower():
                holdings_data = []
                dates = []
                
                for _, row in df.iterrows():
                    try:
                        date = pd.to_datetime(row[date_col])
                        value = float(row[value_col])
                        dates.append(date.strftime('%Y-%m-%d'))
                        holdings_data.append(value)
                    except:
                        continue
                
                if holdings_data:
                    # Calculate net purchases
                    net_purchases = []
                    for i in range(1, len(holdings_data)):
                        net_purchases.append(holdings_data[i] - holdings_data[i-1])
                    
                    self.logger.info(f"  ✔ Calculated {len(net_purchases)} months of net purchases from holdings")
                    return {
                        'monthly_net_purchases': net_purchases,
                        'dates': dates[1:],  # Skip first date to align
                        'source': f'CSV Import: {csv_path.name}'
                    }
            
            # Standard net purchases format
            if date_col and value_col:
                dates = []
                values = []
                
                for _, row in df.iterrows():
                    try:
                        date_str = str(row[date_col])
                        value = float(row[value_col])
                        
                        # Parse date
                        date = pd.to_datetime(date_str)
                        dates.append(date.strftime('%Y-%m-%d'))
                        values.append(value)
                        
                    except Exception:
                        continue
                
                if values:
                    self.logger.info(f"  ✔ Extracted {len(values)} months of TIC data")
                    return {
                        'monthly_net_purchases': values,
                        'dates': dates,
                        'source': f'CSV Import: {csv_path.name}'
                    }
            
            self.logger.error("  ✗ Could not identify TIC data format")
            return None
            
        except Exception as e:
            self.logger.error(f"  ✗ TIC extraction failed: {e}")
            return None
    
    def extract_cofer_from_imf(self, csv_path: Path) -> Optional[Dict]:
        """Extract COFER USD reserve share data from IMF CSV"""
        try:
            df = pd.read_csv(csv_path)
            self.logger.info(f"  📊 Analyzing IMF COFER structure ({df.shape[0]} rows)")
            
            # Find USD reserve share row
            usd_row_idx = None
            
            # Look for percentage-like values in 50-65 range
            quarterly_cols = [col for col in df.columns if '-Q' in str(col)]
            
            for idx, row in df.iterrows():
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
                    indicator = str(row.get('INDICATOR', '')).lower()
                    series_code = str(row.get('SERIES_CODE', '')).lower()
                    
                    if 'allocated' in indicator or 'usd' in series_code or 'u.s.' in series_code:
                        usd_row_idx = idx
                        self.logger.info(f"    ✔ Found USD row: {row.get('SERIES_CODE', 'Unknown')}")
                        self.logger.info(f"    Recent values: {values}")
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
                'indicator_type': 'trending'
            }
            
            self.logger.info(f"  ✔ Extracted {len(values)} quarters of COFER data")
            
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
            deviation_col = None
            
            for col in df.columns:
                col_lower = col.lower()
                if 'date' in col_lower or 'quarter' in col_lower or 'month' in col_lower:
                    date_col = col
                elif 'value' in col_lower or 'ratio' in col_lower or 'close' in col_lower:
                    value_col = col
                elif 'deviation' in col_lower:
                    deviation_col = col
            
            if not date_col or not value_col:
                if len(df.columns) >= 2:
                    date_col = df.columns[0]
                    value_col = df.columns[1]
                    if len(df.columns) >= 3:
                        deviation_col = df.columns[2]
                else:
                    self.logger.error(f"  Could not identify columns in CSV")
                    return None
            
            dates = []
            values = []
            deviations = [] if deviation_col else None
            
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
                    
                    # If we have a deviation column, capture those values too
                    if deviation_col:
                        try:
                            dev_value = row[deviation_col]
                            if pd.notna(dev_value) and dev_value != '':
                                deviations.append(round(float(dev_value), 4))
                            else:
                                deviations.append(None)
                        except:
                            deviations.append(None)
                    
                except Exception:
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
                
                # Add deviation history if we have it
                if deviations:
                    result['deviation_history'] = deviations
                    self.logger.info(f"  ✔ Also imported {len([d for d in deviations if d is not None])} deviation values")
            
            self.logger.info(f"  ✔ Imported {len(values)} data points from CSV")
            return result
            
        except Exception as e:
            self.logger.error(f"  Failed to import CSV: {e}")
            return None

# ============================================================================
# MAIN COLLECTOR v6.2.1
# ============================================================================

class HCPDataCollectorV6:
    """Data collector v6.2.1 with signal transformations and CSV-focused workflow"""
    
    def __init__(self, config: Config = None, mode: UpdateMode = UpdateMode.MERGE):
        self.config = config or Config()
        self.version = self.config.VERSION
        self.mode = mode
        self.setup_logging()
        self.setup_directories()
        
        # Core components
        self.merger = DataMerger(self.logger)
        self.csv_importer = CSVImporter(self.logger)
        self.transformer = SignalTransformer(self.logger, self.config)
        self.tic_fetcher = TICDataFetcher(self.logger, self.config)
        
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
                
                self.logger.info(f"  ✔ Loaded master data with {len(self.indicators)} indicators")
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
        """Update indicator with mode-appropriate merging"""
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
        # Must have either current_value or current_transformed
        has_current = 'current_value' in data or 'current_transformed' in data
        
        if not has_current:
            return False
        
        has_monthly = 'monthly_history' in data and 'monthly_dates' in data
        has_quarterly = 'quarterly_history' in data and 'quarterly_dates' in data
        has_transformed = 'transformed_values' in data and 'transformed_dates' in data
        
        if not (has_monthly or has_quarterly or has_transformed):
            return False
        
        if has_monthly:
            if len(data['monthly_history']) != len(data['monthly_dates']):
                return False
        
        if has_quarterly:
            if len(data['quarterly_history']) != len(data['quarterly_dates']):
                return False
        
        if has_transformed:
            if len(data['transformed_values']) != len(data['transformed_dates']):
                return False
        
        return True
    
    def initialize_fred(self):
        """Initialize FRED API connection"""
        if not self.fred:
            try:
                self.fred = Fred(api_key=self.config.FRED_API_KEY)
                self.logger.info("  ✔ FRED API initialized")
            except Exception as e:
                self.logger.error(f"  ✗ FRED initialization failed: {e}")
                self.fred = None
    
    # ========================================================================
    # TRANSFORMED INDICATOR COLLECTORS
    # ========================================================================
    
    def collect_dxy(self) -> bool:
        """Collect DXY Dollar Index with 3-month RoC transformation"""
        self.logger.info("💵 Collecting DXY Index with transformation...")
        
        try:
            dxy = yf.Ticker("DX-Y.NYB")
            hist = dxy.history(period="max")
            
            if hist.empty:
                self.logger.error("  ✗ No DXY data received")
                return False
            
            monthly = hist['Close'].resample('M').last()
            
            # Get raw values
            raw_values = [round(v, 2) for v in monthly.tolist()]
            raw_dates = [d.strftime('%Y-%m-%d') for d in monthly.index]
            
            # Apply transformation
            transformation = self.transformer.transform_dxy_rate_of_change(raw_values, raw_dates)
            
            if not transformation:
                self.logger.error("  ✗ DXY transformation failed")
                return False
            
            new_data = {
                'current_value': transformation['current_raw'],
                'current_transformed': transformation['current_transformed'],
                'monthly_history': raw_values,
                'monthly_dates': raw_dates,
                'transformed_values': transformation['transformed_values'],
                'transformed_dates': transformation['transformed_dates'],
                'transformation': transformation['transformation'],
                'percentile_rank': transformation['percentile_rank'],
                'source': 'Yahoo Finance (DX-Y.NYB)',
                'last_updated': datetime.now().isoformat(),
                'data_quality': 'real',
                'data_points': len(raw_values)
            }
            
            success = self.update_indicator('dxy_index', new_data)
            if success:
                self.logger.info(f"  ✔ DXY: {len(raw_values)} months collected")
                self.logger.info(f"  ✔ Transformation: {transformation['transformation']}")
                self.logger.info(f"  ✔ Current RoC: {transformation['current_transformed']:.2f}%")
                self.logger.info(f"  ✔ Percentile Rank: {transformation['percentile_rank']:.1f}%")
            return success
            
        except Exception as e:
            self.logger.error(f"  ✗ DXY collection failed: {e}")
            return False
    
    def collect_tic_foreign_demand(self) -> bool:
        """Collect TIC Foreign Demand Index (replaces real rate differential)"""
        self.logger.info("🏦 Collecting TIC Foreign Demand Index...")
        
        try:
            # Initialize FRED if needed
            self.initialize_fred()
            
            # Try FRED first for extensive historical data
            tic_data = None
            if self.fred:
                self.logger.info("  🌐 Fetching TIC data from FRED...")
                try:
                    # Get foreign holdings of US Treasury securities
                    # FDHBFIN is quarterly data in billions
                    holdings = self.fred.get_series(
                        'FDHBFIN',  # Use the series code directly
                        observation_start='1970-01-01'  # Get full history
                    )
                    
                    if not holdings.empty:
                        self.logger.info(f"  ✔ Retrieved {len(holdings)} quarters of FDHBFIN data")
                        
                        # Convert quarterly to monthly by forward-filling
                        # This gives us monthly granularity for the transformation
                        monthly_holdings = holdings.resample('M').ffill()
                        
                        # Calculate net purchases (month-to-month change)
                        net_purchases = monthly_holdings.diff().dropna()
                        
                        # Format for transformation
                        dates = [d.strftime('%Y-%m-%d') for d in net_purchases.index]
                        values = [round(float(v), 2) for v in net_purchases.values]
                        
                        tic_data = {
                            'monthly_net_purchases': values,
                            'dates': dates,
                            'source': 'FRED (FDHBFIN - Foreign Holdings of US Treasuries, quarterly interpolated to monthly)'
                        }
                        
                        self.logger.info(f"  ✔ Converted to {len(values)} months of TIC data")
                        self.logger.info(f"  Date range: {dates[0]} to {dates[-1]}")
                        
                except Exception as e:
                    self.logger.error(f"  ✗ FRED TIC fetch error: {e}")
            
            # If FRED failed, check for CSV import
            if not tic_data:
                csv_files = list(self.config.CSV_IMPORT_DIR.glob("*.csv"))
                for csv_file in csv_files:
                    if self.csv_importer.detect_tic_file(csv_file):
                        tic_data = self.csv_importer.extract_tic_from_csv(csv_file)
                        if tic_data:
                            self.logger.info(f"  ✔ Loaded TIC data from {csv_file.name}")
                            break
            
            # If still no data, try TIC fetcher with other sources
            if not tic_data and self.tic_fetcher is None:
                self.tic_fetcher = TICDataFetcher(self.logger, self.config, self.fred)
                tic_data = self.tic_fetcher.fetch_tic_data()
            
            if not tic_data:
                # Create placeholder with instructions
                self.logger.warning("  ⚠️ TIC data unavailable - using placeholder")
                new_data = {
                    'current_value': None,
                    'current_transformed': None,
                    'source': 'TIC (Manual update required)',
                    'last_updated': datetime.now().isoformat(),
                    'data_quality': 'missing',
                    'data_points': 0,
                    'update_required': True,
                    'instructions': f'Download from {self.config.TIC_MANUAL_URL}'
                }
                return self.update_indicator('tic_foreign_demand', new_data)
            
            # Apply transformation
            transformation = self.transformer.calculate_tic_foreign_demand(tic_data)
            
            if not transformation:
                self.logger.error("  ✗ TIC transformation failed")
                return False
            
            new_data = {
                'current_value': transformation['current_raw'],
                'current_transformed': transformation['current_transformed'],
                'monthly_history': transformation['raw_values'],
                'monthly_dates': transformation['raw_dates'],
                'transformed_values': transformation['transformed_values'],
                'transformed_dates': transformation['transformed_dates'],
                'transformation': transformation['transformation'],
                'percentile_rank': transformation.get('percentile_rank'),
                'source': tic_data.get('source', 'Treasury TIC'),
                'last_updated': datetime.now().isoformat(),
                'data_quality': 'real',
                'data_points': len(transformation['raw_values']),
                'publication_lag': transformation.get('publication_lag'),
                'data_staleness_warning': transformation.get('data_staleness_warning')
            }
            
            success = self.update_indicator('tic_foreign_demand', new_data)
            if success:
                self.logger.info(f"  ✔ TIC: {len(transformation['raw_values'])} months collected")
                self.logger.info(f"  ✔ Current flow: ${transformation['current_raw']:.1f}B")
                self.logger.info(f"  ✔ MoM change: {transformation['current_transformed']:.2f}")
                if transformation.get('data_staleness_warning'):
                    self.logger.warning(f"  ⚠️ {transformation['data_staleness_warning']}")
            return success
            
        except Exception as e:
            self.logger.error(f"  ✗ TIC collection failed: {e}")
            return False
    
    def collect_productivity(self) -> bool:
        """Collect US Productivity with 2-quarter MA transformation"""
        self.logger.info("📊 Collecting US Productivity with transformation...")
        
        try:
            self.initialize_fred()
            if not self.fred:
                return False
            
            productivity = self.fred.get_series('OPHNFB', observation_start='1947-01-01')
            
            if productivity.empty:
                return False
            
            # Calculate YoY growth
            yoy_growth = productivity.pct_change(periods=4) * 100
            yoy_growth = yoy_growth.dropna()
            
            # Get raw values
            raw_values = [round(v, 2) for v in yoy_growth.tolist()]
            raw_dates = [f"{d.year}Q{d.quarter}" for d in yoy_growth.index]
            
            # Apply transformation
            transformation = self.transformer.transform_productivity_2q_ma(raw_values, raw_dates)
            
            if not transformation:
                self.logger.error("  ✗ Productivity transformation failed")
                return False
            
            new_data = {
                'current_value': transformation['current_raw'],
                'current_transformed': transformation['current_transformed'],
                'quarterly_history': raw_values,
                'quarterly_dates': raw_dates,
                'transformed_values': transformation['transformed_values'],
                'transformed_dates': transformation['transformed_dates'],
                'transformation': transformation['transformation'],
                'source': 'FRED (OPHNFB)',
                'last_updated': datetime.now().isoformat(),
                'data_quality': 'real',
                'data_points': len(raw_values)
            }
            
            success = self.update_indicator('productivity_growth', new_data)
            if success:
                self.logger.info(f"  ✔ Productivity: {len(raw_values)} quarters collected")
                self.logger.info(f"  ✔ Current YoY: {transformation['current_raw']:.2f}%")
                self.logger.info(f"  ✔ 2Q MA: {transformation['current_transformed']:.2f}%")
            return success
            
        except Exception as e:
            self.logger.error(f"  ✗ Productivity collection failed: {e}")
            return False
    
    def collect_trailing_pe(self) -> bool:
        """Collect Trailing P/E with deviation from 3-month average - v6.2.1 CSV-based"""
        self.logger.info("📈 Collecting Trailing P/E with transformation...")
        
        # Check for CSV file first
        pe_csv = self.config.CSV_IMPORT_DIR / "pe_data.csv"
        if pe_csv.exists():
            # Re-import directly to ensure we have fresh data
            self.logger.info(f"  📊 Found pe_data.csv, importing directly...")
            pe_data = self.csv_importer.import_indicator_csv(pe_csv, 'trailing_pe')
            
            if pe_data:
                raw_values = pe_data.get('monthly_history', [])
                raw_dates = pe_data.get('monthly_dates', [])
                deviation_values = pe_data.get('deviation_history', [])
                
                self.logger.info(f"  ✔ Loaded {len(raw_values)} P/E values from CSV")
                
                if deviation_values and len(deviation_values) == len(raw_values):
                    # Filter out None values for transformed arrays
                    transformed_values = []
                    transformed_dates = []
                    for i, dev in enumerate(deviation_values):
                        if dev is not None:
                            transformed_values.append(float(dev))
                            transformed_dates.append(raw_dates[i])
                    
                    self.logger.info(f"  ✔ Using {len(transformed_values)} pre-calculated deviations")
                    
                    # The deviation values ARE the transformation we need
                    new_data = {
                        'current_value': raw_values[-1] if raw_values else None,
                        'current_transformed': transformed_values[-1] if transformed_values else None,
                        'monthly_history': raw_values,
                        'monthly_dates': raw_dates,
                        'transformed_values': transformed_values,
                        'transformed_dates': transformed_dates,
                        'transformation': '% deviation from 3-month average',
                        'source': 'CSV Import (pe_data.csv)',
                        'last_updated': datetime.now().isoformat(),
                        'data_quality': 'real',
                        'data_points': len(raw_values)
                    }
                    
                    success = self.update_indicator('trailing_pe', new_data)
                    if success:
                        self.logger.info(f"  ✔ P/E: {len(raw_values)} months with transformation")
                        self.logger.info(f"  ✔ Current P/E: {raw_values[-1]:.2f}")
                        self.logger.info(f"  ✔ Current Deviation: {transformed_values[-1]:.2f}%")
                    return success
                else:
                    # Calculate deviations ourselves if not provided
                    self.logger.info(f"  ⚠️ No deviation values in CSV, calculating...")
                    
                    # Apply transformation
                    transformation = self.transformer.transform_pe_deviation(raw_values, raw_dates)
                    
                    if transformation:
                        new_data = {
                            'current_value': transformation['current_raw'],
                            'current_transformed': transformation['current_transformed'],
                            'monthly_history': raw_values,
                            'monthly_dates': raw_dates,
                            'transformed_values': transformation['transformed_values'],
                            'transformed_dates': transformation['transformed_dates'],
                            'transformation': transformation['transformation'],
                            'source': 'CSV Import (pe_data.csv)',
                            'last_updated': datetime.now().isoformat(),
                            'data_quality': 'real',
                            'data_points': len(raw_values)
                        }
                        
                        success = self.update_indicator('trailing_pe', new_data)
                        if success:
                            self.logger.info(f"  ✔ P/E: {len(raw_values)} months with calculated transformation")
                            self.logger.info(f"  ✔ Current P/E: {raw_values[-1]:.2f}")
                            self.logger.info(f"  ✔ Deviation: {transformation['current_transformed']:.2f}%")
                        return success
                    else:
                        # Just store raw values
                        new_data = {
                            'current_value': raw_values[-1] if raw_values else None,
                            'monthly_history': raw_values,
                            'monthly_dates': raw_dates,
                            'source': 'CSV Import (pe_data.csv)',
                            'last_updated': datetime.now().isoformat(),
                            'data_quality': 'real',
                            'data_points': len(raw_values)
                        }
                        return self.update_indicator('trailing_pe', new_data)
        
        # Check if we already have data from a previous import
        elif 'trailing_pe' in self.indicators:
            existing_data = self.indicators['trailing_pe']
            if existing_data.get('data_points', 0) > 0:
                self.logger.info(f"  ✔ Preserving {existing_data['data_points']} existing P/E data points")
                return True
        
        # No data available
        self.logger.warning("  ⚠️ No P/E data available")
        self.logger.warning("  ⚠️ Please ensure pe_data.csv is in data/csv_imports/")
        self.logger.warning("  ⚠️ File should have columns: date, ratio, deviation")
        return False
    
    # ========================================================================
    # PRESERVED INDICATORS (from v5.x)
    # ========================================================================
    
    def collect_software_ip_investment(self) -> bool:
        """Collect Software/IP Investment %"""
        self.logger.info("💻 Collecting Software/IP Investment %...")
        
        try:
            self.initialize_fred()
            if not self.fred:
                return False
            
            software = self.fred.get_series(
                self.config.FRED_SERIES['software_investment'],
                observation_start='1990-01-01'
            )
            
            total = self.fred.get_series(
                self.config.FRED_SERIES['total_investment'],
                observation_start='1990-01-01'
            )
            
            if software.empty or total.empty:
                self.logger.error("  ✗ No investment data received")
                return False
            
            investment_pct = (software / total) * 100
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
                self.logger.info(f"  ✔ Software/IP: {len(investment_pct)} quarters collected")
            return success
            
        except Exception as e:
            self.logger.error(f"  ✗ Software/IP collection failed: {e}")
            return False
    
    def collect_spy_efa_momentum(self) -> bool:
        """Collect SPY/EFA Momentum (monthly mean already implemented)"""
        self.logger.info("🌍 Collecting SPY/EFA Momentum...")
        
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
            
            # Monthly mean (v5.2.0 fix already applied)
            monthly_momentum = daily_diff.resample('M').mean()
            
            new_data = {
                'current_value': round(float(monthly_momentum.iloc[-1]), 4),
                'monthly_history': [round(v, 4) for v in monthly_momentum.tolist()],
                'monthly_dates': [d.strftime('%Y-%m-%d') for d in monthly_momentum.index],
                'source': 'Yahoo Finance (SPY-EFA 3M returns, monthly mean)',
                'last_updated': datetime.now().isoformat(),
                'data_quality': 'real',
                'data_points': len(monthly_momentum),
                'methodology': 'Monthly mean of daily 3M momentum differential'
            }
            
            success = self.update_indicator('spy_efa_momentum', new_data)
            if success:
                self.logger.info(f"  ✔ SPY/EFA: {len(monthly_momentum)} months collected")
            return success
            
        except Exception as e:
            self.logger.error(f"  ✗ SPY/EFA momentum failed: {e}")
            return False
    
    def collect_total_return_differential(self) -> bool:
        """Collect Total Return Differential (from v5.3.0)"""
        self.logger.info("📈 Collecting Total Return Differential...")
        
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=365*21)
            
            spy = yf.Ticker("SPY")
            efa = yf.Ticker("EFA")
            
            spy_hist = spy.history(start=start_date, end=end_date)
            efa_hist = efa.history(start=start_date, end=end_date)
            
            if spy_hist.empty or efa_hist.empty:
                self.logger.error("  ✗ No SPY/EFA data received")
                return False
            
            # Calculate rolling 252-day (1 year) returns
            spy_returns = spy_hist['Close'].pct_change(periods=252) * 100
            efa_returns = efa_hist['Close'].pct_change(periods=252) * 100
            
            # Align indices
            common_dates = spy_returns.index.intersection(efa_returns.index)
            
            # Calculate differential
            return_diff = spy_returns.loc[common_dates] - efa_returns.loc[common_dates]
            
            # Resample to monthly
            monthly_diff = return_diff.resample('M').last()
            monthly_diff = monthly_diff.dropna()
            
            # Format dates
            monthly_dates = [d.strftime('%Y-%m-%d') for d in monthly_diff.index]
            
            new_data = {
                'current_value': round(float(monthly_diff.iloc[-1]), 2),
                'monthly_history': [round(v, 2) for v in monthly_diff.tolist()],
                'monthly_dates': monthly_dates,
                'source': 'Yahoo Finance (SPY-EFA 1Y rolling returns)',
                'last_updated': datetime.now().isoformat(),
                'data_quality': 'real',
                'data_points': len(monthly_diff),
                'indicator_type': 'momentum',
                'calculation': '252-day rolling return differential',
                'frequency': 'monthly',
                'garch_suitable': True
            }
            
            success = self.update_indicator('total_return_differential', new_data)
            if success:
                self.logger.info(f"  ✔ Return Differential: {len(monthly_diff)} months collected")
            return success
            
        except Exception as e:
            self.logger.error(f"  ✗ Return differential failed: {e}")
            return False
    
    def collect_cape_rate_of_change(self) -> bool:
        """Collect CAPE Rate of Change (from v5.5.0)"""
        self.logger.info("📊 Collecting CAPE Rate of Change...")
        
        try:
            cape_file = self.config.CSV_IMPORT_DIR / "CAPE Data.csv"
            
            if not cape_file.exists():
                self.logger.error(f"  ✗ CAPE Data.csv not found in {self.config.CSV_IMPORT_DIR}")
                return False
            
            # Read and process CAPE data (preserving v5.5.0 logic)
            with open(cape_file, 'r') as f:
                lines = f.readlines()
            
            # Find where data starts
            data_start_row = 0
            for i, line in enumerate(lines):
                first_field = line.split(',')[0].strip()
                if first_field and any(char.isdigit() for char in first_field):
                    if '.' in first_field or '-' in first_field or '/' in first_field:
                        data_start_row = i
                        break
            
            # Read CSV skipping headers
            df = pd.read_csv(cape_file, skiprows=data_start_row, header=None)
            
            if df.shape[1] < 13:
                self.logger.error(f"  ✗ CSV has only {df.shape[1]} columns, need at least 13")
                return False
            
            # Extract columns
            cape_data = pd.DataFrame({
                'Date': df.iloc[:, 0],
                'CAPE': df.iloc[:, 12]
            })
            
            # Clean CAPE column
            cape_data['CAPE'] = pd.to_numeric(cape_data['CAPE'], errors='coerce')
            cape_data = cape_data[cape_data['CAPE'].notna() & (cape_data['CAPE'] > 0)]
            
            # Parse dates (handle YYYY.M format where .1 = October)
            def parse_year_month_decimal(date_str):
                parts = str(date_str).split('.')
                if len(parts) == 2:
                    year = int(parts[0])
                    month_str = parts[1]
                    month = 10 if month_str == '1' else int(month_str)
                    return pd.Timestamp(year=year, month=month, day=1)
                else:
                    raise ValueError(f"Invalid date format: {date_str}")
            
            if '.' in str(cape_data['Date'].iloc[0]):
                cape_data['Date'] = cape_data['Date'].apply(parse_year_month_decimal)
            else:
                cape_data['Date'] = pd.to_datetime(cape_data['Date'])
            
            cape_data = cape_data.set_index('Date').sort_index()
            
            # Calculate 12-month rate of change
            cape_roc = cape_data['CAPE'].pct_change(periods=12) * 100
            cape_roc = cape_roc.dropna()
            
            # Format for storage
            monthly_dates = [d.strftime('%Y-%m-%d') for d in cape_roc.index]
            
            new_data = {
                'current_value': round(float(cape_roc.iloc[-1]), 2),
                'monthly_history': [round(v, 2) for v in cape_roc.tolist()],
                'monthly_dates': monthly_dates,
                'source': 'CSV Import (CAPE Data.csv)',
                'last_updated': datetime.now().isoformat(),
                'data_quality': 'real',
                'data_points': len(cape_roc),
                'indicator_type': 'valuation',
                'calculation': '12-month rate of change',
                'current_cape': round(float(cape_data['CAPE'].iloc[-1]), 2)
            }
            
            success = self.update_indicator('cape_rate_of_change', new_data)
            if success:
                self.logger.info(f"  ✔ CAPE RoC: {len(cape_roc)} months collected")
                self.logger.info(f"  ✔ Current CAPE: {cape_data['CAPE'].iloc[-1]:.1f}")
                self.logger.info(f"  ✔ Current RoC: {cape_roc.iloc[-1]:.2f}%")
            return success
            
        except Exception as e:
            self.logger.error(f"  ✗ CAPE RoC failed: {e}")
            return False
    
    def collect_cofer(self) -> bool:
        """Collect COFER USD Reserve Share"""
        self.logger.info("🏦 Collecting COFER USD Reserve Share...")
        
        # Check if already imported via CSV
        if 'cofer_usd' in self.indicators:
            data_points = len(self.indicators['cofer_usd'].get('quarterly_history', []))
            if data_points > 20:
                self.logger.info(f"  ✔ Have {data_points} quarters of COFER data")
                return True
        
        self.logger.warning("  ⚠️ COFER data not found in CSV imports")
        self.logger.warning("  Download from: https://data.imf.org/COFER")
        self.logger.warning("  Place CSV in: data/csv_imports/")
        
        # Add placeholder
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
                self.logger.info(f"  ✔ QQQ/SPY: {len(monthly_ratio)} months collected")
            return success
            
        except Exception as e:
            self.logger.error(f"  ✗ QQQ/SPY failed: {e}")
            return False
    
    def collect_put_call_ratio(self) -> bool:
        """Collect Put/Call Ratio"""
        self.logger.info("📊 Collecting Put/Call Ratio...")
        
        # Preserve existing if available
        if 'put_call_ratio' in self.indicators:
            existing_points = len(self.indicators['put_call_ratio'].get('monthly_history', []))
            if existing_points > 200:
                self.logger.info(f"  ✔ Preserving {existing_points} months of P/C data")
                return True
        
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
        
        return True
    
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
                'proxy_note': 'SPY/(SPY+0.7*EFA) as US market share proxy'
            }
            
            success = self.update_indicator('us_market_pct', new_data)
            if success:
                self.logger.info(f"  ✔ US Market %: {len(monthly_pct)} months collected")
            return success
            
        except Exception as e:
            self.logger.error(f"  ✗ US market % failed: {e}")
            return False
    
    # ========================================================================
    # CSV Import and Theme Organization - WITH P/C MERGE
    # ========================================================================
    
    def import_csv_updates(self) -> int:
        """Import any CSV files in the import directory - WITH P/C MERGE"""
        csv_files = list(self.config.CSV_IMPORT_DIR.glob("*.csv"))
        
        if not csv_files:
            return 0
        
        self.logger.info(f"📁 Found {len(csv_files)} CSV files to import")
        imported = 0
        
        # Collect all put/call data for merging
        put_call_data_collection = []
        
        for csv_file in csv_files:
            # Check for special file types
            if 'cape' in csv_file.name.lower() and 'data' in csv_file.name.lower():
                self.logger.info(f"  📊 Found {csv_file.name} - reserving for CAPE collector")
                continue
            
            if self.csv_importer.detect_imf_cofer_file(csv_file):
                new_data = self.csv_importer.extract_cofer_from_imf(csv_file)
                if new_data and self.update_indicator('cofer_usd', new_data):
                    imported += 1
                    self.logger.info(f"  ✔ Imported COFER data from {csv_file.name}")
                continue
            
            if self.csv_importer.detect_tic_file(csv_file):
                self.logger.info(f"  💵 Found {csv_file.name} - TIC data will be processed")
                continue
            
            # Check if this is a put/call file
            filename_lower = csv_file.name.lower()
            is_put_call = any(x in filename_lower for x in ['pc', 'put', 'call', 'cboe', 'p/c'])
            
            if is_put_call:
                # Collect for merging instead of immediate import
                pc_data = self.csv_importer.import_indicator_csv(csv_file, 'put_call_ratio')
                if pc_data:
                    put_call_data_collection.append(pc_data)
                    self.logger.info(f"  📊 Collected P/C data from {csv_file.name}")
                continue
            
            # Standard CSV processing for non-P/C files
            indicator_name = csv_file.stem.lower()
            
            # Map common names
            name_mapping = {
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
                    self.logger.info(f"  ✔ Imported {indicator_name} from {csv_file.name}")
        
        # Merge all put/call data if we collected any
        if put_call_data_collection:
            merged_pc = self._merge_put_call_data(put_call_data_collection)
            if merged_pc and self.update_indicator('put_call_ratio', merged_pc):
                imported += 1
                self.logger.info(f"  ✔ Merged {len(put_call_data_collection)} P/C files into single indicator")
        
        return imported
    
    def _merge_put_call_data(self, data_collection: List[Dict]) -> Optional[Dict]:
        """Merge multiple put/call data sources into single indicator"""
        if not data_collection:
            return None
        
        try:
            # Combine all data into single DataFrame
            all_dates = []
            all_values = []
            
            for data in data_collection:
                dates = data.get('monthly_dates', [])
                values = data.get('monthly_history', [])
                
                for date, value in zip(dates, values):
                    all_dates.append(date)
                    all_values.append(value)
            
            if not all_dates:
                return None
            
            # Create DataFrame and sort by date
            df = pd.DataFrame({
                'date': pd.to_datetime(all_dates),
                'value': all_values
            }).sort_values('date')
            
            # Remove duplicates (keep last)
            df = df.drop_duplicates(subset=['date'], keep='last')
            
            # Convert back to lists
            sorted_dates = [d.strftime('%Y-%m-%d') for d in df['date']]
            sorted_values = df['value'].tolist()
            
            self.logger.info(f"  ✔ Merged P/C data: {len(sorted_values)} total data points")
            
            return {
                'current_value': round(sorted_values[-1], 3),
                'monthly_history': sorted_values,
                'monthly_dates': sorted_dates,
                'source': 'CBOE (merged multiple files)',
                'last_updated': datetime.now().isoformat(),
                'data_quality': 'real',
                'data_points': len(sorted_values)
            }
            
        except Exception as e:
            self.logger.error(f"  ✗ P/C merge failed: {e}")
            return None
    
    def organize_into_themes(self):
        """Organize flat indicators into themed structure"""
        theme_mappings = {
            'usd': [
                'dxy_index',
                'tic_foreign_demand',  # CORRECT: uses tic_foreign_demand
                'cofer_usd'
            ],
            'innovation': [
                'qqq_spy_ratio',
                'productivity_growth',
                'software_ip_investment'
            ],
            'valuation': [
                'put_call_ratio',
                'trailing_pe',
                'cape_rate_of_change'
            ],
            'usLeadership': [
                'spy_efa_momentum',
                'us_market_pct',
                'total_return_differential'
            ]
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
        self.logger.info(f"IPS Version: {self.config.IPS_VERSION}")
        self.logger.info(f"Major Feature: CSV-focused workflow with 100% transformations")
        self.logger.info("=" * 60)
        
        # Load existing data
        self.load_master_data()
        
        # Create backup if needed
        if self.master_data:
            self.backup_current_data()
        
        # Import any CSV updates first
        csv_imported = self.import_csv_updates()
        if csv_imported > 0:
            self.logger.info(f"  ✔ Imported {csv_imported} indicators from CSV")
            
            # Debug P/E data after import
            if 'trailing_pe' in self.indicators:
                pe_data = self.indicators['trailing_pe']
                history_len = len(pe_data.get('monthly_history', []))
                deviation_len = len(pe_data.get('deviation_history', []))
                self.logger.debug(f"  P/E after CSV import: {history_len} ratios, {deviation_len} deviations")
        
        # Define collectors
        collectors = [
            ('DXY Index (with RoC)', self.collect_dxy),
            ('TIC Foreign Demand', self.collect_tic_foreign_demand),
            ('COFER USD Share', self.collect_cofer),
            ('QQQ/SPY Ratio', self.collect_qqq_spy),
            ('US Productivity (with MA)', self.collect_productivity),
            ('Software/IP Investment', self.collect_software_ip_investment),
            ('Put/Call Ratio', self.collect_put_call_ratio),
            ('Trailing P/E (with deviation)', self.collect_trailing_pe),
            ('CAPE Rate of Change', self.collect_cape_rate_of_change),
            ('SPY/EFA Momentum', self.collect_spy_efa_momentum),
            ('US Market %', self.collect_us_market_pct),
            ('Total Return Differential', self.collect_total_return_differential)
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
        
        # Organize into themes
        self.organize_into_themes()
        
        # Clean data for JSON
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
            'transformations_applied': [
                'DXY: 3-month rate of change',
                'TIC: 3-month MA MoM change',
                'Productivity: 2-quarter MA',
                'P/E: % deviation from 3-month average',
                'SPY/EFA: Monthly mean'
            ],
            'data_policy': 'CSV_FOCUSED',
            'collection_complete': success_count >= len(collectors) * 0.7,
            'failed_indicators': failed
        }
        
        return {
            'metadata': self.metadata,
            'indicators': self.indicators
        }
    
    def save_data(self, data: Dict) -> bool:
        """Save collected data"""
        try:
            clean_data = clean_json_data(data)
            
            with open(self.config.MASTER_FILE, 'w') as f:
                json.dump(clean_data, f, indent=2)
            
            self.logger.info(f"  💾 Saved to {self.config.MASTER_FILE}")
            
            # Validate
            try:
                with open(self.config.MASTER_FILE, 'r') as f:
                    test_load = json.load(f)
                self.logger.info("  ✔ JSON validation successful")
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
    """Main execution"""
    parser = argparse.ArgumentParser(
        description='HCP Data Collector v6.2.1 - CSV-focused with 100% transformations'
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
    
    # Create collector
    mode = UpdateMode(args.mode)
    collector = HCPDataCollectorV6(config, mode)
    
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
            print(f"   Location: ./data/hcp_master_data.json")
            
            print(f"\n🔄 Transformations Applied:")
            for transform in data['metadata'].get('transformations_applied', []):
                print(f"     - {transform}")
            
            if data['metadata'].get('failed_indicators'):
                print(f"\n⚠️ Note: Some indicators need attention:")
                for ind in data['metadata']['failed_indicators']:
                    print(f"     - {ind}")
            
            print("\n📁 CSV files stay in ./data/csv_imports/ for updates")
            print("   - TIC: Treasury foreign demand data")
            print("   - COFER: IMF reserve currency data")
            print("   - CAPE: Shiller CAPE data")
            print("   - P/C: CBOE put/call ratios (merged)")
            print("   - P/E: Trailing P/E data with deviations")
    else:
        print("\n⚠️ WARNING: Collection incomplete")
        print("   Check logs for specific errors")

if __name__ == "__main__":
    main()
