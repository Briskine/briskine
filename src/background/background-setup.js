/* globals REGISTER_DISABLED, MANIFEST, E2E */
import browser from 'webextension-polyfill'

import Config from '../config.js'
import setupContextMenus from './contextmenus.js'

browser.runtime.onInstalled.addListener((details) => {
  const manifest = browser.runtime.getManifest()

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

  // on install or update
  if (['update', 'install'].includes(details.reason)) {
    // insert the content scripts
    const contentScripts = manifest.content_scripts[0]
    const scripts = contentScripts.js
    const styles = contentScripts.css

    let scriptingNamespace = 'scripting'
    if (MANIFEST === '2') {
      scriptingNamespace = 'tabs'
    }

    browser.tabs.query({
      url: contentScripts.matches
    }).then((tabs) => {
      tabs.forEach((tab) => {
        // remove and insert new content styles
        styles.forEach((file) => {
          browser[scriptingNamespace].removeCSS(tab.id, {file: file}).then(() => {
            browser[scriptingNamespace].insertCSS(tab.id, {file: file})
          })
        })

        // insert new content scripts
        if (MANIFEST === '2') {
          scripts.forEach((script) => {
            browser.tabs.executeScript(tab.id, {file: script})
          })
        } else {
          browser.scripting.executeScript({
            target: {
              tabId: tab.id,
            },
            files: scripts
          })
        }
      })
    })

    // set up the context menus
    setupContextMenus()
  }
})

// set up the context menus when extension starts
setupContextMenus()
