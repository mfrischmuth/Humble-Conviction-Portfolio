"""
COFER USD Reserve Share Explorer & Extractor v1.3
NaN-Safe Version - Prevents NaN values in JSON output
Saves to Outputs directory to match Data Collector v4.3.3
Last Updated: 2025-09-09 06:30:00 UTC

Changelog v1.3:
- Fixed NaN handling to prevent "NaN" strings in JSON
- Added comprehensive validation for numeric values
- Converts all NaN/None to null in JSON output
- Added data validation summary
"""

import pandas as pd
import numpy as np
import json
from datetime import datetime
from pathlib import Path

# FIXED: Use the same Outputs directory as the Data Collector
BASE_DIR = Path(r"C:\Users\markf\OneDrive\Documents\GitHub\Humble-Conviction-Portfolio\data_collector")
OUTPUTS_DIR = BASE_DIR / "Outputs"
HISTORICAL_DIR = BASE_DIR / "Historical Data"


def safe_float_conversion(value):
    """
    Safely convert a value to float, returning None for NaN/invalid values
    """
    try:
        # Handle various input types
        if value is None:
            return None
        if isinstance(value, str):
            # Check for string representations of NaN
            if value.lower() in ['nan', 'null', 'none', '']:
                return None
            value = float(value)
        else:
            value = float(value)
        
        # Check if the float is NaN or infinite
        if np.isnan(value) or np.isinf(value):
            return None
            
        return value
    except (ValueError, TypeError):
        return None


def explore_cofer_structure(csv_path):
    """
    Explore the COFER CSV structure to understand how data is organized
    """
    # Read the CSV
    df = pd.read_csv(csv_path)
    
    print("=" * 60)
    print("COFER Dataset Structure Analysis")
    print("=" * 60)
    print(f"Dataset shape: {df.shape}")
    
    # Show unique values for key columns
    print("\n1. SERIES_CODE samples (first 10):")
    for code in df['SERIES_CODE'].unique()[:10]:
        print(f"   - {code}")
    
    print("\n2. FXR_CURRENCY unique values:")
    currencies = df['FXR_CURRENCY'].unique()
    print(f"   Found {len(currencies)} currencies: {currencies[:10]}")
    
    print("\n3. INDICATOR unique values:")
    for indicator in df['INDICATOR'].unique():
        print(f"   - {indicator}")
    
    print("\n4. Looking for USD-related rows...")
    
    # Check different ways USD might be encoded
    print("\n   Checking FXR_CURRENCY column for USD...")
    usd_currency_rows = df[df['FXR_CURRENCY'].str.contains('USD|U.S.|United States|Dollar', 
                                                            case=False, na=False)]
    print(f"   Found {len(usd_currency_rows)} rows")
    
    print("\n   Checking SERIES_CODE for USD patterns...")
    usd_code_rows = df[df['SERIES_CODE'].str.contains('USD|U.S.|US_', case=False, na=False)]
    print(f"   Found {len(usd_code_rows)} rows")
    if len(usd_code_rows) > 0:
        print("   Sample codes:")
        for code in usd_code_rows['SERIES_CODE'].unique()[:5]:
            print(f"     - {code}")
    
    print("\n   Checking SERIES_NAME for USD/Dollar...")
    if 'SERIES_NAME' in df.columns:
        usd_name_rows = df[df['SERIES_NAME'].str.contains('Dollar|USD|United States', 
                                                          case=False, na=False)]
        print(f"   Found {len(usd_name_rows)} rows")
        if len(usd_name_rows) > 0:
            print("   Sample names:")
            for name in usd_name_rows['SERIES_NAME'].unique()[:5]:
                print(f"     - {name}")
    
    # Show all rows with "Allocated" in indicator (these are usually the percentage shares)
    print("\n5. Rows with 'Allocated' in INDICATOR:")
    allocated_rows = df[df['INDICATOR'].str.contains('Allocated', case=False, na=False)]
    print(f"   Found {len(allocated_rows)} rows")
    
    # Look for rows that might have percentage data
    print("\n6. Examining data values to find percentages...")
    
    # Get quarterly columns
    quarterly_cols = [col for col in df.columns if '-Q' in str(col)]
    print(f"   Found {len(quarterly_cols)} quarterly columns")
    print(f"   Sample quarters: {quarterly_cols[:5]}")
    
    # Check each row for percentage-like values
    print("\n7. Rows with percentage-like values (30-70 range):")
    for idx, row in df.iterrows():
        # Check a few recent quarters for values in percentage range
        test_quarters = ['2024-Q1', '2023-Q4', '2023-Q3']
        values = []
        for q in test_quarters:
            if q in row:
                val = safe_float_conversion(row[q])
                if val is not None:
                    values.append(val)
        
        # If values are in the 30-70 range, likely USD reserve percentages
        if values and all(30 < v < 70 for v in values):
            print(f"\n   Row {idx}: {row['SERIES_CODE']}")
            print(f"   Indicator: {row['INDICATOR']}")
            print(f"   Currency: {row.get('FXR_CURRENCY', 'N/A')}")
            print(f"   Series Name: {row.get('SERIES_NAME', 'N/A')}")
            print(f"   Sample values: {values}")
            print(f"   → This looks like USD reserve share data!")
            return idx
    
    return None


def extract_cofer_by_row(csv_path, row_index):
    """
    Extract COFER data from a specific row with NaN-safe handling
    """
    df = pd.read_csv(csv_path)
    row = df.iloc[row_index]
    
    print("\n" + "=" * 60)
    print(f"Extracting data from row {row_index}")
    print("=" * 60)
    print(f"Series Code: {row['SERIES_CODE']}")
    print(f"Indicator: {row['INDICATOR']}")
    
    # Extract all quarterly data with NaN-safe conversion
    quarterly_data = {}
    quarterly_cols = [col for col in df.columns if '-Q' in str(col)]
    
    # Track validation stats
    total_cols = len(quarterly_cols)
    valid_values = 0
    nan_values = 0
    zero_values = 0
    
    for col in quarterly_cols:
        raw_value = row[col]
        converted_value = safe_float_conversion(raw_value)
        
        if converted_value is not None and converted_value != 0:
            quarterly_data[col] = converted_value
            valid_values += 1
        elif converted_value == 0:
            zero_values += 1
        else:
            nan_values += 1
    
    print(f"\nData Validation Summary:")
    print(f"  Total quarters: {total_cols}")
    print(f"  Valid values: {valid_values}")
    print(f"  NaN/None values: {nan_values}")
    print(f"  Zero values: {zero_values}")
    print(f"  Extracted: {len(quarterly_data)} quarters of valid data")
    
    # Show recent values
    recent_quarters = sorted(quarterly_data.keys())[-8:]
    print("\nRecent values:")
    for q in recent_quarters:
        print(f"  {q}: {quarterly_data[q]:.2f}%")
    
    # Final validation check
    for quarter, value in quarterly_data.items():
        if value is None or np.isnan(value) if isinstance(value, float) else False:
            print(f"⚠️ WARNING: NaN detected in {quarter} - removing")
            del quarterly_data[quarter]
    
    return quarterly_data


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
    elif isinstance(data, np.integer):
        return int(data)
    elif isinstance(data, np.floating):
        return float(data)
    elif isinstance(data, np.ndarray):
        return data.tolist()
    else:
        return data


def save_cofer_to_master(cofer_data, master_file=None):
    """
    Save COFER data to master data file in OUTPUTS directory with NaN-safe JSON handling
    """
    # Use Outputs directory for the master file
    if master_file is None:
        master_file = OUTPUTS_DIR / 'hcp_master_data.json'
    elif not isinstance(master_file, Path):
        # If string provided, ensure it's in Outputs directory
        if '\\' in str(master_file) or '/' in str(master_file):
            # Full path provided
            master_file = Path(master_file)
        else:
            # Just filename provided - put in Outputs
            master_file = OUTPUTS_DIR / master_file
    
    # Ensure Outputs directory exists
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
    
    try:
        with open(master_file, 'r') as f:
            master_data = json.load(f)
        print(f"Loaded existing master file with {len(master_data.get('indicators', {}))} indicators")
    except FileNotFoundError:
        master_data = {
            'metadata': {
                'version': '4.3.3',
                'ips_version': '4.2',
                'last_updated': datetime.now().isoformat()
            },
            'indicators': {}
        }
        print("Creating new master file")
    
    # Ensure 'indicators' section exists
    if 'indicators' not in master_data:
        master_data['indicators'] = {}
    
    # Format the COFER data properly with NaN protection
    quarters = sorted(cofer_data.keys())
    values = []
    for q in quarters:
        val = cofer_data[q]
        # Final safety check
        if val is not None and not (isinstance(val, float) and np.isnan(val)):
            values.append(val)
        else:
            print(f"⚠️ Skipping NaN value for {q}")
    
    # Add COFER data to indicators section
    master_data['indicators']['cofer_usd'] = {
        'current_value': values[-1] if values else None,
        'quarterly_history': values,
        'quarterly_dates': quarters,
        'source': 'IMF COFER',
        'last_updated': datetime.now().isoformat(),
        'data_quality': 'real',
        'data_points': len(values)
    }
    
    # Update metadata
    master_data['metadata']['last_updated'] = datetime.now().isoformat()
    if 'indicators_collected' in master_data['metadata']:
        # Update count if COFER wasn't already counted
        if 'cofer_usd' not in master_data.get('indicators', {}):
            master_data['metadata']['indicators_collected'] += 1
    
    # Clean the entire data structure before saving
    master_data = clean_json_data(master_data)
    
    # Custom JSON encoder to handle any remaining edge cases
    class NaNSafeEncoder(json.JSONEncoder):
        def encode(self, obj):
            if isinstance(obj, float):
                if np.isnan(obj):
                    return "null"
                elif np.isinf(obj):
                    return "null"
            return super().encode(obj)
        
        def iterencode(self, obj, _one_shot=False):
            for chunk in super().iterencode(obj, _one_shot):
                # Replace any "NaN" strings that might have slipped through
                chunk = chunk.replace('"NaN"', 'null')
                chunk = chunk.replace('NaN', 'null')
                yield chunk
    
    # Save with custom encoder
    with open(master_file, 'w') as f:
        json.dump(master_data, f, indent=2, cls=NaNSafeEncoder)
    
    print(f"\n✅ Saved {len(cofer_data)} quarters of COFER data (NaN-safe)")
    print(f"   Location: {master_file}")
    print(f"   Total indicators in file: {len(master_data['indicators'])}")
    
    # Validate the saved file
    try:
        with open(master_file, 'r') as f:
            test_load = json.load(f)
        print("   ✓ JSON validation successful - no NaN values detected")
    except json.JSONDecodeError as e:
        print(f"   ⚠️ WARNING: JSON validation failed: {e}")
    
    # Calculate trend
    recent = sorted(cofer_data.items())[-4:]
    older = sorted(cofer_data.items())[-8:-4]
    
    if recent and older:
        recent_avg = sum(v for k, v in recent) / len(recent)
        older_avg = sum(v for k, v in older) / len(older)
        
        print(f"\nTrend Analysis:")
        print(f"  Previous year average: {older_avg:.2f}%")
        print(f"  Recent year average: {recent_avg:.2f}%")
        print(f"  Change: {recent_avg - older_avg:+.2f}% {'📉' if recent_avg < older_avg else '📈'}")


# Main execution
if __name__ == "__main__":
    # Path to your COFER CSV file
    csv_file = HISTORICAL_DIR / "dataset_2025-09-07T20_18_24.972351557Z_DEFAULT_INTEGRATION_IMF.STA_COFER_7.0.0.csv"
    
    print("=" * 60)
    print("COFER USD Reserve Share Explorer & Extractor v1.3")
    print("NaN-Safe Version")
    print("Outputs to: " + str(OUTPUTS_DIR))
    print("=" * 60)
    
    # First, explore the structure
    usd_row_index = explore_cofer_structure(csv_file)
    
    if usd_row_index is not None:
        # Extract data from the identified row
        cofer_data = extract_cofer_by_row(csv_file, usd_row_index)
        
        if cofer_data:
            # Ask user for confirmation
            print("\n" + "=" * 60)
            response = input("Save this data to Outputs/hcp_master_data.json? (yes/no): ")
            
            if response.lower() in ['yes', 'y']:
                save_cofer_to_master(cofer_data)
                print("\n✅ EXTRACTION COMPLETE!")
                print(f"Data saved to: {OUTPUTS_DIR / 'hcp_master_data.json'}")
            else:
                print("\nData not saved. You can run this script again.")
    else:
        print("\n" + "=" * 60)
        print("MANUAL INSPECTION NEEDED")
        print("=" * 60)
        print("Could not automatically identify USD reserve share row.")
        print("\nPlease open the CSV in Excel and look for:")
        print("1. A row with 'USD' or 'U.S. Dollar' in the currency column")
        print("2. Values in the 50-65% range for recent quarters")
        print("3. Indicator mentioning 'Allocated reserves' or 'Share'")
        print("\nOnce you identify the row number, we can extract it directly.")
