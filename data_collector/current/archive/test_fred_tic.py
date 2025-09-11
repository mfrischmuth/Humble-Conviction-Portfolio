#!/usr/bin/env python3
"""
Test script to check various FRED series for TIC data
Run this to identify which series codes work
"""

from fredapi import Fred
import pandas as pd

# Your FRED API key
FRED_API_KEY = "82fa4bd8294df4c17d0bde5a37903e57"

# Initialize FRED
fred = Fred(api_key=FRED_API_KEY)

# List of potential TIC-related FRED series to test
test_series = {
    'FDHBFIN': 'Foreign Holdings of US Treasury Securities',
    'HNOTSAQ027S': 'Foreign Holdings of Treasury Securities',
    'LTCMFHHUSM': 'Long-term Foreign Holdings',
    'BOGZ1FL263061105A': 'Rest of World Treasury Holdings',
    'TREAS': 'Treasury Securities Outstanding',
    'FDHBFRBN': 'Foreign Holdings at Federal Reserve Banks',
    'INTDSRUSM193N': 'Interest on Treasury Securities',
    'GFDEBTN': 'Federal Debt Total',
    'DSPIC96': 'Real Disposable Personal Income',  # Known working series for comparison
    'OPHNFB': 'Productivity (should work)',  # Another known working series
}

print("=" * 60)
print("FRED API Test for TIC Series")
print("=" * 60)

# Test each series
working_series = []
failed_series = []

for series_code, description in test_series.items():
    print(f"\nTesting: {series_code} - {description}")
    print("-" * 40)
    
    try:
        # Try to fetch the series
        data = fred.get_series(series_code, observation_start='2020-01-01')
        
        if data is not None and not data.empty:
            print(f"✓ SUCCESS: Retrieved {len(data)} data points")
            print(f"  Date range: {data.index[0].strftime('%Y-%m-%d')} to {data.index[-1].strftime('%Y-%m-%d')}")
            print(f"  Latest value: {data.iloc[-1]:.2f}")
            print(f"  Frequency: {pd.infer_freq(data.index)}")
            working_series.append((series_code, description, len(data)))
        else:
            print(f"✗ EMPTY: Series exists but returned no data")
            failed_series.append((series_code, description, "Empty"))
            
    except Exception as e:
        print(f"✗ FAILED: {str(e)}")
        failed_series.append((series_code, description, str(e)))

# Now search for TIC-related series
print("\n" + "=" * 60)
print("Searching FRED for TIC-related series...")
print("=" * 60)

search_terms = [
    'treasury international capital',
    'foreign holdings treasury',
    'TIC',
    'foreign portfolio',
    'major foreign holders'
]

found_series = []

for term in search_terms:
    print(f"\nSearching for: '{term}'")
    try:
        # FRED search returns a DataFrame
        results = fred.search(term, limit=5)
        
        if not results.empty:
            print(f"Found {len(results)} series:")
            for idx, row in results.iterrows():
                print(f"  - {idx}: {row['title'][:60]}...")
                # Try to get a sample of data
                try:
                    sample = fred.get_series(idx, observation_start='2023-01-01')
                    if not sample.empty:
                        print(f"    → Has {len(sample)} recent data points")
                        found_series.append((idx, row['title']))
                except:
                    print(f"    → Could not retrieve data")
        else:
            print("  No results found")
            
    except Exception as e:
        print(f"  Search failed: {e}")

# Summary
print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)

if working_series:
    print(f"\n✓ WORKING SERIES ({len(working_series)}):")
    for code, desc, count in working_series:
        print(f"  {code}: {desc} ({count} points)")

if failed_series:
    print(f"\n✗ FAILED SERIES ({len(failed_series)}):")
    for code, desc, error in failed_series:
        print(f"  {code}: {desc}")
        print(f"    Error: {error}")

if found_series:
    print(f"\n🔍 DISCOVERED SERIES ({len(found_series)}):")
    for code, title in found_series:
        print(f"  {code}: {title[:60]}...")

# Manual verification of a known good series
print("\n" + "=" * 60)
print("Testing known good series for comparison...")
print("=" * 60)

try:
    # Test with DGS10 (10-year Treasury rate) which should definitely work
    test_data = fred.get_series('DGS10', observation_start='2023-01-01')
    print(f"✓ DGS10 (10-Year Treasury): {len(test_data)} points retrieved")
    print(f"  This confirms FRED API is working")
except Exception as e:
    print(f"✗ Even DGS10 failed - API key issue?: {e}")

print("\n" + "=" * 60)
print("Test complete. Use any working series code in your collector.")
print("=" * 60)