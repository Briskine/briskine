#!/usr/bin/env bash
# one-time script to generate vendored test dependencies.
set -euo pipefail

VENDOR_DIR="test/vendor"
mkdir -p "$VENDOR_DIR"

# --- CKEditor 5 classic build (self-contained pre-built ESM) ---
echo "Downloading CKEditor..."
curl -fsSL "https://cdn.jsdelivr.net/npm/@ckeditor/ckeditor5-build-classic/+esm" \
  -o "$VENDOR_DIR/ckeditor5.js"

# --- ProseMirror (bundle all required packages into one ESM file) ---
echo "Bundling ProseMirror..."
TMPDIR_PM=$(mktemp -d)
trap 'rm -rf "$TMPDIR_PM"' EXIT

cat > "$TMPDIR_PM/entry.js" << 'EOF'
export { EditorState } from 'prosemirror-state'
export { EditorView } from 'prosemirror-view'
export { Schema, DOMParser } from 'prosemirror-model'
export { schema } from 'prosemirror-schema-basic'
export { addListNodes } from 'prosemirror-schema-list'
EOF

npm install \
  --prefix "$TMPDIR_PM" \
  --no-save \
  --silent \
  prosemirror-state@1.4.3 \
  prosemirror-view@1 \
  prosemirror-model@1 \
  prosemirror-schema-basic@1 \
  prosemirror-schema-list@1.4.1

npx --yes esbuild "$TMPDIR_PM/entry.js" \
  --bundle \
  --format=esm \
  --outfile="$VENDOR_DIR/prosemirror.js"

echo "Done. Files written to $VENDOR_DIR/ ."
