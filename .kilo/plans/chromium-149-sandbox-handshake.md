# Plan: Brave 1.91 / Chromium 149 Template Compilation Recovery

## Goal

Restore Handlebars variable substitution (`{{from.first_name}}`, `{{moment}}`, `{{> partial}}`, etc.) in Brave 1.91.x / Chromium 149 and reduce future dependence on extension sandbox iframe messaging.

The current raw-body fallback prevents insertions from failing, but it leaves variables unexpanded because the MV3 sandbox iframe does not complete the content-script-to-sandbox handshake.

---

## Evidence From Brave / Community Reports

The two Brave issues narrow the failure from a generic Chromium 149 problem to a Brave 1.91.171 extension-resource regression:

- `brave/brave-browser#56255`: Bitwarden 2026.5.1 inline autofill menu stopped appearing in Brave 1.91.171 / Chromium 149.0.7827.103, while the extension itself and keyboard autofill still work. Chrome and Edge on the same Chromium version are unaffected.
- Bitwarden's public architecture docs show its inline menu uses content scripts that inject randomized custom elements with closed shadow DOM, then render extension UI pages inside sandboxed iframes and communicate through `postMessage` plus background-port routing. That is very close to Briskine's current `sandbox-parent.js` model: content script creates a closed shadow-root host, injects an extension sandbox iframe, then handshakes via `postMessage`.
- `brave/brave-browser#56271`: Brave 1.91.171 hangs navigations/redirects to `chrome-extension://...` web-accessible resources. It is Brave-only, reproducible across Shields/Safe Browsing/debounce settings, works in Brave 1.91.168, and is not reproducible in Chrome/Edge 149.0.7827.103.
- Linked Brave PR `brave/brave-core#37233` identifies a concrete loader bug: Brave did not propagate `kFollowRedirectReason` disconnects to the inner `WebRequestProxyingURLLoaderFactory`; Chromium 149.0.7827.103 made duplicate request-id association fail strictly, causing extension-resource navigation to hang forever.

Working hypothesis: Briskine is hitting the same Brave extension-resource loading/messaging class as Bitwarden, even though our iframe load is not a 302 redirect. The loader fix may restore Brave behavior in a later 1.91.x build, but Briskine should still avoid making template compilation depend on page-embedded extension sandbox iframes.

---

## Current Briskine State

| Layer | Status |
|---|---|
| `MessageChannel` messenger crash | Fixed by direct `postMessage` RPC |
| Sandbox iframe element | Created in `src/content/sandbox/sandbox-parent.js` |
| Iframe `onload` | Fires in current investigation |
| Messenger handshake | Retries for ~1s, then hangs until the outer 3s init timeout |
| Inner `connect()` catch | No warning seen, suggesting the handshake promise does not reject before the outer timeout wins |
| Fallback | `parse-template.js` returns the raw template body so insertion continues |
| Page messenger | Still works for same-window page-script insertion paths |

Important correction to the previous plan: an offscreen document cannot directly run Handlebars `compile()` with `unsafe-eval` under MV3 extension-page CSP. Chrome allows `unsafe-eval` only in manifest sandbox pages because they lose extension API access. Therefore, a direct "compile in offscreen document" migration is not valid unless the offscreen document hosts a sandbox iframe and bridges messages to it.

---

## Diagnosis Phase

Keep diagnostics short and targeted. The purpose is to decide whether a small compatibility fix is possible while the durable AST path is built.

### D1. Version and Upstream-Fix Matrix

Manually test the same build on:

| Browser | Expected Value |
|---|---|
| Brave 1.91.168 / Chromium 149.0.7827.54 | likely works or different failure |
| Brave 1.91.171 / Chromium 149.0.7827.103 | currently fails |
| Latest Brave Beta/Nightly containing or after `brave-core#37233` | determines if Brave fix restores iframe path |
| Chrome 149.0.7827.103 / Edge 149 equivalent | should work if Brave-only |

Output: decide whether this is a temporary Brave regression with an upstream fix, or still a Briskine-specific sandbox/messenger issue.

### D2. Confirm Sandbox Script Execution

Temporarily add a top-level log in `src/content/sandbox/sandbox.js`:

```js
console.warn('[Briskine sandbox] script loaded', location.href)
```

Check DevTools with all frames visible:

- If it appears, the iframe document and script execute; focus on `postMessage` transport and messenger filters.
- If it does not appear, the iframe load is incomplete despite `onload`, or the script is blocked by CSP / resource loading.

### D3. Confirm Message Directionality

Temporarily add catch-all message listeners on both sides:

- In `src/content/sandbox/sandbox.js`, log all `message` events and whether `e.source === self.parent`.
- In `src/content/messenger/messenger.js` around `connect()`, log all `message` events while the handshake is pending.
- From sandbox top-level, send `self.parent.postMessage({ _briskineProbe: true }, '*')` once.

Interpretation:

| Result | Meaning |
|---|---|
| Sandbox receives parent handshake | Messenger filtering/ack routing bug |
| Parent receives sandbox probe only | parent-to-sandbox delivery blocked |
| Sandbox receives nothing and parent receives nothing | extension iframe communication path blocked or document not really running |
| Both directions work in catch-all but not messenger | inspect `scope`, `from`, `to`, `e.source`, and `remoteInstanceId` handling |

### D4. Inspect Extension Resource Load Details

Use DevTools Network/Sources while triggering a template:

- Confirm `chrome-extension://<id>/sandbox/sandbox.html` and `sandbox/sandbox.js` finish, not `(pending)`.
- Compare the resource URL shape when `web_accessible_resources[0].use_dynamic_url` is `true` vs temporarily `false`.
- Temporarily remove `frame-ancestors 'none'` from `content_security_policy.extension_pages` to rule out Brave applying extension-page CSP to the sandbox page incorrectly.
- Confirm whether the page console shows blocked-frame, CSP, MIME, or `chrome-extension://` load errors.

`#56271` used a web-accessible extension page without dynamic URLs, so `use_dynamic_url` is probably not the root cause, but it is cheap to rule out.

### D5. Minimal Repro to Track Brave

If D2-D4 show the iframe or messaging path is Brave-broken, create a tiny local MV3 repro outside Briskine before changing product code:

- `manifest.json` with one content script, one sandbox page, `web_accessible_resources`, and the same sandbox CSP.
- Content script injects a hidden sandbox iframe and sends one `postMessage` handshake.
- Sandbox logs load and replies once.

This repro is useful for Brave issue comments and avoids conflating Briskine's messenger with Brave's loader/proxying code.

---

## Fix Paths

### Path A — Small Manifest or Messenger Fix

Use only if diagnosis proves the iframe path is healthy enough to salvage.

Apply one of these small fixes if supported by D2-D4:

- Remove or change an overly strict manifest setting only if it demonstrably restores the sandbox path.
- Loosen `Messenger` filtering if catch-all listeners see messages that the messenger rejects.
- Handle `e.source === null` explicitly by replying through the known parent/window target instead of relying on `e.source || self`.
- Keep the raw-body fallback and timeouts as safety nets.

Acceptance: variables compile again on Brave 1.91.171 and no regression appears in Chrome/Edge/Firefox MV2.

### Path B — Wait for Brave Fix, Keep Fallback

Use only if latest Brave Beta/Nightly with `brave-core#37233` restores the current sandbox iframe path.

Actions:

- Keep current raw fallback so affected Brave stable users see raw templates rather than failed insertions.
- Add a code comment linking the fallback to Brave 1.91.171 extension-resource regression.
- Do not invest in a large IPC rewrite solely for this regression if the durable AST work is already scheduled.

This is the lowest-code option, but it does not solve future sandbox iframe breakage.

### Path C — Offscreen-Hosted Sandbox Bridge

Use only if we need a non-page-embedded sandbox while keeping Handlebars `compile()`.

Correct model:

1. Add the `offscreen` permission to `src/manifest.json` for MV3 builds only.
2. Add an offscreen extension page, for example `src/content/offscreen/offscreen.html` and `src/content/offscreen/offscreen.js`.
3. The service worker creates that document with `chrome.offscreen.createDocument()` and uses `chrome.runtime.sendMessage` / `chrome.runtime.onMessage` to route compile requests.
4. The offscreen page embeds `sandbox/sandbox.html` in a hidden iframe. The sandbox page keeps the current `unsafe-eval` CSP and current `compileTemplate()` implementation.
5. The offscreen page bridges runtime messages to the sandbox iframe with `postMessage`, then bridges the sandbox response back to the service worker/content script.
6. `src/content/sandbox/sandbox-parent.js` becomes a wrapper that first tries runtime/offscreen compilation when `chrome.offscreen` exists, and keeps the current page-embedded sandbox only as a fallback.

Why this works: the `unsafe-eval` code still runs in a manifest sandbox page, but that sandbox is hosted inside an extension offscreen document rather than inside an arbitrary web page. This avoids Brave's page-to-extension iframe surface while preserving Handlebars compatibility.

Risks:

- More IPC and lifecycle code than Path D.
- Offscreen documents are MV3 Chrome/Brave only; Firefox/MV2 still need existing behavior.
- There is still a sandbox iframe and `postMessage`; it is just moved away from the web page.

### Path D — In-Content AST Renderer (Recommended Durable Fix)

Implement a small Handlebars AST renderer that runs entirely in the content script's isolated world. This avoids `Handlebars.compile()`, `new Function`, sandbox iframes, offscreen documents, and page-to-extension `postMessage` for template compilation.

This is the best long-term answer for Brave B49/Chromium 149 and later because `parse-template.js` already does the CSP-safe part (`Handlebars.parse(template)`) in the content script. The missing piece is rendering the parsed AST without eval.

Implementation outline:

1. Add a renderer module, for example `src/content/utils/render-template-ast.js`.
2. Move the helper registration list from `src/content/sandbox/sandbox.js` into a shared module, for example `src/content/helpers/index.js`, so both the sandbox compiler and AST renderer use the same helpers.
3. In `parse-template.js`, after `const ast = parse(template)`, call `renderTemplateAst(ast, context, partials)` for MV3 before attempting the sandbox path.
4. Keep the existing sandbox compile as a fallback for unsupported AST nodes during the first rollout.
5. Keep the raw-body fallback as the final safety net.

Minimum AST support for existing Briskine templates/tests:

| AST Node / Feature | Required Behavior |
|---|---|
| `Program` | Render each child in order |
| `ContentStatement` | Append literal text |
| `MustacheStatement` | Resolve variables/helpers, HTML-escape unless triple/raw or `SafeString` |
| `BlockStatement` | Support built-ins and block helpers with `options.fn` / `options.inverse` |
| `PartialStatement` | Find partial by `shortcut`, parse/render recursively, guard recursion |
| `SubExpression` | Evaluate nested helper calls such as `{{#if (and first last)}}` |
| `PathExpression` | Resolve `this`, `@root`, `@index`, dotted paths, numeric path parts, and parent segments if present |
| Literals | Support string, number, boolean, null, undefined |
| Hash args | Pass `options.hash` to helpers for calls like `{{moment format="YYYY"}}` |

Built-ins to implement directly:

- `if`, `unless`, `each`, and `with`.
- `each` should provide `@index`, `@first`, `@last`, and preserve `@root`.
- Truthiness should follow Handlebars closely enough for strings, arrays, objects, numbers, `null`, and `undefined`.

Helper compatibility requirements:

- Reuse existing helpers: `moment`, `domain`, `text`, `list`, `capitalize`, `capitalizeAll`, `or`, `and`, `compare`, `random`, `cursor`, and legacy `choice`.
- Build a Handlebars-like `options` object for helpers: `{ hash, data, fn, inverse }`.
- Call helpers with `this` bound to the current context frame.
- Preserve `SafeString` output from helpers like `cursor` and escape normal string output like Handlebars does.

Unsupported-feature strategy:

- If the renderer sees decorators, inline partials, partial blocks, raw blocks, unsupported block params, or other unimplemented nodes, throw an `UnsupportedTemplateFeatureError`.
- `parse-template.js` catches that specific error and falls back to the sandbox/offscreen path.
- Log unsupported node types only in development, so production does not spam consoles.

Testing plan for Path D:

- Add focused unit tests for `render-template-ast.js`: variables, nested paths, arrays, `@root`, `@index`, escaping, triple stache, missing values, hash args, subexpressions, partials, recursion guard, and unsupported nodes.
- Reuse the existing helper specs by running each template through the AST renderer as well as the current sandbox compiler, or add a shared test helper that compares both outputs.
- Ensure existing `src/content/utils/parse-template.spec.js` covers the MV3 AST-first path and fallback behavior.
- Run `npm test` and `npm run lint` after implementation.

Acceptance for Path D:

- The seeded "Say Hello" template renders substituted variables in Brave 1.91.171 even if sandbox handshake still fails.
- Existing helper specs pass through the AST renderer.
- Partial templates render correctly and do not infinitely recurse.
- Unsupported advanced Handlebars features fall back rather than silently rendering wrong output.

---

## Recommended Implementation Order

1. Run D1-D4 diagnostics first. They are cheap and will confirm whether Brave's upstream fix restores the current iframe path.
2. If a small manifest or messenger fix is clearly proven, apply Path A as a short-term compatibility patch.
3. Start Path D as the durable fix regardless of the Brave upstream outcome, because it removes the fragile sandbox-iframe dependency for the common template feature set.
4. Keep the current sandbox compiler as a temporary fallback for unsupported AST features.
5. Consider Path C only if Path D cannot cover enough existing templates quickly and Brave's iframe path remains broken.

---

## Acceptance Criteria

The work is done when, on Brave 1.91.x / Chromium 149:

- `h` + Tab in a Gmail compose window inserts the seeded "Say Hello" template with `{{from.first_name}}` and similar variables substituted.
- Dialog selection on Gmail and GitHub inserts substituted output.
- Normal usage does not log `[Briskine] template compilation failed, returning raw body`; that fallback remains only for hard failures.
- Existing unit tests pass, including helper behavior currently validated through `compileTemplate()`.
- New regression tests cover the AST renderer and the fallback path.
- No new unhandled rejections appear in the page console.

---

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Brave fixes the upstream issue before we ship | Path D is still valuable because it removes a fragile IPC dependency; Path A/B can be minimal if needed. |
| AST renderer diverges from Handlebars semantics | Compare renderer output against current `Handlebars.compile()` in tests for all supported features. |
| Existing templates use unsupported Handlebars features | Throw a typed unsupported-feature error and fall back to sandbox/offscreen compile. |
| Helpers depend on exact Handlebars `options` shape | Build and test `hash`, `data`, `fn`, and `inverse` compatibility explicitly. |
| Partials recurse indefinitely | Track partial shortcut stack and fail with a clear error on cycles. |
| Offscreen direct compile is attempted incorrectly | Do not run `Handlebars.compile()` in offscreen extension pages; only use offscreen as a host for a sandbox iframe if Path C is chosen. |
| Diagnostic logs leak into production | Keep probes temporary, or guard them behind `ENV !== 'production'`. |

---

## Out of Scope

- Replacing the page messenger used for paste/beforeinput/Quill insertion paths.
- Switching away from Handlebars syntax for user templates.
- Implementing the entire Handlebars language in Path D before shipping; unsupported advanced features can fall back initially.
