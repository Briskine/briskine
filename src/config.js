/* globals ENV, VERSION */
export const version = VERSION

export const websiteUrl = (() => {
  if (ENV === 'production' || ENV === 'staging') {
    return 'https://www.briskine.com'
  }

  return 'http://localhost:8080'
})()

export const functionsUrl = (() => {
  if (ENV === 'staging') {
    return 'https://staging.briskine.com'
  }

  if (ENV === 'production') {
    return 'https://app.briskine.com'
  }

  return 'http://localhost:5000'
})()

export const helpUrl = 'https://help.briskine.com/'
export const dashboardTarget = 'gt-dashboard'

export const eventDestroy = 'briskine-destroy'
export const eventStatus = 'briskine-status'
export const eventShowDialog = 'briskine-dialog'
export const eventInsertTemplate = 'briskine-insert-template'
export const eventToggleBubble = 'briskine-toggle-bubble'
export const eventSiteData = 'briskine-site-data'
export const eventSiteMatches = 'briskine-site-matches'
export const eventFormShow = 'briskine-form-show'
export const eventFormRender = 'briskine-form-render'
export const eventFormClose = 'briskine-form-close'

// tag name prefixes for the custom elements of our own ui
export const dialogTagPrefix = 'b-dialog-'
export const bubbleTagPrefix = 'b-bubble-'
export const formTagPrefix = 'b-form-'
export const hiddenAttribute = 'data-briskine-hidden'
