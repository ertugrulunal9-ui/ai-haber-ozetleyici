#!/usr/bin/env bash
# Builds a distributable copy of the extension.
# Usage:
#   SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx \
#   [EXTENSION_PUBLIC_KEY=MIIBIjANBg...] \
#   ./scripts/build-extension.sh
# The output goes to dist/extension/
#
# EXTENSION_PUBLIC_KEY (optional) is the Chrome Web Store item's public key.
# When set, it is written to the built manifest as "key", so an unpacked load
# of dist/extension gets the same extension ID as the store version. Leave it
# unset when building the zip you upload to the store.
# On Windows without bash, use scripts/build-extension.ps1.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
SRC_DIR="$ROOT_DIR/extension"
DIST_DIR="$ROOT_DIR/dist/extension"
PLACEHOLDER="__SUPABASE_PUBLISHABLE_KEY__"

if [[ -z "${SUPABASE_PUBLISHABLE_KEY:-}" ]]; then
  echo "SUPABASE_PUBLISHABLE_KEY is required." >&2
  exit 1
fi

escape_sed_replacement() {
  printf '%s' "$1" | sed -e 's/[&|\\]/\\&/g'
}

SUPABASE_PUBLISHABLE_KEY_ESCAPED="$(escape_sed_replacement "$SUPABASE_PUBLISHABLE_KEY")"

# Clean and copy
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"
cp -r "$SRC_DIR"/* "$DIST_DIR"/

sed -i.bak "s|$PLACEHOLDER|$SUPABASE_PUBLISHABLE_KEY_ESCAPED|g" "$DIST_DIR/background/background.js"
rm -f "$DIST_DIR/background/background.js.bak"

if grep -q "$PLACEHOLDER" "$DIST_DIR/background/background.js"; then
  echo "The publishable key was not written to background.js." >&2
  exit 1
fi

if [[ -n "${EXTENSION_PUBLIC_KEY:-}" ]]; then
  EXTENSION_PUBLIC_KEY="$EXTENSION_PUBLIC_KEY" node -e '
    const fs = require("fs");
    const file = process.argv[1];
    const key = process.env.EXTENSION_PUBLIC_KEY.replace(/-----[^-]+-----|\s/g, "");
    const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
    fs.writeFileSync(file, JSON.stringify({ key, ...manifest }, null, 2) + "\n");
  ' "$DIST_DIR/manifest.json"
  echo "Pinned the extension ID with EXTENSION_PUBLIC_KEY."
fi

echo "Extension built successfully in $DIST_DIR"
