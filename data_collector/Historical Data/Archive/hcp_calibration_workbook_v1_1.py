#!/usr/bin/env python3
"""
HCP Calibration Workbook Generator v1.1
File: create_hcp_calibration_workbook_v1.1.py
Last Updated: 2025-09-02 16:15:00 UTC

Creates comprehensive Excel workbook with separate tabs for each indicator,
properly formatted with historical time periods needed for calibration.
Based on Data Collector v3.8 proven architecture and requirements.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
import calendar

def generate_date_series(start_date, periods, frequency):
    """Generate date series for different frequencies"""
    dates = []
    current = start_date
    
    if frequency == 'daily':
        for i in range(periods):
            dates.append(current.strftime('%Y-%m-%d'))
            current -= timedelta(days=1)
    elif frequency == 'weekly':
        for i in range(periods):
            dates.append(current.strftime('%Y-%m-%d'))
            current -= timedelta(weeks=1)
    elif frequency == 'monthly':
        for i in range(periods):
            # Get last day of month
            last_day = calendar.monthrange(current.year, current.month)[1]
            month_end = current.replace(day=last_day)
            dates.append(month_end.strftime('%Y-%m-%d'))
            current -= relativedelta(months=1)
    elif frequency == 'quarterly':
        for i in range(periods):
            # Quarter end dates
            if current.month <= 3:
                quarter_end = current.replace(month=3, day=31)
            elif current.month <= 6:
                quarter_end = current.replace(month=6, day=30)
            elif current.month <= 9:
                quarter_end = current.replace(month=9, day=30)
            else:
                quarter_end = current.replace(month=12, day=31)
            
            dates.append(quarter_end.strftime('%Y-%m-%d'))
            current -= relativedelta(months=3)
    
    return dates

def create_forward_pe_tab():
    """Forward P/E: Weekly values for 36 months (156 weeks)"""
    dates = generate_date_series(datetime.now(), 156, 'weekly')
    
    data = {
        'Date': dates,
        'Forward_PE': [''] * len(dates),
        'Data_Source': [''] * len(dates),
        'Notes': [''] * len(dates)
    }
    
    df = pd.DataFrame(data)
    
    # Add instruction rows at the top
    instructions = pd.DataFrame({
        'Date': [
            'FORWARD P/E - Historical Calibration Data',
            'Source: Yardeni Research + FactSet Earnings Insight',
            'Frequency: Weekly (every Friday or last trading day)',
            'Time Period: 36 months (3 years for moving average)',
            'Data Location: S&P 500 Earnings Season Updates',
            'Expected Range: 15.0 - 30.0 (historical variation)',
            'Current Estimate: ~21-22 (as of Sept 2025)',
            '--- START DATA ENTRY BELOW ---'
        ],
        'Forward_PE': ['', '', '', '', '', '', '', ''],
        'Data_Source': ['', '', '', '', '', '', '', ''],
        'Notes': ['', '', '', '', '', '', '', '']
    })
    
    return pd.concat([instructions, df], ignore_index=True)

def create_cape_tab():
    """CAPE: Monthly values for 240 months (20 years)"""
    dates = generate_date_series(datetime.now(), 240, 'monthly')
    
    data = {
        'Date': dates,
        'CAPE_Ratio': [''] * len(dates),
        'PE10': [''] * len(dates),  # Alternative name
        'Data_Source': [''] * len(dates),
        'Notes': [''] * len(dates)
    }
    
    df = pd.DataFrame(data)
    
    instructions = pd.DataFrame({
        'Date': [
            'CAPE (Cyclically Adjusted P/E) - Historical Data',
            'Source: Robert Shiller Yale + multpl.com',
            'Frequency: Monthly (month-end values)',
            'Time Period: 240 months (20 years for long-term context)',
            'Data Location: http://www.econ.yale.edu/~shiller/data.htm',
            'Expected Range: 15.0 - 45.0 (extreme historical range)',
            'Current Level: ~30-32 (elevated but not extreme)',
            '--- START DATA ENTRY BELOW ---'
        ],
        'CAPE_Ratio': ['', '', '', '', '', '', '', ''],
        'PE10': ['', '', '', '', '', '', '', ''],
        'Data_Source': ['', '', '', '', '', '', '', ''],
        'Notes': ['', '', '', '', '', '', '', '']
    })
    
    return pd.concat([instructions, df], ignore_index=True)

def create_productivity_tab():
    """Productivity: Quarterly values for 24 quarters (6 years)"""
    dates = generate_date_series(datetime.now(), 24, 'quarterly')
    
    data = {
        'Date': dates,
        'Productivity_Index': [''] * len(dates),
        'YoY_Change': [''] * len(dates),
        'Data_Source': [''] * len(dates),
        'Notes': [''] * len(dates)
    }
    
    df = pd.DataFrame(data)
    
    instructions = pd.DataFrame({
        'Date': [
            'LABOR PRODUCTIVITY - Quarterly Data',
            'Source: FRED (Federal Reserve Economic Data)',
            'Series: OPHNFB (Nonfarm Business Labor Productivity)',
            'Frequency: Quarterly (quarter-end values)',
            'Time Period: 24 quarters (6 years for trend analysis)', 
            'Data Location: https://fred.stlouisfed.org/series/OPHNFB',
            'Expected Range: 100-120 (index, 2012=100)',
            '--- START DATA ENTRY BELOW ---'
        ],
        'Productivity_Index': ['', '', '', '', '', '', '', ''],
        'YoY_Change': ['', '', '', '', '', '', '', ''],
        'Data_Source': ['', '', '', '', '', '', '', ''],
        'Notes': ['', '', '', '', '', '', '', '']
    })
    
    return pd.concat([instructions, df], ignore_index=True)

def create_dxy_tab():
    """DXY: Daily values for 400+ days"""
    dates = generate_date_series(datetime.now(), 400, 'daily')
    
    data = {
        'Date': dates,
        'DXY_Close': [''] * len(dates),
        'DXY_High': [''] * len(dates),
        'DXY_Low': [''] * len(dates),
        'Volume': [''] * len(dates),
        'Notes': [''] * len(dates)
    }
    
    df = pd.DataFrame(data)
    
    instructions = pd.DataFrame({
        'Date': [
            'DXY (US Dollar Index) - Daily Price Data',
            'Source: Yahoo Finance (Symbol: DX-Y.NYB)',
            'Frequency: Daily (trading days only)',
            'Time Period: 400+ days (for 400-day moving average)',
            'Data Location: Yahoo Finance, Bloomberg, TradingView',
            'Expected Range: 90-110 (typical trading range)',
            'Current Level: ~97-98 (as of Sept 2025)',
            '--- START DATA ENTRY BELOW ---'
        ],
        'DXY_Close': ['', '', '', '', '', '', '', ''],
        'DXY_High': ['', '', '', '', '', '', '', ''],
        'DXY_Low': ['', '', '', '', '', '', '', ''],
        'Volume': ['', '', '', '', '', '', '', ''],
        'Notes': ['', '', '', '', '', '', '', '']
    })
    
    return pd.concat([instructions, df], ignore_index=True)

def create_net_margins_tab():
    """Net Margins: Quarterly values for 36 months (12 quarters)"""
    dates = generate_date_series(datetime.now(), 12, 'quarterly')
    
    data = {
        'Date': dates,
        'Net_Margin_Percent': [''] * len(dates),
        'TTM_Net_Margin': [''] * len(dates),
        'Data_Source': [''] * len(dates),
        'Methodology': [''] * len(dates),
        'Notes': [''] * len(dates)
    }
    
    df = pd.DataFrame(data)
    
    instructions = pd.DataFrame({
        'Date': [
            'S&P 500 NET MARGINS - Quarterly Data',
            'Source: S&P Capital IQ, FactSet, or S&P 500 Earnings',
            'Frequency: Quarterly (with earnings reports)',
            'Time Period: 12 quarters (3 years for 3Y MA)',
            'Calculation: Net Income / Total Revenue * 100',
            'Expected Range: 8% - 15% (cyclical variation)',
            'Current Level: ~12-13% (elevated cycle)',
            '--- START DATA ENTRY BELOW ---'
        ],
        'Net_Margin_Percent': ['', '', '', '', '', '', '', ''],
        'TTM_Net_Margin': ['', '', '', '', '', '', '', ''],
        'Data_Source': ['', '', '', '', '', '', '', ''],
        'Methodology': ['', '', '', '', '', '', '', ''],
        'Notes': ['', '', '', '', '', '', '', '']
    })
    
    return pd.concat([instructions, df], ignore_index=True)

def create_yuan_swift_tab():
    """Yuan SWIFT: Monthly values for 36 months"""
    dates = generate_date_series(datetime.now(), 36, 'monthly')
    
    data = {
        'Date': dates,
        'RMB_Share_Percent': [''] * len(dates),
        'USD_Share_Percent': [''] * len(dates),
        'EUR_Share_Percent': [''] * len(dates),
        'Report_Source': [''] * len(dates),
        'Notes': [''] * len(dates)
    }
    
    df = pd.DataFrame(data)
    
    instructions = pd.DataFrame({
        'Date': [
            'YUAN SWIFT SHARE - Monthly Payment Data',
            'Source: SWIFT RMB Tracker (Monthly PDF Reports)',
            'Frequency: Monthly (published ~6 weeks after month-end)',
            'Time Period: 36 months (for 36M MA)',
            'Data Location: SWIFT Institute RMB Tracker Reports',
            'Expected Range: 2.0% - 4.5% (RMB share of payments)',
            'Current Level: ~3.2% (recent months)',
            '--- START DATA ENTRY BELOW ---'
        ],
        'RMB_Share_Percent': ['', '', '', '', '', '', '', ''],
        'USD_Share_Percent': ['', '', '', '', '', '', '', ''],
        'EUR_Share_Percent': ['', '', '', '', '', '', '', ''],
        'Report_Source': ['', '', '', '', '', '', '', ''],
        'Notes': ['', '', '', '', '', '', '', '']
    })
    
    return pd.concat([instructions, df], ignore_index=True)

def create_reserve_share_tab():
    """Reserve Share: Quarterly values for 12 quarters"""
    dates = generate_date_series(datetime.now(), 12, 'quarterly')
    
    data = {
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
    
    df = pd.DataFrame(data)
    
    instructions = pd.DataFrame({
        'Date': [
            'USD RESERVE SHARE - Quarterly Central Bank Data',
            'Source: IMF COFER (Composition of Foreign Exchange Reserves)',
            'Frequency: Quarterly (published with ~1 quarter lag)',
            'Time Period: 12 quarters (3 years)',
            'Data Location: IMF Data Portal - COFER Database',
            'Expected Range: 55% - 65% (USD share trend)',
            'Current Level: ~58-60% (declining trend)',
            '--- START DATA ENTRY BELOW ---'
        ],
        'USD_Reserve_Share': ['', '', '', '', '', '', '', ''],
        'EUR_Reserve_Share': ['', '', '', '', '', '', '', ''],
        'JPY_Reserve_Share': ['', '', '', '', '', '', '', ''],
        'GBP_Reserve_Share': ['', '', '', '', '', '', '', ''],
        'Other_Reserve_Share': ['', '', '', '', '', '', '', ''],
        'Total_Reserves_USD_Billion': ['', '', '', '', '', '', '', ''],
        'Data_Source': ['', '', '', '', '', '', '', ''],
        'Notes': ['', '', '', '', '', '', '', '']
    })
    
    return pd.concat([instructions, df], ignore_index=True)

def create_summary_tab():
    """Summary and conversion instructions"""
    
    summary_data = {
        'Indicator': [
            'forward_pe',
            'cape', 
            'productivity',
            'dxy',
            'net_margins',
            'yuan_swift',
            'reserve_share',
            'qqq_spy_ratio',
            'gold_purchases',
            'tic_flows',
            'us_acwi_share'
        ],
        'Priority': [
            'CRITICAL',
            'HIGH',
            'HIGH', 
            'HIGH',
            'HIGH',
            'MEDIUM',
            'MEDIUM',
            'MEDIUM',
            'LOW',
            'LOW',
            'LOW'
        ],
        'Tab_Name': [
            'Forward_PE',
            'CAPE',
            'Productivity',
            'DXY',
            'Net_Margins', 
            'Yuan_SWIFT',
            'Reserve_Share',
            'QQQ_SPY',
            'Gold_CB',
            'TIC_Flows',
            'US_ACWI'
        ],
        'Data_Points_Needed': [
            156,  # 36 months weekly
            240,  # 20 years monthly
            24,   # 6 years quarterly
            400,  # 400+ daily
            12,   # 3 years quarterly
            36,   # 36 months
            12,   # 3 years quarterly
            300,  # daily ratio calculation
            12,   # quarterly
            24,   # 24 months
            24    # 24 months
        ],
        'Time_Period': [
            '36 months (weekly)',
            '20 years (monthly)',
            '6 years (quarterly)',
            '400+ days',
            '3 years (quarterly)',
            '36 months',
            '3 years (quarterly)', 
            '12 months (daily)',
            '3 years (quarterly)',
            '24 months',
            '24 months'
        ],
        'Completion_Status': ['' for _ in range(11)],
        'Last_Updated': ['' for _ in range(11)],
        'Notes': ['' for _ in range(11)]
    }
    
    df = pd.DataFrame(summary_data)
    
    # Add instructions at the top
    instructions_data = {
        'Indicator': [
            'HCP CALIBRATION WORKBOOK v1.1',
            'Last Updated: ' + datetime.now().strftime('%Y-%m-%d'),
            '',
            'INSTRUCTIONS:',
            '1. Each indicator has its own tab with proper time series format',
            '2. Fill in historical data starting with CRITICAL priority items',
            '3. Use the date ranges provided - they match calibration requirements',
            '4. Mark completion status and update dates in this summary',
            '5. Run Python converter when ready to generate JSON calibration data',
            '',
            'PRIORITY ORDER:',
            'CRITICAL: Forward P/E (start here - core indicator)',
            'HIGH: CAPE, Productivity, DXY, Net Margins (key indicators)', 
            'MEDIUM: Yuan SWIFT, Reserve Share, QQQ/SPY',
            'LOW: Gold purchases, TIC flows, US ACWI share',
            '',
            '--- INDICATOR SUMMARY ---'
        ],
        'Priority': ['' for _ in range(17)],
        'Tab_Name': ['' for _ in range(17)],
        'Data_Points_Needed': ['' for _ in range(17)],
        'Time_Period': ['' for _ in range(17)],
        'Completion_Status': ['' for _ in range(17)],
        'Last_Updated': ['' for _ in range(17)],
        'Notes': ['' for _ in range(17)]
    }
    
    instructions_df = pd.DataFrame(instructions_data)
    
    return pd.concat([instructions_df, df], ignore_index=True)

def create_conversion_instructions():
    """Create detailed conversion instructions"""
    
    instructions = {
        'Step': [
            '1',
            '2', 
            '3',
            '4',
            '5',
            '6',
            '7',
            '8'
        ],
        'Action': [
            'Fill Forward P/E tab (CRITICAL - start here)',
            'Fill high-priority tabs (CAPE, Productivity, DXY, Net Margins)',
            'Complete medium-priority tabs as time allows',
            'Update Summary tab completion status',
            'Save Excel file with version number',
            'Run Python conversion script',
            'Validate JSON output quality',
            'Integrate with HCP calibration system'
        ],
        'Time_Estimate': [
            '30-45 minutes',
            '2-3 hours per indicator',
            '1-2 hours per indicator',
            '5 minutes',
            '2 minutes',
            '1 minute',
            '5 minutes',
            '10 minutes'
        ],
        'Data_Sources': [
            'FactSet Earnings Insight, Bloomberg, Yardeni Research',
            'Yale Shiller data, multpl.com, FRED, Yahoo Finance',
            'SWIFT reports, IMF COFER, various financial sources',
            'Excel workbook tracking',
            'Save as HCP_Calibration_Workbook_vX_X.xlsx',
            'convert_hcp_workbook_to_json.py',
            'Check data ranges, completeness, format',
            'Load JSON into calibration system'
        ],
        'Success_Criteria': [
            'Forward P/E: 150+ weekly data points',
            'Each indicator: 80%+ data completeness',
            'Medium priority: 50%+ completeness acceptable',
            'All completed tabs marked with dates',
            'File saved with clear version/date',
            'JSON file generated without errors',
            'Data passes range validation checks',
            'Calibration system accepts data successfully'
        ],
        'Notes': [
            'This single indicator enables basic system operation',
            'These 4 indicators provide robust calibration foundation',
            'Optional for initial calibration - can add later',
            'Track progress to avoid duplicate work',
            'Use consistent naming for file management',
            'Python script handles format conversion',
            'Fix any outliers or missing data before using',
            'Test with small data set first'
        ]
    }
    
    return pd.DataFrame(instructions)

def create_hcp_calibration_workbook():
    """Create the complete HCP calibration workbook"""
    
    print("Creating HCP Calibration Workbook v1.1...")
    
    # Generate filename with timestamp
    filename = f'HCP_Calibration_Workbook_v1_1_{datetime.now().strftime("%Y%m%d")}.xlsx'
    
    # Create all tabs
    tabs = {
        'Summary': create_summary_tab(),
        'Instructions': create_conversion_instructions(),
        'Forward_PE': create_forward_pe_tab(),
        'CAPE': create_cape_tab(),
        'Productivity': create_productivity_tab(),
        'DXY': create_dxy_tab(),
        'Net_Margins': create_net_margins_tab(),
        'Yuan_SWIFT': create_yuan_swift_tab(),
        'Reserve_Share': create_reserve_share_tab()
    }
    
    # Write to Excel with formatting
    with pd.ExcelWriter(filename, engine='openpyxl') as writer:
        for tab_name, data in tabs.items():
            data.to_excel(writer, sheet_name=tab_name, index=False)
            
            # Get worksheet for formatting
            worksheet = writer.sheets[tab_name]
            
            # Set column widths
            if tab_name == 'Summary':
                worksheet.column_dimensions['A'].width = 20
                worksheet.column_dimensions['B'].width = 12
                worksheet.column_dimensions['C'].width = 15
                worksheet.column_dimensions['D'].width = 15
                worksheet.column_dimensions['E'].width = 20
                worksheet.column_dimensions['F'].width = 15
                worksheet.column_dimensions['G'].width = 12
                worksheet.column_dimensions['H'].width = 25
            elif tab_name == 'Instructions':
                worksheet.column_dimensions['A'].width = 5
                worksheet.column_dimensions['B'].width = 40
                worksheet.column_dimensions['C'].width = 15
                worksheet.column_dimensions['D'].width = 50
                worksheet.column_dimensions['E'].width = 40
                worksheet.column_dimensions['F'].width = 30
            else:
                # Data entry tabs
                for col in ['A', 'B', 'C', 'D', 'E', 'F']:
                    worksheet.column_dimensions[col].width = 15
    
    print(f"✓ Created workbook: {filename}")
    print(f"✓ Tabs created: {len(tabs)}")
    print(f"✓ Total data entry capacity: ~1,500+ historical data points")
    
    print("\n📊 Workbook Structure:")
    print("  • Summary: Progress tracking and overview")
    print("  • Instructions: Step-by-step conversion process")
    print("  • Forward_PE: 156 weekly data points (CRITICAL)")
    print("  • CAPE: 240 monthly data points (20 years)")
    print("  • Productivity: 24 quarterly data points")
    print("  • DXY: 400 daily data points")  
    print("  • Net_Margins: 12 quarterly data points")
    print("  • Yuan_SWIFT: 36 monthly data points")
    print("  • Reserve_Share: 12 quarterly data points")
    
    print("\n🎯 Recommended Workflow:")
    print("  1. Start with Forward_PE tab (enables basic operation)")
    print("  2. Add CAPE and Productivity (high-value indicators)")
    print("  3. Complete remaining high-priority indicators")
    print("  4. Use conversion script to generate JSON")
    
    return filename

if __name__ == "__main__":
    filename = create_hcp_calibration_workbook()
    print(f"\n✨ HCP Calibration Workbook ready: {filename}")
    print("\n🚀 This workbook supports proper time series calibration with")
    print("   separate tabs for each indicator and correct historical periods!")
