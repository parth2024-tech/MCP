#!/usr/bin/env python3
"""
pptx-layout-calculator.py
─────────────────────────
Utilities for professional PPTX construction:
  - EMU (English Metric Unit) conversions
  - Safe zone and grid calculations for 16:9 slides
  - File integrity verification

Usage:
  python pptx-layout-calculator.py --verify <file.pptx>
  python pptx-layout-calculator.py --calc
  python pptx-layout-calculator.py --grid
"""

import argparse
import sys

# ── Constants ─────────────────────────────────────────────────────────────────
EMU_PER_CM   = 360000
EMU_PER_INCH = 914400
EMU_PER_PT   = 12700

# Standard 16:9 slide (PowerPoint default)
SLIDE_W_CM   = 33.867   # cm
SLIDE_H_CM   = 19.050   # cm
SLIDE_W_EMU  = int(SLIDE_W_CM * EMU_PER_CM)   # 12192000
SLIDE_H_EMU  = int(SLIDE_H_CM * EMU_PER_CM)   # 6858000

# Safe zone margins
MARGIN_TB_CM   = 1.270   # 0.5 in — top/bottom
MARGIN_LR_CM   = 1.905   # 0.75 in — left/right

# Content safe zone (inside margins)
SAFE_LEFT_CM   = MARGIN_LR_CM
SAFE_TOP_CM    = MARGIN_TB_CM
SAFE_W_CM      = SLIDE_W_CM - 2 * MARGIN_LR_CM
SAFE_H_CM      = SLIDE_H_CM - 2 * MARGIN_TB_CM

# ── Conversion helpers ────────────────────────────────────────────────────────

def cm_to_emu(cm: float) -> int:
    return int(cm * EMU_PER_CM)

def inch_to_emu(inch: float) -> int:
    return int(inch * EMU_PER_INCH)

def pt_to_emu(pt: float) -> int:
    return int(pt * EMU_PER_PT)

def emu_to_cm(emu: int) -> float:
    return emu / EMU_PER_CM

def emu_to_inch(emu: int) -> float:
    return emu / EMU_PER_INCH

def emu_to_pt(emu: int) -> float:
    return emu / EMU_PER_PT


# ── Grid calculator ───────────────────────────────────────────────────────────

def twelve_column_grid(cols: int = 12, gutter_cm: float = 0.5):
    """
    Compute column widths and left offsets for an N-column grid
    within the safe zone.
    """
    total_gutter = gutter_cm * (cols - 1)
    col_w = (SAFE_W_CM - total_gutter) / cols
    offsets = []
    for i in range(cols):
        left = SAFE_LEFT_CM + i * (col_w + gutter_cm)
        offsets.append(left)
    return col_w, offsets

def print_grid():
    col_w, offsets = twelve_column_grid()
    print("── 12-Column Grid (Safe Zone, 16:9) ──────────────────────────────")
    print(f"  Slide:          {SLIDE_W_CM:.3f} × {SLIDE_H_CM:.3f} cm")
    print(f"  Safe zone:      left={SAFE_LEFT_CM:.3f} cm  top={SAFE_TOP_CM:.3f} cm")
    print(f"                  width={SAFE_W_CM:.3f} cm  height={SAFE_H_CM:.3f} cm")
    print(f"  Column width:   {col_w:.4f} cm  ({cm_to_emu(col_w)} EMU)")
    print(f"  Gutter:         0.500 cm  ({cm_to_emu(0.5)} EMU)")
    print()
    print(f"  {'Col':>3}  {'Left (cm)':>10}  {'Left (EMU)':>12}  {'Right (cm)':>10}")
    print(f"  {'─'*3}  {'─'*10}  {'─'*12}  {'─'*10}")
    for i, left in enumerate(offsets):
        right = left + col_w
        print(f"  {i+1:>3}  {left:>10.4f}  {cm_to_emu(left):>12}  {right:>10.4f}")


# ── Common reference values ───────────────────────────────────────────────────

def print_calc():
    print("── EMU Reference Values ──────────────────────────────────────────")
    print(f"  1 cm  = {EMU_PER_CM:,} EMU")
    print(f"  1 in  = {EMU_PER_INCH:,} EMU")
    print(f"  1 pt  = {EMU_PER_PT:,} EMU")
    print()
    print("── Slide Dimensions (16:9 Standard) ─────────────────────────────")
    print(f"  Width:   {SLIDE_W_CM:.3f} cm  =  {SLIDE_W_EMU:,} EMU")
    print(f"  Height:  {SLIDE_H_CM:.3f} cm  =  {SLIDE_H_EMU:,} EMU")
    print()
    print("── Safe Zone ─────────────────────────────────────────────────────")
    print(f"  Margin L/R:  {MARGIN_LR_CM:.3f} cm  =  {cm_to_emu(MARGIN_LR_CM):,} EMU")
    print(f"  Margin T/B:  {MARGIN_TB_CM:.3f} cm  =  {cm_to_emu(MARGIN_TB_CM):,} EMU")
    print(f"  Content W:   {SAFE_W_CM:.3f} cm  =  {cm_to_emu(SAFE_W_CM):,} EMU")
    print(f"  Content H:   {SAFE_H_CM:.3f} cm  =  {cm_to_emu(SAFE_H_CM):,} EMU")
    print()
    print("── Common pt → EMU (for font sizes) ─────────────────────────────")
    for pt in [8, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 40, 44, 48, 52, 60, 72]:
        print(f"  {pt:>3}pt  =  {pt_to_emu(pt):,} EMU")
    print()
    print("── Common fraction widths (of safe zone) ─────────────────────────")
    for frac, label in [(1, "full"), (1/2, "half"), (1/3, "third"), (2/3, "two-thirds"),
                         (1/4, "quarter"), (3/4, "three-quarters")]:
        w = SAFE_W_CM * frac
        print(f"  {label:<14}  {w:.4f} cm  =  {cm_to_emu(w):,} EMU")


# ── File verification ─────────────────────────────────────────────────────────

def verify_pptx(path: str):
    try:
        from pptx import Presentation
    except ImportError:
        print("ERROR: python-pptx not installed. Run: pip install python-pptx")
        sys.exit(1)

    try:
        prs = Presentation(path)
    except Exception as e:
        print(f"FAIL  Cannot open file: {e}")
        sys.exit(1)

    slide_count = len(prs.slides)
    w = emu_to_cm(prs.slide_width)
    h = emu_to_cm(prs.slide_height)
    ratio = prs.slide_width / prs.slide_height

    issues = []
    if abs(ratio - (16/9)) > 0.01:
        issues.append(f"Non-standard aspect ratio: {ratio:.3f} (expected 1.778 for 16:9)")
    if slide_count == 0:
        issues.append("No slides found in file")

    print(f"── PPTX Verification: {path} ────────────────────────────────────")
    print(f"  Slides:      {slide_count}")
    print(f"  Dimensions:  {w:.3f} × {h:.3f} cm  (ratio: {ratio:.3f})")
    print()

    if issues:
        for i in issues:
            print(f"  WARN  {i}")
    else:
        print(f"  PASS  File is valid, {slide_count} slides, standard 16:9 dimensions")

    # Slide-by-slide shape count
    print()
    print(f"  {'Slide':>6}  {'Shapes':>7}  {'Has Notes':>10}")
    print(f"  {'─'*6}  {'─'*7}  {'─'*10}")
    for i, slide in enumerate(prs.slides):
        has_notes = bool(slide.has_notes_slide and
                         slide.notes_slide.notes_text_frame.text.strip())
        print(f"  {i+1:>6}  {len(slide.shapes):>7}  {'yes' if has_notes else 'no':>10}")


# ── CLI entry ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="PPTX layout calculator and file verifier")
    parser.add_argument("--calc",   action="store_true",
                        help="Print EMU reference values and safe zone dimensions")
    parser.add_argument("--grid",   action="store_true",
                        help="Print 12-column grid offsets")
    parser.add_argument("--verify", metavar="FILE",
                        help="Verify a .pptx file (requires python-pptx)")
    args = parser.parse_args()

    if args.calc:
        print_calc()
    if args.grid:
        print_grid()
    if args.verify:
        verify_pptx(args.verify)
    if not (args.calc or args.grid or args.verify):
        parser.print_help()
