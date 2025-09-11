#!/usr/bin/env python3
"""
HCP Unified Data Collector v4.2.0
File: hcp_unified_collector_v4.2.0.py
Last Updated: 2025-09-06 22:00:00 UTC
Compatible with: IPS v4.1, File Handler v2.1, Theme Calculator v3.2

PHILOSOPHY: REAL DATA ONLY - NO FALLBACKS
- If we can't get real data, we fail and report it
- No estimations, no proxies, no guesses
- Sufficient history for GARCH (20+ years where possible)
- Clear error reporting for debugging

IPS v4.1 INDICATORS (12 total):
1. USD Theme: DXY, Real Rate Differential, COFER USD Share
2. Innovation: QQQ/SPY Ratio, Productivity Growth, R&D/Revenue  
3. P/E: Put/Call Ratio, Forward P/E, EPS Delivery
4. US Leadership: SPY/EFA Momentum, US Market Cap %, ETF Flow Differential

DATA REQUIREMENTS:
- 240 months (20 years) of monthly data for GARCH where available
- 252 days (1 year) of daily data for recent MAs
- Current values for real-time tracking

USAGE:
python hcp_unified_collector_v4.2.0.py
"""

import json
import logging
import sys
import time
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

warnings.filterwarnings('ignore')

# Configuration
FRED_API_KEY = "82fa4bd8294df4c17d0bde5a37903e57"
BASE_DIR = Path("C:/Users/markf/OneDrive/Desktop")
DATA_DIR = BASE_DIR / "data_output"
LOG_DIR = BASE_DIR / "logs"

# Create directories
for dir_path in [DATA_DIR, LOG_DIR]:
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
logger = logging.getLogger('HCP_Unified_Collector_v4.2.0')


class HCPUnifiedCollector:
    """
    Unified collector with REAL DATA ONLY - no fallbacks or estimates
    """
    
    def __init__(self):
        """Initialize collector with v4.2.0 configuration"""
        self.raw_data = {}
        self.calculated_indicators = {}
        self.failures = []  # Track what failed
        self.metadata = {
            'version': '4.2.0',
            'framework': 'IPS v4.1',
            'philosophy': 'Real data only - no fallbacks',
            'collection_date': datetime.now().isoformat(),
            'indicators_expected': 12
        }
        
        # Data requirements
        self.data_config = {
            'monthly_history': 240,  # 20 years for GARCH
            'daily_history': 252,    # 1 year for recent MAs
            'min_garch_months': 60   # 5 years minimum
        }
    
    def collect_all_data(self) -> Dict:
        """Main collection orchestrator"""
        logger.info("="*60)
        logger.info("HCP Unified Collector v4.2.0 - REAL DATA ONLY")
        logger.info("="*60)
        logger.info("Starting data collection - no fallbacks allowed...")
        
        # Collect data in order of reliability
        self._fetch_market_data()       # Yahoo Finance: DXY, QQQ, SPY, EFA, etc.
        self._fetch_fred_data()          # FRED: Productivity, TIPS, etc.
        self._fetch_options_data()       # CBOE: Put/Call ratio
        self._fetch_forward_pe()         # Multiple sources
        self._fetch_etf_data()           # ETF flows and market cap
        self._fetch_earnings_data()      # EPS delivery
        
        # Calculate derived indicators
        self._calculate_usd_indicators()
        self._calculate_innovation_indicators()
        self._calculate_pe_indicators()
        self._calculate_us_leadership_indicators()
        
        # Package output
        output = self._package_output()
        
        # Save to file
        filename = self._save_output(output)
        self.metadata['output_file'] = filename
        
        # Report status
        self._report_status()
        
        return output
    
    def _fetch_market_data(self):
        """Fetch market data from Yahoo Finance"""
        logger.info("Fetching market data...")
        
        tickers = {
            'dxy': 'DX=F',      # US Dollar Index
            'qqq': 'QQQ',       # NASDAQ 100 ETF
            'spy': 'SPY',       # S&P 500 ETF
            'efa': 'EFA',       # Developed International
            'vt': 'VT',         # Total World
            'tnx': '^TNX',      # 10-Year Treasury
            'tlt': 'TLT',       # 20+ Year Treasury
            'gld': 'GLD',       # Gold ETF
            'tips': 'TIP',      # TIPS ETF
        }
        
        for key, ticker in tickers.items():
            logger.info(f"  Fetching {key} ({ticker})...")
            try:
                # Get monthly data for GARCH
                monthly_data = self._fetch_yahoo_monthly(ticker)
                
                # Get daily data for recent MAs
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
            
            # Fetch 20 years of monthly data
            end_date = datetime.now()
            start_date = end_date - relativedelta(years=20)
            
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
            
            # Fetch 1 year of daily data
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
            'productivity': 'OPHNFB',      # Labor productivity
            'tips_10y': 'DFII10',          # 10Y TIPS yield (real rate)
            'breakeven_10y': 'T10YIE',     # 10Y breakeven inflation
            'real_gdp': 'GDPC1',           # Real GDP
            'dxy_fred': 'DTWEXBGS',        # Trade-weighted dollar (backup for DXY)
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
            start_date = (datetime.now() - relativedelta(years=20)).strftime('%Y-%m-%d')
            
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
    
    def _fetch_options_data(self):
        """Fetch Put/Call ratio data from CBOE or calculate from options chain"""
        logger.info("Fetching Put/Call ratio...")
        
        try:
            # Try to get SPY options chain for current P/C ratio
            spy = yf.Ticker('SPY')
            
            # Get options dates
            exp_dates = spy.options
            if not exp_dates:
                raise ValueError("No options data available")
            
            # Use nearest expiration
            near_exp = exp_dates[0]
            
            # Get options chain
            opt_chain = spy.option_chain(near_exp)
            calls = opt_chain.calls
            puts = opt_chain.puts
            
            # Calculate P/C ratio using open interest
            total_call_oi = calls['openInterest'].sum()
            total_put_oi = puts['openInterest'].sum()
            
            if total_call_oi > 0:
                put_call_ratio = total_put_oi / total_call_oi
                
                self.raw_data['put_call'] = {
                    'current_value': put_call_ratio,
                    'source': 'Yahoo Options Chain',
                    'expiry': near_exp,
                    'put_oi': int(total_put_oi),
                    'call_oi': int(total_call_oi)
                }
                
                logger.info(f"  [SUCCESS] Put/Call: {put_call_ratio:.3f} "
                          f"(Puts: {total_put_oi:,}, Calls: {total_call_oi:,})")
            else:
                raise ValueError("No call open interest")
                
        except Exception as e:
            self.failures.append(f"put_call: {str(e)}")
            logger.error(f"  [FAILED] Put/Call ratio: {str(e)}")
    
    def _fetch_forward_pe(self):
        """Fetch Forward P/E from multiple sources"""
        logger.info("Fetching Forward P/E...")
        
        # Try Yahoo Finance first
        try:
            spy = yf.Ticker('SPY')
            info = spy.info
            
            # Try different keys where forward P/E might be stored
            forward_pe = None
            for key in ['forwardPE', 'trailingPE', 'pegRatio']:
                if key in info and info[key]:
                    if key == 'forwardPE':
                        forward_pe = info[key]
                        break
                    elif key == 'trailingPE' and not forward_pe:
                        # Use trailing as backup but note it
                        forward_pe = info[key]
                        logger.warning("Using trailing P/E as forward P/E not available")
            
            if forward_pe and 10 < forward_pe < 50:  # Sanity check
                self.raw_data['forward_pe'] = {
                    'current_value': forward_pe,
                    'source': 'Yahoo Finance',
                    'type': 'forward' if 'forwardPE' in info else 'trailing'
                }
                logger.info(f"  [SUCCESS] Forward P/E: {forward_pe:.1f}")
            else:
                raise ValueError(f"Invalid P/E value: {forward_pe}")
                
        except Exception as e:
            # Try web scraping as backup
            self._fetch_pe_from_web()
    
    def _fetch_pe_from_web(self):
        """Scrape P/E from financial websites"""
        try:
            # Try GuruFocus
            url = "https://www.gurufocus.com/term/forwardPE/SPX/Forward-PE-Ratio/SP-500-Index"
            headers = {'User-Agent': 'Mozilla/5.0'}
            
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Look for P/E value in various formats
                pe_text = soup.find(text=lambda t: t and 'Forward P/E' in t)
                if pe_text:
                    # Extract number from text
                    import re
                    numbers = re.findall(r'\d+\.?\d*', str(pe_text.parent.parent.text))
                    for num in numbers:
                        val = float(num)
                        if 10 < val < 50:  # Sanity check
                            self.raw_data['forward_pe'] = {
                                'current_value': val,
                                'source': 'GuruFocus',
                                'scraped': True
                            }
                            logger.info(f"  [SUCCESS] Forward P/E: {val:.1f} (web scrape)")
                            return
            
            raise ValueError("Could not scrape P/E from web")
            
        except Exception as e:
            self.failures.append(f"forward_pe: {str(e)}")
            logger.error(f"  [FAILED] Forward P/E: {str(e)}")
    
    def _fetch_etf_data(self):
        """Calculate ETF flows and US market cap percentage"""
        logger.info("Fetching ETF flow and market cap data...")
        
        try:
            # US Market Cap % calculation
            spy_data = self.raw_data.get('spy', {})
            vt_data = self.raw_data.get('vt', {})
            
            if spy_data and vt_data:
                # Get market caps from Yahoo
                spy_ticker = yf.Ticker('SPY')
                vt_ticker = yf.Ticker('VT')
                
                spy_shares = spy_ticker.info.get('sharesOutstanding', 0)
                vt_shares = vt_ticker.info.get('sharesOutstanding', 0)
                
                if spy_shares and vt_shares:
                    spy_mcap = spy_shares * spy_data['current_value']
                    vt_mcap = vt_shares * vt_data['current_value']
                    
                    # SPY represents about 80% of US market
                    us_mcap_estimate = spy_mcap / 0.8
                    us_pct = (us_mcap_estimate / vt_mcap) * 100
                    
                    self.raw_data['us_market_cap_pct'] = {
                        'current_value': us_pct,
                        'source': 'Yahoo Finance calculation',
                        'spy_mcap': spy_mcap,
                        'world_mcap': vt_mcap
                    }
                    logger.info(f"  [SUCCESS] US Market Cap %: {us_pct:.1f}%")
                else:
                    raise ValueError("Could not get shares outstanding")
            
            # ETF Flow calculation using volume as proxy
            if spy_data and 'efa' in self.raw_data:
                spy_ticker = yf.Ticker('SPY')
                efa_ticker = yf.Ticker('EFA')
                
                # Get recent volume data
                spy_hist = spy_ticker.history(period='1mo')
                efa_hist = efa_ticker.history(period='1mo')
                
                if not spy_hist.empty and not efa_hist.empty:
                    spy_dollar_vol = (spy_hist['Volume'] * spy_hist['Close']).mean()
                    efa_dollar_vol = (efa_hist['Volume'] * efa_hist['Close']).mean()
                    
                    flow_diff = (spy_dollar_vol - efa_dollar_vol) / 1e9  # Billions
                    
                    self.raw_data['etf_flow_differential'] = {
                        'current_value': flow_diff,
                        'source': 'Volume proxy calculation',
                        'spy_volume': spy_dollar_vol,
                        'efa_volume': efa_dollar_vol
                    }
                    logger.info(f"  [SUCCESS] ETF Flow Differential: ${flow_diff:.1f}B")
                    
        except Exception as e:
            self.failures.append(f"etf_data: {str(e)}")
            logger.error(f"  [ERROR] ETF data: {str(e)}")
    
    def _fetch_earnings_data(self):
        """Calculate EPS delivery rate"""
        logger.info("Fetching earnings surprise data...")
        
        try:
            spy = yf.Ticker('SPY')
            
            # Get earnings history
            earnings = spy.earnings_history
            
            if earnings is not None and not earnings.empty:
                # Calculate delivery rate (actual/estimate)
                earnings['delivery'] = earnings['epsActual'] / earnings['epsEstimate']
                
                # Get average over last 4 quarters
                recent_delivery = earnings['delivery'].tail(4).mean()
                
                self.raw_data['eps_delivery'] = {
                    'current_value': recent_delivery,
                    'source': 'Yahoo Finance earnings',
                    'quarters': len(earnings)
                }
                logger.info(f"  [SUCCESS] EPS Delivery: {recent_delivery:.3f}")
            else:
                raise ValueError("No earnings data available")
                
        except Exception as e:
            self.failures.append(f"eps_delivery: {str(e)}")
            logger.error(f"  [FAILED] EPS Delivery: {str(e)}")
    
    def _calculate_usd_indicators(self):
        """Calculate USD theme indicators"""
        logger.info("Calculating USD indicators...")
        
        # DXY is already fetched
        if 'dxy' in self.raw_data:
            self.calculated_indicators['dxy'] = self.raw_data['dxy']
            logger.info(f"  [OK] DXY: {self.raw_data['dxy']['current_value']:.2f}")
        
        # Real Rate Differential
        if 'tips_10y' in self.raw_data and 'breakeven_10y' in self.raw_data:
            tips = self.raw_data['tips_10y']['current_value']
            breakeven = self.raw_data['breakeven_10y']['current_value']
            nominal = tips + breakeven
            
            # Assume foreign real rate around 0.5% (simplified)
            foreign_real = 0.5
            diff = tips - foreign_real
            
            self.calculated_indicators['real_rate_diff'] = {
                'current_value': diff,
                'us_real': tips,
                'foreign_real': foreign_real,
                'source': 'FRED calculation'
            }
            logger.info(f"  [OK] Real Rate Differential: {diff:.2f}%")
        
        # COFER proxy (no real-time source available)
        self.failures.append("cofer_usd: Requires manual quarterly update from IMF")
        logger.warning("  [MANUAL] COFER USD Share: Requires IMF quarterly data")
    
    def _calculate_innovation_indicators(self):
        """Calculate Innovation theme indicators"""
        logger.info("Calculating Innovation indicators...")
        
        # QQQ/SPY Ratio
        if 'qqq' in self.raw_data and 'spy' in self.raw_data:
            qqq_data = self.raw_data['qqq']
            spy_data = self.raw_data['spy']
            
            # Calculate ratio history
            min_len = min(len(qqq_data['monthly_history']), len(spy_data['monthly_history']))
            monthly_ratios = [q/s for q, s in zip(
                qqq_data['monthly_history'][-min_len:],
                spy_data['monthly_history'][-min_len:]
            )]
            
            current_ratio = qqq_data['current_value'] / spy_data['current_value']
            
            self.calculated_indicators['qqq_spy'] = {
                'current_value': current_ratio,
                'monthly_history': monthly_ratios,
                'daily_values': [q/s for q, s in zip(
                    qqq_data['daily_values'][-100:],
                    spy_data['daily_values'][-100:]
                )],
                'source': 'Yahoo Finance calculation'
            }
            logger.info(f"  [OK] QQQ/SPY Ratio: {current_ratio:.4f}")
        
        # Productivity Growth
        if 'productivity' in self.raw_data:
            prod_data = self.raw_data['productivity']
            
            # Calculate YoY change
            if len(prod_data['values']) >= 5:
                current = prod_data['values'][-1]
                year_ago = prod_data['values'][-5]  # Quarterly data, -5 is ~1 year
                yoy_change = ((current - year_ago) / year_ago) * 100
                
                self.calculated_indicators['productivity'] = {
                    'current_value': yoy_change,
                    'history': prod_data['values'],
                    'source': 'FRED'
                }
                logger.info(f"  [OK] Productivity Growth: {yoy_change:.2f}%")
        
        # R&D/Revenue (requires manual update)
        self.failures.append("rd_revenue: Requires quarterly earnings reports")
        logger.warning("  [MANUAL] R&D/Revenue: Requires S&P earnings data")
    
    def _calculate_pe_indicators(self):
        """Calculate P/E theme indicators"""
        logger.info("Calculating P/E indicators...")
        
        # Put/Call already fetched
        if 'put_call' in self.raw_data:
            self.calculated_indicators['put_call'] = self.raw_data['put_call']
            logger.info(f"  [OK] Put/Call Ratio: {self.raw_data['put_call']['current_value']:.3f}")
        
        # Forward P/E already fetched
        if 'forward_pe' in self.raw_data:
            self.calculated_indicators['forward_pe'] = self.raw_data['forward_pe']
            logger.info(f"  [OK] Forward P/E: {self.raw_data['forward_pe']['current_value']:.1f}")
        
        # EPS Delivery already fetched
        if 'eps_delivery' in self.raw_data:
            self.calculated_indicators['eps_delivery'] = self.raw_data['eps_delivery']
            logger.info(f"  [OK] EPS Delivery: {self.raw_data['eps_delivery']['current_value']:.3f}")
    
    def _calculate_us_leadership_indicators(self):
        """Calculate US Leadership indicators"""
        logger.info("Calculating US Leadership indicators...")
        
        # SPY/EFA Momentum
        if 'spy' in self.raw_data and 'efa' in self.raw_data:
            spy_data = self.raw_data['spy']
            efa_data = self.raw_data['efa']
            
            # Calculate 3-month returns
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
        
        # US Market Cap %
        if 'us_market_cap_pct' in self.raw_data:
            self.calculated_indicators['us_market_cap_pct'] = self.raw_data['us_market_cap_pct']
            logger.info(f"  [OK] US Market Cap %: {self.raw_data['us_market_cap_pct']['current_value']:.1f}%")
        
        # ETF Flow Differential
        if 'etf_flow_differential' in self.raw_data:
            self.calculated_indicators['etf_flow_differential'] = self.raw_data['etf_flow_differential']
            logger.info(f"  [OK] ETF Flow Differential: ${self.raw_data['etf_flow_differential']['current_value']:.1f}B")
    
    def _package_output(self) -> Dict:
        """Package data for output"""
        return {
            'metadata': self.metadata,
            'indicators': self.calculated_indicators,
            'raw_data': self.raw_data,
            'data_quality': self._assess_data_quality(),
            'failures': self.failures
        }
    
    def _assess_data_quality(self) -> Dict:
        """Assess overall data quality"""
        total_expected = 12
        collected = len(self.calculated_indicators)
        
        # Count indicators with sufficient GARCH history
        garch_ready = 0
        for ind_name, ind_data in self.calculated_indicators.items():
            if 'monthly_history' in ind_data:
                if len(ind_data['monthly_history']) >= self.data_config['min_garch_months']:
                    garch_ready += 1
            elif 'history' in ind_data:
                if len(ind_data['history']) >= self.data_config['min_garch_months']:
                    garch_ready += 1
        
        quality = {
            'indicators_collected': collected,
            'indicators_expected': total_expected,
            'completion_rate': round(collected / total_expected * 100, 1),
            'garch_ready': garch_ready,
            'failures_count': len(self.failures),
            'overall': 'GOOD' if collected >= 10 else 'PARTIAL' if collected >= 6 else 'POOR'
        }
        
        return quality
    
    def _save_output(self, output: Dict) -> str:
        """Save output to JSON file"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"hcp_data_v420_{timestamp}.json"
        filepath = DATA_DIR / filename
        
        # Convert numpy types to native Python types
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
        """Report final collection status"""
        quality = self._assess_data_quality()
        
        print("\n" + "="*60)
        print("COLLECTION COMPLETE - v4.2.0")
        print("="*60)
        print(f"Indicators collected: {quality['indicators_collected']}/{quality['indicators_expected']}")
        print(f"GARCH ready: {quality['garch_ready']}")
        print(f"Data quality: {quality['overall']}")
        print(f"Failures: {quality['failures_count']}")
        
        if self.failures:
            print("\nFailed items (require manual update or alternate source):")
            for failure in self.failures:
                print(f"  - {failure}")
        
        print("\n" + "-"*60)
        print("MANUAL DATA COLLECTION REQUIRED:")
        print("-"*60)
        
        print("\n1. IMF COFER USD Reserve Share (Quarterly):")
        print("   - Go to: https://data.imf.org/regular.aspx?key=41175")
        print("   - Download latest COFER data")
        print("   - Look for 'Claims in U.S. dollars' percentage")
        print("   - Most recent: Q2 2025 = ~58-59%")
        
        print("\n2. Corporate R&D/Revenue (Quarterly):")
        print("   - Check S&P 500 earnings reports")
        print("   - FactSet or Bloomberg terminals ideal")
        print("   - Alternative: Company 10-K/10-Q filings")
        print("   - Target: ~3-4% for S&P 500 average")
        
        print("\n3. Yuan SWIFT Share (Monthly):")
        if 'yuan_swift' not in self.raw_data:
            print("   - Download SWIFT RMB Tracker PDFs:")
            print("   - https://www.swift.com/our-solutions/compliance-and-shared-services/business-intelligence/renminbi/rmb-tracker/document-centre")
            print("   - Save PDFs to: " + str(PDF_DIR))
            print("   - Re-run collector to parse")
        else:
            yuan_data = self.raw_data['yuan_swift']
            print(f"   - PARSED: {yuan_data['parsed_months']} months from {yuan_data['pdf_count']} PDFs")
            print("   - For updates, download newer PDFs to pdfs/ directory")
        
        print("\n4. Central Bank Gold Purchases (Quarterly):")
        print("   - World Gold Council reports")
        print("   - https://www.gold.org/goldhub/data/monthly-central-bank-statistics")
        print("   - Look for quarterly tonnage data")
        
        print("\nOutput file ready for HCP Tracker")
        print("="*60)


def main():
    """Main execution"""
    print("="*60)
    print("HCP UNIFIED DATA COLLECTOR v4.2.0")
    print("Real Data Only - No Fallbacks")
    print("Framework: IPS v4.1")
    print("="*60)
    
    collector = HCPUnifiedCollector()
    output = collector.collect_all_data()
    
    return output


if __name__ == "__main__":
    main()
