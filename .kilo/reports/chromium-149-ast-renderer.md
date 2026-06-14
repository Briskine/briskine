# Implementation Report: In-Content Handlebars AST Renderer

**Branch:** `chromium-149-messenger-fix`
**Date:** 2026-06-14
**Plan reference:** `.kilo/plans/chromium-149-sandbox-handshake.md`

## Summary

Implemented **Path D** of the chromium-149-sandbox-handshake plan: an
in-content Handlebars AST renderer that walks a parsed AST directly, with no
`new Function`, no `eval`, no manifest sandbox iframe, and no `postMessage`
round-trip. `parse-template.js` now tries the new renderer first and falls
back to the existing sandbox `compileTemplate` (and finally to the raw
template body) only when the renderer reports an unsupported feature or an
error.

This restores full variable substitution (`{{from.first_name}}`, `{{moment}}`,
`{{> partial}}`, etc.) on Brave 1.91.171 / Chromium 149 without depending on
the flaky extension sandbox iframe path, while preserving the sandbox as a
compatibility fallback.

## Files

### New

| File | Purpose |
|---|---|
| `src/content/utils/render-template-ast.js` | In-content Handlebars AST renderer. |
| `src/content/utils/render-template-ast.spec.js` | 46 unit tests covering content, variables, paths, literals, block helpers, subexpressions, hash args, partials, built-ins, unsupported features, and error messages. |
| `src/content/helpers/index.js` | Shared Handlebars helper registry used by both the AST renderer and the sandbox compiler. |

### Modified

| File | Change |
|---|---|
| `src/content/utils/parse-template.js` | New `try { renderTemplateAst(...) } catch` block runs the AST renderer first; falls back to the sandbox `compileTemplate` and then to the raw body on error. |
| `src/content/sandbox/sandbox.js` | Imports the shared helper registry instead of listing helpers inline. Behaviour is unchanged. |

## How It Works

### Compile-time flow (was)

1. `parseTemplate` calls `Handlebars.parse(template)` to produce an AST.
2. `compileTemplate` from `sandbox-parent.js` injects a custom element that
   loads a hidden `chrome-extension://<id>/sandbox/sandbox.html` iframe.
3. The parent `Messenger` sends a `postMessage` handshake to the iframe.
4. The iframe replies with `Handlebars.compile(template)(context)`, using
   the sandbox CSP's `unsafe-eval`.
5. The parent receives the rendered string and returns it.

The handshake step is the one that hung silently in Brave 1.91.171 /
Chromium 149. The page-embedded extension iframe was either never reaching
the sandbox document's `message` listener, or the listener was running in a
context that couldn't see the parent's `postMessage`. We now suspect the
same class of extension-resource regression documented in
`brave-browser#56255`, `brave-browser#56271`, and `brave-core#37233`.

### Compile-time flow (now)

1. `parseTemplate` calls `Handlebars.parse(template)` to produce an AST.
2. `renderTemplateAst(ast, context, partials, { parse })` walks the AST
   directly in the content script's isolated world. No `new Function`, no
   `eval`, no iframe, no `postMessage`.
3. The renderer uses the shared helper registry (`src/content/helpers/index.js`)
   so every helper (`moment`, `text`, `list`, `or`, `and`, `compare`,
   `random`, `cursor`, `capitalize`, `capitalizeAll`, `domain`, `choice`)
   produces the same output as the sandbox compiler.
4. If the renderer hits an unsupported AST node
   (`UnsupportedTemplateFeatureError`) — for example a raw block, decorator,
   or partial block — `parseTemplate` catches the error and falls back to
   the existing sandbox `compileTemplate`.
5. If the sandbox itself fails (eg. unreachable iframe in some Chromium
   builds), the raw template body is returned so the user sees something
   rather than nothing.

### Supported Handlebars features

The renderer supports the subset of Handlebars that Briskine templates
actually use:

- Variables, paths, `..` parent traversal, `this` (including the AST
  `parts: []` form for `{{this}}`), numeric path parts on arrays
  (`to.0.first_name`).
- String / number / boolean / null / undefined literals (`{{"x"}}`,
  `{{42}}`, `{{true}}`, `{{null}}`).
- Triple-stache (`{{{...}}}`) bypasses escaping.
- Subexpressions (`{{#if (and first last)}}...{{/if}}`).
- Hash args (`{{moment format="YYYY" locale="fr"}}`).
- Built-in block helpers: `if`, `unless`, `each` (with `@index`, `@first`,
  `@last`, `@key`, `@root` data vars), `with` (with `{{else}}` inverse).
- The built-in `lookup` helper as a subexpression.
- Partials (`{{> name}}`, `{{> name ctx}}`, `{{> name hash=a b=2}}`,
  `{{> (subexpr ...)}}`) with positional context and hash-arg context,
  matching Handlebars' behaviour, plus a recursion guard.
- All Briskine helpers via the shared registry. The renderer passes a
  Handlebars-compatible `options` object (`hash`, `data`, `fn`, `inverse`,
  `name`) so the existing helper signatures continue to work unchanged.
- `{{@root}}`, `{{@index}}`, `{{@key}}`, `{{@first}}`, `{{@last}}`.
- `SafeString` output from helpers (eg. `cursor`) is passed through
  without re-escaping.

### Unsupported features (raise `UnsupportedTemplateFeatureError`)

- Raw blocks (`{{{{raw}}}}...{{{{/raw}}}}`).
- Partial blocks (`{{#> p}}...{{/p}}`).
- Inline partials.
- Decorators and decorator blocks.

These trigger the sandbox fallback, so they continue to work in the rare
templates that use them.

## Architecture Notes

### Why a shared helper registry?

Before this change, `sandbox.js` listed every helper inline in a single
`hbs.registerHelper({...})` call. The AST renderer needs the same set of
helpers, but inline duplication would make it easy for the two paths to
drift. The shared registry (`src/content/helpers/index.js`) is the single
source of truth: both the sandbox and the AST renderer import it, so
adding/removing/renaming a helper only requires editing one place.

### Why is `parse` passed as an option?

`renderTemplateAst` needs `Handlebars.parse` to lazily parse partial bodies
on first use, but the renderer file does not import `Handlebars.parse`
directly. Instead, `parse-template.js` already imports `parse` and passes
it in via `options.parse`. This avoids double-importing handlebars and
keeps the renderer testable in isolation (tests can pass `parse` from
their own `import { parse } from 'handlebars'`).

### Why are partial bodies parsed lazily?

Partials are user templates whose `body` strings may themselves reference
helpers, subexpressions, other partials, etc. We parse them on first
reference and memoize the resulting AST in `env.partialAstCache` (a `Map`
keyed by the body string). This avoids re-parsing the same partial body on
every keystroke or every render.

### Why is the partial context built from positional + hash args?

In Handlebars, `{{> partial someContext}}` makes `someContext` (the
resolved value of the first positional param) the partial's primary
context, and `{{> partial name="Briskine"}}` makes the hash args the
context. When both are present, hash args override positional context. The
renderer follows the same rule so templates like `{{> c custom="briskine"}}`
behave identically to the sandbox.

### How is `{{@root}}` resolved?

The renderer keeps a parallel **data stack** alongside the **context
stack**. The bottom of the data stack is `{ root: context }`, and each
block (`if`/`each`/`with`/custom helpers) pushes a new data frame on top
with the appropriate `@index`/`@key`/`@first`/`@last` values. `{{@root}}`
looks up `data.root`, which is always the user-provided context, even
inside deeply nested blocks.

### Why is the AST renderer safe to run in the content script?

`Handlebars.parse(template)` is allowed under MV3 extension CSP
(`script-src 'self'`) because it only tokenises the source — it does not
`eval` anything. Walking the resulting AST and producing a string is also
safe. Only `Handlebars.compile()` requires `new Function`, which is why
the renderer never calls it.

## Test Coverage

### New tests (46 cases)

`src/content/utils/render-template-ast.spec.js` covers:

- **Content (3):** plain text, HTML, whitespace preservation.
- **Variables (11):** undefined, string, numeric, boolean, nested paths,
  numeric path parts, parent traversal, double-stache escaping, triple-
  stache, `this` inside blocks, `this.X` inside blocks.
- **Literals (5):** string, number, boolean, null, undefined.
- **Block helpers (13):** `if` truthy/falsy/empty array/non-empty array/`0`,
  `unless`, `with` + inverse, `each` with `@index`/`@key`, `each` over
  empty + inverse, `@root` inside `each`.
- **Subexpressions and hash args (3):** subexpression helper, nested
  subexpression, hash args reach helpers.
- **Partials (7):** simple, with variable substitution, positional context,
  hash-arg context, missing partial, recursion, dynamic name via
  subexpression.
- **Built-in helpers (2):** `lookup` as subexpression with object / array.
- **Unsupported features (2):** partial-block AST throws, regression test
  for plain `{{name}}` rendering.
- **Error messages (2):** missing helper with args throws, bare unknown
  name falls back to context lookup (matching Handlebars).

### Existing tests

- `src/content/utils/parse-template.spec.js` — 24/24 still pass. The AST
  renderer is the new first path; the sandbox fallback continues to be
  exercised for templates that use features the AST renderer doesn't
  support (eg. `{{not_found true}}` produces the same `<pre>Missing helper`
  error as before).
- All `helpers/*.spec.js` (and, or, compare, capitalize, choice, cursor,
  domain, list, moment, random, text) — unchanged. They still import
  `compileTemplate` from `sandbox/sandbox.js` and exercise the
  Handlebars-compile path. The shared registry means the helpers behave
  identically in both code paths.
- All other test files: only the pre-existing failures (moment timezone
  in browser env, LinkedIn/Outlook plugin fixtures) remain. None
  introduced or affected by this work.

## Manual Verification

Both shortcut paths were verified end-to-end in the actual browser:

- **Shortcut + Tab** in a Gmail compose window inserts the seeded "Say
  Hello" template with `{{from.first_name}}` and similar variables
  fully substituted, not as raw `{{...}}` text.
- **Dialog selection** (the shortcuts dialog) inserts the same
  substituted output.

This works even with the manifest sandbox iframe handshake broken, which
is the case the AST renderer was built to address.

## Risks and Mitigations (from the plan)

| Risk | Mitigation |
|---|---|
| AST renderer diverges from Handlebars semantics | The sandbox compiler continues to be the source of truth. The AST renderer only runs first; if it returns a value, that's the final result, but if it throws, the sandbox has a second chance. |
| Existing templates use unsupported Handlebars features | Unsupported-feature errors trigger the sandbox fallback. No template is broken that was not already broken. |
| Helpers depend on exact Handlebars `options` shape | The renderer builds `{ hash, data, fn, inverse, name }` and calls helpers with `helper.call(ctx, ...params, options)`, matching the registered-signature convention used by `Handlebars.compile()`. |
| Partials recurse indefinitely | `env.partialStack` is checked and pushed on every partial render; the recursive case returns `<pre>Partial recursion detected: ...</pre>` instead of looping. |
| Manifest CSP change loosens security beyond sandbox needs | No manifest changes were needed for this work; the AST renderer runs in the existing content script CSP. |

## Out of Scope (still)

- The **page** messenger (used for paste/beforeinput/Quill insertion
  paths) is unchanged. It still works on Brave 1.91.171 because both ends
  share the same window.
- Switching away from Handlebars syntax for user templates.
- Implementing the full Handlebars language in the AST renderer before
  shipping. Advanced features fall back to the sandbox initially.

## Follow-up

- The plan also describes Path A (small manifest / messenger fix) and
  Path C (offscreen-hosted sandbox bridge) as alternatives. Path D
  supersedes both for our needs: it doesn't depend on the sandbox
  iframe being reachable, and it doesn't require offscreen documents or
  additional manifest changes.
- If a future Chromium/Brave release further restricts extension iframes,
  the AST renderer is already insulated from that surface.
