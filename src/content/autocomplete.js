/*
 * Generic methods for autocompletion
 */

import {register, run as runPlugins} from './plugin.js'
import gmailPlugin from './plugins/gmail.js'
import gmailMobilePlugin from './plugins/gmail-mobile.js'
import linkedinPlugin from './plugins/linkedin.js'
import linkedinSalesNavigatorPlugin from './plugins/linkedin-sales-navigator.js'
import outlookPlugin from './plugins/outlook.js'
import facebookPlugin from './plugins/facebook.js'
import universalPlugin from './plugins/universal.js'

import {updateTemplateStats} from '../store/store-content.js'

// register plugins,
// in execution order.
register(gmailPlugin)
register(gmailMobilePlugin)
register(linkedinPlugin)
register(linkedinSalesNavigatorPlugin)
register(outlookPlugin)
register(facebookPlugin)
register(universalPlugin)

// TODO export default
export async function autocomplete (params) {
  await runPlugins(Object.assign({}, params))
  await updateTemplateStats(params.template)
  return params
}
