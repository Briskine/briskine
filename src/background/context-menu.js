/* globals MANIFEST */
import browser from 'webextension-polyfill'
import isEqual from 'lodash.isequal'
import debounce from 'lodash.debounce'

import config from '../config.js'
import {getAccount} from '../store/store-api.js'
import {openPopup} from '../store/open-popup.js'

const saveAsTemplateMenu = 'saveAsTemplate'
const openDialogMenu = 'openDialog'
const signInMenu = 'signIn'

function getSelectedText () {
  return window.getSelection()?.toString?.()
}

function showDialog () {
  const dialogShowEvent = 'briskine-dialog'
  if (document.activeElement) {
    document.activeElement.dispatchEvent(new CustomEvent(dialogShowEvent, {
      bubbles: true,
      composed: true,
    }))
  }
}

async function saveAsTemplateAction (info) {
  let body = info.selectionText
  if (MANIFEST === '3') {
    const activeTab = await browser.tabs.query({active: true})
    const selection = await browser.scripting.executeScript({
      target: {
        tabId: activeTab[0].id,
      },
      func: getSelectedText,
    })
    // replace newlines with brs
    if (selection[0].result) {
      body = selection[0].result.replace(/(?:\r\n|\r|\n)/g, '<br>')
    }
  }

  browser.tabs.create({
    url: `${config.functionsUrl}/template/new?body=${encodeURIComponent(body)}`
  })
}

async function openDialogAction () {
  const activeTab = await browser.tabs.query({active: true})
  await browser.scripting.executeScript({
    target: {
      tabId: activeTab[0].id,
    },
    func: showDialog,
  })
}

async function signInAction () {
  return openPopup()
}

async function clickContextMenu (info) {
  if (info.menuItemId === saveAsTemplateMenu) {
    return saveAsTemplateAction(info)
  }

  if (info.menuItemId === openDialogMenu) {
    return openDialogAction()
  }

  if (info.menuItemId === signInMenu) {
    return signInAction()
  }
}

async function setupContextMenus () {
  if (!browser.contextMenus) {
    return
  }

  await browser.contextMenus.removeAll()

  const parentMenu = 'briskineMenu'
  browser.contextMenus.create({
    contexts: ['all'],
    title: 'Briskine',
    id: parentMenu,
  })

  try {
    // logged-in
    await getAccount()
    browser.contextMenus.create({
      contexts: ['all'],
      title: 'Open Briskine popup',
      id: signInMenu,
      parentId: parentMenu,
    })
  } catch {
    // logged-out
    browser.contextMenus.create({
      contexts: ['all'],
      title: 'Sign in to access your templates',
      id: signInMenu,
      parentId: parentMenu,
    })
  }

  browser.contextMenus.create({
    contexts: ['editable', 'selection'],
    type: 'separator',
    parentId: parentMenu,
    id: 'mainSeparator',
  })

  browser.contextMenus.create({
    contexts: ['selection'],
    title: 'Save "%s" as a template',
    parentId: parentMenu,
    id: saveAsTemplateMenu,
  })

  browser.contextMenus.create({
    contexts: ['editable'],
    title: 'Open Briskine dialog',
    parentId: parentMenu,
    id: openDialogMenu,
  })

  browser.contextMenus.onClicked.addListener(clickContextMenu)
}

browser.runtime.onInstalled.addListener(setupContextMenus)

const debouncedSetupContextMenus = debounce(setupContextMenus, 500)

const watchedKeys = [
  'firebaseUser',
  'templatesOwned',
  'templatesShared',
  'templatesEveryone',
]

function storageChange (changes = {}) {
  const changedItems = Object.keys(changes)
  changedItems.some((item) => {
    if (watchedKeys.includes(item)) {
      const oldValue = changes[item].oldValue
      const newValue = changes[item].newValue
      if (!isEqual(oldValue, newValue)) {
        debouncedSetupContextMenus()
        return true
      }
    }

    return false
  })
}

browser.storage.local.onChanged.addListener(storageChange)

