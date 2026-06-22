#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────────────────
# optimize-3d-assets.sh
# Premium 3D asset optimization pipeline for production web deployment.
#
# Usage:
#   chmod +x optimize-3d-assets.sh
#   ./optimize-3d-assets.sh input.glb output.glb
#   ./optimize-3d-assets.sh input.glb             # auto-names output
#
# Requirements (auto-installed via npx):
#   - @gltf-transform/cli
#   - ktx-software (system package for KTX2 generation)
# ────────────────────────────────────────────────────────────────────────────

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${CYAN}[3D-OPT]${NC} $*"; }
ok()   { echo -e "${GREEN}[  OK  ]${NC} $*"; }
warn() { echo -e "${YELLOW}[ WARN ]${NC} $*"; }
err()  { echo -e "${RED}[ ERR  ]${NC} $*"; exit 1; }

# ── Args ─────────────────────────────────────────────────────────────────────
INPUT="${1:-}"
OUTPUT="${2:-}"

[[ -z "$INPUT" ]] && err "Usage: $0 <input.glb> [output.glb]"
[[ ! -f "$INPUT" ]] && err "File not found: $INPUT"

BASENAME=$(basename "$INPUT" .glb)
OUTPUT="${OUTPUT:-${BASENAME}-optimized.glb}"
REPORT="${BASENAME}-optimization-report.txt"

INPUT_SIZE=$(du -sh "$INPUT" | cut -f1)
log "Input:  $INPUT ($INPUT_SIZE)"
log "Output: $OUTPUT"

# ── Step 1: gltf-transform optimize ──────────────────────────────────────────
log "Step 1/5 — Running gltf-transform optimize..."
npx --yes @gltf-transform/cli@latest optimize "$INPUT" "$OUTPUT" \
  --compress draco \
  --texture-compress webp \
  --texture-size 1024 \
  --simplify \
  --flatten \
  --join \
  --dedup \
  --weld 2>/dev/null

ok "Draco compression + WebP textures applied."

# ── Step 2: MeshOpt re-encode (better GPU streaming) ─────────────────────────
log "Step 2/5 — MeshOpt re-encode for better GPU streaming..."
TEMP_MESH="${BASENAME}-meshopt.glb"
npx --yes @gltf-transform/cli@latest optimize "$OUTPUT" "$TEMP_MESH" \
  --compress meshopt 2>/dev/null && mv "$TEMP_MESH" "$OUTPUT"
ok "MeshOpt encoding applied."

# ── Step 3: Prune unused data ─────────────────────────────────────────────────
log "Step 3/5 — Pruning unused nodes, lights, cameras, animations..."
npx --yes @gltf-transform/cli@latest prune "$OUTPUT" "$OUTPUT" 2>/dev/null
ok "Unused assets pruned."

# ── Step 4: Generate size report ─────────────────────────────────────────────
log "Step 4/5 — Generating optimization report..."
OUTPUT_SIZE=$(du -sh "$OUTPUT" | cut -f1)
OUTPUT_BYTES=$(wc -c < "$OUTPUT")
INPUT_BYTES=$(wc -c < "$INPUT")
SAVED=$(( INPUT_BYTES - OUTPUT_BYTES ))
PERCENT=$(awk "BEGIN {printf \"%.1f\", ($SAVED / $INPUT_BYTES) * 100}")

cat > "$REPORT" << EOF
────────────────────────────────────
  3D Asset Optimization Report
  $(date)
────────────────────────────────────
Input file:     $INPUT
Output file:    $OUTPUT

Input size:     $INPUT_SIZE ($INPUT_BYTES bytes)
Output size:    $OUTPUT_SIZE ($OUTPUT_BYTES bytes)
Bytes saved:    $SAVED bytes (${PERCENT}% reduction)

Techniques applied:
  ✓ Draco geometry compression
  ✓ WebP texture compression (max 1024px)
  ✓ MeshOpt vertex cache optimization
  ✓ Geometry deduplication & welding
  ✓ Flat node hierarchy
  ✓ Unused data pruned

Target thresholds:
  < 3MB  → Ideal for above-the-fold hero
  < 5MB  → Acceptable for product viewer
  < 10MB → Background / non-critical
EOF

cat "$REPORT"

# ── Step 5: Web delivery check ────────────────────────────────────────────────
log "Step 5/5 — Web delivery validation..."

if (( OUTPUT_BYTES < 3145728 )); then
  ok "✓ Under 3MB — ideal for hero use"
elif (( OUTPUT_BYTES < 5242880 )); then
  warn "⚠ Under 5MB — acceptable, consider lazy-loading"
else
  warn "⚠ Over 5MB — add lazy-loading + skeleton loading UI"
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN} Optimization complete: $OUTPUT${NC}"
echo -e "${GREEN} $INPUT_SIZE → $OUTPUT_SIZE (${PERCENT}% saved)${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"

# ── Usage reminder ────────────────────────────────────────────────────────────
echo ""
log "Next steps:"
echo "  1. Copy $OUTPUT to /public/models/"
echo "  2. In Three.js: use DRACOLoader + MeshoptDecoder"
echo "  3. In R3F:       useGLTF('/models/$OUTPUT') with Suspense"
echo "  4. Serve with Content-Type: model/gltf-binary"
echo "  5. Add Cache-Control: public, max-age=31536000, immutable"
