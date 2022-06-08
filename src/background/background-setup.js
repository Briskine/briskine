/* globals REGISTER_DISABLED, chrome */
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

    // TODO use browser.scripting when available in webextension-polyfill
    // https://github.com/mozilla/webextension-polyfill/pull/383
    browser.tabs.query({
      url: contentScripts.matches
    }).then((tabs) => {
      tabs.forEach((tab) => {
        // remove and insert new content styles
        styles.forEach((file) => {
          chrome.scripting.removeCSS(tab.id, {file: file}).then(() => {
            chrome.scripting.insertCSS(tab.id, {file: file})
          })
        })

        // insert new content scripts
        // TODO use updateContentScripts
        // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/scripting/updateContentScripts
        chrome.scripting.executeScript({
          target: {
            tabId: tab.id,
          },
          files: scripts
        })
      })
    })

    // set up the context menus
    setupContextMenus()
  }
})

// set up the context menus when extension starts
setupContextMenus()
