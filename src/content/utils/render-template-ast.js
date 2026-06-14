/*
 * In-content Handlebars AST renderer.
 *
 * Why this exists
 * ---------------
 * Briskine's MV3 extension pages can no longer use `unsafe-eval`, so
 * `Handlebars.compile()` cannot run in the content script isolated world.
 * The historical workaround was to compile templates in a manifest
 * sandbox iframe (which still allows `unsafe-eval`) and talk to it via
 * `postMessage`. That handshake has been flaky in Brave 1.91.171 /
 * Chromium 149 (see brave-browser#56255, brave-browser#56271 and
 * brave-core#37233 for the related regression in Brave's extension
 * resource loading).
 *
 * Path D of the chromium-149-sandbox-handshake plan replaces that fragile
 * IPC with a small renderer that walks a Handlebars AST (produced by
 * `Handlebars.parse(template)`) and emits the rendered output directly.
 * It supports the subset of Handlebars that Briskine templates actually
 * use:
 *
 *   - variables, paths, `..` parent traversal, `this`
 *   - string/number/boolean/null/undefined literals
 *   - subexpressions and hash args
 *   - built-in block helpers: `if`, `unless`, `each`, `with`
 *   - the built-in `lookup` helper
 *   - partials (with positional context and/or hash args)
 *   - the full set of Briskine helpers via the shared registry
 *   - `{{@root}}`, `{{@index}}`, `{{@key}}`, `{{@first}}`, `{{@last}}`
 *   - `SafeString` output from helpers like `cursor`
 *   - triple-stache `{{{...}}}` (no escaping)
 *
 * Unsupported advanced nodes (decorators, partial blocks, raw blocks,
 * inline partials, etc.) raise `UnsupportedTemplateFeatureError` so
 * `parse-template.js` can fall back to the legacy sandbox compiler.
 *
 * The renderer is intentionally simple: no `new Function`, no `eval`, no
 * sandbox iframe, no `postMessage`. It runs entirely in the content
 * script's isolated world, which works even when the MV3 extension
 * sandbox iframe handshake is blocked.
 */

import { SafeString, Utils } from 'handlebars'

import { sharedHelpers } from '../helpers/index.js'

const { escapeExpression } = Utils

export class UnsupportedTemplateFeatureError extends Error {
  constructor (node) {
    super(`Unsupported Handlebars feature: ${node?.type || 'unknown'}`)
    this.name = 'UnsupportedTemplateFeatureError'
    this.node = node
  }
}

// ---------------------------------------------------------------------------
// Helpers: Handlebars truthiness / emptiness / escaping primitives
// ---------------------------------------------------------------------------

function isEmpty (value) {
  // Handlebars' isEmpty: empty array, empty string, false, 0 treated via includeZero,
  // undefined, null, plus Handlebars' array-test via isArray.
  if (value === undefined || value === null) {
    return true
  }
  if (value === false) {
    return true
  }
  if (Array.isArray(value)) {
    return value.length === 0
  }
  if (typeof value === 'string') {
    return value === ''
  }
  if (typeof value === 'object' && value && typeof value.length === 'number') {
    return value.length === 0
  }
  return false
}

function escapeOutput (value) {
  // Used for the rendered output of `{{var}}` (double stache). Triple-stache
  // and `SafeString` output bypass this and are returned as-is.
  if (value instanceof SafeString) {
    return value.toString()
  }
  if (value && typeof value === 'object' && value.__safe__) {
    return value.value
  }
  if (value === null || value === undefined) {
    return ''
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  const s = String(value)
  // Raw HTML templates use the AST source itself which already contains trusted markup;
  // we still escape variables unless they came from a SafeString.
  return escapeExpression(s)
}

function isTrue (value) {
  // Handlebars truthiness: false, "", empty array, undefined, null, NaN, 0 are falsy.
  // Note: Handlebars considers 0 falsy unless includeZero is set.
  if (value === undefined || value === null) {
    return false
  }
  if (value === false) {
    return false
  }
  if (typeof value === 'string') {
    return value !== ''
  }
  if (Array.isArray(value)) {
    return value.length > 0
  }
  if (typeof value === 'number') {
    return value !== 0 && !Number.isNaN(value)
  }
  return true
}

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

function lookupProperty (obj, field) {
  // Mirrors Handlebars' `lookupProperty`: plain property access, with a small
  // extension so that numeric path parts (eg. `to.0.first_name`) resolve on
  // arrays / array-likes. This is needed because `parse-template.js`
  // sometimes spreads contact properties onto an array wrapper.
  if (obj == null) {
    return undefined
  }
  // support numeric fields on arrays/array-likes
  if (typeof obj === 'object' && /^(\d+)$/.test(String(field)) && obj[Symbol.iterator]) {
    const arr = Array.isArray(obj) ? obj : Array.from(obj)
    return arr[Number(field)]
  }
  if (typeof obj === 'object' && typeof field === 'string' && field in obj) {
    return obj[field]
  }
  if (typeof obj === 'object' && typeof field === 'number' && typeof obj.length === 'number') {
    return obj[field]
  }
  return undefined
}

// Resolve a PathExpression against the current context stack.
// PathExpression: { type: 'PathExpression', data: bool, depth, parts: [string, ...] }
// Supported: 'this' (parts: ['this'] or empty with `original: "this"`),
// '@root', '@index', '@key', '@first', '@last', '..' parent traversal, and
// dotted paths like 'to.first_name'. Also supports numeric path parts like
// 'to.0.first_name' through the dotted segments directly.
function resolvePath (pathExpr, contextStack, dataStack) {
  const parts = pathExpr.parts || []

  // Handle '@data' variable: the parser emits `data: true` on the path
  // expression and `parts: ["root", ...]` etc. for `{{@root.foo}}`.
  if (pathExpr.data) {
    const data = dataStack && dataStack.length > 0 ? dataStack[dataStack.length - 1] : undefined
    if (!data) {
      return undefined
    }
    // Special names: @root, @index, @key, @first, @last.
    if (parts.length === 0) {
      return data.root
    }
    if (parts[0] === '@root' || parts[0] === 'root') {
      let value = data.root
      for (let p = 1; p < parts.length; p++) {
        if (value == null) {
          return undefined
        }
        value = lookupProperty(value, parts[p])
      }
      return value
    }
    if (parts[0] === '@index' || parts[0] === 'index') {
      return parts.length > 1 ? lookupProperty(data?.index, parts[1]) : data?.index
    }
    if (parts[0] === '@key' || parts[0] === 'key') {
      return parts.length > 1 ? lookupProperty(data?.key, parts[1]) : data?.key
    }
    if (parts[0] === '@first' || parts[0] === 'first') {
      return data?.first
    }
    if (parts[0] === '@last' || parts[0] === 'last') {
      return data?.last
    }
    // Fall back to looking up the rest on the data frame.
    return lookupProperty(data, parts[0])
  }

  // 'this' with empty parts and original === 'this'.
  if (pathExpr.original === 'this' && parts.length === 0) {
    return contextStack[contextStack.length - 1]
  }

  if (!parts.length) {
    return undefined
  }

  // Strip a leading 'this' since the current context is implicit.
  let realParts = parts
  if (parts[0] === 'this') {
    realParts = parts.slice(1)
    if (realParts.length === 0) {
      return contextStack[contextStack.length - 1]
    }
  }

  // Parent traversal: '..' prefixes. Compute a fresh context pointer without
  // mutating the caller's stack.
  let contextIndex = contextStack.length - 1
  let i = 0
  while (i < realParts.length && realParts[i] === '..') {
    if (contextIndex > 0) {
      contextIndex--
    }
    i++
  }

  if (i >= realParts.length) {
    return contextStack[contextIndex]
  }

  const remaining = realParts.slice(i)
  // Try the path against the current context first. If not found, walk up the
  // context stack to handle inherited names (e.g. 'account' resolved inside a
  // partial invoked with a different context).
  let value = resolveOnContext(contextStack[contextIndex], remaining)
  if (value === undefined) {
    for (let s = contextIndex - 1; s >= 0; s--) {
      const v = resolveOnContext(contextStack[s], remaining)
      if (v !== undefined) {
        value = v
        break
      }
    }
  }
  return value
}

function resolveOnContext (context, parts) {
  // Walk a single dotted path (e.g. ["to", "first_name"]) against a context
  // object, returning the resolved value or `undefined`.
  if (context == null) {
    return undefined
  }
  let value = context
  for (const part of parts) {
    if (value == null) {
      return undefined
    }
    value = lookupProperty(value, part)
  }
  return value
}

// ---------------------------------------------------------------------------
// Expression / helper evaluation
// ---------------------------------------------------------------------------

function evalExpression (expr, contextStack, dataStack, env) {
  // Evaluate a value-position AST node: literals, paths, and subexpressions.
  if (!expr) {
    return undefined
  }
  switch (expr.type) {
    case 'StringLiteral':
      return expr.value
    case 'NumberLiteral':
      return expr.value
    case 'BooleanLiteral':
      return expr.value
    case 'NullLiteral':
      return null
    case 'UndefinedLiteral':
      return undefined
    case 'PathExpression':
      return resolvePath(expr, contextStack, dataStack)
    case 'SubExpression': {
      // `(helper arg1 arg2 ...)` — evaluate the helper and return its result.
      return callHelperFromAST(expr, contextStack, dataStack, env)
    }
    case 'Hash':
      // shouldn't appear as a value, but guard anyway
      return undefined
    default:
      throw new UnsupportedTemplateFeatureError(expr)
  }
}

function callHelperFromAST (mustacheOrSubExpr, contextStack, dataStack, env) {
  // Dispatch a MustacheStatement or SubExpression to its helper. Looks up the
  // helper by name in the shared registry; falls back to the built-in
  // `lookup` helper; raises a missing-helper error for anything else.
  //
  // mustacheOrSubExpr shape: { type, path: PathExpression, params: [expr...], hash: { pairs: [...] } }
  const name = (mustacheOrSubExpr.path?.parts || []).join('.')
  if (!name) {
    throw new UnsupportedTemplateFeatureError(mustacheOrSubExpr)
  }
  const helper = env.helpers[name]
  // Built-in helpers we implement directly.
  if (!helper) {
    if (name === 'lookup') {
      const args = (mustacheOrSubExpr.params || []).map((p) => evalExpression(p, contextStack, dataStack, env))
      const [obj, field] = args
      return lookupProperty(obj, field)
    }
    if (name === 'if' || name === 'unless' || name === 'each' || name === 'with') {
      // Block helpers are handled at the block level; this branch only fires
      // for subexpression uses of `if`/`each` which we don't support.
      throw new UnsupportedTemplateFeatureError(mustacheOrSubExpr)
    }
    // Unknown helper. In Handlebars this becomes a missing-helper error.
    if ((mustacheOrSubExpr.params || []).length === 0) {
      // bare `{{name}}` with no params; resolve to the context value
      return resolvePath(mustacheOrSubExpr.path, contextStack, dataStack)
    }
    throw new Error(`Missing helper: "${name}"`)
  }

  const params = (mustacheOrSubExpr.params || []).map((p) => evalExpression(p, contextStack, dataStack, env))
  const hash = evalHash(mustacheOrSubExpr.hash, contextStack, dataStack, env)

  // Build a Handlebars-like options object for helpers.
  // Note: this is not a Handlebars `this`, but a context frame (helpers can
  // call `this` indirectly via `cursor` etc.).
  const ctx = contextStack[contextStack.length - 1]
  const data = dataStack[dataStack.length - 1]

  const options = {
    hash,
    data,
    fn: undefined,
    inverse: undefined,
    // some helpers reference these for the legacy signature
    name,
  }

  // Briskine helpers (e.g. `or`, `and`, `compare`, `text`, `list`,
  // `random`, `moment`, `cursor`) expect the last positional argument to be
  // the options object, matching the signature they already use inside the
  // sandbox's `Handlebars.compile()` call.
  return helper.call(ctx, ...params, options)
}

function evalHash (hashNode, contextStack, dataStack, env) {
  // Materialise a hash-args node (`format="YYYY" locale="fr"`) as a plain
  // object, evaluating each value via `evalExpression`.
  const out = {}
  if (!hashNode || !Array.isArray(hashNode.pairs)) {
    return out
  }
  for (const pair of hashNode.pairs) {
    out[pair.key] = evalExpression(pair.value, contextStack, dataStack, env)
  }
  return out
}

function renderProgram (node, contextStack, dataStack, env) {
  // Render a Program node by concatenating the rendered output of each child
  // node. This is the entry point used by `renderTemplateAst`, by `each`
  // block bodies, and by partial bodies.
  let out = ''
  for (const child of node.body || []) {
    out += renderNode(child, contextStack, dataStack, env)
  }
  return out
}

// ---------------------------------------------------------------------------
// Top-level AST walkers
// ---------------------------------------------------------------------------

function renderNode (node, contextStack, dataStack, env) {
  // Dispatch a single AST node to its renderer. Unsupported node types
  // raise `UnsupportedTemplateFeatureError` so the caller can fall back.
  if (!node) {
    return ''
  }
  switch (node.type) {
    case 'Program':
      return renderProgram(node, contextStack, dataStack, env)
    case 'ContentStatement':
      // Raw template text (eg. the `<div>` literal in a template).
      return node.value || ''
    case 'CommentStatement':
      // `{{!-- ... --}}` and `{{! ... }}` produce no output.
      return ''
    case 'MustacheStatement': {
      const value = renderMustache(node, contextStack, dataStack, env)
      if (node.escaped === false) {
        // {{{triple stache}}} or {{!...}} with unsafe contents
        return unwrapToString(value)
      }
      return escapeOutput(value)
    }
    case 'BlockStatement': {
      return renderBlock(node, contextStack, dataStack, env)
    }
    case 'PartialStatement': {
      return renderPartial(node, contextStack, dataStack, env)
    }
    case 'PartialBlockStatement':
    case 'DecoratorBlock':
    case 'Decorator':
    case 'RawBlockStatement':
    case 'InlinePartialStatement':
    default:
      throw new UnsupportedTemplateFeatureError(node)
  }
}

function unwrapToString (value) {
  // Convert any helper return value to a raw string for triple-stache output.
  // SafeStrings are passed through without further escaping.
  if (value == null) {
    return ''
  }
  if (value instanceof SafeString) {
    return value.toString()
  }
  if (value && typeof value === 'object' && value.__safe__) {
    return value.value
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

// ---------------------------------------------------------------------------
// Mustache, block, and partial rendering
// ---------------------------------------------------------------------------

function renderMustache (node, contextStack, dataStack, env) {
  // `{{name}}` with no params/hash is either a helper call (e.g. `{{cursor}}`)
  // or a context lookup (e.g. `{{first_name}}`). In Handlebars, helpers
  // registered with `registerHelper` take precedence over context values.
  // `this`/`@root`/dotted paths are always context lookups. A bare literal
  // path like `{{"hello"}}` or `{{42}}` renders the literal value.
  const hasParams = node.params && node.params.length > 0
  const hasHash = node.hash && node.hash.pairs && node.hash.pairs.length > 0

  // Bare literal `{{...}}` short-circuits to the literal value.
  if (!hasParams && !hasHash && node.path) {
    if (node.path.type === 'StringLiteral' || node.path.type === 'NumberLiteral' || node.path.type === 'BooleanLiteral' || node.path.type === 'NullLiteral' || node.path.type === 'UndefinedLiteral') {
      return node.path.value
    }
  }

  const name = (node.path?.parts || []).join('.')
  const isThis = name === 'this' || (!name && node.path?.original === 'this')
  const isData = node.path?.data
  if (!hasParams && !hasHash) {
    if (isThis || isData) {
      return resolvePath(node.path, contextStack, dataStack)
    }
    if (env.helpers[name]) {
      return callHelperFromAST(node, contextStack, dataStack, env)
    }
    if (name === 'lookup' || name === 'if' || name === 'unless' || name === 'each' || name === 'with') {
      return callHelperFromAST(node, contextStack, dataStack, env)
    }
    return resolvePath(node.path, contextStack, dataStack)
  }
  return callHelperFromAST(node, contextStack, dataStack, env)
}

function renderBlock (node, contextStack, dataStack, env) {
  // Render a BlockStatement (`{{#helper ...}}...{{/helper}}` or
  // `{{#helper ...}}...{{else}}...{{/helper}}`). Built-in block helpers are
  // implemented directly; everything else is dispatched to the registered
  // helper with a Handlebars-compatible `fn`/`inverse`/`data`/`hash` options
  // object.
  const name = (node.path?.parts || []).join('.')
  const params = (node.params || []).map((p) => evalExpression(p, contextStack, dataStack, env))
  const hash = evalHash(node.hash, contextStack, dataStack, env)
  const ctx = contextStack[contextStack.length - 1]
  const data = dataStack[dataStack.length - 1]

  // `fn` and `inverse` are the closures Handlebars-built templates call to
  // render the block body and the `{{else}}` body. The optional `frameOptions`
  // parameter mirrors Handlebars' `(context, options)` second argument and
  // is used by the each helper to thread through a new data frame.
  const fn = (innerCtx, frameOptions) => {
    const newContext = innerCtx
    const newData = frameOptions?.data || data
    contextStack.push(newContext)
    dataStack.push(newData)
    try {
      return renderProgram(node.program, contextStack, dataStack, env)
    } finally {
      contextStack.pop()
      dataStack.pop()
    }
  }
  const inverse = (innerCtx, frameOptions) => {
    if (!node.inverse) {
      return ''
    }
    const newContext = innerCtx
    const newData = frameOptions?.data || data
    contextStack.push(newContext)
    dataStack.push(newData)
    try {
      return renderProgram(node.inverse, contextStack, dataStack, env)
    } finally {
      contextStack.pop()
      dataStack.pop()
    }
  }

  // Built-in block helpers
  if (name === 'if') {
    const value = params[0]
    const cond = isTrue(value) && !isEmpty(value)
    return cond ? fn(ctx) : inverse(ctx)
  }
  if (name === 'unless') {
    const value = params[0]
    const cond = isTrue(value) && !isEmpty(value)
    return cond ? inverse(ctx) : fn(ctx)
  }
  if (name === 'with') {
    const value = params[0]
    if (isEmpty(value)) {
      return inverse(ctx)
    }
    return fn(value)
  }
  if (name === 'each') {
    // Supports arrays, strings, array-likes (with a `length` property), and
    // plain objects. Iterates with @index, @first, @last, @key data vars.
    let list = params[0]
    if (typeof list === 'function') {
      list = list.call(ctx)
    }
    if (list && typeof list === 'object' && typeof list[Symbol.iterator] === 'function' && !Array.isArray(list)) {
      list = Array.from(list)
    }
    if (list == null) {
      return inverse(ctx)
    }
    if (typeof list === 'string' || Array.isArray(list) || (typeof list === 'object' && typeof list.length === 'number')) {
      if (list.length === 0) {
        return inverse(ctx)
      }
      let out = ''
      const isArr = Array.isArray(list)
      if (isArr) {
        for (let i = 0; i < list.length; i++) {
          const newData = { ...data, index: i, first: i === 0, last: i === list.length - 1, key: i }
          contextStack.push(list[i])
          dataStack.push(newData)
          try {
            out += renderProgram(node.program, contextStack, dataStack, env)
          } finally {
            contextStack.pop()
            dataStack.pop()
          }
        }
      } else if (typeof list === 'string') {
        for (let i = 0; i < list.length; i++) {
          const newData = { ...data, index: i, first: i === 0, last: i === list.length - 1, key: i }
          contextStack.push(list[i])
          dataStack.push(newData)
          try {
            out += renderProgram(node.program, contextStack, dataStack, env)
          } finally {
            contextStack.pop()
            dataStack.pop()
          }
        }
      } else {
        // array-like
        const keys = Object.keys(list)
        keys.forEach((key, idx) => {
          const newData = { ...data, index: idx, first: idx === 0, last: idx === keys.length - 1, key }
          contextStack.push(list[key])
          dataStack.push(newData)
          try {
            out += renderProgram(node.program, contextStack, dataStack, env)
          } finally {
            contextStack.pop()
            dataStack.pop()
          }
        })
      }
      return out
    }
    // Object iteration
    const keys = Object.keys(list)
    if (keys.length === 0) {
      return inverse(ctx)
    }
    let out = ''
    keys.forEach((key, idx) => {
      const newData = { ...data, index: idx, first: idx === 0, last: idx === keys.length - 1, key }
      contextStack.push(list[key])
      dataStack.push(newData)
      try {
        out += renderProgram(node.program, contextStack, dataStack, env)
      } finally {
        contextStack.pop()
        dataStack.pop()
      }
    })
    return out
  }

  // Custom block helper
  const helper = env.helpers[name]
  if (!helper) {
    throw new Error(`Missing helper: "${name}"`)
  }
  const options = {
    hash,
    data,
    fn,
    inverse,
    name,
  }
  return helper.call(ctx, ...params, options)
}

function renderPartial (node, contextStack, dataStack, env) {
  // Render a `{{> partial ...}}` reference.
  //
  // PartialStatement shape: { type, name: { type, parts | value }, params, hash, indent }
  const nameExpr = node.name
  if (!nameExpr) {
    throw new UnsupportedTemplateFeatureError(node)
  }
  // Resolve the partial name.
  //   - If the name is a PathExpression and the resolved value is a non-empty
  //     string, use that (covers dynamic partials and subexpressions wrapped
  //     in PathExpression-like shapes).
  //   - Otherwise fall back to the literal parts joined by '.'. This matches
  //     Handlebars' behaviour for `{{> missing}}` which keeps the original
  //     partial name in the missing-partial error message.
  let shortcut
  if (nameExpr.type === 'PathExpression' && nameExpr.parts) {
    const resolved = resolvePath(nameExpr, contextStack, dataStack)
    if (typeof resolved === 'string' && resolved) {
      shortcut = resolved
    } else {
      shortcut = nameExpr.parts.join('.')
    }
  } else {
    shortcut = evalExpression(nameExpr, contextStack, dataStack, env)
    if (typeof shortcut !== 'string' || !shortcut) {
      // For SubExpression names that evaluated to something non-string, fall
      // back to the literal source for the error message.
      shortcut = nameExpr.original || nameExpr.value || String(shortcut || '')
    }
  }
  if (!shortcut) {
    return '<pre>The partial  could not be found</pre>'
  }
  if (env.partialStack?.includes(shortcut)) {
    return `<pre>Partial recursion detected: ${shortcut}</pre>`
  }
  const partial = env.partials?.[shortcut]
  if (!partial) {
    return `<pre>The partial ${shortcut} could not be found</pre>`
  }
  // Build a partial context that matches Handlebars' behavior:
  //   - The first positional param (if any) becomes the primary context for
  //     the partial, matching `{{> partial someContext}}` semantics.
  //   - Hash args from the partial call override the positional context.
  //   - The parent context remains reachable through parent traversal.
  const positionalParams = (node.params || []).map((p) => evalExpression(p, contextStack, dataStack, env))
  const hash = evalHash(node.hash, contextStack, dataStack, env)
  let partialContext
  if (positionalParams.length > 0) {
    partialContext = { ...positionalParams[0] }
    for (const [k, v] of Object.entries(hash)) {
      partialContext[k] = v
    }
  } else {
    partialContext = { ...hash }
  }
  // Recursion guard: prevent `{{> a}}{{> a}}...` style cycles.
  env.partialStack = env.partialStack || []
  env.partialStack.push(shortcut)
  try {
    const rendered = env.renderPartialWithContext(partial, partialContext, contextStack, dataStack)
    return rendered
  } finally {
    env.partialStack.pop()
  }
}

function makePartialRenderer (env) {
  // Build the per-env closure that parses (once) and renders a partial body.
  // The parsed AST is memoised in `env.partialAstCache` keyed by body source.
  const cache = env.partialAstCache
  function renderPartialBody (partialBody, partialContext, outerContextStack, outerDataStack) {
    let ast = cache.get(partialBody)
    if (!ast) {
      try {
        ast = env.parse(partialBody)
      } catch (err) {
        return `<pre>${err.message || err}</pre>`
      }
      cache.set(partialBody, ast)
    }
    // Push the partial context onto the stack so that hash args become the
    // primary context for `{{var}}` lookups, while the outer context remains
    // reachable through parent traversal (`..`).
    outerContextStack.push(partialContext)
    outerDataStack.push(outerDataStack[outerDataStack.length - 1])
    try {
      return renderProgram(ast, outerContextStack, outerDataStack, env)
    } finally {
      outerContextStack.pop()
      outerDataStack.pop()
    }
  }
  return renderPartialBody
}

// ---------------------------------------------------------------------------
// Environment / entry point
// ---------------------------------------------------------------------------

function makeEnv (partials = [], parse = defaultParse) {
  // Build the per-render environment. Holds:
  //   - `helpers`     : the shared Briskine helper registry.
  //   - `partials`    : map of shortcut -> body string, populated from the
  //                     caller's `partials` argument (the list of available
  //                     Briskine templates).
  //   - `partialStack`: recursion guard for partial rendering.
  //   - `partialAstCache`: memoises parsed partial ASTs by body string.
  //   - `parse`       : the Handlebars `parse` function used to parse
  //                     partial bodies lazily on first render.
  //   - `renderPartial*`: closures that render a partial body within the
  //                     caller's context stack.
  const env = {
    helpers: sharedHelpers,
    partials: {},
    partialStack: [],
    parse,
    renderPartial: null,
    renderPartialWithContext: null,
    partialAstCache: new Map(),
  }
  for (const p of partials || []) {
    if (p?.shortcut) {
      env.partials[p.shortcut] = p.body || ''
    }
  }
  const renderBody = makePartialRenderer(env)
  env.renderPartial = renderBody
  env.renderPartialWithContext = function (partialBody, partialContext, outerContextStack, outerDataStack) {
    return renderBody(partialBody, partialContext, outerContextStack, outerDataStack)
  }
  return env
}

function defaultParse () {
  // The renderer's own parse function is provided by the caller via the
  // `parse` option, since importing handlebars here would be redundant.
  // This default is a placeholder that throws if it's ever reached
  // without a real parser (which would be a programming error).
  throw new Error('defaultParse called; pass the handlebars `parse` function into renderTemplateAst')
}

function buildDataFrame (context) {
  // Initial data frame: the user-provided context is stashed at `.root` so
  // `{{@root.foo}}` resolves correctly inside any nested block.
  return { root: context }
}

/**
 * Render a pre-parsed Handlebars AST against a context.
 *
 * @param {object} ast     - the AST returned by `Handlebars.parse(template)`.
 * @param {object} context - the user template context (eg. `{ to, from, account, ... }`).
 * @param {Array}  partials - list of available Briskine templates
 *                            (`{ shortcut, body }`) used to resolve `{{> ...}}`.
 * @param {object} options
 * @param {function} options.parse - the `Handlebars.parse` function. Required
 *                                   because the renderer needs to parse
 *                                   partial bodies lazily.
 * @returns {string} the rendered template.
 *
 * @throws {UnsupportedTemplateFeatureError} when the template uses an
 *         advanced Handlebars feature (eg. raw blocks, decorators) the
 *         renderer does not support. The caller is expected to fall back
 *         to the legacy sandbox compiler in that case.
 */
export function renderTemplateAst (ast, context = {}, partials = [], options = {}) {
  const parse = options.parse
  if (typeof parse !== 'function') {
    throw new Error('renderTemplateAst requires `options.parse` (the `Handlebars.parse` function)')
  }
  const env = makeEnv(partials, parse)
  const contextStack = [context]
  const dataStack = [buildDataFrame(context)]
  try {
    return renderProgram(ast, contextStack, dataStack, env)
  } catch (err) {
    // Unsupported-feature errors are rethrown so the caller can fall back.
    // Other errors are also rethrown unchanged so they surface with a
    // useful stack in the dev console.
    if (err instanceof UnsupportedTemplateFeatureError) {
      throw err
    }
    throw err
  }
}

export default renderTemplateAst
