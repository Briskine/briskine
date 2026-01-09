/* globals ENV, VERSION */
export const version = VERSION

export const websiteUrl = (() => {
  if (ENV === 'production') {
    return 'https://www.briskine.com'
  }

  return 'http://localhost:4000'
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
export const eventSandboxCompile = 'briskine-template-compile'
export const eventShowDialog = 'briskine-dialog'
export const eventInsertTemplate = 'briskine-insert-template'
export const eventToggleBubble = 'briskine-toggle-bubble'
