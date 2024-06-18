import browser from 'webextension-polyfill'

/* globals MANIFEST */
import config from '../config.js'

const saveAsTemplate = 'saveAsTemplate'

function getSelection () {
  return window.getSelection()?.toString?.()
}

async function clickContextMenu (info) {
  if (info.menuItemId === saveAsTemplate) {
    let body = info.selectionText
    if (MANIFEST === '3') {
      const activeTab = await browser.tabs.query({active: true})
      const selection = await browser.scripting.executeScript({
        target: {
          tabId: activeTab[0].id,
        },
        func: getSelection,
      })
      // replace newlines with brs
      body = selection[0]?.result?.replace?.(/(?:\r\n|\r|\n)/g, '<br>')
    }

    browser.tabs.create({
      url: `${config.functionsUrl}/template/new?body=${encodeURIComponent(body)}`
    })
  }
}

async function setupContextMenus () {
  if (!browser.contextMenus) {
    return
  }

  await browser.contextMenus.removeAll()
  browser.contextMenus.create({
    title: 'Save "%s" as a template',
    contexts: ['selection'],
    id: saveAsTemplate,
  })

  browser.contextMenus.onClicked.addListener(clickContextMenu)
}

browser.runtime.onInstalled.addListener(setupContextMenus)
