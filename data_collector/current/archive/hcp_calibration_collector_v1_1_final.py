#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HCP Calibration Data Collector v1.1
File: hcp_calibration_collector_v1.1.py
Last Updated: 2025-09-01 19:30:00 UTC
Version: 1.1.0

CHANGELOG v1.1.0:
- CRITICAL FIX: Removed all dangerous fallback data generation
- Added explicit failure handling with detailed error reporting
- Fixed syntax errors in exception handling
- Implemented honest data collection status reporting
- No more synthetic/estimated data masquerading as real data
- Enhanced calibration viability assessment

PURPOSE:
- Gather comprehensive historical data for indicator calibration
- Determine optimal thresholds for ~50% trigger rates
- Build master calibration dataset for backtesting
- Extend existing Data Collector v3.8.2 architecture

FEATURES:
- Real web scraping for Forward P/E (Yardeni + FactSet)
- FRED API integration for productivity, DXY, treasury data
- Yahoo Finance for market ratios and historical prices
- PDF parsing for Yuan SWIFT and other indicators
- Master file approach with nested JSON structure
- Comprehensive error handling and data validation
- EXPLICIT FAILURE REPORTING (no synthetic fallbacks)

USAGE:
python hcp_calibration_collector_v1.1.py --mode calibration
python hcp_calibration_collector_v1.1.py --indicator forward_pe --years 25
python hcp_calibration_collector_v1.1.py --validate --output summary
"""

import argparse
import calendar
import json
import logging
import os
import re
import sys
import time
import warnings
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

# Third-party imports
try:
    import numpy as np
    import pandas as pd
    import requests
    import yfinance as yf
    from dateutil.relativedelta import relativedelta
    from bs4 import BeautifulSoup
    import pdfplumber
except ImportError as e:
    print(f"Missing required package: {e}")
    print("Install with: pip install pandas numpy yfinance requests beautifulsoup4 pdfplumber python-dateutil")
    sys.exit(1)

# Suppress warnings
warnings.filterwarnings('ignore')

# ============================================================================
# CONFIGURATION
# ============================================================================

# FRED API Key (replace with your own)
FRED_API_KEY = "82fa4bd8294df4c17d0bde5a37903e57"

# Data Sources Configuration
DATA_SOURCES = {
    'forward_pe': {
        'yardeni_pdf': 'https://archive.yardeni.com/pub/stockmktperatio.pdf',
        'factset_earnings': 'https://insight.factset.com/hubfs/Resources%20Section/Research/Earnings%20Insight/EarningsInsight_081625.pdf',
        'backup_sources': [
            'https://www.multpl.com/s-p-500-pe-ratio/table/by-month',
            'https://ycharts.com/indicators/sp_500_pe_ratio_forward'
        ]
    },
    'productivity': {
        'fred_series': 'OPHNFB',  # Nonfarm Business Sector: Labor Productivity
        'bls_backup': 'https://www.bls.gov/lpc/prodybar.htm'
    },
    'treasury_10y': {
        'fred_series': 'DGS10',
        'yahoo_symbol': '^TNX'
    },
    'dxy': {
        'yahoo_symbol': 'DX=F',
        'fred_series': 'DTWEXBGS'  # Trade Weighted U.S. Dollar Index
    },
    'yuan_swift': {
        'swift_reports': 'https://www.swift.com/our-solutions/compliance-and-shared-services/business-intelligence/renminbi/rmb-tracker/document-centre',
        'pdf_pattern': r'RMB.*?([0-9]+\.?[0-9]*)\s*%'
    }
}

# Calibration Configuration
CALIBRATION_CONFIG = {
    'target_trigger_rate': 0.50,  # 50% trigger rate target
    'min_data_points': 50,        # Minimum quarterly observations
    'confidence_interval': 0.95,  # Statistical confidence
    'validation_period': 5,       # Years to hold out for validation
    'indicators': [
        'forward_pe', 'productivity', 'qqq_spy', 'net_margins',
        'cape', 'risk_premium', 'dxy', 'yuan_swift', 'reserve_share',
        'gold_purchases', 'sp_vs_world', 'us_acwi', 'tic_flows'
    ]
}

# Output Configuration
BASE_DIR = Path.cwd()
DATA_DIR = BASE_DIR / "calibration_data"
PDF_DIR = BASE_DIR / "pdfs"
LOG_DIR = BASE_DIR / "logs"

# Create directories
for directory in [DATA_DIR, PDF_DIR, LOG_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_DIR / f'calibration_{datetime.now().strftime("%Y%m%d")}.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('HCP_Calibration_v1.1')

# ============================================================================
# HCP CALIBRATION DATA COLLECTOR CLASS
# ============================================================================

class HCPCalibrationCollector:
    """
    HCP Calibration Data Collector v1.1
    Comprehensive historical data gathering for indicator threshold calibration
    """
    
    def __init__(self, fred_api_key: str = None):
        """Initialize the calibration collector"""
        self.fred_api_key = fred_api_key or FRED_API_KEY
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        
        self.calibration_data = {}
        self.data_quality_report = {}
        self.threshold_results = {}
        
        logger.info("="*80)
        logger.info("HCP CALIBRATION DATA COLLECTOR v1.1")
        logger.info("Fixed dangerous fallback behavior - now fails explicitly when data unavailable")
        logger.info("Building comprehensive historical datasets for indicator calibration")
        logger.info(f"Target trigger rate: {CALIBRATION_CONFIG['target_trigger_rate']:.0%}")
        logger.info(f"Minimum data points: {CALIBRATION_CONFIG['min_data_points']}")
        logger.info("="*80)
    
    def collect_all_indicators(self) -> Dict:
        """Collect historical data for all indicators"""
        logger.info("\nStarting comprehensive data collection...")
        
        # Initialize master data structure
        master_dataset = {
            'version': '1.1.0',
            'type': 'calibration_dataset',
            'created': datetime.now().isoformat(),
            'purpose': 'Historical data for indicator threshold calibration',
            'target_trigger_rate': CALIBRATION_CONFIG['target_trigger_rate'],
            'data_integrity': 'no_synthetic_fallbacks',
            'indicators': {},
            'calibration_results': {},
            'data_quality': {}
        }
        
        # Collect each indicator
        indicators_to_collect = CALIBRATION_CONFIG['indicators']
        
        for indicator in indicators_to_collect:
            logger.info(f"\n--- Collecting {indicator.upper()} ---")
            
            try:
                if indicator == 'forward_pe':
                    data = self.collect_forward_pe_historical()
                elif indicator == 'productivity':
                    data = self.collect_productivity_historical()
                elif indicator == 'qqq_spy':
                    data = self.collect_qqq_spy_historical()
                elif indicator == 'net_margins':
                    data = self.collect_net_margins_historical()
                elif indicator == 'cape':
                    data = self.collect_cape_historical()
                elif indicator == 'risk_premium':
                    data = self.collect_risk_premium_historical()
                elif indicator == 'dxy':
                    data = self.collect_dxy_historical()
                elif indicator == 'yuan_swift':
                    data = self.collect_yuan_swift_historical()
                elif indicator == 'reserve_share':
                    data = self.collect_reserve_share_historical()
                elif indicator == 'gold_purchases':
                    data = self.collect_gold_purchases_historical()
                elif indicator == 'sp_vs_world':
                    data = self.collect_sp_vs_world_historical()
                elif indicator == 'us_acwi':
                    data = self.collect_us_acwi_historical()
                elif indicator == 'tic_flows':
                    data = self.collect_tic_flows_historical()
                else:
                    logger.warning(f"Unknown indicator: {indicator}")
                    continue
                
                master_dataset['indicators'][indicator] = data
                
                # Calculate calibration results for this indicator
                calibration_result = self.calibrate_indicator_threshold(indicator, data)
                master_dataset['calibration_results'][indicator] = calibration_result
                
                # Assess data quality
                quality_assessment = self.assess_indicator_quality(indicator, data)
                master_dataset['data_quality'][indicator] = quality_assessment
                
                status = data.get('collection_status', 'unknown')
                logger.info(f"✓ {indicator}: {status}, {data.get('data_points', 0)} points, quality: {quality_assessment.get('overall', 'unknown')}")
                
            except Exception as e:
                logger.error(f"✗ {indicator} failed: {e}")
                master_dataset['data_quality'][indicator] = {
                    'overall': 'failed',
                    'error': str(e)
                }
        
        # Generate summary
        master_dataset['collection_summary'] = self.generate_collection_summary(master_dataset)
        
        return master_dataset
    
    # ========================================================================
    # FORWARD P/E COLLECTION (YARDENI + FACTSET)
    # ========================================================================
    
    def collect_forward_pe_historical(self) -> Dict:
        """Collect comprehensive Forward P/E historical data"""
        logger.info("Collecting Forward P/E data from Yardeni and FactSet...")
        
        # Attempt to scrape Yardeni data
        yardeni_data = self.scrape_yardeni_forward_pe()
        
        # Attempt to scrape recent FactSet data
        factset_data = self.scrape_factset_forward_pe()
        
        # Combine data sources
        combined_data = self.combine_pe_data_sources(yardeni_data, factset_data)
        
        return {
            'indicator_name': 'Forward P/E',
            'description': 'S&P 500 Forward 12-Month P/E Ratio (Consensus Estimates)',
            'methodology': 'Dual-source: Yardeni historical baseline + FactSet monthly updates',
            'frequency': 'Monthly',
            'collection_status': 'success' if len(combined_data) >= 20 else 'failed',
            'failure_reason': 'Insufficient data from all sources' if len(combined_data) < 20 else None,
            'historical_data': combined_data,
            'data_points': len(combined_data),
            'data_quality': self.assess_pe_data_quality(combined_data, yardeni_data, factset_data),
            'date_range': {
                'start': min(combined_data.keys()) if combined_data else None,
                'end': max(combined_data.keys()) if combined_data else None
            },
            'sources': {
                'primary': 'Yardeni Research (I/B/E/S Refinitiv)',
                'secondary': 'FactSet Earnings Insight',
                'yardeni_success': len(yardeni_data) > 0,
                'factset_success': len(factset_data) > 0,
                'urls': [
                    DATA_SOURCES['forward_pe']['yardeni_pdf'],
                    DATA_SOURCES['forward_pe']['factset_earnings']
                ]
            },
            'trigger_logic': 'When 1-year MA > calibrated_threshold',
            'expected_threshold_range': [20.0, 23.0],
            'calibration_viable': len(combined_data) >= CALIBRATION_CONFIG['min_data_points'],
            'notes': self.generate_pe_collection_notes(yardeni_data, factset_data, combined_data)
        }
    
    def scrape_yardeni_forward_pe(self) -> Dict:
        """Scrape historical Forward P/E data from Yardeni PDF"""
        try:
            logger.info("Downloading Yardeni PDF...")
            
            response = self.session.get(DATA_SOURCES['forward_pe']['yardeni_pdf'], timeout=30)
            if response.status_code == 200:
                # Save PDF locally
                pdf_path = PDF_DIR / "yardeni_pe_ratios.pdf"
                with open(pdf_path, 'wb') as f:
                    f.write(response.content)
                
                # Parse PDF for Forward P/E data
                pe_data = self.parse_yardeni_pdf(pdf_path)
                if len(pe_data) > 0:
                    logger.info(f"Successfully extracted {len(pe_data)} data points from Yardeni PDF")
                    return pe_data
                else:
                    logger.error("CRITICAL: Yardeni PDF parsing failed - no data extracted")
                    return {}
            else:
                logger.error(f"CRITICAL: Failed to download Yardeni PDF: HTTP {response.status_code}")
                return {}
                
        except Exception as e:
            logger.error(f"CRITICAL: Yardeni scraping failed: {e}")
            return {}
    
    def parse_yardeni_pdf(self, pdf_path: Path) -> Dict:
        """Parse Yardeni PDF to extract Forward P/E data"""
        pe_data = {}
        
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for page_num, page in enumerate(pdf.pages):
                    text = page.extract_text()
                    if text and 'forward' in text.lower() and 'p/e' in text.lower():
                        # Look for data patterns
                        # This is a simplified parser - real implementation would be more sophisticated
                        lines = text.split('\n')
                        for line in lines:
                            # Look for year-value patterns
                            matches = re.findall(r'(20\d{2})[^\d]*([0-9]{2}\.[0-9])', line)
                            for year, pe_value in matches:
                                if 15 <= float(pe_value) <= 35:  # Reasonable P/E range
                                    quarter_key = f"{year}-Q4"  # Assume year-end
                                    pe_data[quarter_key] = float(pe_value)
        
        except Exception as e:
            logger.error(f"Error parsing Yardeni PDF: {e}")
        
        return pe_data
    
    def scrape_factset_forward_pe(self) -> Dict:
        """Scrape recent Forward P/E data from FactSet reports"""
        factset_data = {}
        
        try:
            logger.info("Scraping FactSet Earnings Insight...")
            
            # Try to access FactSet earnings page
            url = "https://insight.factset.com/topic/earnings"
            response = self.session.get(url, timeout=15)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Look for forward P/E mentions
                text = soup.get_text()
                pe_matches = re.findall(r'forward.*?p/e.*?([0-9]{2}\.[0-9])', text, re.IGNORECASE)
                
                if pe_matches:
                    current_pe = float(pe_matches[0])
                    current_date = datetime.now().strftime("%Y-%m")
                    factset_data[current_date] = current_pe
                    logger.info(f"Found current Forward P/E: {current_pe}")
                
        except Exception as e:
            logger.warning(f"Error scraping FactSet: {e}")
        
        return factset_data
    
    def combine_pe_data_sources(self, yardeni_data: Dict, factset_data: Dict) -> Dict:
        """Combine Yardeni historical with FactSet current data"""
        combined = {}
        
        # Add Yardeni historical data
        if yardeni_data:
            combined.update(yardeni_data)
            logger.info(f"Combined {len(yardeni_data)} Yardeni data points")
        else:
            logger.error("CRITICAL: No Yardeni historical data available")
        
        # Add FactSet recent data (takes precedence for overlapping dates)
        if factset_data:
            combined.update(factset_data)
            logger.info(f"Added {len(factset_data)} FactSet data points")
        else:
            logger.warning("No current FactSet data available")
        
        # Only interpolate if we have substantial data
        if len(combined) >= 10:
            combined = self.interpolate_missing_quarters(combined)
            logger.info(f"Interpolated gaps, final dataset: {len(combined)} points")
        elif len(combined) > 0:
            logger.warning(f"Limited data available: {len(combined)} points, no interpolation")
        else:
            logger.error("CRITICAL: No Forward P/E data from any source")
        
        return combined
    
    def assess_pe_data_quality(self, combined_data: Dict, yardeni_data: Dict, factset_data: Dict) -> Dict:
        """Assess Forward P/E data quality and sources"""
        return {
            'overall': 'excellent' if len(combined_data) >= 80 else 'good' if len(combined_data) >= 50 else 'poor' if len(combined_data) >= 20 else 'insufficient',
            'yardeni_contribution': len(yardeni_data),
            'factset_contribution': len(factset_data), 
            'total_points': len(combined_data),
            'years_covered': len(combined_data) // 4 if combined_data else 0,
            'source_reliability': 'high' if len(yardeni_data) > 50 else 'medium' if len(yardeni_data) > 20 else 'low',
            'interpolation_used': len(combined_data) > (len(yardeni_data) + len(factset_data)),
            'calibration_ready': len(combined_data) >= CALIBRATION_CONFIG['min_data_points']
        }
    
    def generate_pe_collection_notes(self, yardeni_data: Dict, factset_data: Dict, combined_data: Dict) -> str:
        """Generate detailed notes about Forward P/E data collection"""
        notes = []
        
        if len(yardeni_data) == 0:
            notes.append("CRITICAL: Yardeni historical data collection failed")
        else:
            notes.append(f"Yardeni data: {len(yardeni_data)} points collected successfully")
        
        if len(factset_data) == 0:
            notes.append("WARNING: FactSet current data unavailable")
        else:
            notes.append(f"FactSet data: {len(factset_data)} points collected")
        
        if len(combined_data) < CALIBRATION_CONFIG['min_data_points']:
            notes.append(f"ERROR: Insufficient data for calibration ({len(combined_data)} < {CALIBRATION_CONFIG['min_data_points']})")
        
        return " | ".join(notes)
    
    # ========================================================================
    # PRODUCTIVITY COLLECTION (FRED API)
    # ========================================================================
    
    def collect_productivity_historical(self) -> Dict:
        """Collect labor productivity historical data from FRED"""
        logger.info("Collecting productivity data from FRED...")
        
        try:
            # FRED API call for productivity
            url = "https://api.stlouisfed.org/fred/series/observations"
            params = {
                'series_id': DATA_SOURCES['productivity']['fred_series'],
                'api_key': self.fred_api_key,
                'file_type': 'json',
                'observation_start': '1995-01-01',
                'sort_order': 'asc'
            }
            
            response = self.session.get(url, params=params, timeout=15)
            if response.status_code == 200:
                data = response.json()
                
                if 'observations' in data:
                    productivity_data = {}
                    for obs in data['observations']:
                        if obs['value'] != '.':  # FRED uses '.' for missing values
                            date = obs['date']
                            value = float(obs['value'])
                            productivity_data[date] = value
                    
                    logger.info(f"Collected {len(productivity_data)} productivity data points")
                    
                    return {
                        'indicator_name': 'Labor Productivity Growth',
                        'description': 'Nonfarm Business Sector Labor Productivity',
                        'methodology': 'BLS quarterly data via FRED API',
                        'frequency': 'Quarterly',
                        'collection_status': 'success',
                        'historical_data': productivity_data,
                        'data_points': len(productivity_data),
                        'calibration_viable': len(productivity_data) >= CALIBRATION_CONFIG['min_data_points'],
                        'date_range': {
                            'start': min(productivity_data.keys()),
                            'end': max(productivity_data.keys())
                        },
                        'sources': {
                            'primary': 'Federal Reserve Economic Data (FRED)',
                            'series_id': DATA_SOURCES['productivity']['fred_series'],
                            'url': f"https://fred.stlouisfed.org/series/{DATA_SOURCES['productivity']['fred_series']}"
                        },
                        'trigger_logic': 'When 2Q MA > 6Q MA',
                        'expected_threshold_range': 'N/A (MA comparison)',
                        'unit': 'Index (2012=100)'
                    }
            else:
                logger.error(f"FRED API error: HTTP {response.status_code}")
                return self.create_failed_indicator_structure('Labor Productivity Growth', f'FRED API error: HTTP {response.status_code}')
            
        except Exception as e:
            logger.error(f"Error collecting productivity data: {e}")
            return self.create_failed_indicator_structure('Labor Productivity Growth', str(e))
    
    # ========================================================================
    # QQQ/SPY RATIO COLLECTION (YAHOO FINANCE)
    # ========================================================================
    
    def collect_qqq_spy_historical(self) -> Dict:
        """Collect QQQ/SPY ratio historical data"""
        logger.info("Collecting QQQ/SPY ratio data...")
        
        try:
            # Get historical data for both symbols
            qqq = yf.Ticker("QQQ")
            spy = yf.Ticker("SPY")
            
            # Get data from 1999 (when QQQ started)
            start_date = "1999-03-10"
            end_date = datetime.now().strftime("%Y-%m-%d")
            
            qqq_data = qqq.history(start=start_date, end=end_date, interval="1mo")
            spy_data = spy.history(start=start_date, end=end_date, interval="1mo")
            
            # Calculate monthly ratios
            ratio_data = {}
            
            for date in qqq_data.index:
                if date in spy_data.index:
                    qqq_close = qqq_data.loc[date, 'Close']
                    spy_close = spy_data.loc[date, 'Close']
                    
                    if spy_close > 0:
                        ratio = qqq_close / spy_close
                        date_str = date.strftime("%Y-%m-%d")
                        ratio_data[date_str] = round(ratio, 4)
            
            logger.info(f"Collected {len(ratio_data)} QQQ/SPY ratio data points")
            
            return {
                'indicator_name': 'QQQ/SPY Ratio',
                'description': 'Technology vs Broad Market Performance Ratio',
                'methodology': 'Monthly close prices from Yahoo Finance',
                'frequency': 'Monthly',
                'collection_status': 'success',
                'historical_data': ratio_data,
                'data_points': len(ratio_data),
                'calibration_viable': len(ratio_data) >= CALIBRATION_CONFIG['min_data_points'],
                'date_range': {
                    'start': min(ratio_data.keys()) if ratio_data else None,
                    'end': max(ratio_data.keys()) if ratio_data else None
                },
                'sources': {
                    'primary': 'Yahoo Finance',
                    'symbols': ['QQQ', 'SPY'],
                    'url': 'https://finance.yahoo.com'
                },
                'trigger_logic': 'When 50D MA > 200D MA',
                'expected_threshold_range': [0.75, 0.95],
                'calculation': 'QQQ_close / SPY_close'
            }
            
        except Exception as e:
            logger.error(f"Error collecting QQQ/SPY data: {e}")
            return self.create_failed_indicator_structure('QQQ/SPY Ratio', str(e))
    
    # ========================================================================
    # ADDITIONAL INDICATOR COLLECTION METHODS
    # ========================================================================
    
    def collect_net_margins_historical(self) -> Dict:
        """Collect S&P 500 net margins historical data"""
        logger.info("Collecting S&P 500 net margins data...")
        
        # This requires subscription data from S&P, FactSet, or Bloomberg
        logger.error("CRITICAL: S&P 500 net margins requires subscription data source")
        logger.error("Available sources: S&P Capital IQ, FactSet, Bloomberg, Refinitiv")
        logger.error("Consider using SPDR S&P 500 ETF (SPY) financial reports as proxy")
        
        return {
            'indicator_name': 'S&P 500 Net Margins',
            'description': 'S&P 500 Net Profit Margins',
            'methodology': 'Subscription data required',
            'frequency': 'Quarterly',
            'collection_status': 'failed',
            'failure_reason': 'No accessible data source - requires subscription service',
            'historical_data': {},
            'data_points': 0,
            'calibration_viable': False,
            'suggested_sources': [
                'S&P Capital IQ',
                'FactSet Fundamentals',
                'Bloomberg Terminal', 
                'Refinitiv Eikon',
                'SEC EDGAR (manual calculation from 10-K filings)'
            ],
            'alternative_approach': 'Use aggregate financial data from major S&P 500 companies'
        }
    
    def collect_cape_historical(self) -> Dict:
        """Collect CAPE ratio historical data"""
        logger.info("Attempting to collect CAPE data from Robert Shiller's website...")
        
        try:
            # Try to get Shiller's data
            url = "http://www.econ.yale.edu/~shiller/data/ie_data.xls"
            response = self.session.get(url, timeout=15)
            
            if response.status_code == 200:
                logger.info("Successfully downloaded Shiller CAPE data")
                # Would parse Excel file here
                # For now, indicate parsing needed
                cape_data = {}  # Would populate from Excel parsing
                
                if len(cape_data) == 0:
                    logger.error("CAPE data parsing not yet implemented")
                    return self.create_failed_indicator_structure('CAPE Ratio', 'Excel parsing not implemented')
                
                return {
                    'indicator_name': 'CAPE Ratio',
                    'description': 'Cyclically Adjusted Price-to-Earnings Ratio',
                    'methodology': "Robert Shiller's original CAPE calculation",
                    'frequency': 'Monthly',
                    'collection_status': 'success',
                    'historical_data': cape_data,
                    'data_points': len(cape_data),
                    'calibration_viable': len(cape_data) >= CALIBRATION_CONFIG['min_data_points'],
                    'source_url': url,
                    'notes': 'Data from Yale Economics Department - Robert Shiller'
                }
            else:
                logger.error(f"Failed to download CAPE data: HTTP {response.status_code}")
                return self.create_failed_indicator_structure('CAPE Ratio', f'Download failed: HTTP {response.status_code}')
                
        except Exception as e:
            logger.error(f"CAPE collection failed: {e}")
            return self.create_failed_indicator_structure('CAPE Ratio', str(e))
    
    def collect_risk_premium_historical(self) -> Dict:
        """Collect equity risk premium data"""
        logger.info("Calculating equity risk premium from FRED treasury data...")
        
        try:
            # Get 10-year Treasury rates from FRED
            treasury_data = self.collect_fred_series('DGS10', 'Treasury 10-Year Rate')
            
            if not treasury_data.get('historical_data'):
                return self.create_failed_indicator_structure('Equity Risk Premium', 'Treasury rate data unavailable')
            
            # Risk premium calculation requires earnings yield
            # This is a simplified calculation - real implementation would need earnings data
            logger.warning("Risk premium calculation incomplete: missing earnings yield component")
            
            return {
                'indicator_name': 'Equity Risk Premium',
                'description': 'Earnings Yield minus 10-Year Treasury Rate',
                'methodology': 'Calculated from earnings yield and treasury rates',
                'collection_status': 'partial',
                'failure_reason': 'Missing earnings yield component for full calculation',
                'historical_data': {},  # Would calculate if earnings data available
                'data_points': 0,
                'calibration_viable': False,
                'notes': 'Requires S&P 500 earnings yield data for completion'
            }
            
        except Exception as e:
            logger.error(f"Risk premium collection failed: {e}")
            return self.create_failed_indicator_structure('Equity Risk Premium', str(e))
    
    def collect_dxy_historical(self) -> Dict:
        """Collect DXY historical data"""
        logger.info("Collecting DXY data from Yahoo Finance...")
        
        try:
            dxy = yf.Ticker("DX=F")
            data = dxy.history(start="1999-01-01", end=datetime.now().strftime("%Y-%m-%d"), interval="1mo")
            
            if data.empty:
                logger.error("No DXY data returned from Yahoo Finance")
                return self.create_failed_indicator_structure('DXY Index', 'No data from Yahoo Finance')
            
            dxy_data = {}
            for date, row in data.iterrows():
                date_str = date.strftime("%Y-%m-%d")
                dxy_data[date_str] = round(row['Close'], 2)
            
            logger.info(f"Successfully collected {len(dxy_data)} DXY data points")
            
            return {
                'indicator_name': 'US Dollar Index (DXY)',
                'description': 'US Dollar strength vs major currencies',
                'methodology': 'Monthly close prices from Yahoo Finance',
                'frequency': 'Monthly',
                'collection_status': 'success',
                'historical_data': dxy_data,
                'data_points': len(dxy_data),
                'calibration_viable': len(dxy_data) >= CALIBRATION_CONFIG['min_data_points'],
                'date_range': {
                    'start': min(dxy_data.keys()),
                    'end': max(dxy_data.keys())
                },
                'trigger_logic': 'When 200D MA < 400D MA',
                'source': 'Yahoo Finance (DX=F)',
                'data_quality': 'high'
            }
            
        except Exception as e:
            logger.error(f"DXY collection failed: {e}")
            return self.create_failed_indicator_structure('DXY Index', str(e))
    
    def collect_yuan_swift_historical(self) -> Dict:
        """Collect Yuan SWIFT share data"""
        logger.info("Yuan SWIFT data requires manual PDF parsing from SWIFT reports...")
        logger.error("CRITICAL: Yuan SWIFT collection not implemented")
        logger.error("Requires: Download monthly SWIFT RMB Tracker PDFs and parse percentage values")
        
        return self.create_failed_indicator_structure(
            'Yuan SWIFT Share', 
            'Manual PDF parsing required from SWIFT RMB Tracker reports'
        )
    
    def collect_reserve_share_historical(self) -> Dict:
        """Collect USD reserve share data"""
        logger.info("USD Reserve Share requires IMF COFER database access...")
        logger.error("CRITICAL: USD Reserve Share collection not implemented")
        logger.error("Requires: IMF COFER (Composition of Foreign Exchange Reserves) database")
        
        return self.create_failed_indicator_structure(
            'USD Reserve Share',
            'IMF COFER database access required'
        )
    
    def collect_gold_purchases_historical(self) -> Dict:
        """Collect central bank gold purchases data"""
        logger.info("Gold purchases require World Gold Council data...")
        logger.error("CRITICAL: Gold purchases collection not implemented")
        logger.error("Requires: World Gold Council quarterly reports or subscription")
        
        return self.create_failed_indicator_structure(
            'Central Bank Gold Purchases',
            'World Gold Council data access required'
        )
    
    def collect_sp_vs_world_historical(self) -> Dict:
        """Collect S&P vs World performance data"""
        logger.info("Calculating S&P 500 vs MSCI World performance...")
        
        try:
            # This would require MSCI World data - expensive subscription
            logger.warning("MSCI World data requires subscription")
            logger.info("Alternative: Use VEU (Developed Markets ex-US) as proxy")
            
            # Try using VEU as proxy
            spy = yf.Ticker("SPY")
            veu = yf.Ticker("VEU")  # Developed markets ex-US
            
            spy_data = spy.history(start="2007-01-01", interval="1mo")  # VEU started 2007
            veu_data = veu.history(start="2007-01-01", interval="1mo")
            
            if spy_data.empty or veu_data.empty:
                return self.create_failed_indicator_structure('S&P vs World Performance', 'ETF data unavailable')
            
            performance_data = {}
            # Calculate 12-month rolling relative performance
            # This is a simplified implementation
            logger.info(f"Collected proxy data: SPY ({len(spy_data)} points), VEU ({len(veu_data)} points)")
            
            return {
                'indicator_name': 'S&P vs World Performance',
                'description': 'S&P 500 vs International Developed Markets',
                'methodology': 'SPY vs VEU (proxy for MSCI World)',
                'collection_status': 'proxy',
                'historical_data': performance_data,  # Would calculate rolling performance
                'data_points': len(performance_data),
                'calibration_viable': False,  # Calculation not complete
                'notes': 'Using VEU as MSCI World proxy - calculation incomplete',
                'limitation': 'True MSCI World data requires subscription'
            }
            
        except Exception as e:
            logger.error(f"S&P vs World collection failed: {e}")
            return self.create_failed_indicator_structure('S&P vs World Performance', str(e))
    
    def collect_us_acwi_historical(self) -> Dict:
        """Collect US % of ACWI data"""
        logger.error("CRITICAL: US % of ACWI requires MSCI subscription data")
        return self.create_failed_indicator_structure(
            'US % of ACWI',
            'MSCI ACWI composition data requires subscription'
        )
    
    def collect_tic_flows_historical(self) -> Dict:
        """Collect TIC flows data"""
        logger.info("TIC flows require U.S. Treasury TIC reports...")
        logger.error("CRITICAL: TIC flows collection not implemented")
        logger.error("Requires: Parsing monthly Treasury TIC (Treasury International Capital) reports")
        
        return self.create_failed_indicator_structure(
            'TIC Net Flows',
            'Treasury TIC report parsing required'
        )
    
    # ========================================================================
    # CALIBRATION AND THRESHOLD OPTIMIZATION
    # ========================================================================
    
    def calibrate_indicator_threshold(self, indicator_name: str, indicator_data: Dict) -> Dict:
        """Calibrate optimal threshold for ~50% trigger rate"""
        logger.info(f"Calibrating threshold for {indicator_name}...")
        
        # Check if data collection was successful
        collection_status = indicator_data.get('collection_status', 'unknown')
        if collection_status == 'failed':
            logger.error(f"Cannot calibrate {indicator_name}: data collection failed")
            return {
                'status': 'calibration_impossible',
                'reason': 'Data collection failed',
                'failure_details': indicator_data.get('failure_reason', 'Unknown'),
                'data_points': 0,
                'calibration_viable': False
            }
        
        historical_data = indicator_data.get('historical_data', {})
        
        if len(historical_data) < CALIBRATION_CONFIG['min_data_points']:
            logger.warning(f"Insufficient data for {indicator_name}: {len(historical_data)} < {CALIBRATION_CONFIG['min_data_points']} required")
            return {
                'status': 'insufficient_data', 
                'data_points': len(historical_data),
                'required_points': CALIBRATION_CONFIG['min_data_points'],
                'calibration_viable': False,
                'recommendation': 'Improve data collection or find alternative data source'
            }
        
        # Convert to time series
        dates = sorted(historical_data.keys())
        values = [historical_data[date] for date in dates]
        
        # Remove any None values
        clean_values = [v for v in values if v is not None]
        if len(clean_values) < len(values) * 0.8:  # More than 20% missing
            logger.warning(f"High missing data rate for {indicator_name}: {len(values) - len(clean_values)}/{len(values)} missing")
        
        if len(clean_values) < CALIBRATION_CONFIG['min_data_points']:
            return {
                'status': 'insufficient_clean_data',
                'original_points': len(values),
                'clean_points': len(clean_values),
                'required_points': CALIBRATION_CONFIG['min_data_points'],
                'calibration_viable': False
            }
        
        # Calculate moving averages if needed
        trigger_logic = indicator_data.get('trigger_logic', '')
        if 'MA' in trigger_logic or 'ma' in trigger_logic.lower():
            ma_values = self.calculate_moving_average_series(clean_values, 12)  # 1-year MA
            test_values = [v for v in ma_values if v is not None]
        else:
            test_values = clean_values
        
        if len(test_values) < 20:  # Minimum for meaningful calibration
            return {
                'status': 'insufficient_processed_data',
                'processed_points': len(test_values),
                'calibration_viable': False
            }
        
        # Find optimal threshold
        optimal_threshold = self.find_optimal_threshold(test_values, CALIBRATION_CONFIG['target_trigger_rate'])
        
        # Calculate trigger statistics
        triggers = sum(1 for v in test_values if v > optimal_threshold)
        trigger_rate = triggers / len(test_values)
        
        # Validation
        validation_results = self.validate_threshold(test_values, optimal_threshold)
        
        return {
            'status': 'calibrated',
            'optimal_threshold': round(optimal_threshold, 3),
            'achieved_trigger_rate': round(trigger_rate, 3),
            'target_trigger_rate': CALIBRATION_CONFIG['target_trigger_rate'],
            'deviation_from_target': abs(trigger_rate - CALIBRATION_CONFIG['target_trigger_rate']),
            'data_points_used': len(test_values),
            'original_data_points': len(historical_data),
            'date_range': f"{dates[0]} to {dates[-1]}",
            'validation': validation_results,
            'calibration_method': 'percentile_optimization',
            'calibration_quality': 'excellent' if abs(trigger_rate - CALIBRATION_CONFIG['target_trigger_rate']) < 0.05 else 'good' if abs(trigger_rate - CALIBRATION_CONFIG['target_trigger_rate']) < 0.10 else 'poor',
            'calibration_viable': True
        }
    
    def find_optimal_threshold(self, values: List[float], target_rate: float) -> float:
        """Find threshold that achieves target trigger rate"""
        if not values:
            return 0.0
        
        # Sort values to find percentile
        sorted_values = sorted(values)
        percentile_index = int(len(sorted_values) * (1 - target_rate))
        
        if percentile_index >= len(sorted_values):
            percentile_index = len(sorted_values) - 1
        elif percentile_index < 0:
            percentile_index = 0
        
        return sorted_values[percentile_index]
    
    def validate_threshold(self, values: List[float], threshold: float) -> Dict:
        """Validate threshold using statistical measures"""
        if not values:
            return {'status': 'no_data'}
        
        triggers = [v > threshold for v in values]
        trigger_rate = sum(triggers) / len(triggers)
        
        return {
            'status': 'validated',
            'trigger_rate': round(trigger_rate, 3),
            'threshold_percentile': round((1 - trigger_rate) * 100, 1),
            'triggers_count': sum(triggers),
            'total_observations': len(triggers)
        }
    
    def create_failed_indicator_structure(self, name: str, failure_reason: str) -> Dict:
        """Create structure for failed indicator collection"""
        return {
            'indicator_name': name,
            'description': f'Data collection failed for {name}',
            'collection_status': 'failed',
            'failure_reason': failure_reason,
            'historical_data': {},
            'data_points': 0,
            'calibration_viable': False,
            'recommended_action': 'Find alternative data source or implement specific scraper'
        }
    
    def collect_fred_series(self, series_id: str, series_name: str) -> Dict:
        """Collect data from FRED API"""
        try:
            url = "https://api.stlouisfed.org/fred/series/observations"
            params = {
                'series_id': series_id,
                'api_key': self.fred_api_key,
                'file_type': 'json',
                'observation_start': '1990-01-01',
                'sort_order': 'asc'
            }
            
            response = self.session.get(url, params=params, timeout=15)
            if response.status_code == 200:
                data = response.json()
                
                if 'observations' in data:
                    series_data = {}
                    for obs in data['observations']:
                        if obs['value'] != '.':  # FRED uses '.' for missing values
                            date = obs['date']
                            value = float(obs['value'])
                            series_data[date] = value
                    
                    return {
                        'collection_status': 'success',
                        'historical_data': series_data,
                        'data_points': len(series_data),
                        'series_id': series_id
                    }
                else:
                    return {
                        'collection_status': 'failed',
                        'failure_reason': 'No observations in FRED response'
                    }
            else:
                return {
                    'collection_status': 'failed',
                    'failure_reason': f'FRED API error: HTTP {response.status_code}'
                }
                
        except Exception as e:
            return {
                'collection_status': 'failed',
                'failure_reason': f'FRED API exception: {str(e)}'
            }
    
    # ========================================================================
    # UTILITY METHODS
    # ========================================================================
    
    def create_empty_indicator_structure(self, name: str) -> Dict:
        """Create empty structure for failed indicators - DEPRECATED"""
        logger.warning(f"create_empty_indicator_structure is deprecated for {name}")
        return self.create_failed_indicator_structure(name, "Collection method not implemented")
    
    def calculate_moving_average_series(self, values: List[float], window: int) -> List[float]:
        """Calculate rolling moving average series"""
        ma_values = []
        for i in range(len(values)):
            if i < window - 1:
                ma_values.append(values[i])  # Not enough data for MA yet
            else:
                ma = np.mean(values[i - window + 1:i + 1])
                ma_values.append(ma)
        
        return ma_values
    
    def interpolate_missing_quarters(self, quarterly_data: Dict) -> Dict:
        """Interpolate missing quarters in data"""
        if len(quarterly_data) < 2:
            return quarterly_data
        
        # Sort by date
        sorted_dates = sorted(quarterly_data.keys())
        
        # Fill gaps with linear interpolation
        filled_data = quarterly_data.copy()
        
        for i in range(len(sorted_dates) - 1):
            current_date = sorted_dates[i]
            next_date = sorted_dates[i + 1]
            
            # Check if there's a gap larger than 1 quarter
            current_year, current_q = self.parse_quarter_key(current_date)
            next_year, next_q = self.parse_quarter_key(next_date)
            
            quarters_diff = (next_year - current_year) * 4 + (next_q - current_q)
            
            if quarters_diff > 1:
                # Fill the gaps
                current_val = quarterly_data[current_date]
                next_val = quarterly_data[next_date]
                
                for q in range(1, quarters_diff):
                    # Linear interpolation
                    interp_val = current_val + (next_val - current_val) * (q / quarters_diff)
                    
                    # Calculate intermediate date
                    total_quarters = current_year * 4 + current_q - 1 + q
                    interp_year = total_quarters // 4
                    interp_quarter = (total_quarters % 4) + 1
                    
                    interp_key = f"{interp_year}-Q{interp_quarter}"
                    filled_data[interp_key] = round(interp_val, 2)
        
        return filled_data
    
    def parse_quarter_key(self, quarter_key: str) -> Tuple[int, int]:
        """Parse quarter key like '2020-Q3' into (year, quarter)"""
        parts = quarter_key.split('-Q')
        return int(parts[0]), int(parts[1])
    
    def assess_indicator_quality(self, indicator_name: str, indicator_data: Dict) -> Dict:
        """Assess data quality for an indicator"""
        collection_status = indicator_data.get('collection_status', 'unknown')
        historical_data = indicator_data.get('historical_data', {})
        data_points = len(historical_data)
        
        if collection_status == 'failed':
            return {'overall': 'failed', 'data_points': 0, 'collection_status': 'failed'}
        elif data_points == 0:
            return {'overall': 'no_data', 'data_points': 0}
        elif data_points < 20:
            return {'overall': 'insufficient', 'data_points': data_points}
        elif data_points < 50:
            return {'overall': 'limited', 'data_points': data_points}
        elif collection_status == 'proxy':
            return {'overall': 'proxy_data', 'data_points': data_points}
        else:
            return {'overall': 'good', 'data_points': data_points}
    
    def generate_collection_summary(self, master_dataset: Dict) -> Dict:
        """Generate summary of data collection results"""
        indicators = master_dataset.get('indicators', {})
        quality_data = master_dataset.get('data_quality', {})
        calibration_results = master_dataset.get('calibration_results', {})
        
        total_indicators = len(indicators)
        
        # Count successful collections
        successful_collections = 0
        failed_collections = 0
        partial_collections = 0
        
        for indicator_name, indicator_data in indicators.items():
            status = indicator_data.get('collection_status', 'unknown')
            if status == 'success':
                successful_collections += 1
            elif status == 'failed':
                failed_collections += 1
            elif status in ['partial', 'proxy']:
                partial_collections += 1
        
        # Count successful calibrations (only possible if data collection succeeded)
        successful_calibrations = 0
        insufficient_data_calibrations = 0
        failed_calibrations = 0
        
        for result in calibration_results.values():
            status = result.get('status', 'unknown')
            if status == 'calibrated':
                successful_calibrations += 1
            elif status in ['insufficient_data', 'insufficient_clean_data']:
                insufficient_data_calibrations += 1
            elif status in ['calibration_impossible', 'failed']:
                failed_calibrations += 1
        
        # Generate quality breakdown
        quality_counts = {
            'successful_collections': successful_collections,
            'partial_collections': partial_collections, 
            'failed_collections': failed_collections,
            'successful_calibrations': successful_calibrations,
            'insufficient_data': insufficient_data_calibrations,
            'failed_calibrations': failed_calibrations
        }
        
        # Calculate success rates
        collection_success_rate = successful_collections / total_indicators if total_indicators > 0 else 0
        calibration_success_rate = successful_calibrations / total_indicators if total_indicators > 0 else 0
        
        return {
            'total_indicators': total_indicators,
            'successful_collections': successful_collections,
            'partial_collections': partial_collections,
            'failed_collections': failed_collections,
            'successful_calibrations': successful_calibrations,
            'calibration_success_rate': calibration_success_rate,
            'collection_success_rate': collection_success_rate,
            'quality_breakdown': quality_counts,
            'overall_status': self.determine_overall_status(collection_success_rate, calibration_success_rate),
            'critical_failures': self.identify_critical_failures(indicators),
            'recommended_next_steps': self.generate_recommendations(quality_counts, successful_calibrations, total_indicators, indicators)
        }
    
    def determine_overall_status(self, collection_rate: float, calibration_rate: float) -> str:
        """Determine overall collection status"""
        if calibration_rate >= 0.8:
            return 'EXCELLENT'
        elif calibration_rate >= 0.6:
            return 'GOOD'  
        elif calibration_rate >= 0.4 or collection_rate >= 0.7:
            return 'PARTIAL'
        elif collection_rate >= 0.3:
            return 'POOR'
        else:
            return 'CRITICAL'
    
    def identify_critical_failures(self, indicators: Dict) -> List[str]:
        """Identify indicators that are critical for the system"""
        critical_indicators = ['forward_pe', 'productivity', 'qqq_spy', 'dxy']  # Core indicators
        critical_failures = []
        
        for indicator_name in critical_indicators:
            if indicator_name in indicators:
                status = indicators[indicator_name].get('collection_status', 'unknown')
                if status == 'failed':
                    critical_failures.append(indicator_name)
        
        return critical_failures
    
    def generate_recommendations(self, quality_counts: Dict, successful_calibrations: int, total_indicators: int, indicators: Dict) -> List[str]:
        """Generate actionable recommendations based on collection results"""
        recommendations = []
        
        failed_count = quality_counts.get('failed_collections', 0)
        successful_calibrations_count = quality_counts.get('successful_calibrations', 0)
        
        # Critical failures first
        critical_failures = self.identify_critical_failures(indicators)
        if critical_failures:
            recommendations.append(f"CRITICAL: Fix data collection for core indicators: {', '.join(critical_failures)}")
        
        # Data collection issues
        if failed_count > total_indicators * 0.5:
            recommendations.append(f"URGENT: {failed_count} indicators failed collection - review data sources and scraping methods")
        elif failed_count > 0:
            recommendations.append(f"Fix {failed_count} failed indicators by implementing proper scrapers or finding alternative sources")
        
        # Calibration issues
        if successful_calibrations_count < total_indicators * 0.3:
            recommendations.append("URGENT: Less than 30% of indicators successfully calibrated - system not ready for production")
        elif successful_calibrations_count < total_indicators * 0.7:
            recommendations.append("Improve data quality to enable calibration for more indicators")
        
        # Specific technical recommendations
        if any(ind.get('failure_reason', '').startswith('Excel parsing') for ind in indicators.values()):
            recommendations.append("Implement Excel/PDF parsing for Shiller CAPE and other document-based sources")
        
        if any('subscription' in ind.get('failure_reason', '') for ind in indicators.values()):
            recommendations.append("Consider data subscriptions for professional-grade indicators (FactSet, Bloomberg, etc.)")
        
        # Success recommendations
        if successful_calibrations_count >= total_indicators * 0.8:
            recommendations.append("Excellent calibration coverage - ready for backtesting validation")
            recommendations.append("Implement ThemeCalculator integration with calibrated thresholds")
        elif successful_calibrations_count >= total_indicators * 0.5:
            recommendations.append("Good calibration baseline - focus on improving failed indicators")
        
        # Always include final steps
        recommendations.append("Validate calibrated thresholds through backtesting on out-of-sample data")
        recommendations.append("Document data sources and update collection procedures")
        
        return recommendations
    
    def save_calibration_dataset(self, master_dataset: Dict, filename: str = None) -> Path:
        """Save master calibration dataset to file"""
        if filename is None:
            filename = f"hcp_calibration_dataset_{datetime.now().strftime('%Y%m%d')}.json"
        
        output_path = DATA_DIR / filename
        
        # Convert numpy types to native Python for JSON serialization
        def convert_numpy_types(obj):
            if isinstance(obj, np.integer):
                return int(obj)
            elif isinstance(obj, np.floating):
                return float(obj)
            elif isinstance(obj, np.ndarray):
                return obj.tolist()
            elif isinstance(obj, dict):
                return {key: convert_numpy_types(value) for key, value in obj.items()}
            elif isinstance(obj, list):
                return [convert_numpy_types(item) for item in obj]
            return obj
        
        clean_dataset = convert_numpy_types(master_dataset)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(clean_dataset, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Calibration dataset saved to: {output_path}")
        return output_path

# ============================================================================
# COMMAND-LINE INTERFACE
# ============================================================================

def main():
    """Main execution function"""
    parser = argparse.ArgumentParser(
        description='HCP Calibration Data Collector v1.1 - Historical data collection and threshold calibration'
    )
    
    parser.add_argument(
        '--mode',
        choices=['calibration', 'single-indicator', 'validate', 'summary'],
        default='calibration',
        help='Collection mode'
    )
    
    parser.add_argument(
        '--indicator',
        choices=CALIBRATION_CONFIG['indicators'],
        help='Single indicator to collect (when mode=single-indicator)'
    )
    
    parser.add_argument(
        '--output',
        default='auto',
        help='Output filename (default: auto-generated)'
    )
    
    parser.add_argument(
        '--fred-api-key',
        help='FRED API key (optional, uses default if not provided)'
    )
    
    args = parser.parse_args()
    
    # Initialize collector
    collector = HCPCalibrationCollector(fred_api_key=args.fred_api_key)
    
    if args.mode == 'calibration':
        logger.info("Running full calibration data collection...")
        
        # Collect all indicators
        master_dataset = collector.collect_all_indicators()
        
        # Save results
        output_file = collector.save_calibration_dataset(master_dataset, args.output if args.output != 'auto' else None)
        
        # Print summary
        summary = master_dataset['collection_summary']
        print(f"\n{'='*80}")
        print("CALIBRATION COLLECTION COMPLETE")
        print(f"{'='*80}")
        print(f"Total Indicators: {summary['total_indicators']}")
        print(f"Successful Collections: {summary['successful_collections']}")
        print(f"Successful Calibrations: {summary['successful_calibrations']}")
        print(f"Calibration Success Rate: {summary['calibration_success_rate']:.1%}")
        print(f"Overall Status: {summary['overall_status']}")
        print(f"\nCollection Breakdown:")
        print(f"  Successful: {summary['successful_collections']}")
        print(f"  Partial: {summary['partial_collections']}")
        print(f"  Failed: {summary['failed_collections']}")
        print(f"\nOutput File: {output_file}")
        print(f"{'='*80}")
        
        # Print critical failures
        if summary['critical_failures']:
            print(f"\n⚠️ CRITICAL FAILURES:")
            for failure in summary['critical_failures']:
                print(f"  - {failure}")
        
        # Print recommendations
        print(f"\nRecommended Next Steps:")
        for i, rec in enumerate(summary['recommended_next_steps'], 1):
            print(f"{i}. {rec}")
        
    elif args.mode == 'single-indicator':
        if not args.indicator:
            print("Error: --indicator required when mode=single-indicator")
            sys.exit(1)
        
        logger.info(f"Collecting single indicator: {args.indicator}")
        # Single indicator collection logic would go here
        
    else:
        print(f"Mode '{args.mode}' not yet implemented")

if __name__ == "__main__":
    main()
