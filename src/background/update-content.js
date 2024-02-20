/* globals MANIFEST */
import browser from 'webextension-polyfill'

browser.runtime.onInstalled.addListener(async (details) => {
  if (!['update', 'install'].includes(details.reason)) {
    return
  }

  const manifest = browser.runtime.getManifest()
  const contentScripts = manifest.content_scripts[0]
  const scripts = contentScripts.js
  const styles = contentScripts.css

  const tabs = await browser.tabs.query({url: contentScripts.matches})

  for (const tab of tabs) {
    if (MANIFEST === '2') {
      // manifest v2
      for (const file of styles) {
        await browser.tabs.removeCSS(tab.id, {file: file})
        browser.tabs.insertCSS(tab.id, {file: file})
      }

      scripts.forEach((script) => {
        browser.tabs.executeScript(tab.id, {file: script})
      })
    } else {
      // manifest v3
      const cssInjectParams = {
        target: {
          tabId: tab.id,
        },
        files: styles,
      }

      await browser.scripting.removeCSS(cssInjectParams)
      browser.scripting.insertCSS(cssInjectParams)

      browser.scripting.executeScript({
        target: {
          tabId: tab.id,
        },
        files: scripts
      })
    }
  }
})
