import { functionsUrl, dashboardTarget } from '../../config.js'

// the message is inserted in the editor instead of the template
export default class PremiumError extends Error {
  constructor (message = 'This feature is only available for Briskine Premium users.') {
    super(`<div>${message} <a href="${functionsUrl}/subscription/" target="${dashboardTarget}">Upgrade to Premium</a></div>`)
    this.name = 'PremiumError'
  }
}
