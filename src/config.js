/* globals ENV, VERSION */
var Config = {
  version: VERSION,
  websiteUrl: 'http://localhost:4000',
  functionsUrl: 'http://localhost:5000',
  dashboardTarget: 'gt-dashboard',

  eventDestroy: 'briskine-destroy',
  eventPage: 'briskine-page',
  eventStatus: 'briskine-status',
  eventSandboxCompile: 'briskine-template-compile',
}

// firebase staging
if (ENV === 'staging') {
  Config = Object.assign(Config, {
    functionsUrl: 'https://staging.briskine.com'
  })
}

if (ENV === 'production') {
  Config = Object.assign(Config, {
    websiteUrl: 'https://www.briskine.com',
    functionsUrl: 'https://app.briskine.com'
  })
}

export default Config
