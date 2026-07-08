#!/usr/bin/env bash
# one-time script to generate vendored test dependencies.
set -euo pipefail

VENDOR_DIR="test/vendor"
mkdir -p "$VENDOR_DIR"

TMPDIR_DEPS=$(mktemp -d)
trap 'rm -rf "$TMPDIR_DEPS"' EXIT

echo "Installing packages..."
npm install \
  --prefix "$TMPDIR_DEPS" \
  --no-save \
  --silent \
  prosemirror-state@1.4.4 \
  prosemirror-view@1.41.5 \
  prosemirror-model@1.25.4 \
  prosemirror-schema-basic@1.2.4 \
  prosemirror-schema-list@1.5.1 \
  'ckeditor5@47.5.0' \
  'quill1@npm:quill@1.3.7' \
  'quill2@npm:quill@2.0.3' \
  'squire-rte@2.4.2' \
  'draft-js@0.11.7' \
  'react@19.2.4' \
  'react-dom@19.2.4' \
  '@lexical/react@0.39.0' \
  'slate@0.123.0' \
  'slate-react@0.123.0'

# --- Entry files ---

cat > "$TMPDIR_DEPS/prosemirror-entry.js" << 'EOF'
export { EditorState } from 'prosemirror-state'
export { EditorView } from 'prosemirror-view'
export { Schema, DOMParser } from 'prosemirror-model'
export { schema } from 'prosemirror-schema-basic'
export { addListNodes } from 'prosemirror-schema-list'
EOF

cat > "$TMPDIR_DEPS/ckeditor5-entry.js" << 'EOF'
export { ClassicEditor, Essentials, Bold, Italic, Paragraph, Image } from 'ckeditor5'
EOF

cat > "$TMPDIR_DEPS/quill1-entry.js" << 'EOF'
export { default } from 'quill1'
EOF

cat > "$TMPDIR_DEPS/quill2-entry.js" << 'EOF'
export { default } from 'quill2'
EOF

cat > "$TMPDIR_DEPS/squire-entry.js" << 'EOF'
export { default } from 'squire-rte'
EOF

cat > "$TMPDIR_DEPS/draft-js-entry.js" << 'EOF'
export { default as React } from 'react'
export { createRoot } from 'react-dom/client'
export { default as DraftJS } from 'draft-js'
EOF

cat > "$TMPDIR_DEPS/lexical-entry.js" << 'EOF'
export { createElement } from 'react'
export { createRoot } from 'react-dom/client'
export { LexicalComposer } from '@lexical/react/LexicalComposer'
export { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin'
export { ContentEditable } from '@lexical/react/LexicalContentEditable'
EOF

cat > "$TMPDIR_DEPS/slate-entry.js" << 'EOF'
export { useMemo, createElement } from 'react'
export { createRoot } from 'react-dom/client'
export { createEditor } from 'slate'
export { Slate, Editable, withReact } from 'slate-react'
EOF

# --- Bundle ---

BUNDLE="npx --yes esbuild --bundle --format=esm --loader:.svg=dataurl --loader:.css=empty"

echo "Bundling ProseMirror..."
$BUNDLE "$TMPDIR_DEPS/prosemirror-entry.js" --outfile="$VENDOR_DIR/prosemirror.js"

echo "Bundling CKEditor 5..."
$BUNDLE "$TMPDIR_DEPS/ckeditor5-entry.js" --outfile="$VENDOR_DIR/ckeditor5.js"

echo "Bundling Quill 1..."
$BUNDLE "$TMPDIR_DEPS/quill1-entry.js" --outfile="$VENDOR_DIR/quill1.js"

echo "Bundling Quill 2..."
$BUNDLE "$TMPDIR_DEPS/quill2-entry.js" --outfile="$VENDOR_DIR/quill2.js"

echo "Bundling Squire..."
$BUNDLE "$TMPDIR_DEPS/squire-entry.js" --outfile="$VENDOR_DIR/squire.js"

echo "Bundling Draft.js..."
$BUNDLE --define:global=globalThis "$TMPDIR_DEPS/draft-js-entry.js" --outfile="$VENDOR_DIR/draft-js.js"

echo "Bundling Lexical..."
$BUNDLE "$TMPDIR_DEPS/lexical-entry.js" --outfile="$VENDOR_DIR/lexical.js"

echo "Bundling Slate..."
$BUNDLE "$TMPDIR_DEPS/slate-entry.js" --outfile="$VENDOR_DIR/slate.js"

# --- CSS ---

echo "Copying CSS..."
cp "$TMPDIR_DEPS/node_modules/ckeditor5/dist/ckeditor5.css" "$VENDOR_DIR/ckeditor5.css"
cp "$TMPDIR_DEPS/node_modules/quill1/dist/quill.snow.css" "$VENDOR_DIR/quill1.snow.css"
cp "$TMPDIR_DEPS/node_modules/quill2/dist/quill.snow.css" "$VENDOR_DIR/quill2.snow.css"

# --- CKEditor 4 (pre-built CDN bundle; skin/plugins load from cdn.ckeditor.com at runtime via CKEDITOR_BASEPATH) ---

echo "Downloading CKEditor 4..."
curl -fsSL "https://cdn.ckeditor.com/4.22.1/standard/ckeditor.js" -o "$VENDOR_DIR/ckeditor4.js"

# --- Symlink for playwright ---

if [ ! -L "playwright/vendor" ]; then
  ln -s "../test/vendor" "playwright/vendor"
  echo "Created playwright/vendor -> ../test/vendor"
fi

echo "Done. Files written to $VENDOR_DIR/ ."
