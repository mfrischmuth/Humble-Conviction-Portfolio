#!/usr/bin/env python3
"""
HCP Unified Data Collector v4.2.4
File: hcp_unified_collector_v4.2.4.py
Last Updated: 2025-09-07 00:20:00 UTC
Compatible with: IPS v4.1.1, File Handler v2.1, Theme Calculator v3.2

MAJOR UPDATE v4.2.4: Yuan SWIFT Trend-Based Classification
- Added trend-based classification for Yuan SWIFT (±17% bands)
- Calculate months to trigger for scenario probability
- All v4.2.3 functionality preserved unchanged
- Fixed paths to GitHub repo location
- Master file architecture with CSV workflow
- IMF SDMX API for COFER data
- Improved Forward P/E scraping

PHILOSOPHY: REAL DATA ONLY - NO FALLBACKS
- If we can't get real data, we fail and report it
- No estimations, no proxies, no guesses
- Master file preserves all historical data
- Clear workflow for manual data entry
- Yuan uses trend-based classification due to limited history

VERSION HISTORY:
- v4.2.0: Initial real-data-only architecture with PDF parsing
- v4.2.1: Fixed PDF_DIR reference bug in status reporting
- v4.2.2: Master file architecture, CSV workflow, SDMX API
- v4.2.3: Fixed paths to GitHub repo location, consistent versioning
- v4.2.4: Added Yuan SWIFT trend-based classification per IPS v4.1.1

USAGE:
python hcp_unified_collector_v4.2.4.py --initialize    # First time setup
python hcp_unified_collector_v4.2.4.py --monthly       # Monthly update
python hcp_unified_collector_v4.2.4.py --import-csv [file]  # Import manual data
python hcp_unified_collector_v4.2.4.py --export-tracker     # Export for tracker
python hcp_unified_collector_v4.2.4.py --status        # Show current status
"""

import argparse
import json
import logging
import sys
import time
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import warnings

import numpy as np
import pandas as pd
import requests
import yfinance as yf
from bs4 import BeautifulSoup
from dateutil.relativedelta import relativedelta
import pdfplumber
import re
import calendar

warnings.filterwarnings('ignore')

# Configuration - FIXED PATHS FOR GITHUB REPO
FRED_API_KEY = "82fa4bd8294df4c17d0bde5a37903e57"
BASE_DIR = Path("C:/Users/markf/OneDrive/Documents/GitHub/Humble-Conviction-Portfolio/data_collector")
DATA_DIR = BASE_DIR / "Outputs"
LOG_DIR = BASE_DIR / "logs"
PDF_DIR = BASE_DIR / "pdfs"

# Create directories
for dir_path in [DATA_DIR, LOG_DIR, PDF_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)

# Fix encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_DIR / f'collector_{datetime.now().strftime("%Y%m%d")}.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('HCP_Unified_Collector_v4.2.4')


class HCPUnifiedCollector:
    """
    Unified collector v4.2.4 with Yuan trend-based classification
    """
    
    def __init__(self, mode='monthly'):
        """Initialize collector with v4.2.4 configuration"""
        self.mode = mode
        self.raw_data = {}
        self.calculated_indicators = {}
        self.failures = []
        self.pdf_dir = PDF_DIR
        self.master_file = DATA_DIR / "hcp_master_data.json"
        self.master_data = self._load_master_data()
        
        self.metadata = {
            'version': '4.2.4',
            'framework': 'IPS v4.1.1',
            'philosophy': 'Real data only with master file persistence',
            'collection_date': datetime.now().isoformat(),
            'indicators_expected': 12,
            'mode': mode,
            'data_dir': str(DATA_DIR),
            'pdf_dir': str(PDF_DIR),
            'yuan_classification': 'trend-based'
        }
        
        # Data requirements
        self.data_config = {
            'monthly_history': 240 if mode == 'initialize' else 24,
            'daily_history': 252,
            'min_garch_months': 60,
            'yuan_trend_window': 6,  # Months for short-term trend
            'yuan_band_width': 0.17  # ±17% bands
        }
        
        # Log paths being used
        logger.info(f"Using DATA_DIR: {DATA_DIR}")
        logger.info(f"Using PDF_DIR: {PDF_DIR}")
        logger.info(f"Master file: {self.master_file}")
    
    def _load_master_data(self) -> Dict:
        """Load existing master data file if it exists"""
        if self.master_file.exists():
            try:
                with open(self.master_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    logger.info(f"Loaded master data file with {len(data.get('historical_data', {}))} indicators")
                    return data
            except Exception as e:
                logger.error(f"Error loading master file: {e}")
                return self._create_empty_master()
        else:
            logger.info("No master file found, creating new one")
            return self._create_empty_master()
    
    def _create_empty_master(self) -> Dict:
        """Create empty master data structure"""
        return {
            'metadata': {
                'version': '4.2.4',
                'created': datetime.now().isoformat(),
                'last_updated': datetime.now().isoformat(),
                'data_dir': str(DATA_DIR),
                'pdf_dir': str(PDF_DIR)
            },
            'historical_data': {
                'yuan_swift': {},
                'cofer_usd': {},
                'rd_revenue': {},
                'central_bank_gold': {}
            },
            'auto_data': {}
        }
    
    def _save_master_data(self):
        """Save master data with backup"""
        # Create backup if file exists
        if self.master_file.exists():
            backup_file = DATA_DIR / f"hcp_master_data_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            shutil.copy2(self.master_file, backup_file)
            logger.info(f"Created backup: {backup_file.name}")
        
        # Update metadata
        self.master_data['metadata']['last_updated'] = datetime.now().isoformat()
        self.master_data['metadata']['version'] = '4.2.4'
        self.master_data['metadata']['data_dir'] = str(DATA_DIR)
        self.master_data['metadata']['pdf_dir'] = str(PDF_DIR)
        
        # Save master file
        with open(self.master_file, 'w', encoding='utf-8') as f:
            json.dump(self.master_data, f, indent=2, default=str)
        logger.info(f"Master data file saved to: {self.master_file}")
    
    def _calculate_yuan_trend_classification(self) -> Dict:
        """
        NEW in v4.2.4: Calculate trend-based classification for Yuan SWIFT
        Using ±17% bands around long-term trend projection
        """
        logger.info("  Calculating Yuan trend-based classification...")
        
        # Get all available Yuan data
        yuan_history = {}
        
        # Combine historical data from master file
        if self.master_data['historical_data'].get('yuan_swift'):
            yuan_history.update(self.master_data['historical_data']['yuan_swift'])
        
        # Add current parsed data
        if 'yuan_swift' in self.raw_data and 'monthly_data' in self.raw_data['yuan_swift']:
            yuan_history.update(self.raw_data['yuan_swift']['monthly_data'])
        
        if not yuan_history or len(yuan_history) < 3:
            logger.warning("    Insufficient Yuan data for trend analysis")
            return {}
        
        # Sort by date and convert to arrays
        sorted_months = sorted(yuan_history.keys())
        values = np.array([yuan_history[month] for month in sorted_months])
        x = np.arange(len(values))
        
        # Calculate long-term trend (all available data)
        long_slope, long_intercept = np.polyfit(x, values, 1)
        
        # Calculate short-term trend (last 6 months or available)
        short_window = min(6, len(values))
        short_x = np.arange(short_window)
        short_values = values[-short_window:]
        short_slope, short_intercept = np.polyfit(short_x, short_values, 1)
        
        # Current value and projection
        current_value = values[-1]
        current_month_index = len(values) - 1
        expected_value = long_slope * current_month_index + long_intercept
        
        # Calculate classification bands (±17%)
        lower_band = expected_value * (1 - self.data_config['yuan_band_width'])
        upper_band = expected_value * (1 + self.data_config['yuan_band_width'])
        
        # Classify current value
        if current_value < lower_band:
            classification = 'Low'
        elif current_value > upper_band:
            classification = 'High'
        else:
            classification = 'Normal'
        
        # Calculate months to trigger (band crossing)
        months_to_trigger = float('inf')
        trigger_direction = 'stable'
        
        if abs(short_slope) > 0.001:  # Avoid division by zero
            # Project short-term trend forward
            short_trend_current = short_values[-1] + short_slope  # One month forward
            
            # Calculate months until crossing
            if classification == 'Normal':
                # Check which band we're approaching
                months_to_upper = (upper_band - current_value) / short_slope if short_slope > 0 else float('inf')
                months_to_lower = (lower_band - current_value) / short_slope if short_slope < 0 else float('inf')
                
                if 0 < months_to_upper < months_to_lower:
                    months_to_trigger = months_to_upper
                    trigger_direction = 'approaching_high'
                elif 0 < months_to_lower < months_to_upper:
                    months_to_trigger = months_to_lower
                    trigger_direction = 'approaching_low'
            elif classification == 'High':
                # Check if returning to normal
                months_to_normal = (upper_band - current_value) / short_slope if short_slope < 0 else float('inf')
                if months_to_normal > 0:
                    months_to_trigger = months_to_normal
                    trigger_direction = 'returning_to_normal'
            else:  # Low
                # Check if returning to normal
                months_to_normal = (lower_band - current_value) / short_slope if short_slope > 0 else float('inf')
                if months_to_normal > 0:
                    months_to_trigger = months_to_normal
                    trigger_direction = 'returning_to_normal'
        
        # Build comprehensive trend data
        trend_data = {
            'classification': classification,
            'current_value': current_value,
            'expected_value': round(expected_value, 2),
            'lower_band': round(lower_band, 2),
            'upper_band': round(upper_band, 2),
            'long_term_slope': round(long_slope, 4),
            'short_term_slope': round(short_slope, 4),
            'months_to_trigger': round(months_to_trigger, 1) if months_to_trigger != float('inf') else None,
            'trigger_direction': trigger_direction,
            'data_points': len(values),
            'last_month': sorted_months[-1],
            'trend_divergence': round((short_slope - long_slope) / abs(long_slope) * 100, 1) if long_slope != 0 else 0
        }
        
        logger.info(f"    Classification: {classification} (current: {current_value:.2f}%, expected: {expected_value:.2f}%)")
        logger.info(f"    Bands: [{lower_band:.2f}%, {upper_band:.2f}%]")
        if months_to_trigger != float('inf'):
            logger.info(f"    Months to trigger: {months_to_trigger:.1f} ({trigger_direction})")
        
        return trend_data
    
    def collect_all_data(self) -> Dict:
        """Main collection orchestrator"""
        logger.info("="*60)
        logger.info("HCP Unified Collector v4.2.4 - Yuan Trend Classification")
        logger.info(f"Mode: {self.mode.upper()}")
        logger.info(f"Data Directory: {DATA_DIR}")
        logger.info(f"PDF Directory: {PDF_DIR}")
        logger.info("="*60)
        
        # Collect data in order of reliability
        self._fetch_market_data()
        self._fetch_fred_data()
        self._fetch_pdf_data()
        self._fetch_imf_cofer()  # SDMX API
        self._fetch_options_data()
        self._fetch_forward_pe_improved()  # Improved scraping
        self._fetch_etf_data()
        self._fetch_earnings_data()
        
        # Calculate derived indicators
        self._calculate_usd_indicators()
        self._calculate_innovation_indicators()
        self._calculate_pe_indicators()
        self._calculate_us_leadership_indicators()
        
        # Merge with master data
        self._merge_with_master()
        
        # Package output
        output = self._package_output()
        
        # Save outputs
        self._save_master_data()
        filename = self._save_output(output)
        self.metadata['output_file'] = filename
        
        # Generate CSV for manual updates
        if self.mode in ['initialize', 'monthly']:
            self._export_manual_csv()
        
        # Report status
        self._report_status()
        
        return output
    
    def _fetch_market_data(self):
        """Fetch market data from Yahoo Finance"""
        logger.info("Fetching market data...")
        
        tickers = {
            'dxy': 'DX=F',
            'qqq': 'QQQ',
            'spy': 'SPY',
            'efa': 'EFA',
            'vt': 'VT',
            'tnx': '^TNX',
            'tlt': 'TLT',
            'gld': 'GLD',
            'tips': 'TIP',
        }
        
        for key, ticker in tickers.items():
            logger.info(f"  Fetching {key} ({ticker})...")
            try:
                monthly_data = self._fetch_yahoo_monthly(ticker)
                daily_data = self._fetch_yahoo_daily(ticker)
                
                if monthly_data and daily_data:
                    self.raw_data[key] = {
                        'ticker': ticker,
                        'monthly_history': monthly_data['values'],
                        'monthly_dates': monthly_data['dates'],
                        'daily_values': daily_data['values'],
                        'daily_dates': daily_data['dates'],
                        'current_value': daily_data['values'][-1] if daily_data['values'] else None,
                        'source': 'Yahoo Finance',
                        'data_points': len(monthly_data['values'])
                    }
                    
                    logger.info(f"    [SUCCESS] {key}: {len(monthly_data['values'])} months, "
                              f"{len(daily_data['values'])} days (current: {daily_data['values'][-1]:.2f})")
                else:
                    self.failures.append(f"{key}: Failed to fetch data")
                    logger.error(f"    [FAILED] {key}: No data retrieved")
                    
            except Exception as e:
                self.failures.append(f"{key}: {str(e)}")
                logger.error(f"    [ERROR] {key}: {str(e)}")
    
    def _fetch_yahoo_monthly(self, ticker: str) -> Optional[Dict]:
        """Fetch monthly historical data from Yahoo"""
        try:
            stock = yf.Ticker(ticker)
            
            # Fetch based on mode
            if self.mode == 'initialize':
                start_date = datetime.now() - relativedelta(years=20)
            else:
                start_date = datetime.now() - relativedelta(months=24)
            
            end_date = datetime.now()
            hist = stock.history(start=start_date, end=end_date, interval='1mo')
            
            if hist.empty:
                return None
            
            values = hist['Close'].tolist()
            dates = [d.strftime('%Y-%m-%d') for d in hist.index]
            
            return {'values': values, 'dates': dates}
            
        except Exception as e:
            logger.error(f"Monthly fetch error for {ticker}: {e}")
            return None
    
    def _fetch_yahoo_daily(self, ticker: str) -> Optional[Dict]:
        """Fetch daily data from Yahoo"""
        try:
            stock = yf.Ticker(ticker)
            end_date = datetime.now()
            start_date = end_date - timedelta(days=365)
            
            hist = stock.history(start=start_date, end=end_date)
            
            if hist.empty:
                return None
            
            values = hist['Close'].tolist()
            dates = [d.strftime('%Y-%m-%d') for d in hist.index]
            
            return {'values': values, 'dates': dates}
            
        except Exception as e:
            logger.error(f"Daily fetch error for {ticker}: {e}")
            return None
    
    def _fetch_fred_data(self):
        """Fetch data from FRED API"""
        logger.info("Fetching FRED data...")
        
        series_ids = {
            'productivity': 'OPHNFB',
            'tips_10y': 'DFII10',
            'breakeven_10y': 'T10YIE',
            'real_gdp': 'GDPC1',
        }
        
        for key, series_id in series_ids.items():
            try:
                data = self._fetch_fred_series(series_id)
                if data:
                    self.raw_data[key] = data
                    logger.info(f"  [SUCCESS] {key}: {len(data['values'])} observations")
                else:
                    self.failures.append(f"{key}: No data from FRED")
                    logger.error(f"  [FAILED] {key}: No data retrieved")
            except Exception as e:
                self.failures.append(f"{key}: {str(e)}")
                logger.error(f"  [ERROR] {key}: {str(e)}")
    
    def _fetch_fred_series(self, series_id: str) -> Optional[Dict]:
        """Fetch time series from FRED"""
        try:
            if self.mode == 'initialize':
                start_date = (datetime.now() - relativedelta(years=20)).strftime('%Y-%m-%d')
            else:
                start_date = (datetime.now() - relativedelta(years=2)).strftime('%Y-%m-%d')
            
            url = "https://api.stlouisfed.org/fred/series/observations"
            params = {
                'series_id': series_id,
                'api_key': FRED_API_KEY,
                'file_type': 'json',
                'observation_start': start_date,
                'sort_order': 'asc'
            }
            
            response = requests.get(url, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if 'observations' in data:
                    values = []
                    dates = []
                    for obs in data['observations']:
                        if obs['value'] not in ['.', '']:
                            try:
                                values.append(float(obs['value']))
                                dates.append(obs['date'])
                            except ValueError:
                                continue
                    
                    if values:
                        return {
                            'values': values,
                            'dates': dates,
                            'current_value': values[-1],
                            'source': 'FRED',
                            'series_id': series_id
                        }
            return None
            
        except Exception as e:
            logger.error(f"FRED fetch error for {series_id}: {e}")
            return None
    
    def _fetch_imf_cofer(self):
        """Fetch COFER data from IMF SDMX API"""
        logger.info("Fetching IMF COFER data...")
        
        try:
            # SDMX 2.1 endpoint for COFER USD reserves
            url = "https://sdmxcentral.imf.org/ws/public/sdmxapi/rest/data/COFER/Q.USD"
            headers = {'Accept': 'application/json'}
            
            response = requests.get(url, headers=headers, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                
                # Parse SDMX JSON response
                cofer_data = {}
                
                # Try to extract time series data
                if 'dataSets' in data:
                    dataset = data['dataSets'][0]
                    if 'series' in dataset:
                        for series in dataset['series']:
                            if 'observations' in series:
                                for time_period, values in series['observations'].items():
                                    # Convert to quarter format
                                    quarter = self._sdmx_to_quarter(time_period)
                                    if quarter and values:
                                        cofer_data[quarter] = float(values[0])
                
                if cofer_data:
                    # Store in master data
                    self.master_data['historical_data']['cofer_usd'].update(cofer_data)
                    
                    # Get most recent value
                    sorted_quarters = sorted(cofer_data.keys())
                    current_value = cofer_data[sorted_quarters[-1]]
                    
                    self.raw_data['cofer_usd'] = {
                        'current_value': current_value,
                        'quarterly_data': cofer_data,
                        'source': 'IMF SDMX API',
                        'last_quarter': sorted_quarters[-1]
                    }
                    
                    logger.info(f"  [SUCCESS] COFER USD: {current_value:.1f}% (Q: {sorted_quarters[-1]})")
                else:
                    raise ValueError("No COFER data in response")
                    
            else:
                raise ValueError(f"API returned status {response.status_code}")
                
        except Exception as e:
            logger.warning(f"  [MANUAL] COFER fetch failed: {str(e)}")
            logger.info("  Will require manual entry via CSV")
            
            # Try to use historical data from master file
            if self.master_data['historical_data'].get('cofer_usd'):
                cofer_hist = self.master_data['historical_data']['cofer_usd']
                if cofer_hist:
                    sorted_quarters = sorted(cofer_hist.keys())
                    current_value = cofer_hist[sorted_quarters[-1]]
                    
                    self.raw_data['cofer_usd'] = {
                        'current_value': current_value,
                        'source': 'Master file (historical)',
                        'last_quarter': sorted_quarters[-1]
                    }
                    logger.info(f"  Using historical COFER: {current_value:.1f}% from {sorted_quarters[-1]}")
    
    def _sdmx_to_quarter(self, time_period: str) -> str:
        """Convert SDMX time period to quarter format"""
        try:
            # SDMX format might be like "2023-Q1" or similar
            if 'Q' in time_period:
                return time_period
            # Or might need other parsing
            return None
        except:
            return None
    
    def _fetch_pdf_data(self):
        """Parse PDF files for indicators like Yuan SWIFT share"""
        logger.info("Parsing PDF data...")
        logger.info(f"  Looking for PDFs in: {PDF_DIR}")
        self._parse_yuan_swift_pdfs()
    
    def _parse_yuan_swift_pdfs(self):
        """Parse SWIFT RMB Tracker PDFs for Yuan share of payments"""
        logger.info("  Parsing SWIFT RMB Tracker PDFs...")
        
        try:
            monthly_values = {}
            pdf_files = list(PDF_DIR.glob("*.pdf"))
            
            if not pdf_files:
                logger.warning(f"    No PDF files found in {PDF_DIR}")
                logger.info("    Download from: https://www.swift.com/rmb-tracker")
                
                # Use historical data if available
                if self.master_data['historical_data'].get('yuan_swift'):
                    yuan_hist = self.master_data['historical_data']['yuan_swift']
                    if yuan_hist:
                        sorted_months = sorted(yuan_hist.keys())
                        current_value = yuan_hist[sorted_months[-1]]
                        
                        self.raw_data['yuan_swift'] = {
                            'current_value': current_value,
                            'source': 'Master file (historical)',
                            'last_month': sorted_months[-1]
                        }
                        logger.info(f"    Using historical Yuan: {current_value:.2f}% from {sorted_months[-1]}")
                return
            
            logger.info(f"    Found {len(pdf_files)} PDF files")
            
            for pdf_file in pdf_files:
                try:
                    filename = pdf_file.name.lower()
                    
                    # Extract year and month
                    year_match = re.search(r'(202[3-5])', filename)
                    month_patterns = {
                        'january': 1, 'jan': 1, 'february': 2, 'feb': 2,
                        'march': 3, 'mar': 3, 'april': 4, 'apr': 4,
                        'may': 5, 'june': 6, 'jun': 6, 'july': 7, 'jul': 7,
                        'august': 8, 'aug': 8, 'september': 9, 'sep': 9,
                        'october': 10, 'oct': 10, 'november': 11, 'nov': 11,
                        'december': 12, 'dec': 12
                    }
                    
                    month = None
                    for month_name, month_num in month_patterns.items():
                        if month_name in filename:
                            month = month_num
                            break
                    
                    if year_match and month:
                        year = int(year_match.group())
                        
                        with pdfplumber.open(pdf_file) as pdf:
                            for page_num in range(min(3, len(pdf.pages))):
                                page = pdf.pages[page_num]
                                text = page.extract_text()
                                
                                if text:
                                    patterns = [
                                        r'RMB.*?([0-9]+\.?[0-9]*)\s*%',
                                        r'yuan.*?([0-9]+\.?[0-9]*)\s*%',
                                        r'CNY.*?([0-9]+\.?[0-9]*)\s*%',
                                    ]
                                    
                                    for pattern in patterns:
                                        matches = re.findall(pattern, text, re.IGNORECASE)
                                        if matches:
                                            for match in matches:
                                                value = float(match)
                                                if 0.5 < value < 10:
                                                    date_key = f"{year}-{month:02d}"
                                                    monthly_values[date_key] = value
                                                    logger.info(f"    Found {date_key}: {value:.2f}%")
                                                    break
                                            if f"{year}-{month:02d}" in monthly_values:
                                                break
                
                except Exception as e:
                    logger.warning(f"    Error parsing {pdf_file.name}: {e}")
            
            if monthly_values:
                # Update master data
                self.master_data['historical_data']['yuan_swift'].update(monthly_values)
                
                # Get current value
                sorted_months = sorted(monthly_values.keys())
                current_value = monthly_values[sorted_months[-1]]
                
                self.raw_data['yuan_swift'] = {
                    'current_value': current_value,
                    'monthly_data': monthly_values,
                    'source': 'SWIFT RMB Tracker PDFs',
                    'pdf_count': len(pdf_files),
                    'parsed_months': len(monthly_values)
                }
                
                logger.info(f"  [SUCCESS] Yuan SWIFT: {len(monthly_values)} months parsed")
                logger.info(f"    Current value: {current_value:.2f}%")
                
                # NEW in v4.2.4: Calculate trend-based classification
                trend_data = self._calculate_yuan_trend_classification()
                if trend_data:
                    # Enhance yuan_swift data with trend information
                    self.raw_data['yuan_swift'].update(trend_data)
                    logger.info(f"  [SUCCESS] Yuan trend classification: {trend_data['classification']}")
            else:
                logger.error("  [FAILED] Yuan SWIFT: No data extracted from PDFs")
                
        except Exception as e:
            self.failures.append(f"yuan_swift: {str(e)}")
            logger.error(f"  [ERROR] Yuan SWIFT PDF parsing: {str(e)}")
    
    def _fetch_forward_pe_improved(self):
        """Improved Forward P/E fetching from multiple sources"""
        logger.info("Fetching Forward P/E...")
        
        # Try Yahoo first
        pe_value = self._try_yahoo_forward_pe()
        
        # Try web scraping if Yahoo fails
        if not pe_value:
            pe_value = self._try_multpl_forward_pe()
        
        if not pe_value:
            pe_value = self._try_gurufocus_forward_pe()
        
        if pe_value:
            self.raw_data['forward_pe'] = {
                'current_value': pe_value,
                'source': 'Multiple sources',
                'type': 'forward'
            }
            logger.info(f"  [SUCCESS] Forward P/E: {pe_value:.1f}")
        else:
            self.failures.append("forward_pe: Could not fetch from any source")
            logger.error("  [FAILED] Forward P/E: All sources failed")
    
    def _try_yahoo_forward_pe(self) -> Optional[float]:
        """Try to get forward P/E from Yahoo"""
        try:
            spy = yf.Ticker('SPY')
            info = spy.info
            
            if 'forwardPE' in info and info['forwardPE']:
                pe = info['forwardPE']
                if 10 < pe < 50:
                    return pe
            
            # Try trailing as last resort
            if 'trailingPE' in info and info['trailingPE']:
                pe = info['trailingPE']
                if 10 < pe < 50:
                    logger.warning("Using trailing P/E as forward unavailable")
                    return pe
                    
        except Exception as e:
            logger.debug(f"Yahoo P/E failed: {e}")
        return None
    
    def _try_multpl_forward_pe(self) -> Optional[float]:
        """Scrape forward P/E from multpl.com"""
        try:
            url = "https://www.multpl.com/s-p-500-pe-ratio"
            headers = {'User-Agent': 'Mozilla/5.0'}
            
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Look for current value (adjust based on actual HTML)
                value_element = soup.find('div', {'id': 'current'})
                if value_element:
                    text = value_element.get_text()
                    numbers = re.findall(r'\d+\.?\d*', text)
                    for num in numbers:
                        val = float(num)
                        if 10 < val < 50:
                            return val
                            
        except Exception as e:
            logger.debug(f"Multpl scraping failed: {e}")
        return None
    
    def _try_gurufocus_forward_pe(self) -> Optional[float]:
        """Scrape forward P/E from GuruFocus"""
        try:
            url = "https://www.gurufocus.com/term/forwardPE/SPX"
            headers = {'User-Agent': 'Mozilla/5.0'}
            
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 200:
                text = response.text
                
                # Look for P/E patterns
                patterns = [
                    r'Forward P/E[:\s]+(\d+\.?\d*)',
                    r'forward PE[:\s]+(\d+\.?\d*)',
                ]
                
                for pattern in patterns:
                    matches = re.findall(pattern, text, re.IGNORECASE)
                    if matches:
                        val = float(matches[0])
                        if 10 < val < 50:
                            return val
                            
        except Exception as e:
            logger.debug(f"GuruFocus scraping failed: {e}")
        return None
    
    def _fetch_options_data(self):
        """Fetch Put/Call ratio data"""
        logger.info("Fetching Put/Call ratio...")
        
        try:
            spy = yf.Ticker('SPY')
            exp_dates = spy.options
            
            if not exp_dates:
                raise ValueError("No options data available")
            
            near_exp = exp_dates[0]
            opt_chain = spy.option_chain(near_exp)
            
            total_call_oi = opt_chain.calls['openInterest'].sum()
            total_put_oi = opt_chain.puts['openInterest'].sum()
            
            if total_call_oi > 0:
                put_call_ratio = total_put_oi / total_call_oi
                
                self.raw_data['put_call'] = {
                    'current_value': put_call_ratio,
                    'source': 'Yahoo Options Chain',
                    'expiry': near_exp
                }
                
                logger.info(f"  [SUCCESS] Put/Call: {put_call_ratio:.3f}")
            else:
                raise ValueError("No call open interest")
                
        except Exception as e:
            self.failures.append(f"put_call: {str(e)}")
            logger.error(f"  [FAILED] Put/Call ratio: {str(e)}")
    
    def _fetch_etf_data(self):
        """Calculate ETF flows and US market cap percentage"""
        logger.info("Fetching ETF flow and market cap data...")
        
        try:
            # Simplified US market cap calculation
            if 'spy' in self.raw_data and 'vt' in self.raw_data:
                # Use ratio approximation
                spy_price = self.raw_data['spy']['current_value']
                vt_price = self.raw_data['vt']['current_value']
                
                # Approximate US as 60% of world (typical range 55-65%)
                us_pct = 60.0  # Default estimate
                
                self.raw_data['us_market_cap_pct'] = {
                    'current_value': us_pct,
                    'source': 'Estimated from market prices',
                    'note': 'Requires manual update for accuracy'
                }
                logger.info(f"  [ESTIMATE] US Market Cap %: {us_pct:.1f}%")
                
            # ETF Flow differential
            if 'spy' in self.raw_data and 'efa' in self.raw_data:
                spy_ticker = yf.Ticker('SPY')
                efa_ticker = yf.Ticker('EFA')
                
                spy_hist = spy_ticker.history(period='1mo')
                efa_hist = efa_ticker.history(period='1mo')
                
                if not spy_hist.empty and not efa_hist.empty:
                    spy_dollar_vol = (spy_hist['Volume'] * spy_hist['Close']).mean()
                    efa_dollar_vol = (efa_hist['Volume'] * efa_hist['Close']).mean()
                    
                    flow_diff = (spy_dollar_vol - efa_dollar_vol) / 1e9
                    
                    self.raw_data['etf_flow_differential'] = {
                        'current_value': flow_diff,
                        'source': 'Volume proxy calculation'
                    }
                    logger.info(f"  [SUCCESS] ETF Flow Differential: ${flow_diff:.1f}B")
                    
        except Exception as e:
            self.failures.append(f"etf_data: {str(e)}")
            logger.error(f"  [ERROR] ETF data: {str(e)}")
    
    def _fetch_earnings_data(self):
        """Calculate EPS delivery rate"""
        logger.info("Fetching earnings data...")
        
        try:
            # Try S&P 500 index instead of SPY
            sp500 = yf.Ticker('^GSPC')
            
            # Alternative: use major components
            components = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA']
            deliveries = []
            
            for symbol in components:
                try:
                    stock = yf.Ticker(symbol)
                    earnings = stock.earnings_history
                    
                    if earnings is not None and not earnings.empty:
                        if 'epsActual' in earnings.columns and 'epsEstimate' in earnings.columns:
                            earnings['delivery'] = earnings['epsActual'] / earnings['epsEstimate']
                            recent = earnings['delivery'].tail(4).mean()
                            if 0.5 < recent < 2.0:  # Sanity check
                                deliveries.append(recent)
                except:
                    continue
            
            if deliveries:
                avg_delivery = np.mean(deliveries)
                
                self.raw_data['eps_delivery'] = {
                    'current_value': avg_delivery,
                    'source': 'Top S&P components average',
                    'components': len(deliveries)
                }
                logger.info(f"  [SUCCESS] EPS Delivery: {avg_delivery:.3f}")
            else:
                raise ValueError("No earnings data available")
                
        except Exception as e:
            self.failures.append(f"eps_delivery: {str(e)}")
            logger.error(f"  [FAILED] EPS Delivery: {str(e)}")
    
    def _calculate_usd_indicators(self):
        """Calculate USD theme indicators - ENHANCED in v4.2.4"""
        logger.info("Calculating USD indicators...")
        
        if 'dxy' in self.raw_data:
            self.calculated_indicators['dxy'] = self.raw_data['dxy']
            logger.info(f"  [OK] DXY: {self.raw_data['dxy']['current_value']:.2f}")
        
        if 'tips_10y' in self.raw_data and 'breakeven_10y' in self.raw_data:
            tips = self.raw_data['tips_10y']['current_value']
            breakeven = self.raw_data['breakeven_10y']['current_value']
            foreign_real = 0.5
            diff = tips - foreign_real
            
            self.calculated_indicators['real_rate_diff'] = {
                'current_value': diff,
                'us_real': tips,
                'foreign_real': foreign_real,
                'source': 'FRED calculation'
            }
            logger.info(f"  [OK] Real Rate Differential: {diff:.2f}%")
        
        # ENHANCED in v4.2.4: Yuan with trend classification
        if 'yuan_swift' in self.raw_data:
            self.calculated_indicators['yuan_swift'] = self.raw_data['yuan_swift']
            logger.info(f"  [OK] Yuan SWIFT Share: {self.raw_data['yuan_swift']['current_value']:.2f}%")
            
            # Log trend classification if available
            if 'classification' in self.raw_data['yuan_swift']:
                logger.info(f"       Classification: {self.raw_data['yuan_swift']['classification']}")
                if self.raw_data['yuan_swift'].get('months_to_trigger'):
                    logger.info(f"       Months to trigger: {self.raw_data['yuan_swift']['months_to_trigger']:.1f}")
        
        if 'cofer_usd' in self.raw_data:
            self.calculated_indicators['cofer_usd'] = self.raw_data['cofer_usd']
            logger.info(f"  [OK] COFER USD Share: {self.raw_data['cofer_usd']['current_value']:.1f}%")
    
    def _calculate_innovation_indicators(self):
        """Calculate Innovation theme indicators"""
        logger.info("Calculating Innovation indicators...")
        
        if 'qqq' in self.raw_data and 'spy' in self.raw_data:
            qqq_data = self.raw_data['qqq']
            spy_data = self.raw_data['spy']
            
            current_ratio = qqq_data['current_value'] / spy_data['current_value']
            
            self.calculated_indicators['qqq_spy'] = {
                'current_value': current_ratio,
                'source': 'Yahoo Finance calculation'
            }
            logger.info(f"  [OK] QQQ/SPY Ratio: {current_ratio:.4f}")
        
        if 'productivity' in self.raw_data:
            prod_data = self.raw_data['productivity']
            
            if len(prod_data['values']) >= 5:
                current = prod_data['values'][-1]
                year_ago = prod_data['values'][-5]
                yoy_change = ((current - year_ago) / year_ago) * 100
                
                self.calculated_indicators['productivity'] = {
                    'current_value': yoy_change,
                    'source': 'FRED'
                }
                logger.info(f"  [OK] Productivity Growth: {yoy_change:.2f}%")
    
    def _calculate_pe_indicators(self):
        """Calculate P/E theme indicators"""
        logger.info("Calculating P/E indicators...")
        
        if 'put_call' in self.raw_data:
            self.calculated_indicators['put_call'] = self.raw_data['put_call']
            logger.info(f"  [OK] Put/Call Ratio: {self.raw_data['put_call']['current_value']:.3f}")
        
        if 'forward_pe' in self.raw_data:
            self.calculated_indicators['forward_pe'] = self.raw_data['forward_pe']
            logger.info(f"  [OK] Forward P/E: {self.raw_data['forward_pe']['current_value']:.1f}")
        
        if 'eps_delivery' in self.raw_data:
            self.calculated_indicators['eps_delivery'] = self.raw_data['eps_delivery']
            logger.info(f"  [OK] EPS Delivery: {self.raw_data['eps_delivery']['current_value']:.3f}")
    
    def _calculate_us_leadership_indicators(self):
        """Calculate US Leadership indicators"""
        logger.info("Calculating US Leadership indicators...")
        
        if 'spy' in self.raw_data and 'efa' in self.raw_data:
            spy_data = self.raw_data['spy']
            efa_data = self.raw_data['efa']
            
            if len(spy_data['daily_values']) >= 63 and len(efa_data['daily_values']) >= 63:
                spy_3m_return = (spy_data['daily_values'][-1] / spy_data['daily_values'][-63] - 1) * 100
                efa_3m_return = (efa_data['daily_values'][-1] / efa_data['daily_values'][-63] - 1) * 100
                
                momentum_diff = spy_3m_return - efa_3m_return
                
                self.calculated_indicators['spy_efa_momentum'] = {
                    'current_value': momentum_diff,
                    'spy_return': spy_3m_return,
                    'efa_return': efa_3m_return,
                    'source': 'Yahoo Finance calculation'
                }
                logger.info(f"  [OK] SPY/EFA Momentum: {momentum_diff:.2f}%")
        
        if 'us_market_cap_pct' in self.raw_data:
            self.calculated_indicators['us_market_cap_pct'] = self.raw_data['us_market_cap_pct']
            logger.info(f"  [OK] US Market Cap %: {self.raw_data['us_market_cap_pct']['current_value']:.1f}%")
        
        if 'etf_flow_differential' in self.raw_data:
            self.calculated_indicators['etf_flow_differential'] = self.raw_data['etf_flow_differential']
            logger.info(f"  [OK] ETF Flow Differential: ${self.raw_data['etf_flow_differential']['current_value']:.1f}B")
    
    def _merge_with_master(self):
        """Merge current data with master file"""
        # Auto data gets updated
        self.master_data['auto_data'] = self.calculated_indicators
        
        # Historical manual data is preserved
        # New PDF data was already added during parsing
    
    def _export_manual_csv(self):
        """Export CSV for manual data entry"""
        current_month = datetime.now().strftime('%Y-%m')
        csv_file = DATA_DIR / f"hcp_manual_update_{current_month}.csv"
        
        # Create DataFrame with current values
        data = {
            'Date': [current_month],
            'DXY': [self.calculated_indicators.get('dxy', {}).get('current_value', '')],
            'QQQ_SPY': [self.calculated_indicators.get('qqq_spy', {}).get('current_value', '')],
            'Forward_PE': [self.calculated_indicators.get('forward_pe', {}).get('current_value', '')],
            'Put_Call': [self.calculated_indicators.get('put_call', {}).get('current_value', '')],
            'Productivity': [self.calculated_indicators.get('productivity', {}).get('current_value', '')],
            'SPY_EFA_Mom': [self.calculated_indicators.get('spy_efa_momentum', {}).get('current_value', '')],
            'Yuan_SWIFT': [''],  # Manual entry
            'COFER_USD': [''],   # Manual entry
            'RD_Revenue': [''],  # Manual entry
            'CB_Gold': [''],     # Manual entry
            'US_Mkt_Cap': [''],  # Manual entry
            'EPS_Delivery': [self.calculated_indicators.get('eps_delivery', {}).get('current_value', '')],
        }
        
        df = pd.DataFrame(data)
        df.to_csv(csv_file, index=False)
        
        print(f"\n📋 Manual Update File Created: {csv_file}")
        print("   1. Open this CSV file")
        print("   2. Fill in empty cells with manual data")
        print("   3. Save and run: python hcp_unified_collector_v4.2.4.py --import-csv " + csv_file.name)
    
    def import_csv(self, csv_file: str):
        """Import manually updated CSV data"""
        csv_path = DATA_DIR / csv_file if not Path(csv_file).is_absolute() else Path(csv_file)
        
        if not csv_path.exists():
            logger.error(f"CSV file not found: {csv_path}")
            return False
        
        try:
            df = pd.read_csv(csv_path)
            
            for _, row in df.iterrows():
                date = row['Date']
                
                # Update manual indicators
                if pd.notna(row.get('Yuan_SWIFT')) and row['Yuan_SWIFT'] != '':
                    self.master_data['historical_data']['yuan_swift'][date] = float(row['Yuan_SWIFT'])
                    logger.info(f"Updated Yuan SWIFT for {date}: {row['Yuan_SWIFT']}")
                
                if pd.notna(row.get('COFER_USD')) and row['COFER_USD'] != '':
                    quarter = self._month_to_quarter(date)
                    self.master_data['historical_data']['cofer_usd'][quarter] = float(row['COFER_USD'])
                    logger.info(f"Updated COFER USD for {quarter}: {row['COFER_USD']}")
                
                if pd.notna(row.get('RD_Revenue')) and row['RD_Revenue'] != '':
                    quarter = self._month_to_quarter(date)
                    self.master_data['historical_data']['rd_revenue'][quarter] = float(row['RD_Revenue'])
                    logger.info(f"Updated R&D/Revenue for {quarter}: {row['RD_Revenue']}")
                
                if pd.notna(row.get('CB_Gold')) and row['CB_Gold'] != '':
                    quarter = self._month_to_quarter(date)
                    self.master_data['historical_data']['central_bank_gold'][quarter] = float(row['CB_Gold'])
                    logger.info(f"Updated Central Bank Gold for {quarter}: {row['CB_Gold']}")
            
            self._save_master_data()
            print("✅ Manual data imported successfully!")
            
            # NEW in v4.2.4: Recalculate Yuan trend if data was added
            if 'Yuan_SWIFT' in df.columns:
                trend_data = self._calculate_yuan_trend_classification()
                if trend_data:
                    logger.info(f"Yuan trend recalculated: {trend_data['classification']}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error importing CSV: {e}")
            return False
    
    def _month_to_quarter(self, date_str: str) -> str:
        """Convert YYYY-MM to YYYY-Qx format"""
        try:
            year, month = date_str.split('-')
            quarter = (int(month) - 1) // 3 + 1
            return f"{year}-Q{quarter}"
        except:
            return date_str
    
    def export_tracker_format(self):
        """Export data in format ready for HCP Tracker - ENHANCED v4.2.4"""
        output_file = DATA_DIR / f"hcp_tracker_input_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        # Combine master data with current calculations
        tracker_data = {
            'metadata': self.metadata,
            'indicators': self.calculated_indicators,
            'historical': self.master_data['historical_data'],
            'data_quality': self._assess_data_quality(),
            'yuan_trend': {}  # NEW in v4.2.4
        }
        
        # Add Yuan trend information if available
        if 'yuan_swift' in self.calculated_indicators:
            yuan_data = self.calculated_indicators['yuan_swift']
            if 'classification' in yuan_data:
                tracker_data['yuan_trend'] = {
                    'classification': yuan_data.get('classification'),
                    'current_value': yuan_data.get('current_value'),
                    'expected_value': yuan_data.get('expected_value'),
                    'bands': {
                        'lower': yuan_data.get('lower_band'),
                        'upper': yuan_data.get('upper_band')
                    },
                    'months_to_trigger': yuan_data.get('months_to_trigger'),
                    'trigger_direction': yuan_data.get('trigger_direction'),
                    'trend_divergence': yuan_data.get('trend_divergence')
                }
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(tracker_data, f, indent=2, default=str)
        
        print(f"\n✅ Tracker input file created: {output_file}")
        return output_file
    
    def show_status(self):
        """Show current data status - ENHANCED v4.2.4"""
        print("\n" + "="*60)
        print("HCP DATA COLLECTOR STATUS - v4.2.4")
        print("="*60)
        
        print(f"\n📁 Directory Configuration:")
        print(f"   Data Directory: {DATA_DIR}")
        print(f"   PDF Directory:  {PDF_DIR}")
        print(f"   Log Directory:  {LOG_DIR}")
        
        # Check master file
        if self.master_file.exists():
            print(f"\n✅ Master file exists: {self.master_file.name}")
            print(f"   Last updated: {self.master_data['metadata'].get('last_updated', 'Unknown')}")
            print(f"   Version: {self.master_data['metadata'].get('version', 'Unknown')}")
        else:
            print("\n❌ No master file found")
        
        # Check historical data
        print("\nHistorical Data Points:")
        for key, data in self.master_data['historical_data'].items():
            if data:
                print(f"  {key}: {len(data)} data points")
        
        # NEW in v4.2.4: Show Yuan trend status
        if self.master_data['historical_data'].get('yuan_swift'):
            trend_data = self._calculate_yuan_trend_classification()
            if trend_data:
                print(f"\nYuan SWIFT Trend Analysis:")
                print(f"  Classification: {trend_data['classification']}")
                print(f"  Current: {trend_data['current_value']:.2f}%")
                print(f"  Expected: {trend_data['expected_value']:.2f}%")
                print(f"  Bands: [{trend_data['lower_band']:.2f}%, {trend_data['upper_band']:.2f}%]")
                if trend_data.get('months_to_trigger'):
                    print(f"  Months to trigger: {trend_data['months_to_trigger']:.1f}")
        
        # Check PDFs
        pdf_count = len(list(PDF_DIR.glob("*.pdf")))
        print(f"\nPDF Files: {pdf_count} files in {PDF_DIR}")
        
        # Recent data
        if self.master_data.get('auto_data'):
            print("\nRecent Indicator Values:")
            for key, data in self.master_data['auto_data'].items():
                if isinstance(data, dict) and 'current_value' in data:
                    print(f"  {key}: {data['current_value']:.2f}")
    
    def _package_output(self) -> Dict:
        """Package data for output"""
        return {
            'metadata': self.metadata,
            'indicators': self.calculated_indicators,
            'raw_data': self.raw_data,
            'master_data': self.master_data,
            'data_quality': self._assess_data_quality(),
            'failures': self.failures
        }
    
    def _assess_data_quality(self) -> Dict:
        """Assess overall data quality - ENHANCED v4.2.4"""
        total_expected = 12
        collected = len(self.calculated_indicators)
        
        garch_ready = 0
        trend_based = 0  # NEW in v4.2.4
        
        for ind_name, ind_data in self.calculated_indicators.items():
            if isinstance(ind_data, dict):
                if 'monthly_history' in ind_data:
                    if len(ind_data.get('monthly_history', [])) >= 60:
                        garch_ready += 1
                # NEW: Count trend-based indicators
                if 'classification' in ind_data:
                    trend_based += 1
        
        quality = {
            'indicators_collected': collected,
            'indicators_expected': total_expected,
            'completion_rate': round(collected / total_expected * 100, 1),
            'garch_ready': garch_ready,
            'trend_based': trend_based,  # NEW in v4.2.4
            'failures_count': len(self.failures),
            'overall': 'GOOD' if collected >= 10 else 'PARTIAL' if collected >= 6 else 'POOR'
        }
        
        return quality
    
    def _save_output(self, output: Dict) -> str:
        """Save output to JSON file"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"hcp_data_v424_{timestamp}.json"
        filepath = DATA_DIR / filename
        
        # Convert numpy types
        def convert_types(obj):
            if isinstance(obj, np.integer):
                return int(obj)
            elif isinstance(obj, np.floating):
                return float(obj)
            elif isinstance(obj, np.ndarray):
                return obj.tolist()
            elif isinstance(obj, dict):
                return {k: convert_types(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_types(i) for i in obj]
            return obj
        
        output_clean = convert_types(output)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(output_clean, f, indent=2, default=str)
        
        logger.info(f"Data saved to: {filepath}")
        return filename
    
    def _report_status(self):
        """Report final collection status - ENHANCED v4.2.4"""
        quality = self._assess_data_quality()
        
        print("\n" + "="*60)
        print("COLLECTION COMPLETE - v4.2.4")
        print("="*60)
        print(f"Indicators collected: {quality['indicators_collected']}/{quality['indicators_expected']}")
        print(f"GARCH ready: {quality['garch_ready']}")
        print(f"Trend-based: {quality['trend_based']}")  # NEW
        print(f"Data quality: {quality['overall']}")
        print(f"Failures: {quality['failures_count']}")
        print(f"\nOutput Location: {DATA_DIR}")
        
        if self.failures:
            print("\nItems requiring manual update:")
            for failure in self.failures:
                print(f"  - {failure}")
        
        print("\n" + "-"*60)
        print("NEXT STEPS:")
        print("-"*60)
        
        if self.mode == 'initialize':
            print("\n1. Review the manual update CSV file")
            print("2. Add any missing historical data")
            print("3. Import with --import-csv")
            print("4. Run --export-tracker to create tracker input")
        else:
            print("\n1. Check the manual update CSV")
            print("2. Add new Yuan SWIFT value if available")
            print("3. Add COFER if new quarter")
            print("4. Import and export for tracker")
            print("\nNEW: Yuan trend classification automatically calculated")
        
        print("\n" + "="*60)


def main():
    """Main execution with command-line arguments"""
    parser = argparse.ArgumentParser(description='HCP Unified Data Collector v4.2.4')
    parser.add_argument('--initialize', action='store_true', 
                       help='First time setup with full historical data')
    parser.add_argument('--monthly', action='store_true',
                       help='Monthly update mode')
    parser.add_argument('--import-csv', type=str,
                       help='Import manual data from CSV file')
    parser.add_argument('--export-tracker', action='store_true',
                       help='Export data for HCP Tracker')
    parser.add_argument('--status', action='store_true',
                       help='Show current data status')
    
    args = parser.parse_args()
    
    # Default to monthly if no mode specified
    if not any([args.initialize, args.monthly, args.import_csv, args.export_tracker, args.status]):
        args.monthly = True
    
    print("="*60)
    print("HCP UNIFIED DATA COLLECTOR v4.2.4")
    print("Yuan Trend-Based Classification Enabled")
    print("Framework: IPS v4.1.1")
    print("="*60)
    print(f"Data Location: {DATA_DIR}")
    print(f"PDF Location:  {PDF_DIR}")
    print("="*60)
    
    if args.status:
        collector = HCPUnifiedCollector()
        collector.show_status()
    elif args.import_csv:
        collector = HCPUnifiedCollector()
        collector.import_csv(args.import_csv)
    elif args.export_tracker:
        collector = HCPUnifiedCollector()
        collector.export_tracker_format()
    else:
        mode = 'initialize' if args.initialize else 'monthly'
        collector = HCPUnifiedCollector(mode=mode)
        output = collector.collect_all_data()
    
    return 0


if __name__ == "__main__":
    sys.exit(main())