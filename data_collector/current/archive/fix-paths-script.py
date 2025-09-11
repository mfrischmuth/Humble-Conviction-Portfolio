#!/usr/bin/env python3
"""
Fix HCP Data Collector File Paths
Moves files from Desktop/data_output to the correct GitHub repo Outputs folder
"""

import shutil
import json
from pathlib import Path
from datetime import datetime

# Define old and new locations
OLD_DIR = Path("C:/Users/markf/OneDrive/Desktop/data_output")
NEW_DIR = Path("C:/Users/markf/OneDrive/Documents/GitHub/Humble-Conviction-Portfolio/data_collector/Outputs")

# Also define the correct PDF directory
PDF_DIR = Path("C:/Users/markf/OneDrive/Documents/GitHub/Humble-Conviction-Portfolio/data_collector/pdfs")

def fix_paths():
    """Move all data collector files to correct locations"""
    
    print("="*60)
    print("HCP DATA COLLECTOR PATH FIX")
    print("="*60)
    
    # Create directories if they don't exist
    NEW_DIR.mkdir(parents=True, exist_ok=True)
    PDF_DIR.mkdir(parents=True, exist_ok=True)
    
    # Track what we move
    moved_files = []
    already_exists = []
    not_found = []
    
    # 1. Check if master file is already in correct location
    new_master = NEW_DIR / "hcp_master_data.json"
    if new_master.exists():
        print("✓ Master file already in correct location")
        already_exists.append("hcp_master_data.json")
    else:
        # Try to copy from old location
        old_master = OLD_DIR / "hcp_master_data.json"
        if old_master.exists():
            shutil.copy2(old_master, new_master)
            moved_files.append("hcp_master_data.json")
            print(f"✓ Moved master file to {NEW_DIR}")
        else:
            not_found.append("hcp_master_data.json")
            print("✗ Master file not found in old location")
    
    # 2. Move any CSV files (manual update files)
    if OLD_DIR.exists():
        for csv_file in OLD_DIR.glob("hcp_*.csv"):
            new_csv = NEW_DIR / csv_file.name
            if not new_csv.exists():
                shutil.copy2(csv_file, new_csv)
                moved_files.append(csv_file.name)
                print(f"✓ Moved {csv_file.name}")
            else:
                already_exists.append(csv_file.name)
    
    # 3. Move any recent JSON output files (last 7 days)
    if OLD_DIR.exists():
        for json_file in OLD_DIR.glob("hcp_data_v*.json"):
            # Check if file is recent (last 7 days)
            if (datetime.now() - datetime.fromtimestamp(json_file.stat().st_mtime)).days <= 7:
                new_json = NEW_DIR / json_file.name
                if not new_json.exists():
                    shutil.copy2(json_file, new_json)
                    moved_files.append(json_file.name)
                    print(f"✓ Moved {json_file.name}")
    
    # 4. Move any backup files
    if OLD_DIR.exists():
        for backup in OLD_DIR.glob("hcp_master_data_backup_*.json"):
            new_backup = NEW_DIR / backup.name
            if not new_backup.exists():
                shutil.copy2(backup, new_backup)
                moved_files.append(backup.name)
                print(f"✓ Moved backup: {backup.name}")
    
    # 5. Check for PDFs in wrong location and suggest move
    old_pdf_dir = Path("C:/Users/markf/OneDrive/Desktop/pdfs")
    if old_pdf_dir.exists():
        pdf_count = len(list(old_pdf_dir.glob("*.pdf")))
        if pdf_count > 0:
            print(f"\n⚠ Found {pdf_count} PDFs in Desktop/pdfs/")
            print(f"  Suggested: Move PDFs to {PDF_DIR}")
            
            # Offer to move them
            response = input("  Move PDFs to correct location? (y/n): ")
            if response.lower() == 'y':
                for pdf in old_pdf_dir.glob("*.pdf"):
                    new_pdf = PDF_DIR / pdf.name
                    if not new_pdf.exists():
                        shutil.copy2(pdf, new_pdf)
                        moved_files.append(f"PDF: {pdf.name}")
                        print(f"  ✓ Moved {pdf.name}")
    
    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    
    if moved_files:
        print(f"\n✓ Moved {len(moved_files)} files:")
        for f in moved_files[:5]:  # Show first 5
            print(f"  - {f}")
        if len(moved_files) > 5:
            print(f"  ... and {len(moved_files)-5} more")
    
    if already_exists:
        print(f"\n→ Already in place: {len(already_exists)} files")
    
    if not_found:
        print(f"\n✗ Not found: {len(not_found)} files")
    
    print(f"\n📁 Correct locations:")
    print(f"  Data files: {NEW_DIR}")
    print(f"  PDF files:  {PDF_DIR}")
    
    # Update the master file to ensure paths are correct
    if new_master.exists():
        try:
            with open(new_master, 'r') as f:
                master_data = json.load(f)
            
            # Update metadata
            master_data['metadata']['last_path_fix'] = datetime.now().isoformat()
            master_data['metadata']['correct_data_dir'] = str(NEW_DIR)
            master_data['metadata']['correct_pdf_dir'] = str(PDF_DIR)
            
            with open(new_master, 'w') as f:
                json.dump(master_data, f, indent=2)
            
            print("\n✓ Updated master file with correct paths")
        except Exception as e:
            print(f"\n⚠ Could not update master file: {e}")
    
    print("\n" + "="*60)
    print("Path fix complete!")
    print("\nNext step: Run the collector with correct paths:")
    print("python hcp_unified_collector_v4.2.3.py --monthly")
    print("="*60)

if __name__ == "__main__":
    fix_paths()
