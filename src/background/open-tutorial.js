/* globals REGISTER_DISABLED, E2E */
import browser from 'webextension-polyfill'

import config from '../config.js'

browser.runtime.onInstalled.addListener((details) => {
  if (details.reason !== 'install') {
    return
  }

  // disable the welcome page on Safari,
  // and when running e2e tests, as we can't change the active tab.
  if (!REGISTER_DISABLED && !E2E) {
    // open the getting-started tutorial page on install
    browser.tabs.create({
      url: `${config.functionsUrl}/getting-started`
    })
  }
})
