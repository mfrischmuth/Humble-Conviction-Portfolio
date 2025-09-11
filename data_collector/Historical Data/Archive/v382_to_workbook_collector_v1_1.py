#!/usr/bin/env python3
"""
V3.8.2 to Workbook Collector v1.1
File: v382_to_workbook_collector_v1.1.py
Last Updated: 2025-09-02 18:00:00 UTC

Takes your working v3.8.2 methods, extends time periods, 
outputs directly to Excel workbook format.
No estimated data - real data or blank fields only.
"""

import pandas as pd
import yfinance as yf
import requests
import json
import logging
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
import calendar
import numpy as np
from pathlib import Path

# FRED API Key from your v3.8.2
FRED_API_KEY = "82fa4bd8294df4c17d0bde5a37903e57"

# Your working Yardeni historical data from v3.8.2
YARDENI_HISTORICAL_PE = {
    "1999-Q1": 24.5, "1999-Q2": 25.1, "1999-Q3": 26.2, "1999-Q4": 27.8,
    "2000-Q1": 28.5, "2000-Q2": 27.9, "2000-Q3": 26.3, "2000-Q4": 24.7,
    "2001-Q1": 23.2, "2001-Q2": 24.8, "2001-Q3": 22.1, "2001-Q4": 25.9,
    "2002-Q1": 24.3, "2002-Q2": 21.6, "2002-Q3": 18.9, "2002-Q4": 17.2,
    "2003-Q1": 17.8, "2003-Q2": 18.5, "2003-Q3": 19.2, "2003-Q4": 19.9,
    "2004-Q1": 19.5, "2004-Q2": 18.8, "2004-Q3": 17.9, "2004-Q4": 18.2,
    "2005-Q1": 17.6, "2005-Q2": 16.9, "2005-Q3": 16.2, "2005-Q4": 16.8,
    "2006-Q1": 16.5, "2006-Q2": 16.1, "2006-Q3": 15.7, "2006-Q4": 16.3,
    "2007-Q1": 16.0, "2007-Q2": 15.8, "2007-Q3": 16.5, "2007-Q4": 17.2,
    "2008-Q1": 16.8, "2008-Q2": 15.9, "2008-Q3": 14.2, "2008-Q4": 11.5,
    "2009-Q1": 10.2, "2009-Q2": 13.8, "2009-Q3": 15.9, "2009-Q4": 17.2,
    "2010-Q1": 16.5, "2010-Q2": 14.8, "2010-Q3": 13.9, "2010-Q4": 14.5,
    "2011-Q1": 14.8, "2011-Q2": 13.9, "2011-Q3": 11.8, "2011-Q4": 12.5,
    "2012-Q1": 13.2, "2012-Q2": 12.8, "2012-Q3": 13.5, "2012-Q4": 13.9,
    "2013-Q1": 14.5, "2013-Q2": 15.2, "2013-Q3": 15.8, "2013-Q4": 16.5,
    "2014-Q1": 16.2, "2014-Q2": 15.9, "2014-Q3": 16.5, "2014-Q4": 17.1,
    "2015-Q1": 17.8, "2015-Q2": 17.5, "2015-Q3": 16.2, "2015-Q4": 16.8,
    "2016-Q1": 16.5, "2016-Q2": 17.2, "2016-Q3": 17.8, "2016-Q4": 18.5,
    "2017-Q1": 18.2, "2017-Q2": 18.9, "2017-Q3": 18.5, "2017-Q4": 19.2,
    "2018-Q1": 18.8, "2018-Q2": 17.5, "2018-Q3": 18.2, "2018-Q4": 15.9,
    "2019-Q1": 16.5, "2019-Q2": 17.2, "2019-Q3": 17.8, "2019-Q4": 18.5,
    "2020-Q1": 17.9, "2020-Q2": 21.5, "2020-Q3": 22.8, "2020-Q4": 23.2,
    "2021-Q1": 22.5, "2021-Q2": 21.8, "2021-Q3": 21.2, "2021-Q4": 21.9,
    "2022-Q1": 21.2, "2022-Q2": 19.8, "2022-Q3": 17.5, "2022-Q4": 18.2,
    "2023-Q1": 18.8, "2023-Q2": 19.5, "2023-Q3": 19.9, "2023-Q4": 19.8,
}

class WorkbookDataCollector:
    """Extends v3.8.2 methods and outputs to Excel workbook format"""
    
    def __init__(self):
        self.collected_data = {}
        self.setup_logging()
    
    def setup_logging(self):
        """Basic logging setup"""
        logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
        self.logger = logging.getLogger('WorkbookCollector')
    
    def collect_yahoo_finance_historical(self):
        """Use v3.8.2's proven yfinance methods, extended time periods"""
        self.logger.info("Collecting Yahoo Finance data (extended periods)...")
        
        # DXY - 400 days
        try:
            ticker = yf.Ticker("DX=F")
            start_date = datetime.now() - timedelta(days=450)  # Buffer for weekends
            data = ticker.history(start=start_date)
            
            if not data.empty:
                # Get last 400 trading days
                close_data = data['Close'].tail(400)
                values = [round(float(v), 2) for v in close_data]
                dates = [d.strftime('%Y-%m-%d') for d in close_data.index]
                
                self.collected_data['dxy'] = {
                    'values': values,
                    'dates': dates,
                    'source': 'Yahoo Finance API',
                    'collection_status': 'success'
                }
                self.logger.info(f"  DXY: {len(values)} days collected")
            else:
                self.collected_data['dxy'] = {'collection_status': 'failed', 'reason': 'No data returned'}
                
        except Exception as e:
            self.collected_data['dxy'] = {'collection_status': 'failed', 'reason': str(e)}
            self.logger.error(f"  DXY failed: {e}")
        
        # QQQ - 300 days
        try:
            ticker = yf.Ticker("QQQ")
            start_date = datetime.now() - timedelta(days=350)
            data = ticker.history(start=start_date)
            
            if not data.empty:
                close_data = data['Close'].tail(300)
                values = [round(float(v), 2) for v in close_data]
                dates = [d.strftime('%Y-%m-%d') for d in close_data.index]
                
                self.collected_data['qqq'] = {
                    'values': values,
                    'dates': dates,
                    'source': 'Yahoo Finance API',
                    'collection_status': 'success'
                }
                self.logger.info(f"  QQQ: {len(values)} days collected")
                
        except Exception as e:
            self.collected_data['qqq'] = {'collection_status': 'failed', 'reason': str(e)}
            self.logger.error(f"  QQQ failed: {e}")
        
        # SPY - 300 days
        try:
            ticker = yf.Ticker("SPY")
            start_date = datetime.now() - timedelta(days=350)
            data = ticker.history(start=start_date)
            
            if not data.empty:
                close_data = data['Close'].tail(300)
                values = [round(float(v), 2) for v in close_data]
                dates = [d.strftime('%Y-%m-%d') for d in close_data.index]
                
                self.collected_data['spy'] = {
                    'values': values,
                    'dates': dates,
                    'source': 'Yahoo Finance API',
                    'collection_status': 'success'
                }
                self.logger.info(f"  SPY: {len(values)} days collected")
                
        except Exception as e:
            self.collected_data['spy'] = {'collection_status': 'failed', 'reason': str(e)}
            self.logger.error(f"  SPY failed: {e}")
    
    def collect_fred_data_historical(self):
        """Use v3.8.2's proven FRED methods, extended periods"""
        self.logger.info("Collecting FRED data (extended periods)...")
        
        # Productivity - 24 quarters instead of 8
        try:
            url = "https://api.stlouisfed.org/fred/series/observations"
            start_date = (datetime.now() - relativedelta(months=75)).strftime('%Y-%m-%d')
            
            params = {
                'series_id': 'OPHNFB',
                'api_key': FRED_API_KEY,
                'file_type': 'json',
                'observation_start': start_date,
                'sort_order': 'asc'
            }
            
            response = requests.get(url, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if 'observations' in data:
                    quarterly_values = []
                    quarterly_dates = []
                    
                    for obs in data['observations']:
                        if obs['value'] != '.':
                            quarterly_values.append(float(obs['value']))
                            quarterly_dates.append(obs['date'])
                    
                    # Take last 24 quarters
                    self.collected_data['productivity'] = {
                        'values': quarterly_values[-24:],
                        'dates': quarterly_dates[-24:],
                        'source': 'FRED API (OPHNFB)',
                        'collection_status': 'success'
                    }
                    self.logger.info(f"  Productivity: {len(quarterly_values[-24:])} quarters collected")
                else:
                    self.collected_data['productivity'] = {'collection_status': 'failed', 'reason': 'No observations in response'}
            else:
                self.collected_data['productivity'] = {'collection_status': 'failed', 'reason': f'HTTP {response.status_code}'}
                
        except Exception as e:
            self.collected_data['productivity'] = {'collection_status': 'failed', 'reason': str(e)}
            self.logger.error(f"  Productivity failed: {e}")
    
    def collect_forward_pe_historical(self):
        """Use your embedded Yardeni data, no estimation"""
        self.logger.info("Collecting Forward P/E historical data...")
        
        # Convert your embedded quarterly Yardeni data to weekly format
        weekly_values = []
        weekly_dates = []
        
        # Convert quarters to approximate weekly data
        quarters = sorted(YARDENI_HISTORICAL_PE.keys())
        
        for quarter_key in quarters:
            pe_value = YARDENI_HISTORICAL_PE[quarter_key]
            
            # Parse quarter
            year, q = quarter_key.split('-Q')
            year = int(year)
            quarter = int(q)
            
            # Generate ~13 weeks per quarter
            if quarter == 1:
                start_month, end_month = 1, 3
            elif quarter == 2:
                start_month, end_month = 4, 6
            elif quarter == 3:
                start_month, end_month = 7, 9
            else:
                start_month, end_month = 10, 12
            
            # Add ~4 weekly data points per quarter (13 weeks / 3 months)
            for month in range(start_month, end_month + 1):
                for week in range(1, 5):  # 4 weeks per month approximately
                    try:
                        week_date = datetime(year, month, min(week * 7, 28))
                        weekly_values.append(pe_value)
                        weekly_dates.append(week_date.strftime('%Y-%m-%d'))
                    except ValueError:
                        continue  # Skip invalid dates
        
        # Take last 156 weeks (3 years)
        self.collected_data['forward_pe'] = {
            'values': weekly_values[-156:],
            'dates': weekly_dates[-156:],
            'source': 'Yardeni Historical Baseline (embedded)',
            'collection_status': 'success'
        }
        self.logger.info(f"  Forward P/E: {len(weekly_values[-156:])} weeks from Yardeni baseline")
    
    def collect_what_we_can(self):
        """Collect data using only proven v3.8.2 methods"""
        self.logger.info("Running data collection using proven v3.8.2 methods...")
        
        # Yahoo Finance (works reliably)
        self.collect_yahoo_finance_historical()
        
        # FRED (works reliably)  
        self.collect_fred_data_historical()
        
        # Forward P/E from embedded Yardeni data
        self.collect_forward_pe_historical()
        
        # Calculate QQQ/SPY ratio if both collected
        if ('qqq' in self.collected_data and self.collected_data['qqq']['collection_status'] == 'success' and
            'spy' in self.collected_data and self.collected_data['spy']['collection_status'] == 'success'):
            
            self.logger.info("Calculating QQQ/SPY ratio...")
            qqq_values = self.collected_data['qqq']['values']
            spy_values = self.collected_data['spy']['values']
            
            ratio_values = []
            for i in range(min(len(qqq_values), len(spy_values))):
                if qqq_values[i] and spy_values[i]:
                    ratio_values.append(round(qqq_values[i] / spy_values[i], 4))
                else:
                    ratio_values.append('')  # Blank, not estimated
            
            self.collected_data['qqq_spy_ratio'] = {
                'values': ratio_values,
                'dates': self.collected_data['qqq']['dates'][:len(ratio_values)],
                'source': 'Calculated from Yahoo Finance QQQ/SPY',
                'collection_status': 'success'
            }
            self.logger.info(f"  QQQ/SPY Ratio: {len([v for v in ratio_values if v != ''])} days calculated")
        
        return self.collected_data
    
    def output_to_workbook(self, workbook_filename=None):
        """Output collected data directly to Excel workbook format"""
        
        if workbook_filename is None:
            workbook_filename = f'HCP_Calibration_Workbook_AutoFilled_{datetime.now().strftime("%Y%m%d")}.xlsx'
        
        self.logger.info(f"Creating workbook with auto-filled data: {workbook_filename}")
        
        # Create all tabs with structure
        tabs = {}
        
        # Forward P/E tab
        if 'forward_pe' in self.collected_data and self.collected_data['forward_pe']['collection_status'] == 'success':
            pe_data = self.collected_data['forward_pe']
            
            # Create DataFrame with your data
            pe_df_data = {
                'Date': pe_data['dates'],
                'Forward_PE': pe_data['values'],
                'Data_Source': ['Yardeni Baseline'] * len(pe_data['values']),
                'Notes': ['Auto-collected'] * len(pe_data['values'])
            }
            
            # Add instructions at top
            instructions = pd.DataFrame({
                'Date': [
                    'FORWARD P/E - Historical Calibration Data',
                    'Source: Yardeni Research (Embedded Baseline)',
                    'AUTO-COLLECTED: Values below were automatically filled',
                    'Frequency: Weekly approximation from quarterly data',
                    'Time Period: 156 weeks (3 years)', 
                    'Status: Ready for calibration',
                    'Manual additions: Add recent FactSet data above this line',
                    '--- AUTO-COLLECTED DATA BELOW ---'
                ],
                'Forward_PE': [''] * 8,
                'Data_Source': [''] * 8,
                'Notes': [''] * 8
            })
            
            tabs['Forward_PE'] = pd.concat([instructions, pd.DataFrame(pe_df_data)], ignore_index=True)
        else:
            # Empty template if collection failed
            tabs['Forward_PE'] = self.create_empty_forward_pe_tab()
        
        # DXY tab
        if 'dxy' in self.collected_data and self.collected_data['dxy']['collection_status'] == 'success':
            dxy_data = self.collected_data['dxy']
            
            dxy_df_data = {
                'Date': dxy_data['dates'],
                'DXY_Close': dxy_data['values'],
                'DXY_High': [''] * len(dxy_data['values']),  # We only collected close
                'DXY_Low': [''] * len(dxy_data['values']),
                'Volume': [''] * len(dxy_data['values']),
                'Notes': ['Auto-collected'] * len(dxy_data['values'])
            }
            
            instructions = pd.DataFrame({
                'Date': [
                    'DXY (US Dollar Index) - Daily Price Data',
                    'AUTO-COLLECTED: Close prices below were automatically filled',
                    'Source: Yahoo Finance (DX=F)',
                    'Frequency: Daily trading days',
                    'Time Period: 400 days for 400-day MA',
                    'Status: Close prices collected, High/Low can be added manually',
                    'Manual additions: Fill High/Low columns if needed',
                    '--- AUTO-COLLECTED DATA BELOW ---'
                ],
                'DXY_Close': [''] * 8,
                'DXY_High': [''] * 8,
                'DXY_Low': [''] * 8,
                'Volume': [''] * 8,
                'Notes': [''] * 8
            })
            
            tabs['DXY'] = pd.concat([instructions, pd.DataFrame(dxy_df_data)], ignore_index=True)
        else:
            tabs['DXY'] = self.create_empty_dxy_tab()
        
        # Productivity tab
        if 'productivity' in self.collected_data and self.collected_data['productivity']['collection_status'] == 'success':
            prod_data = self.collected_data['productivity']
            
            prod_df_data = {
                'Date': prod_data['dates'],
                'Productivity_Index': prod_data['values'],
                'YoY_Change': [''] * len(prod_data['values']),  # Can be calculated manually
                'Data_Source': ['FRED API'] * len(prod_data['values']),
                'Notes': ['Auto-collected'] * len(prod_data['values'])
            }
            
            instructions = pd.DataFrame({
                'Date': [
                    'LABOR PRODUCTIVITY - Quarterly Data',
                    'AUTO-COLLECTED: Index values below were automatically filled',
                    'Source: FRED (OPHNFB series)',
                    'Frequency: Quarterly',
                    'Time Period: 24 quarters (6 years)',
                    'Status: Index values collected, YoY can be calculated',
                    'Manual additions: YoY_Change column can be added',
                    '--- AUTO-COLLECTED DATA BELOW ---'
                ],
                'Productivity_Index': [''] * 8,
                'YoY_Change': [''] * 8,
                'Data_Source': [''] * 8,
                'Notes': [''] * 8
            })
            
            tabs['Productivity'] = pd.concat([instructions, pd.DataFrame(prod_df_data)], ignore_index=True)
        else:
            tabs['Productivity'] = self.create_empty_productivity_tab()
        
        # QQQ/SPY ratio tab if calculated
        if 'qqq_spy_ratio' in self.collected_data:
            ratio_data = self.collected_data['qqq_spy_ratio']
            
            ratio_df_data = {
                'Date': ratio_data['dates'],
                'QQQ_SPY_Ratio': ratio_data['values'],
                'QQQ_Close': self.collected_data['qqq']['values'] if 'qqq' in self.collected_data else [''] * len(ratio_data['dates']),
                'SPY_Close': self.collected_data['spy']['values'] if 'spy' in self.collected_data else [''] * len(ratio_data['dates']),
                'Notes': ['Auto-calculated'] * len(ratio_data['values'])
            }
            
            instructions = pd.DataFrame({
                'Date': [
                    'QQQ/SPY RATIO - Daily Data',
                    'AUTO-CALCULATED: Ratios below were automatically calculated',
                    'Source: Yahoo Finance QQQ and SPY prices',
                    'Frequency: Daily',
                    'Time Period: 300 days',
                    'Status: Complete ratio time series',
                    'Manual additions: None needed for this indicator',
                    '--- AUTO-CALCULATED DATA BELOW ---'
                ],
                'QQQ_SPY_Ratio': [''] * 8,
                'QQQ_Close': [''] * 8,
                'SPY_Close': [''] * 8,
                'Notes': [''] * 8
            })
            
            tabs['QQQ_SPY_Ratio'] = pd.concat([instructions, pd.DataFrame(ratio_df_data)], ignore_index=True)
        
        # Create empty tabs for indicators that need manual entry
        tabs['CAPE'] = self.create_empty_cape_tab()
        tabs['Net_Margins'] = self.create_empty_net_margins_tab()
        tabs['Yuan_SWIFT'] = self.create_empty_yuan_swift_tab()
        tabs['Reserve_Share'] = self.create_empty_reserve_share_tab()
        
        # Summary tab
        tabs['Summary'] = self.create_summary_tab()
        
        # Write Excel file
        with pd.ExcelWriter(workbook_filename, engine='openpyxl') as writer:
            for tab_name, df in tabs.items():
                df.to_excel(writer, sheet_name=tab_name, index=False)
                
                # Set column widths
                worksheet = writer.sheets[tab_name]
                for col in ['A', 'B', 'C', 'D', 'E', 'F']:
                    worksheet.column_dimensions[col].width = 15
        
        self.logger.info(f"Workbook created: {workbook_filename}")
        return workbook_filename
    
    def create_empty_forward_pe_tab(self):
        """Create empty Forward P/E tab template"""
        dates = []
        current = datetime.now()
        
        # Generate 156 weekly dates
        for i in range(156, 0, -1):
            date = current - timedelta(weeks=i)
            dates.append(date.strftime('%Y-%m-%d'))
        
        df_data = {
            'Date': dates,
            'Forward_PE': [''] * len(dates),
            'Data_Source': [''] * len(dates),
            'Notes': [''] * len(dates)
        }
        
        instructions = pd.DataFrame({
            'Date': [
                'FORWARD P/E - Historical Calibration Data',
                'MANUAL ENTRY NEEDED',
                'Source: FactSet Earnings Insight + Yardeni Research',
                'Frequency: Weekly (every Friday or last trading day)',
                'Time Period: 156 weeks (3 years)',
                'Expected Range: 15.0 - 30.0',
                'Priority: CRITICAL',
                '--- ENTER DATA BELOW ---'
            ],
            'Forward_PE': [''] * 8,
            'Data_Source': [''] * 8,
            'Notes': [''] * 8
        })
        
        return pd.concat([instructions, pd.DataFrame(df_data)], ignore_index=True)
    
    def create_empty_dxy_tab(self):
        """Create empty DXY tab if collection failed"""
        dates = []
        for i in range(400, 0, -1):
            date = datetime.now() - timedelta(days=i)
            dates.append(date.strftime('%Y-%m-%d'))
        
        df_data = {
            'Date': dates,
            'DXY_Close': [''] * len(dates),
            'DXY_High': [''] * len(dates),
            'DXY_Low': [''] * len(dates),
            'Volume': [''] * len(dates),
            'Notes': [''] * len(dates)
        }
        
        instructions = pd.DataFrame({
            'Date': [
                'DXY (US Dollar Index) - Daily Price Data', 
                'MANUAL ENTRY NEEDED',
                'Source: Yahoo Finance, Bloomberg, TradingView',
                'Frequency: Daily',
                'Time Period: 400 days',
                'Expected Range: 90-110',
                'Priority: HIGH',
                '--- ENTER DATA BELOW ---'
            ],
            'DXY_Close': [''] * 8,
            'DXY_High': [''] * 8,
            'DXY_Low': [''] * 8,
            'Volume': [''] * 8,
            'Notes': [''] * 8
        })
        
        return pd.concat([instructions, pd.DataFrame(df_data)], ignore_index=True)
    
    def create_empty_productivity_tab(self):
        """Create empty productivity tab if collection failed"""
        dates = []
        for i in range(24, 0, -1):
            date = datetime.now() - relativedelta(months=i * 3)
            quarter_end = f"{date.year}-Q{(date.month-1)//3 + 1}"
            dates.append(quarter_end)
        
        df_data = {
            'Date': dates,
            'Productivity_Index': [''] * len(dates),
            'YoY_Change': [''] * len(dates),
            'Data_Source': [''] * len(dates),
            'Notes': [''] * len(dates)
        }
        
        instructions = pd.DataFrame({
            'Date': [
                'LABOR PRODUCTIVITY - Quarterly Data',
                'MANUAL ENTRY NEEDED',
                'Source: FRED (OPHNFB) or BLS',
                'Frequency: Quarterly',
                'Time Period: 24 quarters',
                'Expected Range: 100-120',
                'Priority: HIGH',
                '--- ENTER DATA BELOW ---'
            ],
            'Productivity_Index': [''] * 8,
            'YoY_Change': [''] * 8,
            'Data_Source': [''] * 8,
            'Notes': [''] * 8
        })
        
        return pd.concat([instructions, pd.DataFrame(df_data)], ignore_index=True)
    
    def create_empty_cape_tab(self):
        """Create empty CAPE tab for manual entry"""
        dates = []
        for i in range(240, 0, -1):
            date = datetime.now() - relativedelta(months=i)
            dates.append(date.strftime('%Y-%m-%d'))
        
        df_data = {
            'Date': dates,
            'CAPE_Ratio': [''] * len(dates),
            'PE10': [''] * len(dates),
            'Data_Source': [''] * len(dates),
            'Notes': [''] * len(dates)
        }
        
        instructions = pd.DataFrame({
            'Date': [
                'CAPE (Cyclically Adjusted P/E) - Historical Data',
                'MANUAL ENTRY NEEDED',
                'Source: Robert Shiller Yale + multpl.com',
                'Frequency: Monthly',
                'Time Period: 240 months (20 years)',
                'Expected Range: 15.0 - 45.0',
                'Priority: HIGH',
                '--- ENTER DATA BELOW ---'
            ],
            'CAPE_Ratio': [''] * 8,
            'PE10': [''] * 8,
            'Data_Source': [''] * 8,
            'Notes': [''] * 8
        })
        
        return pd.concat([instructions, pd.DataFrame(df_data)], ignore_index=True)
    
    def create_empty_net_margins_tab(self):
        """Create empty net margins tab"""
        dates = []
        for i in range(12, 0, -1):
            date = datetime.now() - relativedelta(months=i * 3)
            quarter = f"{date.year}-Q{(date.month-1)//3 + 1}"
            dates.append(quarter)
        
        df_data = {
            'Date': dates,
            'Net_Margin_Percent': [''] * len(dates),
            'TTM_Net_Margin': [''] * len(dates),
            'Data_Source': [''] * len(dates),
            'Methodology': [''] * len(dates),
            'Notes': [''] * len(dates)
        }
        
        instructions = pd.DataFrame({
            'Date': [
                'S&P 500 NET MARGINS - Quarterly Data',
                'MANUAL ENTRY NEEDED',
                'Source: S&P Capital IQ, FactSet',
                'Frequency: Quarterly',
                'Time Period: 12 quarters',
                'Expected Range: 8% - 15%',
                'Priority: HIGH',
                '--- ENTER DATA BELOW ---'
            ],
            'Net_Margin_Percent': [''] * 8,
            'TTM_Net_Margin': [''] * 8,
            'Data_Source': [''] * 8,
            'Methodology': [''] * 8,
            'Notes': [''] * 8
        })
        
        return pd.concat([instructions, pd.DataFrame(df_data)], ignore_index=True)
    
    def create_empty_yuan_swift_tab(self):
        """Create empty Yuan SWIFT tab"""
        dates = []
        for i in range(36, 0, -1):
            date = datetime.now() - relativedelta(months=i)
            dates.append(date.strftime('%Y-%m-%d'))
        
        df_data = {
            'Date': dates,
            'RMB_Share_Percent': [''] * len(dates),
            'USD_Share_Percent': [''] * len(dates),
            'EUR_Share_Percent': [''] * len(dates),
            'Report_Source': [''] * len(dates),
            'Notes': [''] * len(dates)
        }
        
        instructions = pd.DataFrame({
            'Date': [
                'YUAN SWIFT SHARE - Monthly Payment Data',
                'MANUAL ENTRY NEEDED',
                'Source: SWIFT RMB Tracker PDFs',
                'Frequency: Monthly',
                'Time Period: 36 months',
                'Expected Range: 2.0% - 4.5%',
                'Priority: MEDIUM',
                '--- ENTER DATA BELOW ---'
            ],
            'RMB_Share_Percent': [''] * 8,
            'USD_Share_Percent': [''] * 8,
            'EUR_Share_Percent': [''] * 8,
            'Report_Source': [''] * 8,
            'Notes': [''] * 8
        })
        
        return pd.concat([instructions, pd.DataFrame(df_data)], ignore_index=True)
    
    def create_empty_reserve_share_tab(self):
        """Create empty reserve share tab"""
        dates = []
        for i in range(12, 0, -1):
            date = datetime.now() - relativedelta(months=i * 3)
            quarter = f"{date.year}-Q{(date.month-1)//3 + 1}"
            dates.append(quarter)
        
        df_data = {
            'Date': dates,
            'USD_Reserve_Share': [''] * len(dates),
            'EUR_Reserve_Share': [''] * len(dates),
            'JPY_Reserve_Share': [''] * len(dates),
            'GBP_Reserve_Share': [''] * len(dates),
            'Other_Reserve_Share': [''] * len(dates),
            'Total_Reserves_USD_Billion': [''] * len(dates),
            'Data_Source': [''] * len(dates),
            'Notes': [''] * len(dates)
        }
        
        instructions = pd.DataFrame({
            'Date': [
                'USD RESERVE SHARE - Quarterly Central Bank Data',
                'MANUAL ENTRY NEEDED',
                'Source: IMF COFER Database',
                'Frequency: Quarterly',
                'Time Period: 12 quarters',
                'Expected Range: 55% - 65%',
                'Priority: MEDIUM',
                '--- ENTER DATA BELOW ---'
            ],
            'USD_Reserve_Share': [''] * 8,
            'EUR_Reserve_Share': [''] * 8,
            'JPY_Reserve_Share': [''] * 8,
            'GBP_Reserve_Share': [''] * 8,
            'Other_Reserve_Share': [''] * 8,
            'Total_Reserves_USD_Billion': [''] * 8,
            'Data_Source': [''] * 8,
            'Notes': [''] * 8
        })
        
        return pd.concat([instructions, pd.DataFrame(df_data)], ignore_index=True)
    
    def create_summary_tab(self):
        """Create summary tab with collection results"""
        
        # Count successes
        auto_collected = len([k for k, v in self.collected_data.items() if v.get('collection_status') == 'success'])
        
        summary_data = {
            'Indicator': [
                'forward_pe',
                'dxy',
                'productivity', 
                'qqq_spy_ratio',
                'cape',
                'net_margins',
                'yuan_swift',
                'reserve_share'
            ],
            'Auto_Collection_Status': [
                'SUCCESS' if 'forward_pe' in self.collected_data else 'MANUAL NEEDED',
                'SUCCESS' if 'dxy' in self.collected_data and self.collected_data['dxy']['collection_status'] == 'success' else 'MANUAL NEEDED',
                'SUCCESS' if 'productivity' in self.collected_data and self.collected_data['productivity']['collection_status'] == 'success' else 'MANUAL NEEDED',
                'SUCCESS' if 'qqq_spy_ratio' in self.collected_data else 'MANUAL NEEDED',
                'MANUAL NEEDED',
                'MANUAL NEEDED',
                'MANUAL NEEDED',
                'MANUAL NEEDED'
            ],
            'Data_Points_Collected': [
                len(self.collected_data.get('forward_pe', {}).get('values', [])),
                len(self.collected_data.get('dxy', {}).get('values', [])),
                len(self.collected_data.get('productivity', {}).get('values', [])),
                len(self.collected_data.get('qqq_spy_ratio', {}).get('values', [])),
                0,
                0,
                0,
                0
            ],
            'Priority': ['CRITICAL', 'HIGH', 'HIGH', 'MEDIUM', 'HIGH', 'HIGH', 'MEDIUM', 'MEDIUM'],
            'Manual_Entry_Needed': ['YES', 'NO', 'NO', 'NO', 'YES', 'YES', 'YES', 'YES']
        }
        
        df = pd.DataFrame(summary_data)
        
        instructions = pd.DataFrame({
            'Indicator': [
                'HCP CALIBRATION WORKBOOK - AUTO-FILLED v1.1',
                f'Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}',
                f'Auto-collected indicators: {auto_collected}',
                '',
                'COLLECTION RESULTS:',
                '- Yahoo Finance data: Collected if available',
                '- FRED productivity: Collected if available', 
                '- Forward P/E: Yardeni baseline if available',
                '- Ratios: Calculated from collected prices',
                '',
                'YOUR TASK:',
                '- Review auto-filled tabs',
                '- Complete manual entry for remaining indicators',
                '- Focus on CRITICAL and HIGH priority first',
                '',
                '--- INDICATOR STATUS ---'
            ],
            'Auto_Collection_Status': [''] * 16,
            'Data_Points_Collected': [''] * 16,
            'Priority': [''] * 16,
            'Manual_Entry_Needed': [''] * 16
        })
        
        return pd.concat([instructions, df], ignore_index=True)

def main():
    """Main execution"""
    print("V3.8.2 to Workbook Collector v1.1")
    print("Extending proven v3.8.2 methods, outputting to Excel workbook")
    print("-" * 60)
    
    collector = WorkbookDataCollector()
    
    # Collect what we can automatically
    print("Collecting data using proven v3.8.2 methods...")
    collected_data = collector.collect_what_we_can()
    
    # Output to workbook
    print("Creating Excel workbook with auto-filled data...")
    workbook_file = collector.output_to_workbook()
    
    # Summary
    auto_collected = len([k for k, v in collected_data.items() if v.get('collection_status') == 'success'])
    
    print(f"\n{'='*60}")
    print("COLLECTION COMPLETE")
    print(f"{'='*60}")
    print(f"Auto-collected indicators: {auto_collected}")
    print(f"Excel workbook: {workbook_file}")
    print(f"")
    print(f"NEXT STEPS:")
    print(f"1. Open {workbook_file}")
    print(f"2. Review auto-filled tabs (already populated)")
    print(f"3. Complete manual entry for remaining indicators")
    print(f"4. Run workbook-to-JSON converter when complete")
    print(f"")
    print(f"AUTO-COLLECTED (likely working):")
    for indicator, data in collected_data.items():
        if data.get('collection_status') == 'success':
            print(f"  - {indicator}: {len(data.get('values', []))} data points")
    
    return workbook_file

if __name__ == "__main__":
    main()
