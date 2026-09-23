/*
 * eachSite helper
 *
 * {{#eachSite "briskine.com"}}{{css ".person"}} - {{@site.title}}{{else}}no tabs{{/eachSite}}
 *
 * Renders the block once for every open tab that matches, in tab strip order,
 * each with that tab's plugin data and @site, the same way {{#site}} does.
 * Renders the else branch only when no tab matched.
 *
 */

import { createFrame } from '../../briskbars/briskbars.js'

import { getSiteContexts } from '../site/site-context.js'
import parseContext from '../utils/parse-context.js'
import cached from '../utils/cached.js'

// a new cache per render, so a second insert gets fresh data
export default function createEachSite (cache = new Map()) {
  return async function eachSite (...args) {
    const options = args.pop()
    const [pattern = ''] = args

    const contexts = await cached(cache, pattern, () => getSiteContexts(pattern))
    if (!contexts.length) {
      return options.inverse(this)
    }

    let output = ''
    for (const context of contexts) {
      const frame = createFrame(options.data)
      // nested helpers read the tab from here
      frame.site = {
        tabId: context.tabId,
        url: context.url,
        title: context.title,
      }

      output += await options.fn(await parseContext(context.data), {data: frame})
    }

    return output
  }
}
