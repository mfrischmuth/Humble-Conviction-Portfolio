"""
COFER USD Reserve Share Extractor v1.0
Last Updated: 2025-09-07 20:30 UTC
Extracts USD reserve share percentages from IMF COFER dataset
"""

import pandas as pd
import json
from datetime import datetime

def extract_cofer_usd_data(csv_path):
    """
    Extract USD reserve share from IMF COFER dataset
    
    Args:
        csv_path: Path to the COFER CSV file
    
    Returns:
        Dictionary of quarterly USD reserve percentages
    """
    
    # Read the CSV
    df = pd.read_csv(csv_path)
    
    print(f"Dataset shape: {df.shape}")
    print(f"Columns: {df.columns.tolist()[:10]}...")  # Show first 10 columns
    
    # Look for USD reserve share rows
    # Typically this will be where FXR_CURRENCY='USD' and it's a percentage of allocated reserves
    
    # First, let's see what indicators are available
    if 'INDICATOR' in df.columns:
        print("\nAvailable indicators:")
        for indicator in df['INDICATOR'].unique()[:10]:
            print(f"  - {indicator}")
    
    # Filter for USD rows
    usd_mask = df['FXR_CURRENCY'] == 'USD' if 'FXR_CURRENCY' in df.columns else False
    
    # Also check for rows that might contain "U.S. Dollar" or "USD" in SERIES_NAME
    if 'SERIES_NAME' in df.columns:
        usd_name_mask = df['SERIES_NAME'].str.contains('U.S. Dollar|USD|United States Dollar', 
                                                        case=False, na=False)
        usd_rows = df[usd_mask | usd_name_mask]
    else:
        usd_rows = df[usd_mask]
    
    print(f"\nFound {len(usd_rows)} USD-related rows")
    
    if len(usd_rows) > 0:
        # Look for the row with percentages (not amounts)
        # Usually this has "Shares" or "Percent" in the indicator
        for idx, row in usd_rows.iterrows():
            print(f"\nRow {idx}:")
            print(f"  Indicator: {row.get('INDICATOR', 'N/A')}")
            print(f"  Series Name: {row.get('SERIES_NAME', 'N/A')}")
            print(f"  Series Code: {row.get('SERIES_CODE', 'N/A')}")
            
            # Extract quarterly data
            quarterly_data = {}
            
            # Get all quarterly columns (format: YYYY-QN)
            quarterly_cols = [col for col in df.columns if '-Q' in str(col)]
            
            for col in quarterly_cols:
                value = row.get(col)
                if pd.notna(value) and value != 0:
                    quarterly_data[col] = float(value)
            
            if quarterly_data:
                print(f"  Sample data: {list(quarterly_data.items())[:5]}")
                
                # If this looks like percentage data (values between 0 and 100)
                sample_values = list(quarterly_data.values())[:5]
                if sample_values and 30 < max(sample_values) < 80:
                    print("\n✅ This appears to be USD reserve share percentage data!")
                    return quarterly_data
    
    # Alternative approach: Look for specific series codes
    print("\n\nAlternative search by SERIES_CODE patterns...")
    
    # Common COFER series codes for USD shares
    possible_codes = ['COFER.Q.USD', 'RAXG_USD', 'COFER_USD_SHARE']
    
    for code_pattern in possible_codes:
        matching_rows = df[df['SERIES_CODE'].str.contains(code_pattern, case=False, na=False)]
        if len(matching_rows) > 0:
            print(f"Found match for pattern: {code_pattern}")
            # Extract data from first matching row
            row = matching_rows.iloc[0]
            quarterly_data = {}
            quarterly_cols = [col for col in df.columns if '-Q' in str(col)]
            
            for col in quarterly_cols:
                value = row.get(col)
                if pd.notna(value) and value != 0:
                    quarterly_data[col] = float(value)
            
            if quarterly_data:
                return quarterly_data
    
    print("\n⚠️ Could not automatically identify USD reserve share data.")
    print("Please review the CSV manually to identify the correct row.")
    return None


def save_cofer_to_master(cofer_data, master_file='hcp_master_data.json'):
    """
    Save COFER data to master data file
    
    Args:
        cofer_data: Dictionary of quarterly USD reserve percentages
        master_file: Path to master data JSON file
    """
    
    try:
        # Load existing master data
        with open(master_file, 'r') as f:
            master_data = json.load(f)
    except FileNotFoundError:
        # Create new master data structure
        master_data = {
            'metadata': {
                'version': '4.2.5',
                'last_updated': datetime.now().isoformat()
            },
            'historical_data': {}
        }
    
    # Ensure structure exists
    if 'historical_data' not in master_data:
        master_data['historical_data'] = {}
    
    # Add COFER data
    master_data['historical_data']['cofer_usd'] = cofer_data
    
    # Update metadata
    master_data['metadata']['last_updated'] = datetime.now().isoformat()
    master_data['metadata']['cofer_quarters'] = len(cofer_data)
    
    # Save updated master data
    with open(master_file, 'w') as f:
        json.dump(master_data, f, indent=2)
    
    print(f"\n✅ Saved {len(cofer_data)} quarters of COFER data to {master_file}")
    
    # Show recent data
    recent_quarters = sorted(cofer_data.keys())[-8:]
    print("\nRecent COFER USD Reserve Share (%):")
    for quarter in recent_quarters:
        print(f"  {quarter}: {cofer_data[quarter]:.2f}%")


# Example usage
if __name__ == "__main__":
    # Replace with your actual file path
    csv_file = "dataset_20250907T20_18_24.972351557Z_DEFAULT_INTEGRATION_IMF.STA_COFER_7.0.0.csv"
    
    print("=" * 60)
    print("COFER USD Reserve Share Extractor")
    print("=" * 60)
    
    # Extract the data
    cofer_data = extract_cofer_usd_data(csv_file)
    
    if cofer_data:
        # Save to master file
        save_cofer_to_master(cofer_data)
        
        print("\n" + "=" * 60)
        print("EXTRACTION COMPLETE")
        print("=" * 60)
        print(f"Total quarters extracted: {len(cofer_data)}")
        print(f"Date range: {min(cofer_data.keys())} to {max(cofer_data.keys())}")
        
        # Calculate trend
        recent = sorted(cofer_data.items())[-4:]
        older = sorted(cofer_data.items())[-8:-4]
        
        recent_avg = sum(v for k, v in recent) / len(recent)
        older_avg = sum(v for k, v in older) / len(older)
        
        print(f"\nTrend Analysis:")
        print(f"  Previous year average: {older_avg:.2f}%")
        print(f"  Recent year average: {recent_avg:.2f}%")
        print(f"  Change: {recent_avg - older_avg:+.2f}%")
    else:
        print("\n❌ Failed to extract COFER data automatically")
        print("Please inspect the CSV structure manually")
