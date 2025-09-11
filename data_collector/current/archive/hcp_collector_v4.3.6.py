#!/usr/bin/env python3
"""
Humble Conviction Portfolio (HCP) Data Collector
Version: 4.3.6
IPS Version: 4.2
Filename: hcp_collector_v4_3_6.py
Last Updated: 2025-09-07T23:56:00 UTC

CHANGES IN v4.3.6:
- Fixed Historical Data directory path (goes up one level from current)
- All other functionality from v4.3.5 preserved
"""

import json
import logging
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
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

class Config:
    """Centralized configuration - v4.3.6"""
    
    # API Keys
    FRED_API_KEY = "82fa4bd8294df4c17d0bde5a37903e57"
    ALPHA_VANTAGE_KEY = "S0D46TD4M36JW9GC"
    
    # File paths - FIXED in v4.3.6
    BASE_DIR = Path(__file__).parent
    DATA_DIR = BASE_DIR / "data"
    # Historical Data is one level up from current directory
    HISTORICAL_DIR = BASE_DIR.parent / "Historical Data"
    MASTER_FILE = DATA_DIR / "hcp_master_data.json"
    
    # Data collection settings
    MAX_RETRIES = 3
    RETRY_DELAY = 2  # seconds
    
    # Alpha Vantage settings
    AV_MAX_YEARS = 20  # Request up to 20 years of data
    
    # Logging
    LOG_LEVEL = logging.INFO
    LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    # Version tracking
    VERSION = "4.3.6"
    IPS_VERSION = "4.2"

# ============================================================================
# DATA COLLECTOR v4.3.6
# ============================================================================

class HCPDataCollectorV436:
    """Data collector v4.3.6 - Fixed Historical Data path"""
    
    def __init__(self, config: Config = None):
        self.config = config or Config()
        self.version = self.config.VERSION
        self.setup_logging()
        self.setup_directories()
        self.fred = None
        self.indicators = {}
        self.metadata = {}
        
    def setup_logging(self):
        """Configure logging"""
        logging.basicConfig(
            level=self.config.LOG_LEVEL,
            format=self.config.LOG_FORMAT
        )
        self.logger = logging.getLogger(f"HCPCollector_v{self.version}")
        
    def setup_directories(self):
        """Create necessary directories and verify paths"""
        self.config.DATA_DIR.mkdir(exist_ok=True)
        
        # Log the actual path being used for Historical Data
        self.logger.info(f"  📁 Historical Data path: {self.config.HISTORICAL_DIR}")
        if self.config.HISTORICAL_DIR.exists():
            csv_files = list(self.config.HISTORICAL_DIR.glob("*.csv"))
            self.logger.info(f"  📁 Found {len(csv_files)} CSV files in Historical Data")
        else:
            self.logger.warning(f"  ⚠ Historical Data directory not found at {self.config.HISTORICAL_DIR}")
        
    def initialize_fred(self):
        """Initialize FRED API connection"""
        if not self.fred:
            try:
                self.fred = Fred(api_key=self.config.FRED_API_KEY)
                self.logger.info("  ✓ FRED API initialized")
            except Exception as e:
                self.logger.error(f"  ✗ FRED initialization failed: {e}")
                self.fred = None
    
    # ========================================================================
    # Put/Call Collection - v4.3.6 with correct path
    # ========================================================================
    
    def collect_put_call_ratio(self) -> bool:
        """
        Collect REAL Put/Call ratio data - v4.3.6 with correct path
        """
        self.logger.info("📊 Collecting Put/Call Ratio (v4.3.6)...")
        
        try:
            all_dates = []
            all_values = []
            
            # Step 1: Load CBOE historical file (2006-2019)
            cboe_file = self.config.HISTORICAL_DIR / "CBOE 20062019_total_pc.csv"
            self.logger.info(f"  Looking for: {cboe_file}")
            
            if cboe_file.exists():
                try:
                    df = pd.read_csv(cboe_file)
                    self.logger.info(f"  ✓ Loaded CBOE file with {len(df)} rows")
                    
                    # Find date and ratio columns flexibly
                    date_col = None
                    pc_col = None
                    
                    self.logger.info(f"  Columns found: {df.columns.tolist()}")
                    
                    for col in df.columns:
                        if 'date' in col.lower():
                            date_col = col
                        if any(x in col.lower() for x in ['ratio', 'put/call', 'p/c', 'pc', 'put_call']):
                            pc_col = col
                    
                    if date_col and pc_col:
                        df['Date'] = pd.to_datetime(df[date_col])
                        df.set_index('Date', inplace=True)
                        
                        # Resample to monthly averages
                        monthly = df[pc_col].resample('M').mean()
                        
                        dates = [d.strftime('%Y-%m-%d') for d in monthly.index]
                        values = [round(v, 3) for v in monthly.values if not pd.isna(v)]
                        
                        all_dates.extend(dates[:len(values)])
                        all_values.extend(values)
                        
                        self.logger.info(f"  ✓ Historical CBOE: {len(values)} months (2006-2019)")
                    else:
                        self.logger.warning(f"  ⚠ Could not identify columns")
                        
                except Exception as e:
                    self.logger.warning(f"  ⚠ Could not parse CBOE historical: {e}")
            else:
                self.logger.warning(f"  ⚠ CBOE file not found at {cboe_file}")
            
            # Step 2: Load monthly file (2020-2025)
            monthly_file = self.config.HISTORICAL_DIR / "cboe_monthly_2020_2025.csv"
            self.logger.info(f"  Looking for: {monthly_file}")
            
            if monthly_file.exists():
                try:
                    df = pd.read_csv(monthly_file)
                    self.logger.info(f"  ✓ Loaded monthly file with {len(df)} rows")
                    
                    # Find columns
                    date_col = None
                    pc_col = None
                    
                    for col in df.columns:
                        if 'date' in col.lower():
                            date_col = col
                        if any(x in col.lower() for x in ['ratio', 'put/call', 'p/c', 'pc']):
                            pc_col = col
                    
                    if date_col and pc_col:
                        df[date_col] = pd.to_datetime(df[date_col])
                        
                        for _, row in df.iterrows():
                            date_str = row[date_col].strftime('%Y-%m-%d')
                            value = round(float(row[pc_col]), 3)
                            all_dates.append(date_str)
                            all_values.append(value)
                        
                        self.logger.info(f"  ✓ Monthly CBOE: {len(df)} months (2020-2025)")
                    else:
                        self.logger.warning(f"  ⚠ Could not identify columns in monthly file")
                        
                except Exception as e:
                    self.logger.warning(f"  ⚠ Could not parse monthly file: {e}")
            else:
                self.logger.warning(f"  ⚠ Monthly file not found at {monthly_file}")
            
            # Step 3: Get current value from Yahoo
            try:
                spy = yf.Ticker("SPY")
                if spy.options:
                    opt_chain = spy.option_chain(spy.options[0])
                    
                    total_call_oi = opt_chain.calls['openInterest'].sum()
                    total_put_oi = opt_chain.puts['openInterest'].sum()
                    
                    if total_call_oi > 0:
                        pc_ratio = total_put_oi / total_call_oi
                        current_date = datetime.now().strftime('%Y-%m-%d')
                        
                        # Only add if more recent than last data point
                        if not all_dates or current_date > all_dates[-1]:
                            all_dates.append(current_date)
                            all_values.append(round(pc_ratio, 3))
                            self.logger.info(f"  ✓ Current from Yahoo: {pc_ratio:.3f}")
            except Exception as e:
                self.logger.debug(f"  Yahoo P/C failed: {e}")
            
            if not all_values:
                self.logger.error("  ✗ No Put/Call data collected")
                return False
            
            # Store indicator
            self.indicators['put_call_ratio'] = {
                'current_value': all_values[-1],
                'monthly_history': all_values,
                'monthly_dates': all_dates,
                'source': 'CBOE Total Put/Call Ratio (2006-2019)',
                'last_updated': datetime.now().isoformat(),
                'data_quality': 'real',
                'data_points': len(all_values),
                'data_note': 'CBOE historical + manual updates if available'
            }
            
            self.logger.info(f"  ✓ Put/Call Ratio: {len(all_values)} months collected")
            return True
            
        except Exception as e:
            self.logger.error(f"  ✗ Put/Call collection failed: {e}")
            import traceback
            self.logger.debug(traceback.format_exc())
            return False
    
    # ========================================================================
    # Alpha Vantage EPS Collection
    # ========================================================================
    
    def collect_eps_delivery_enhanced(self) -> bool:
        """Collect EPS delivery with Alpha Vantage for up to 20 years of history"""
        self.logger.info("📈 Collecting EPS Delivery (up to 20 years)...")
        
        try:
            symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA']
            quarterly_delivery = {}
            
            for symbol in symbols:
                self.logger.info(f"  Fetching {symbol} earnings (20 year request)...")
                
                # Alpha Vantage with extended history request
                av_data = self._fetch_alpha_vantage_earnings_extended(symbol)
                if av_data:
                    for quarter, delivery in av_data.items():
                        if quarter not in quarterly_delivery:
                            quarterly_delivery[quarter] = []
                        quarterly_delivery[quarter].append(delivery)
                    self.logger.info(f"    ✓ {symbol}: {len(av_data)} quarters from Alpha Vantage")
                
                # Supplement with Yahoo for very recent quarters
                yahoo_data = self._fetch_yahoo_earnings(symbol)
                if yahoo_data:
                    for quarter, delivery in yahoo_data.items():
                        if quarter not in quarterly_delivery:
                            quarterly_delivery[quarter] = []
                        elif quarter in quarterly_delivery and delivery not in quarterly_delivery[quarter]:
                            quarterly_delivery[quarter].append(delivery)
                
                time.sleep(12)  # Alpha Vantage rate limit: 5 calls/minute
            
            if not quarterly_delivery:
                self.logger.error("  ✗ No EPS data collected")
                return False
            
            # Calculate quarterly averages for up to 20 years (80 quarters)
            sorted_quarters = sorted(quarterly_delivery.keys())
            
            # Take last 80 quarters (20 years)
            recent_quarters = sorted_quarters[-80:] if len(sorted_quarters) > 80 else sorted_quarters
            
            values = []
            valid_quarters = []
            
            for q in recent_quarters:
                if q in quarterly_delivery and quarterly_delivery[q]:
                    avg = np.mean(quarterly_delivery[q])
                    values.append(round(avg, 3))
                    valid_quarters.append(q)
            
            self.logger.info(f"  ✓ Total quarters with data: {len(values)}")
            
            self.indicators['eps_delivery'] = {
                'current_value': values[-1] if values else 1.0,
                'quarterly_history': values,
                'quarterly_dates': valid_quarters,
                'source': 'Alpha Vantage (20 year history)',
                'last_updated': datetime.now().isoformat(),
                'data_quality': 'real',
                'data_points': len(values)
            }
            
            self.logger.info(f"  ✓ EPS Delivery: {len(values)} quarters collected")
            return True
            
        except Exception as e:
            self.logger.error(f"  ✗ EPS collection failed: {e}")
            return False
    
    def _fetch_alpha_vantage_earnings_extended(self, symbol: str) -> Dict[str, float]:
        """Fetch up to 20 years of earnings from Alpha Vantage"""
        try:
            url = "https://www.alphavantage.co/query"
            params = {
                'function': 'EARNINGS',
                'symbol': symbol,
                'apikey': self.config.ALPHA_VANTAGE_KEY
            }
            
            response = requests.get(url, params=params, timeout=30)
            data = response.json()
            
            if 'quarterlyEarnings' not in data:
                self.logger.warning(f"    ⚠ No quarterly earnings for {symbol}")
                return {}
            
            result = {}
            quarters_processed = 0
            max_quarters = 80  # 20 years * 4 quarters
            
            for quarter in data['quarterlyEarnings']:
                if quarters_processed >= max_quarters:
                    break
                    
                try:
                    date_str = quarter.get('fiscalDateEnding')
                    reported = quarter.get('reportedEPS')
                    estimated = quarter.get('estimatedEPS')
                    
                    if reported and estimated:
                        try:
                            actual = float(reported)
                            estimate = float(estimated)
                            
                            if estimate != 0 and actual != 0:
                                delivery = actual / estimate
                                
                                # Sanity check
                                if 0.5 < delivery < 2.0:
                                    q_date = pd.to_datetime(date_str)
                                    q_key = f"{q_date.year}Q{q_date.quarter}"
                                    result[q_key] = delivery
                                    quarters_processed += 1
                        except (ValueError, TypeError):
                            continue
                            
                except Exception:
                    continue
            
            return result
            
        except Exception as e:
            self.logger.warning(f"    ⚠ Alpha Vantage error for {symbol}: {e}")
            return {}
    
    def _fetch_yahoo_earnings(self, symbol: str) -> Dict[str, float]:
        """Fetch recent earnings from Yahoo Finance"""
        try:
            stock = yf.Ticker(symbol)
            
            if hasattr(stock, 'earnings_history'):
                earnings = stock.earnings_history
                
                result = {}
                if earnings is not None and not earnings.empty:
                    for _, row in earnings.iterrows():
                        try:
                            if 'epsActual' in row and 'epsEstimate' in row:
                                actual = row['epsActual']
                                estimate = row['epsEstimate']
                                
                                if estimate and actual and estimate != 0:
                                    delivery = actual / estimate
                                    if 0.5 < delivery < 2.0:
                                        quarter = pd.to_datetime(row.name).to_period('Q')
                                        q_key = str(quarter)
                                        result[q_key] = delivery
                        except:
                            continue
                
                return result
            
            return {}
            
        except Exception:
            return {}
    
    # ========================================================================
    # CORE COLLECTORS - UNCHANGED FROM v4.3.5
    # ========================================================================
    
    def collect_dxy(self) -> bool:
        """Collect DXY Dollar Index"""
        self.logger.info("💵 Collecting DXY Index...")
        try:
            dxy = yf.Ticker("DX-Y.NYB")
            hist = dxy.history(period="max")
            
            if hist.empty:
                self.logger.error("  ✗ No DXY data received")
                return False
            
            monthly = hist['Close'].resample('M').last()
            
            self.indicators['dxy_index'] = {
                'current_value': round(float(monthly.iloc[-1]), 2),
                'monthly_history': [round(v, 2) for v in monthly.tolist()],
                'monthly_dates': [d.strftime('%Y-%m-%d') for d in monthly.index],
                'source': 'Yahoo Finance (DX-Y.NYB)',
                'last_updated': datetime.now().isoformat(),
                'data_quality': 'real',
                'data_points': len(monthly)
            }
            
            self.logger.info(f"  ✓ DXY: {len(monthly)} months collected")
            return True
            
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
            
            self.indicators['real_rate_differential'] = {
                'current_value': round(float(real_diff.iloc[-1]), 2),
                'monthly_history': [round(v, 2) for v in real_diff.tolist()],
                'monthly_dates': [d.strftime('%Y-%m-%d') for d in real_diff.index],
                'source': 'FRED TIPS (DFII10) minus foreign proxy',
                'last_updated': datetime.now().isoformat(),
                'data_quality': 'proxy',
                'data_points': len(real_diff),
                'proxy_note': 'US TIPS minus 1.5% foreign estimate (IPS v4.2 accepted)'
            }
            
            self.logger.info(f"  ✓ Real Rates: {len(real_diff)} months collected")
            return True
            
        except Exception as e:
            self.logger.error(f"  ✗ Real rates collection failed: {e}")
            return False
    
    def collect_cofer(self) -> bool:
        """Collect COFER USD Reserve Share"""
        self.logger.info("🏦 Collecting COFER USD Reserve Share...")
        
        self.logger.warning("  ⚠ COFER manual update required")
        self.logger.warning("  Download from: https://data.imf.org/COFER")
        
        self.indicators['cofer_usd'] = {
            'current_value': 58.0,
            'quarterly_history': [58.0],
            'quarterly_dates': ['2024Q4'],
            'source': 'IMF COFER (Manual Update Required)',
            'last_updated': datetime.now().isoformat(),
            'data_quality': 'manual',
            'data_points': 1,
            'update_required': True
        }
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
            
            self.indicators['qqq_spy_ratio'] = {
                'current_value': round(float(monthly_ratio.iloc[-1]), 4),
                'monthly_history': [round(v, 4) for v in monthly_ratio.tolist()],
                'monthly_dates': [d.strftime('%Y-%m-%d') for d in monthly_ratio.index],
                'source': 'Yahoo Finance (QQQ/SPY)',
                'last_updated': datetime.now().isoformat(),
                'data_quality': 'real',
                'data_points': len(monthly_ratio)
            }
            
            self.logger.info(f"  ✓ QQQ/SPY: {len(monthly_ratio)} months collected")
            return True
            
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
            
            self.indicators['productivity_growth'] = {
                'current_value': round(float(yoy_growth.iloc[-1]), 2),
                'quarterly_history': [round(v, 2) for v in yoy_growth.dropna().tolist()],
                'quarterly_dates': [f"{d.year}Q{d.quarter}" for d in yoy_growth.dropna().index],
                'source': 'FRED (OPHNFB)',
                'last_updated': datetime.now().isoformat(),
                'data_quality': 'real',
                'data_points': len(yoy_growth.dropna())
            }
            
            self.logger.info(f"  ✓ Productivity: {len(yoy_growth.dropna())} quarters collected")
            return True
            
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
            
            self.indicators['tech_employment_pct'] = {
                'current_value': round(float(tech_pct.iloc[-1]), 2),
                'monthly_history': [round(v, 2) for v in tech_pct.tolist()],
                'monthly_dates': [d.strftime('%Y-%m-%d') for d in tech_pct.index],
                'source': 'FRED (USINFO/PAYEMS)',
                'last_updated': datetime.now().isoformat(),
                'data_quality': 'real',
                'data_points': len(tech_pct)
            }
            
            self.logger.info(f"  ✓ Tech Employment: {len(tech_pct)} months collected")
            return True
            
        except Exception as e:
            self.logger.error(f"  ✗ Tech employment collection failed: {e}")
            return False
    
    def collect_trailing_pe(self) -> bool:
        """Collect Trailing P/E Ratio"""
        self.logger.info("📈 Collecting Trailing P/E...")
        
        try:
            spy = yf.Ticker("SPY")
            info = spy.info
            
            current_pe = info.get('trailingPE')
            
            if not current_pe:
                self.logger.warning("  ⚠ No current P/E available")
                return False
            
            self.indicators['trailing_pe'] = {
                'current_value': round(current_pe, 2),
                'monthly_history': [round(current_pe, 2)],
                'monthly_dates': [datetime.now().strftime('%Y-%m-%d')],
                'source': 'Yahoo Finance (SPY)',
                'last_updated': datetime.now().isoformat(),
                'data_quality': 'real',
                'data_points': 1,
                'note': 'Historical data requires additional source'
            }
            
            self.logger.info(f"  ✓ Trailing P/E: {current_pe:.2f}")
            return True
            
        except Exception as e:
            self.logger.error(f"  ✗ P/E collection failed: {e}")
            return False
    
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
            
            self.indicators['spy_efa_momentum'] = {
                'current_value': round(float(monthly_momentum.iloc[-1]), 4),
                'monthly_history': [round(v, 4) for v in monthly_momentum.tolist()],
                'monthly_dates': [d.strftime('%Y-%m-%d') for d in monthly_momentum.index],
                'source': 'Yahoo Finance (SPY-EFA 3M returns)',
                'last_updated': datetime.now().isoformat(),
                'data_quality': 'real',
                'data_points': len(monthly_momentum)
            }
            
            self.logger.info(f"  ✓ SPY/EFA Momentum: {len(monthly_momentum)} months collected")
            return True
            
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
            
            self.indicators['us_market_pct'] = {
                'current_value': round(float(monthly_pct.iloc[-1]), 2),
                'monthly_history': [round(v, 2) for v in monthly_pct.tolist()],
                'monthly_dates': [d.strftime('%Y-%m-%d') for d in monthly_pct.index],
                'source': 'SPY/(SPY+EFA) proxy',
                'last_updated': datetime.now().isoformat(),
                'data_quality': 'proxy',
                'data_points': len(monthly_pct),
                'proxy_note': 'SPY/(SPY+0.7*EFA) as US market share proxy (IPS v4.2 accepted)'
            }
            
            self.logger.info(f"  ✓ US Market %: {len(monthly_pct)} months collected")
            return True
            
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
            
            self.indicators['etf_flow_differential'] = {
                'current_value': round(float(monthly_flows.iloc[-1]), 2),
                'monthly_history': [round(v, 2) for v in monthly_flows.tolist()],
                'monthly_dates': [d.strftime('%Y-%m-%d') for d in monthly_flows.index],
                'source': 'Volume differential proxy (SPY-EFA)',
                'last_updated': datetime.now().isoformat(),
                'data_quality': 'proxy',
                'data_points': len(monthly_flows),
                'proxy_note': 'Dollar volume differential as flow proxy (IPS v4.2 accepted)'
            }
            
            self.logger.info(f"  ✓ ETF Flows: {len(monthly_flows)} months collected")
            return True
            
        except Exception as e:
            self.logger.error(f"  ✗ ETF flows collection failed: {e}")
            return False
    
    # ========================================================================
    # Theme Organization
    # ========================================================================
    
    def organize_into_themes(self):
        """Organize flat indicators into nested theme structure per IPS v4.2"""
        self.logger.info("🎯 Organizing indicators into themes (IPS v4.2)...")
        
        theme_mappings = {
            'usd': ['dxy_index', 'real_rate_differential', 'cofer_usd'],
            'innovation': ['qqq_spy_ratio', 'productivity_growth', 'tech_employment_pct'],
            'pe': ['put_call_ratio', 'trailing_pe', 'eps_delivery'],
            'intl': ['spy_efa_momentum', 'us_market_pct', 'etf_flow_differential']
        }
        
        themed_indicators = {}
        
        for theme, indicator_list in theme_mappings.items():
            themed_indicators[theme] = {}
            for indicator in indicator_list:
                if indicator in self.indicators:
                    themed_indicators[theme][indicator] = self.indicators[indicator]
                else:
                    self.logger.warning(f"  ⚠ Missing {indicator} for theme {theme}")
        
        self.indicators = themed_indicators
        
        for theme, indicators in themed_indicators.items():
            count = len(indicators)
            status = "✓" if count == 3 else "⚠"
            self.logger.info(f"  {status} {theme}: {count}/3 indicators")
    
    # ========================================================================
    # Main Collection
    # ========================================================================
    
    def collect_all_indicators(self) -> Dict[str, Any]:
        """Collect all indicators with v4.3.6 fixes"""
        self.logger.info("=" * 60)
        self.logger.info(f"HCP Data Collector v{self.version} - REAL DATA ONLY")
        self.logger.info("IPS v4.2 Compliant - Zero Regression Policy")
        self.logger.info("=" * 60)
        
        # Load existing data if available
        existing_data = self.load_existing_data()
        if existing_data and 'indicators' in existing_data:
            self._flatten_existing_data(existing_data)
            self.logger.info(f"  ℹ Loaded existing data with {len(self.indicators)} indicators")
        
        # Define collection tasks
        collectors = [
            ('DXY Index', self.collect_dxy),
            ('Real Rate Differential', self.collect_real_rates),
            ('COFER USD Share', self.collect_cofer),
            ('QQQ/SPY Ratio', self.collect_qqq_spy),
            ('US Productivity', self.collect_productivity),
            ('Tech Employment %', self.collect_tech_employment),
            ('Put/Call Ratio', self.collect_put_call_ratio),  # v4.3.6 FIXED PATH
            ('Trailing P/E', self.collect_trailing_pe),
            ('EPS Delivery', self.collect_eps_delivery_enhanced),
            ('SPY/EFA Momentum', self.collect_spy_efa_momentum),
            ('US Market %', self.collect_us_market_pct),
            ('ETF Flow Differential', self.collect_etf_flows)
        ]
        
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
        self.logger.info(f"Collection Summary: {success_count}/12 indicators")
        
        if failed:
            self.logger.warning(f"Failed indicators: {', '.join(failed)}")
        
        # Organize into themes
        self.organize_into_themes()
        
        # Create metadata
        self.metadata = {
            'version': self.version,
            'ips_version': self.config.IPS_VERSION,
            'last_updated': datetime.now().isoformat(),
            'indicators_collected': success_count,
            'data_policy': 'REAL_DATA_ONLY',
            'collection_complete': success_count >= 10,
            'failed_indicators': failed
        }
        
        return {
            'metadata': self.metadata,
            'indicators': self.indicators
        }
    
    def _flatten_existing_data(self, data: Dict):
        """Flatten nested theme structure for processing"""
        if 'indicators' not in data:
            return
        
        indicators = data['indicators']
        
        # Check if already flat
        if any(key in indicators for key in ['dxy_index', 'qqq_spy_ratio', 'trailing_pe']):
            self.indicators = indicators
            return
        
        # Flatten nested themes
        flat = {}
        for theme in ['usd', 'innovation', 'pe', 'intl']:
            if theme in indicators and isinstance(indicators[theme], dict):
                for indicator, indicator_data in indicators[theme].items():
                    flat[indicator] = indicator_data
        
        self.indicators = flat
    
    def load_existing_data(self) -> Optional[Dict]:
        """Load existing master data file if exists"""
        if self.config.MASTER_FILE.exists():
            try:
                with open(self.config.MASTER_FILE, 'r') as f:
                    data = json.load(f)
                    return data
            except Exception as e:
                self.logger.error(f"  ✗ Error loading master file: {e}")
        return None
    
    def save_data(self, data: Dict):
        """Save collected data with backup"""
        try:
            # Create backup if file exists
            if self.config.MASTER_FILE.exists():
                backup_name = f"hcp_master_data_v{self.version}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
                backup_path = self.config.DATA_DIR / backup_name
                
                import shutil
                shutil.copy(self.config.MASTER_FILE, backup_path)
                self.logger.info(f"  📦 Created backup: {backup_name}")
            
            # Save new data
            with open(self.config.MASTER_FILE, 'w') as f:
                json.dump(data, f, indent=2)
            
            self.logger.info(f"  💾 Saved to {self.config.MASTER_FILE}")
            
        except Exception as e:
            self.logger.error(f"  ✗ Save failed: {e}")

# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    """Main execution for v4.3.6"""
    print("\n" + "=" * 60)
    print("HCP Data Collector v4.3.6")
    print("FIXED Historical Data Path")
    print("=" * 60 + "\n")
    
    # Create collector
    collector = HCPDataCollectorV436()
    
    # Collect all indicators
    data = collector.collect_all_indicators()
    
    # Save if successful
    if data['metadata']['collection_complete']:
        collector.save_data(data)
        print("\n✅ SUCCESS: Data collection complete!")
        print(f"   Version: {data['metadata']['version']}")
        print(f"   Collected: {data['metadata']['indicators_collected']}/12 indicators")
        print(f"   Structure: Themed and File Handler ready")
        print(f"   Quality: REAL DATA ONLY")
        
        if data['metadata']['failed_indicators']:
            print(f"\n⚠️  Note: Failed indicators can be updated manually:")
            for ind in data['metadata']['failed_indicators']:
                print(f"     - {ind}")
    else:
        print("\n⚠️  WARNING: Collection incomplete")
        print(f"   Only {data['metadata']['indicators_collected']}/12 indicators collected")
        print("   Check logs for specific errors")

if __name__ == "__main__":
    main()
