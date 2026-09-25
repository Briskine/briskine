/*
 * eachSite helper
 *
 * {{#eachSite "briskine.com"}}{{css ".person"}} - {{@site.title}}{{else}}no tabs{{/eachSite}}
 * {{#eachSite "briskine.com"}}{{#unless @first}}, {{/unless}}{{@site.title}}{{/eachSite}}
 *
 * Renders the block once for every open tab that matches, in tab strip order,
 * each with that tab's plugin data and @site, the same way {{#site}} does,
 * and @index, @first and @last, the same way {{#each}} does.
 * Renders the else branch only when no tab matched.
 *
 */

import { createFrame } from '../../briskbars/briskbars.js'

import { getSiteContexts } from '../site/site-context.js'
import siteFrame from '../site/site-frame.js'
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
    for (const [index, context] of contexts.entries()) {
      const frame = createFrame(options.data)
      frame.index = index
      frame.first = index === 0
      frame.last = index === contexts.length - 1
      frame.site = siteFrame(context)

      output += await options.fn(await parseContext(context.data), {data: frame})
    }

    return output
  }
}
