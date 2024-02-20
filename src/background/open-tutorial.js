/* globals REGISTER_DISABLED, E2E */
import browser from 'webextension-polyfill'

import Config from '../config.js'
import setupContextMenus from './contextmenus.js'

browser.runtime.onInstalled.addListener((details) => {
  // disable the welcome page on Safari,
  // and when running e2e tests with Cypress, as we can't change the active tab.
  if (!REGISTER_DISABLED && !E2E) {
    // open the welcome page on install
    if (details.reason === 'install') {
      browser.tabs.create({
        url: `${Config.functionsUrl}/getting-started`
      })
    }
  }
})
