#!/usr/bin/env bash
# Builds a distributable copy of the extension.
# Usage: SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx ./scripts/build-extension.sh
# The output goes to dist/extension/

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
SRC_DIR="$ROOT_DIR/extension"
DIST_DIR="$ROOT_DIR/dist/extension"

if [[ -z "${SUPABASE_PUBLISHABLE_KEY:-}" ]]; then
  echo "SUPABASE_PUBLISHABLE_KEY is required." >&2
  exit 1
fi

# Clean and copy
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"
cp -r "$SRC_DIR"/* "$DIST_DIR"/
cp "$ROOT_DIR/manifest.json" "$DIST_DIR"/ 2>/dev/null || true

sed -i.bak "s|__SUPABASE_PUBLISHABLE_KEY__|$SUPABASE_PUBLISHABLE_KEY|g" "$DIST_DIR/background/background.js"
rm -f "$DIST_DIR/background/background.js.bak"

echo "Extension built successfully in $DIST_DIR"
