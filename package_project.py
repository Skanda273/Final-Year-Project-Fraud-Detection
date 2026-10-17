"""
Packaging Script: Creates a clean, shareable ZIP of the project on Desktop.
Excludes node_modules, __pycache__, .git, and uncompressed 150MB CSV (keeps creditcard.csv.zip).
"""
import os
import zipfile
import time

SOURCE_DIR = os.path.dirname(os.path.abspath(__file__))
DESKTOP_DIR = os.path.dirname(SOURCE_DIR)
OUTPUT_ZIP = os.path.join(DESKTOP_DIR, "Final_Year_Project_Shareable.zip")

EXCLUDE_DIRS = {"node_modules", "__pycache__", ".git", "dist", ".cache", ".venv", "venv"}
EXCLUDE_FILES = {"creditcard.csv"}  # Exclude uncompressed 150MB CSV; creditcard.csv.zip is included!

def package():
    print(f"[*] Packaging project from: {SOURCE_DIR}")
    print(f"[*] Output archive: {OUTPUT_ZIP}")
    t0 = time.time()
    
    total_files = 0
    with zipfile.ZipFile(OUTPUT_ZIP, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(SOURCE_DIR):
            # Prune excluded directories
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            
            for file in files:
                if file in EXCLUDE_FILES or file.endswith(".pyc"):
                    continue
                # Do not re-zip the zip if it happens to be in the folder
                if file == "Final_Year_Project_Shareable.zip":
                    continue
                
                abs_path = os.path.join(root, file)
                rel_path = os.path.relpath(abs_path, SOURCE_DIR)
                
                zipf.write(abs_path, arcname=rel_path)
                total_files += 1

    elapsed = time.time() - t0
    size_mb = os.path.getsize(OUTPUT_ZIP) / (1024 * 1024)
    print(f"[+] Successfully packaged {total_files} files in {elapsed:.1f}s!")
    print(f"[+] Archive created at: {OUTPUT_ZIP}")
    print(f"[+] Total Archive Size: {size_mb:.2f} MB")

if __name__ == "__main__":
    package()
