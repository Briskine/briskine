import browser from 'webextension-polyfill'

import config from '../config.js'

const saveAsTemplate = 'saveAsTemplate'

function clickContextMenu (info) {
  if (info.menuItemId === saveAsTemplate) {
    const body = encodeURIComponent(info.selectionText)
    browser.tabs.create({
      url: `${config.functionsUrl}/template/new?body=${body}`
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
