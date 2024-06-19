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

async function executeScript (info = {}, tab = {}, func = () => {}) {
  return browser.scripting.executeScript({
    target: {
      tabId: tab.id,
      frameIds: [info.frameId],
    },
    func: func,
  })
}

async function saveAsTemplateAction (info, tab) {
  let body = info.selectionText
  try {
    const selection = await executeScript(info, tab, getSelectedText)
    // replace newlines with brs
    if (selection[0].result) {
      body = selection[0].result.replace(/(?:\r\n|\r|\n)/g, '<br>')
    }
  } catch {
    // can't get multi-line selection
  }

  browser.tabs.create({
    url: `${config.functionsUrl}/template/new?body=${encodeURIComponent(body)}`
  })
}

async function openDialogAction (info, tab) {
  await executeScript(info, tab, showDialog)
}

async function signInAction () {
  return openPopup()
}

async function clickContextMenu (info = {}, tab = {}) {
  if (info.menuItemId === saveAsTemplateMenu) {
    return saveAsTemplateAction(info, tab)
  }

  if (info.menuItemId === openDialogMenu) {
    return openDialogAction(info, tab)
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

  const documentUrlPatterns = [
    'https://*/*',
    'http://*/*',
  ]

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
    documentUrlPatterns: documentUrlPatterns,
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
