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

  await Promise.allSettled(tabs.map(async (tab) => {
    const cssInjectParams = {
      target: {
        tabId: tab.id,
        allFrames: true,
      },
      files: styles,
    }

    await browser.scripting.removeCSS(cssInjectParams)
    await browser.scripting.insertCSS(cssInjectParams)

    await browser.scripting.executeScript({
      target: {
        tabId: tab.id,
      },
      files: scripts
    })

    return true
  }))
})
