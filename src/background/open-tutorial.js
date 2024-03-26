/* globals REGISTER_DISABLED */
import browser from 'webextension-polyfill'

import config from '../config.js'

browser.runtime.onInstalled.addListener((details) => {
  if (details.reason !== 'install') {
    return
  }

  // disable the welcome page on Safari,
  if (!REGISTER_DISABLED) {
    // open the getting-started tutorial page on install
    browser.tabs.create({
      url: `${config.functionsUrl}/getting-started`
    })
  }
})
