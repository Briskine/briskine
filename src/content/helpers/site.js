/*
 * Site helper
 *
 * {{#site "briskine.com"}}Hi {{to.first_name}}{{else}}Hi there{{/site}}
 * {{#site "briskine.com"}}{{to.email}} / {{../to.email}} / {{@site.url}}{{/site}}
 * {{#site "briskine.com"}}{{@site.domain}}{{@site.path}}{{@site.query}}{{/site}}
 *
 * Switches the block context to the plugin data of another open tab.
 * Renders the else branch only when no tab matched.
 *
 */

import { createFrame } from '../../briskbars/briskbars.js'

import { getSiteContext } from '../site/site-context.js'
import siteFrame from '../site/site-frame.js'
import parseContext from '../utils/parse-context.js'
import cached from '../utils/cached.js'

// a new cache per render, so a second insert gets fresh data
export default function createSite (cache = new Map()) {
  return async function site (...args) {
    const options = args.pop()
    const [pattern = ''] = args

    const context = await cached(cache, pattern, () => getSiteContext(pattern))
    if (!context) {
      return options.inverse(this)
    }

    const frame = createFrame(options.data)
    frame.site = siteFrame(context)

    return options.fn(await parseContext(context.data), {data: frame})
  }
}
