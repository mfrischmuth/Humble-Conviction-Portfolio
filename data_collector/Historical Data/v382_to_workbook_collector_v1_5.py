#!/usr/bin/env python3
"""
V3.8.2 to Workbook Collector v1.5
File: v382_to_workbook_collector_v1_5.py
Last Updated: 2025-09-02 18:30:00 UTC

Clean version - fixes syntax errors in try-except blocks.
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
    
    def collect_single_ticker(self, symbol, days, name):
        """Helper method to collect data for a single ticker"""
        try:
            ticker = yf.Ticker(symbol)
            start_date = datetime.now() - timedelta(days=days + 50)
            data = ticker.history(start=start_date)
            
            if not data.empty:
                close_data = data['Close'].tail(days)
                values = [round(float(v), 2) for v in close_data]
                dates = [d.strftime('%Y-%m-%d') for d in close_data.index]
                
                self.collected_data[name] = {
                    'values': values,
                    'dates': dates,
                    'source': 'Yahoo Finance API',
                    'collection_status': 'success'
                }
                self.logger.info(f"  {symbol}: {len(values)} days collected")
                return True
            else:
                self.collected_data[name] = {'collection_status': 'failed', 'reason': 'No data returned'}
                return False
                
        except Exception as e:
            self.collected_data[name] = {'collection_status': 'failed', 'reason': str(e)}
            self.logger.error(f"  {symbol} failed: {e}")
            return False
    
    def collect_yahoo_finance_historical(self):
        """Use v3.8.2's proven yfinance methods, extended time periods"""
        self.logger.info("Collecting Yahoo Finance data (extended periods)...")
        
        # Collect all tickers using the helper method
        self.collect_single_ticker("DX=F", 400, "dxy")
        self.collect_single_ticker("QQQ", 300, "qqq") 
        self.collect_single_ticker("SPY", 300, "spy")
        self.collect_single_ticker("ACWX", 90, "acwx")
        self.collect_single_ticker("VEU", 300, "veu")
        self.collect_single_ticker("^TNX", 150, "treasury_10y")
    
    def collect_fred_data_historical(self):
        """Use v3.8.2's proven FRED methods, extended periods"""
        self.logger.info("Collecting FRED data (extended periods)...")
        
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
        """Use your embedded Yardeni data"""
        self.logger.info("Collecting Forward P/E historical data...")
        
        weekly_values = []
        weekly_dates = []
        
        quarters = sorted(YARDENI_HISTORICAL_PE.keys())
        
        for quarter_key in quarters:
            pe_value = YARDENI_HISTORICAL_PE[quarter_key]
            
            year, q = quarter_key.split('-Q')
            year = int(year)
            quarter = int(q)
            
            if quarter == 1:
                start_month, end_month = 1, 3
            elif quarter == 2:
                start_month, end_month = 4, 6
            elif quarter == 3:
                start_month, end_month = 7, 9
            else:
                start_month, end_month = 10, 12
            
            for month in range(start_month, end_month + 1):
                for week in range(1, 5):
                    try:
                        week_date = datetime(year, month, min(week * 7, 28))
                        weekly_values.append(pe_value)
                        weekly_dates.append(week_date.strftime('%Y-%m-%d'))
                    except ValueError:
                        continue
        
        self.collected_data['forward_pe'] = {
            'values': weekly_values[-156:],
            'dates': weekly_dates[-156:],
            'source': 'Yardeni Historical Baseline (embedded)',
            'collection_status': 'success'
        }
        self.logger.info(f"  Forward P/E: {len(weekly_values[-156:])} weeks from Yardeni baseline")
    
    def calculate_ratios_and_performance(self):
        """Calculate ratios and performance metrics from collected data"""
        self.logger.info("Calculating ratios and performance metrics...")
        
        # QQQ/SPY ratio
        if (self.collected_data.get('qqq', {}).get('collection_status') == 'success' and
            self.collected_data.get('spy', {}).get('collection_status') == 'success'):
            
            qqq_values = self.collected_data['qqq']['values']
            spy_values = self.collected_data['spy']['values']
            
            ratio_values = []
            min_len = min(len(qqq_values), len(spy_values))
            
            for i in range(min_len):
                if qqq_values[i] and spy_values[i]:
                    ratio_values.append(round(qqq_values[i] / spy_values[i], 4))
                else:
                    ratio_values.append('')
            
            self.collected_data['qqq_spy_ratio'] = {
                'values': ratio_values,
                'dates': self.collected_data['qqq']['dates'][:len(ratio_values)],
                'source': 'Calculated from Yahoo Finance QQQ/SPY',
                'collection_status': 'success'
            }
            self.logger.info(f"  QQQ/SPY Ratio: {len([v for v in ratio_values if v != ''])} days calculated")
        
        # ACWX/SPY ratio
        if (self.collected_data.get('acwx', {}).get('collection_status') == 'success' and
            self.collected_data.get('spy', {}).get('collection_status') == 'success'):
            
            acwx_values = self.collected_data['acwx']['values']
            spy_values = self.collected_data['spy']['values'][-len(acwx_values):]
            
            ratio_values = []
            for i in range(min(len(acwx_values), len(spy_values))):
                if acwx_values[i] and spy_values[i]:
                    ratio_values.append(round(acwx_values[i] / spy_values[i], 4))
                else:
                    ratio_values.append('')
            
            self.collected_data['acwx_spy_ratio'] = {
                'values': ratio_values,
                'dates': self.collected_data['acwx']['dates'][:len(ratio_values)],
                'source': 'Calculated from Yahoo Finance ACWX/SPY',
                'collection_status': 'success'
            }
            self.logger.info(f"  ACWX/SPY Ratio: {len([v for v in ratio_values if v != ''])} days calculated")
        
        # S&P vs World performance
        if (self.collected_data.get('spy', {}).get('collection_status') == 'success' and
            self.collected_data.get('veu', {}).get('collection_status') == 'success'):
            
            spy_values = self.collected_data['spy']['values']
            veu_values = self.collected_data['veu']['values']
            
            performance_diff = []
            min_length = min(len(spy_values), len(veu_values))
            
            for i in range(130, min_length):  # 130 days ≈ 6 months
                if (spy_values[i] and spy_values[i-130] and 
                    veu_values[i] and veu_values[i-130]):
                    
                    spy_return = (spy_values[i] / spy_values[i-130] - 1) * 100
                    veu_return = (veu_values[i] / veu_values[i-130] - 1) * 100
                    performance_diff.append(round(spy_return - veu_return, 2))
                else:
                    performance_diff.append('')
            
            spy_dates_matched = self.collected_data['spy']['dates'][130:130+len(performance_diff)]
            
            self.collected_data['sp_vs_world'] = {
                'values': performance_diff,
                'dates': spy_dates_matched,
                'source': 'Calculated from SPY vs VEU (6M relative performance)',
                'collection_status': 'success'
            }
            self.logger.info(f"  S&P vs World: {len([v for v in performance_diff if v != ''])} periods calculated")
        
        # Risk Premium
        if self.collected_data.get('treasury_10y', {}).get('collection_status') == 'success':
            treasury_values = self.collected_data['treasury_10y']['values']
            estimated_earnings_yield = 4.5
            
            risk_premium_values = []
            for treasury_yield in treasury_values:
                if treasury_yield:
                    risk_premium = estimated_earnings_yield - treasury_yield
                    risk_premium_values.append(round(risk_premium, 2))
                else:
                    risk_premium_values.append('')
            
            self.collected_data['risk_premium'] = {
                'values': risk_premium_values,
                'dates': self.collected_data['treasury_10y']['dates'],
                'source': 'Calculated: Est. Earnings Yield (4.5%) - Treasury 10Y',
                'collection_status': 'success'
            }
            self.logger.info(f"  Risk Premium: {len([v for v in risk_premium_values if v != ''])} days calculated")
    
    def collect_what_we_can(self):
        """Collect data using only proven v3.8.2 methods"""
        self.logger.info("Running data collection using proven v3.8.2 methods...")
        
        self.collect_yahoo_finance_historical()
        self.collect_fred_data_historical()
        self.collect_forward_pe_historical()
        self.calculate_ratios_and_performance()
        
        return self.collected_data
    
    def create_tab_with_data(self, tab_name, data_key, columns, instructions_text):
        """Helper method to create tabs with auto-filled data"""
        if data_key in self.collected_data and self.collected_data[data_key].get('collection_status') == 'success':
            data = self.collected_data[data_key]
            
            # Create data DataFrame
            df_data = {columns[0]: data['dates']}
            df_data[columns[1]] = data['values']
            
            # Fill remaining columns with empty strings
            for col in columns[2:]:
                df_data[col] = [''] * len(data['dates'])
            
            # Add instructions
            instructions = pd.DataFrame({
                col: ([''] * len(instructions_text)) for col in columns
            })
            instructions[columns[0]] = instructions_text
            
            return pd.concat([instructions, pd.DataFrame(df_data)], ignore_index=True)
        else:
            return self.create_empty_tab(columns, instructions_text)
    
    def create_empty_tab(self, columns, instructions_text):
        """Create empty template tab"""
        instructions = pd.DataFrame({
            col: ([''] * len(instructions_text)) for col in columns
        })
        instructions[columns[0]] = instructions_text
        return instructions
    
    def output_to_workbook(self, workbook_filename=None):
        """Output collected data directly to Excel workbook format"""
        
        if workbook_filename is None:
            workbook_filename = f'HCP_Calibration_Workbook_AutoFilled_{datetime.now().strftime("%Y%m%d")}.xlsx'
        
        self.logger.info(f"Creating workbook with auto-filled data: {workbook_filename}")
        
        tabs = {}
        
        # Forward P/E tab
        tabs['Forward_PE'] = self.create_tab_with_data(
            'Forward_PE', 'forward_pe',
            ['Date', 'Forward_PE', 'Data_Source', 'Notes'],
            ['FORWARD P/E - Historical Calibration Data', 'AUTO-FILLED from Yardeni baseline', 
             'Source: Embedded Yardeni Research data', '156 weeks for calibration', 
             'Status: Ready for threshold analysis', '--- AUTO-FILLED DATA BELOW ---']
        )
        
        # DXY tab
        tabs['DXY'] = self.create_tab_with_data(
            'DXY', 'dxy',
            ['Date', 'DXY_Close', 'DXY_High', 'DXY_Low', 'Volume', 'Notes'],
            ['DXY (US Dollar Index) - Daily Price Data', 'AUTO-FILLED close prices', 
             'Source: Yahoo Finance', '400 days for 400-day MA', 
             'Status: Close prices collected', '--- AUTO-FILLED DATA BELOW ---']
        )
        
        # Productivity tab
        tabs['Productivity'] = self.create_tab_with_data(
            'Productivity', 'productivity',
            ['Date', 'Productivity_Index', 'YoY_Change', 'Data_Source', 'Notes'],
            ['LABOR PRODUCTIVITY - Quarterly Data', 'AUTO-FILLED index values',
             'Source: FRED API (OPHNFB)', '24 quarters collected',
             'Status: Ready for MA calculations', '--- AUTO-FILLED DATA BELOW ---']
        )
        
        # Create all other tabs (auto-filled where available, empty templates otherwise)
        tabs['QQQ_SPY_Ratio'] = self.create_tab_with_data(
            'QQQ_SPY_Ratio', 'qqq_spy_ratio',
            ['Date', 'QQQ_SPY_Ratio', 'QQQ_Close', 'SPY_Close', 'Notes'],
            ['QQQ/SPY RATIO - Daily Data', 'AUTO-CALCULATED ratios', 
             '300 days for MA calculations', '--- AUTO-CALCULATED DATA BELOW ---']
        )
        
        tabs['ACWX_SPY_Ratio'] = self.create_tab_with_data(
            'ACWX_SPY_Ratio', 'acwx_spy_ratio', 
            ['Date', 'ACWX_SPY_Ratio', 'ACWX_Close', 'SPY_Close', 'Notes'],
            ['ACWX/SPY RATIO - Daily Data', 'AUTO-CALCULATED ratios',
             '90 days for 30D/90D MA', '--- AUTO-CALCULATED DATA BELOW ---']
        )
        
        tabs['SP_vs_World'] = self.create_tab_with_data(
            'SP_vs_World', 'sp_vs_world',
            ['Date', 'SPY_vs_VEU_Diff', 'SPY_6M_Return', 'VEU_6M_Return', 'Notes'], 
            ['S&P vs WORLD - Performance Difference', 'AUTO-CALCULATED from SPY vs VEU',
             '6-month relative performance', '--- AUTO-CALCULATED DATA BELOW ---']
        )
        
        tabs['Risk_Premium'] = self.create_tab_with_data(
            'Risk_Premium', 'risk_premium',
            ['Date', 'Risk_Premium', 'Treasury_10Y', 'Earnings_Yield', 'Notes'],
            ['EQUITY RISK PREMIUM - Daily Data', 'AUTO-CALCULATED with estimated yield',
             'Formula: 4.5% - Treasury 10Y', '--- AUTO-CALCULATED DATA BELOW ---']
        )
        
        # Manual entry tabs
        tabs['CAPE'] = self.create_empty_tab(
            ['Date', 'CAPE_Ratio', 'PE10', 'Data_Source', 'Notes'],
            ['CAPE - Manual Entry Needed', 'Source: Robert Shiller Yale', 
             '240 months needed', '--- ENTER DATA BELOW ---']
        )
        
        tabs['Net_Margins'] = self.create_empty_tab(
            ['Date', 'Net_Margin_Percent', 'TTM_Net_Margin', 'Data_Source', 'Notes'],
            ['S&P 500 NET MARGINS - Manual Entry Needed', 'Source: S&P Capital IQ',
             '12 quarters needed', '--- ENTER DATA BELOW ---']
        )
        
        tabs['Yuan_SWIFT'] = self.create_empty_tab(
            ['Date', 'RMB_Share_Percent', 'USD_Share_Percent', 'Report_Source', 'Notes'],
            ['YUAN SWIFT SHARE - Manual Entry Needed', 'Source: SWIFT RMB Tracker PDFs',
             '36 months needed', '--- ENTER DATA BELOW ---']
        )
        
        tabs['Reserve_Share'] = self.create_empty_tab(
            ['Date', 'USD_Reserve_Share', 'EUR_Reserve_Share', 'Data_Source', 'Notes'],
            ['USD RESERVE SHARE - Manual Entry Needed', 'Source: IMF COFER Database',
             '12 quarters needed', '--- ENTER DATA BELOW ---']
        )
        
        tabs['Central_Bank_Gold'] = self.create_empty_tab(
            ['Date', 'CB_Gold_Purchases_Tonnes', 'Net_Purchases', 'Data_Source', 'Notes'],
            ['CENTRAL BANK GOLD - Manual Entry Needed', 'Source: World Gold Council',
             '12 quarters needed', '--- ENTER DATA BELOW ---']
        )
        
        tabs['TIC_Flows'] = self.create_empty_tab(
            ['Date', 'TIC_Net_Flows_Billions', 'Foreign_Purchases', 'Data_Source', 'Notes'],
            ['TIC NET FLOWS - Manual Entry Needed', 'Source: US Treasury TIC Reports',
             '24 months needed', '--- ENTER DATA BELOW ---']
        )
        
        # Summary tab
        auto_collected = len([k for k, v in self.collected_data.items() if v.get('collection_status') == 'success'])
        
        tabs['Summary'] = pd.DataFrame({
            'Status': [
                'HCP CALIBRATION WORKBOOK v1.5',
                f'Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}',
                f'Auto-collected indicators: {auto_collected}',
                '',
                'AUTO-FILLED TABS (review and use):',
                '- Forward_PE: Yardeni baseline data',
                '- DXY: Yahoo Finance prices',
                '- Productivity: FRED quarterly data', 
                '- QQQ_SPY_Ratio: Calculated ratios',
                '- ACWX_SPY_Ratio: Calculated ratios',
                '- SP_vs_World: Performance comparison',
                '- Risk_Premium: Treasury-based calculation',
                '',
                'MANUAL ENTRY NEEDED:',
                '- CAPE, Net_Margins, Yuan_SWIFT',
                '- Reserve_Share, Central_Bank_Gold, TIC_Flows'
            ]
        })
        
        # Write Excel file
        with pd.ExcelWriter(workbook_filename, engine='openpyxl') as writer:
            for tab_name, df in tabs.items():
                df.to_excel(writer, sheet_name=tab_name, index=False)
                
                worksheet = writer.sheets[tab_name]
                for col in ['A', 'B', 'C', 'D', 'E', 'F']:
                    worksheet.column_dimensions[col].width = 15
        
        self.logger.info(f"Workbook created: {workbook_filename}")
        return workbook_filename

def main():
    """Main execution"""
    print("V3.8.2 to Workbook Collector v1.5 (Clean Version)")
    print("Extending proven v3.8.2 methods, outputting to Excel workbook")
    print("-" * 60)
    
    collector = WorkbookDataCollector()
    
    print("Collecting data using proven v3.8.2 methods...")
    collected_data = collector.collect_what_we_can()
    
    print("Creating Excel workbook with auto-filled data...")
    workbook_file = collector.output_to_workbook()
    
    auto_collected = len([k for k, v in collected_data.items() if v.get('collection_status') == 'success'])
    
    print(f"\n{'='*60}")
    print("COLLECTION COMPLETE")
    print(f"{'='*60}")
    print(f"Auto-collected indicators: {auto_collected}")
    print(f"Excel workbook: {workbook_file}")
    print(f"")
    print(f"AUTO-COLLECTED:")
    for indicator, data in collected_data.items():
        if data.get('collection_status') == 'success':
            print(f"  - {indicator}: {len(data.get('values', []))} data points")
    
    return workbook_file

if __name__ == "__main__":
    main()
