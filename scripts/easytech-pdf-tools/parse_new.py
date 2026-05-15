#!/usr/bin/env python3
"""Parse the text dump of the NEW Easytech PDF into a structured table.
Uses ONLY the PDFKit page.string output (already saved to new_page_1.txt).
No OCR, no extra deps.

Usage:
  python3 parse_new.py [path/to/new_page_1.txt]

Default input: <repo>/tmp_pdf_inspect/new_page_1.txt (relative to project root)."""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TXT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "tmp_pdf_inspect/new_page_1.txt"

# Canonical row labels we expect (in order). Each label maps to a
# (regex, expected_columns) where expected_columns is 2 (DROITE/GAUCHE)
# or 3 (DROITE/GAUCHE/Rapport).
ROWS = [
    ("Vitesse Ext/Flex",            r"^Vitesse Ext/Flex\s+(.*)$",            2),
    ("# Rep. Set/Exec.",            r"^# Rep\.\s+Set/Exec\.\s+(.*)$",        2),
    ("Angle de mouvement limit Set",r"^Angle de mouvement limit Set\s+(.*)$",2),
    ("Angle de mouvement maximal",  r"^Angle de mouvement maximal\s+(.*)$",  3),
    ("Moyenne Couple Maximal [Nm]", r"^Moyenne Couple Maximal\s*\[Nm\]\s+(.*)$", 3),
    ("Couple Maximal[Nm]",          r"^Couple Maximal\[Nm\]\s+(?!/)(.*)$",   3),
    ("Couple Maximal[Nm] / Poids",  r"^Couple Maximal\[Nm\]\s*/\s*Poids\s+(.*)$", 3),
    ("Angle @CM",                   r"^Angle @CM\s+(.*)$",                   2),
    ("Max Puissance",               r"^Max Puissance\s+(.*)$",               3),
    ("Angle @Max Puissance",        r"^Angle @Max Puissance\s+(.*)$",        3),
    ("Tot. Travail",                r"^Tot\.\s+Travail\s+(.*)$",             2),
    ("Index de résistance %",       r"^Index de résistance %\s+(.*)$",       2),
    ("Rapport Flex/Ext %",          r"^Rapport Flex/Ext %:?\s+(.*)$",        3),
]

VALUE_RE = re.compile(r"(?:[-+]?\d+(?:[.,]\d+)?|\*)/(?:[-+]?\d+(?:[.,]\d+)?|\*)")

if not TXT.is_file():
    print(f"ERROR: file not found: {TXT}", file=sys.stderr)
    sys.exit(1)

text = TXT.read_text(encoding="utf-8")
lines = [ln.rstrip() for ln in text.splitlines()]

print(f"=== Parsing {TXT.name} ({len(lines)} lines) ===\n")

# Header info
print("HEADER:")
for ln in lines[:5]:
    print(f"  {ln}")
print()

# Try to find Côté line (DROITE / GAUCHE)
for ln in lines:
    if ln.strip().startswith("Côté "):
        print(f"COLUMN HEADERS: {ln}")
print()

# Parse each known row
print("TABLE:")
print(f"  {'LABEL':32s} | {'DROITE':>14s} | {'GAUCHE':>14s} | {'RAPPORT':>14s}")
print("  " + "-" * 84)

found = 0
for label, pat, ncols in ROWS:
    rx = re.compile(pat)
    matched = None
    for ln in lines:
        m = rx.match(ln)
        if m:
            matched = m.group(1).strip()
            break
    if matched is None:
        print(f"  {label:32s} | <NOT FOUND>")
        continue
    if label == "Rapport Flex/Ext %":
        scalars = re.findall(r"[-+]?\d+(?:[.,]\d+)?", matched)
        vals = scalars
    else:
        vals = VALUE_RE.findall(matched)
    found += 1
    droite = vals[0] if len(vals) >= 1 else ""
    gauche = vals[1] if len(vals) >= 2 else ""
    rapport = vals[2] if len(vals) >= 3 else ""
    if ncols == 2:
        rapport = ""  # not expected
    print(f"  {label:32s} | {droite:>14s} | {gauche:>14s} | {rapport:>14s}")

print()
print(f"Rows found: {found}/{len(ROWS)} = {100*found/len(ROWS):.0f}%")
