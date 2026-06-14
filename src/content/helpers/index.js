// Shared Handlebars helper registry.
//
// Both the in-content AST renderer (`src/content/utils/render-template-ast.js`)
// and the sandbox Handlebars compiler (`src/content/sandbox/sandbox.js`) use
// this same map so that, for any given template, both code paths produce the
// same output. This is what lets the AST renderer be a drop-in first choice
// for `parse-template.js`, with the sandbox only invoked as a fallback for
// templates that use a Handlebars feature the AST renderer does not yet
// support.
//
// Adding a new Briskine helper means importing the function here and adding
// it to the `sharedHelpers` map below; both compilation paths pick it up
// automatically.

import moment from './moment.js'
import domain from './domain.js'
import text from './text.js'
import list from './list.js'
import {capitalize, capitalizeAll} from './capitalize.js'
import or from './or.js'
import and from './and.js'
import compare from './compare.js'
import random from './random.js'
import cursor from './cursor.js'

// legacy choice helper (deprecated, kept for backwards compatibility)
import choice from './choice.js'

export const sharedHelpers = {
  // legacy
  choice,

  and,
  moment,
  domain,
  text,
  list,
  capitalize,
  capitalizeAll,
  or,
  compare,
  random,
  cursor,
}

export default sharedHelpers
