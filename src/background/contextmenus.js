import browser from 'webextension-polyfill'

import Config from '../config.js'

const saveAsTemplate = 'saveAsTemplate'

function clickContextMenu (info) {
  if (info.menuItemId === saveAsTemplate) {
    const body = encodeURIComponent(info.selectionText)
    browser.tabs.create({
      url: `${Config.functionsUrl}/template/new?body=${body}`
    })
  }
}

export default function setupContextMenus () {
  if (typeof browser.contextMenus === 'undefined') {
    return
  }

  browser.contextMenus.removeAll()
    .then(() => {
      browser.contextMenus.create({
        title: 'Save "%s" as a template',
        contexts: ['selection'],
        id: saveAsTemplate
      })

      browser.contextMenus.onClicked.addListener(clickContextMenu)
    })
}
