/* globals MANIFEST, ENV
 */
// Template parsing and rendering entry point.
//
// The flow is:
//   1. `Handlebars.parse(template)` — produces an AST (safe under MV3 CSP).
//   2. `templateFeatures(ast)`     — detects whether the template references
//                                   any `{{> partial}}` so we know whether to
//                                   fetch the user's other templates.
//   3. `parseContext(data)`        — normalises the user-provided context
//                                   (`{to, cc, bcc, from, account}`), merging
//                                   in the account from the store.
//   4. Render the AST:
//      a. On MV2, use the legacy in-page sandbox compile (which doesn't need
//         an iframe because MV2 allows `unsafe-eval` in the content script).
//      b. On MV3, prefer the in-content AST renderer (`render-template-ast`).
//         It works without the manifest sandbox iframe, so it sidesteps the
//         Brave 1.91.171 / Chromium 149 extension-resource regression that
//         broke the iframe handshake.
//      c. If the AST renderer reports an unsupported feature (or any other
//         error), fall back to the manifest sandbox `compileTemplate` which
//         can still use `unsafe-eval`.
//      d. If the sandbox itself fails (eg. unreachable iframe in some
//         Chromium 149 builds), return the raw template body so the user
//         at least sees something render.

import {parse} from 'handlebars'

import {compileTemplate} from '../sandbox/sandbox-parent.js'
import createContact from './create-contact.js'
import templateFeatures from './template-features.js'
import renderTemplateAst, { UnsupportedTemplateFeatureError } from './render-template-ast.js'
import {getAccount as storeGetAccount, getTemplates} from  '../../store/store-content.js'

let compileTemplateLegacy = async () => {}
if (MANIFEST === '2') {
  const sandbox = await import(
    /* webpackMode: "eager" */
    '../sandbox/sandbox.js'
  )
  compileTemplateLegacy = sandbox.compileTemplate
}

function mergeContacts (a = {}, b = {}) {
  const merged = {}
  Object.keys(createContact()).forEach((p) => merged[p] = b[p] || a[p] || '')
  return merged
}

async function getAccount (contextAccount = {}) {
  let accountCache = {}
  try {
    const storeAccount = await storeGetAccount()
    // map response to contact format
    accountCache = {
      name: storeAccount.full_name,
      email: storeAccount.email,
    }
  } catch {
    // logged-out
  }

  return mergeContacts(accountCache, contextAccount)
}

// return array of contacts, with the first contact exposed directly on the array.
// to.first_name and to.0.first_name will both work,
// but looping will only return array index items.
function contactsArray (contacts = []) {
  const context = []
  if (contacts.length) {
    // make sure each array item is a contact
    contacts.forEach((contact) => context.push(createContact(contact)))

    // expose the first contact's properties on the array
    Object.entries(context[0]).forEach(([key, value]) => context[key] = value)
  }

  return context
}

const contactLists = ['to', 'cc', 'bcc']
async function parseContext (data = {}) {
  const context = structuredClone(data)
  contactLists.forEach((p) => {
    const propData = Array.isArray(context[p] || []) ? context[p] : [context[p]]
    context[p] = contactsArray(propData)
  })

  context.account = createContact(await getAccount(context.account))
  // merge from details with account
  context.from = createContact(mergeContacts(context.account, context.from))

  return context
}

export default async function parseTemplate (template = '', data = {}) {
  let ast
  try {
    ast = parse(template)
  } catch (err) {
    // catch syntax errors
    return `<pre>${err.message || err}</pre>`
  }

  const features = templateFeatures(ast)
  const context = await parseContext(data)
  let partials = []
  if (features.partials) {
    const templates = await getTemplates()
    partials = templates
      .filter((t) => t.shortcut?.trim?.() && t.body !== template)
      .map((t) => ({ shortcut: t.shortcut, body: t.body }))
  }

  try {
    if (MANIFEST === '2') {
      // MV2: `unsafe-eval` is allowed in the content script, so we can use
      // the in-page sandbox compile directly. No iframe handshake needed.
      return await compileTemplateLegacy(ast, context, partials)
    }

    // MV3: prefer the in-content AST renderer. It runs in the content script
    // isolated world, so it works even when the MV3 extension sandbox iframe
    // handshake is blocked (eg. Brave 1.91.171 / Chromium 149). The
    // renderer covers the common subset of Handlebars used by Briskine
    // templates; templates that use advanced features (eg. raw blocks,
    // decorators) fall back to the sandbox compiler below.
    try {
      return renderTemplateAst(ast, context, partials, {parse})
    } catch (astErr) {
      if (astErr instanceof UnsupportedTemplateFeatureError) {
        // The template uses a Handlebars feature the AST renderer does not
        // support yet — try the sandbox compiler which has the full
        // Handlebars feature set.
        if (ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn('[Briskine] AST renderer unsupported, falling back to sandbox:', astErr.message)
        }
      } else {
        // For any other AST error (missing helper, runtime error, etc.) the
        // sandbox compiler may produce a better message (eg. `<pre>Missing
        // helper: "x"</pre>`). Record a dev-only warning and try the
        // sandbox; if the sandbox itself fails, the outer catch returns
        // the raw body.
        if (ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn('[Briskine] AST renderer error, falling back to sandbox:', astErr.message)
        }
      }
    }

    // Fallback: legacy MV3 sandbox compile (uses `unsafe-eval` in the
    // extension sandbox page). Talks to the iframe over `postMessage`.
    return await compileTemplate(ast, context, partials)
  } catch (err) {
    // Both the AST renderer and the sandbox failed. The most common cause
    // is that the sandbox iframe never loaded (eg. Brave/Chromium 149
    // cannot load the extension sandbox iframe). Return the raw template
    // body so the user at least sees something render — variables will
    // appear as raw `{{...}}` text, which is preferable to silently
    // dropping the insert.
    // eslint-disable-next-line no-console
    console.warn('[Briskine] template compilation failed, returning raw body:', err.message || err)
    return template
  }
}
