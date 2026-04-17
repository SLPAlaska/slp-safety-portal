#!/usr/bin/env python3
"""
Patches app/admin/lms/page.js to make Company rows and User rows clickable,
navigating to the new detail pages:

  - Company row click -> /admin/lms/companies/{id}
  - User row click    -> /admin/lms/users/{id}

Strategy: adds onClick handlers to the <tr> elements using useRouter().

Idempotent. Run from project root:
    python patch_clickable_rows.py
"""
import re
import sys
from pathlib import Path

FILE = Path("app/admin/lms/page.js")
if not FILE.exists():
    print(f"ERROR: {FILE} not found.")
    sys.exit(1)

s = FILE.read_text(encoding="utf-8")

# ---------------------------------------------------------------
# 1. Ensure useRouter is imported from next/navigation
# ---------------------------------------------------------------
if "useRouter" not in s:
    if "from 'next/navigation'" in s:
        s = s.replace(
            "from 'next/navigation'",
            "from 'next/navigation'",  # no-op, we'll handle below
        )
    # Add the import after the first 'use client' or at the top
    import_line = "import { useRouter } from 'next/navigation'\n"
    if "'use client'" in s:
        s = s.replace("'use client'", "'use client'\n\n" + import_line.strip(), 1)
    else:
        s = import_line + s
    print("OK  Added useRouter import")
else:
    print("--  useRouter already imported")

# ---------------------------------------------------------------
# 2. CompaniesTab — add onClick to company rows
#
# Look for a pattern like: <tr key={c.id} style={S.tr}>
# inside CompaniesTab, add onClick to navigate to /admin/lms/companies/{c.id}
# ---------------------------------------------------------------
def patch_tab(tab_name, id_var, dest_path, tag="tr", prefix=""):
    """Add onClick={() => router.push(...)} + cursor:pointer to a <tr ...> inside a given tab."""
    global s
    # Find the function body
    tab_re = re.compile(
        rf"function\s+{tab_name}\s*\([^)]*\)\s*\{{",
        re.DOTALL,
    )
    m = tab_re.search(s)
    if not m:
        print(f"WARN  Could not find function {tab_name}; skipping row click")
        return

    body_start = m.end()
    # Find matching closing brace (dumb nesting counter)
    depth = 1; i = body_start
    while i < len(s) and depth > 0:
        if s[i] == "{": depth += 1
        elif s[i] == "}": depth -= 1
        i += 1
    body_end = i
    body = s[body_start:body_end]

    # 1. inject useRouter hook at top of function body if not already
    if "const router = useRouter()" not in body:
        # Insert right after the opening brace (preserve formatting)
        body_new = "\n  const router = useRouter()\n" + body
    else:
        body_new = body

    # 2. add onClick to the <tr key={X.id}...> pattern
    # we target the specific variable (c for company, u for user) to avoid collateral
    tr_re = re.compile(
        rf"(<tr\s+key=\{{{id_var}\.id\}}\s+style=\{{[^}}]*\}})(\s*>)"
    )
    def add_click(m2):
        tr_open = m2.group(1)
        if "onClick" in tr_open:
            return m2.group(0)
        # inject cursor:pointer via inline style override + onClick
        click_attr = (
            f' onClick={{() => router.push(`{dest_path}/${{{id_var}.id}}`)}}'
            f' style={{{{...S.tr, cursor: \'pointer\'}}}}'
        )
        # Replace the style={S.tr} portion with cursor override too
        tr_open_new = re.sub(
            r"style=\{S\.tr\}",
            "style={{...S.tr, cursor: 'pointer'}}",
            tr_open,
        )
        # If regex didn't replace (different style), just append onClick
        if tr_open_new == tr_open:
            return tr_open + f' onClick={{() => router.push(`{dest_path}/${{{id_var}.id}}`)}}' + m2.group(2)
        return tr_open_new + f' onClick={{() => router.push(`{dest_path}/${{{id_var}.id}}`)}}' + m2.group(2)

    body_new2, count = tr_re.subn(add_click, body_new, count=1)
    if count == 0:
        print(f"WARN  Could not find <tr key={{{id_var}.id}}...> in {tab_name}")
        return

    s_new = s[:body_start] + body_new2 + s[body_end:]
    # Update global
    s = s_new
    print(f"OK  Patched {tab_name} row click -> {dest_path}")

patch_tab("CompaniesTab", "c", "/admin/lms/companies")
patch_tab("UsersTab",     "u", "/admin/lms/users")

# ---------------------------------------------------------------
# Write
# ---------------------------------------------------------------
FILE.write_text(s, encoding="utf-8")

# Bracket sanity check
if s.count("{") != s.count("}"):
    print("WARNING: bracket imbalance in page.js — inspect before pushing")

print()
print("Done. Next:")
print('  git add app/admin/lms/page.js')
print('  git commit -m "Clickable company and user rows"')
print('  git push origin main')
