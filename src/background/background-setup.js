import browser from 'webextension-polyfill'

import setupContextMenus from './contextmenus.js'

browser.runtime.onInstalled.addListener(() => {
  // set up the context menus
  setupContextMenus()
})

// set up the context menus when extension starts
setupContextMenus()
