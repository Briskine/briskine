/* globals REGISTER_DISABLED */
import browser from 'webextension-polyfill'

import Config from '../config.js'
import setupContextMenus from './contextmenus.js'

browser.runtime.onInstalled.addListener((details) => {
  const manifest = browser.runtime.getManifest()

  // open the welcome page on install
  if (!REGISTER_DISABLED) {
    if (details.reason === 'install') {
      browser.tabs.create({
        url: `${Config.functionsUrl}/getting-started`
      })
    }
  }

  // on install or update
  if (['update', 'install'].includes(details.reason)) {
    // insert the content scripts
    const contentScripts = manifest.content_scripts[0]
    const scripts = contentScripts.js
    const styles = contentScripts.css

    browser.tabs.query({
      url: contentScripts.matches
    }).then((tabs) => {
      tabs.forEach((tab) => {
        // remove and insert new content styles
        styles.forEach((file) => {
          browser.tabs.removeCSS(tab.id, {file: file}).then(() => {
            browser.tabs.insertCSS(tab.id, {file: file})
          })
        })

        // insert new content scripts
        scripts.forEach((file) => {
          browser.tabs.executeScript(tab.id, {file: file})
        })
      })
    })

    // set up the context menus
    setupContextMenus()
  }
})

// set up the context menus when extension starts
setupContextMenus()
