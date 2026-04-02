import browser from 'webextension-polyfill'

import debug from '../debug.js'

browser.runtime.onInstalled.addListener(async (details) => {
  if (!['update', 'install'].includes(details.reason)) {
    return
  }

  const manifest = browser.runtime.getManifest()
  const contentScripts = manifest.content_scripts[0]
  const scripts = contentScripts.js
  const styles = contentScripts.css

  const tabs = await browser.tabs.query({
    url: contentScripts.matches,
    discarded: false,
  })

  const updates = await Promise.allSettled(tabs.map(async (tab) => {
    const target = {
      tabId: tab.id,
      allFrames: true,
    }

    return Promise.allSettled([
      browser.scripting.removeCSS({
        target: target,
        files: styles,
      }),
      browser.scripting.insertCSS({
        target: target,
        files: styles,
      }),
      browser.scripting.executeScript({
        target: target,
        files: scripts,
      })
    ])
  }))

  updates.forEach((c) => {
    if (c.status === 'rejected') {
      debug(['update-content', c, c.reason], 'error')
    }
  })
})
