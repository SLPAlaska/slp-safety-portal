#!/usr/bin/env python3
"""
One-shot installer for the Grant Credit + Refresher Frequency build.

Expected in C:\\Users\\brian\\Downloads:
  - patch_grant_credit_super_admin.py
  - route.js   (the grant-credit backend route)

Optional (SQL files — informational only, you run these in Supabase SQL Editor):
  - 01_migration_refresher_columns.sql
  - 02_seed_refresher_frequencies.sql
  - 03_migration_grant_credit_columns.sql

What this does:
  1. Copies route.js        -> app/api/lms/grant-credit/route.js
  2. Copies patcher script  -> project root
  3. Copies SQL files       -> project root (for your reference)
  4. Runs the patcher       (edits app/admin/lms/page.js in place)
  5. git add / commit / push

Run from project root:
    python install_grant_credit.py
"""
import os
import shutil
import subprocess
import sys
from pathlib import Path

# ------------------------------------------------------------------
# Config — adjust if your Downloads folder is elsewhere
# ------------------------------------------------------------------
DOWNLOADS = Path(os.path.expanduser("~")) / "Downloads"

FILES = {
    # Downloads filename -> destination path (relative to project root)
    "route.js":                                "app/api/lms/grant-credit/route.js",
    "patch_grant_credit_super_admin.py":       "patch_grant_credit_super_admin.py",
    # SQL files stay at project root for your reference when you run them in Supabase
    "01_migration_refresher_columns.sql":      "01_migration_refresher_columns.sql",
    "02_seed_refresher_frequencies.sql":       "02_seed_refresher_frequencies.sql",
    "03_migration_grant_credit_columns.sql":   "03_migration_grant_credit_columns.sql",
}

REQUIRED = {"route.js", "patch_grant_credit_super_admin.py"}

# ------------------------------------------------------------------
# Pre-flight checks
# ------------------------------------------------------------------
project_root = Path.cwd()
if not (project_root / "app").exists():
    print(f"ERROR: Not in project root. Current dir: {project_root}")
    print("       cd to the GitHub Safety Portal folder first.")
    sys.exit(1)

if not DOWNLOADS.exists():
    print(f"ERROR: Downloads folder not found at {DOWNLOADS}")
    sys.exit(1)

print(f"Project root: {project_root}")
print(f"Downloads:    {DOWNLOADS}")
print()

# ------------------------------------------------------------------
# Check required files
# ------------------------------------------------------------------
missing = [f for f in REQUIRED if not (DOWNLOADS / f).exists()]
if missing:
    print("ERROR: Missing required files in Downloads:")
    for m in missing:
        print(f"  - {m}")
    print()
    print("Make sure you downloaded all files from this chat.")
    sys.exit(1)

# ------------------------------------------------------------------
# Copy files
# ------------------------------------------------------------------
print("Copying files...")
copied = []
for src_name, dest_rel in FILES.items():
    src = DOWNLOADS / src_name
    if not src.exists():
        print(f"  SKIP  {src_name} (not in Downloads)")
        continue
    dest = project_root / dest_rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dest)
    copied.append(dest_rel)
    print(f"  OK    {src_name}  ->  {dest_rel}")
print()

# ------------------------------------------------------------------
# Run the patcher
# ------------------------------------------------------------------
patcher = project_root / "patch_grant_credit_super_admin.py"
print(f"Running patcher: {patcher.name}")
result = subprocess.run(
    [sys.executable, str(patcher)],
    cwd=str(project_root),
    capture_output=True,
    text=True,
)
print(result.stdout)
if result.returncode != 0:
    print("PATCHER FAILED:")
    print(result.stderr)
    sys.exit(1)

# ------------------------------------------------------------------
# Verify JS syntax (light check — node -c equivalent)
# ------------------------------------------------------------------
route_file = project_root / "app/api/lms/grant-credit/route.js"
page_file = project_root / "app/admin/lms/page.js"
for f in (route_file, page_file):
    if not f.exists():
        print(f"ERROR: expected file missing: {f}")
        sys.exit(1)
    content = f.read_text(encoding="utf-8")
    # Quick bracket balance sanity check
    if content.count("{") != content.count("}"):
        print(f"WARNING: bracket imbalance in {f.name} — verify manually before pushing")

# ------------------------------------------------------------------
# Git commit + push
# ------------------------------------------------------------------
def run_git(args, check=True):
    r = subprocess.run(["git"] + args, cwd=str(project_root), capture_output=True, text=True)
    if r.stdout.strip(): print(r.stdout.strip())
    if r.stderr.strip(): print(r.stderr.strip())
    if check and r.returncode != 0:
        print(f"git {' '.join(args)} failed")
        sys.exit(1)
    return r

print()
print("Git add...")
run_git(["add",
         "app/admin/lms/page.js",
         "app/api/lms/grant-credit/route.js"])

# Check if there's anything to commit
status = subprocess.run(
    ["git", "diff", "--cached", "--name-only"],
    cwd=str(project_root),
    capture_output=True, text=True,
)
if not status.stdout.strip():
    print("Nothing staged to commit. Did the patcher skip because it was already applied?")
    sys.exit(0)

print()
print("Git commit...")
run_git(["commit", "-m", "Refresher frequencies + Grant Credit tab (super admin)"])

print()
print("Git push...")
run_git(["push", "origin", "main"])

print()
print("=" * 60)
print("DONE. Vercel will auto-deploy in ~30s.")
print()
print("Still to do manually in Supabase SQL Editor:")
print("  1. Run 01_migration_refresher_columns.sql")
print("  2. Run 02_seed_refresher_frequencies.sql")
print("  3. Run 03_migration_grant_credit_columns.sql")
print()
print("SQL files are copied to project root for your reference.")
print("=" * 60)
