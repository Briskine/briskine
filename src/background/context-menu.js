import browser from 'webextension-polyfill'
import isEqual from 'lodash.isequal'
import debounce from 'lodash.debounce'

import config from '../config.js'
import {getAccount, getTemplates, getExtensionData} from '../store/store-api.js'
import sortTemplates from '../store/sort-templates.js'
import {openPopup} from '../store/open-popup.js'

const saveAsTemplateMenu = 'saveAsTemplate'
const openDialogMenu = 'openDialog'
const signInMenu = 'signIn'
const parentMenu = 'briskineMenu'
const separatorMenu = 'mainSeparator'
const insertTemplatesMenu = 'insertTemplates'

const templatesLimit = 30
// context menus will show up on blocklisted sites as well
const documentUrlPatterns = [
  'https://*/*',
  'http://*/*',
]

function getSelectedText () {
  return window.getSelection()?.toString?.()
}

function showDialog (eventShowDialog) {
  if (document.activeElement) {
    document.activeElement.dispatchEvent(new CustomEvent(eventShowDialog, {
      bubbles: true,
      composed: true,
    }))
  }
}

function insertTemplate (eventInsertTemplate, template) {
  if (document.activeElement) {
    document.activeElement.dispatchEvent(new CustomEvent(eventInsertTemplate, {
      bubbles: true,
      composed: true,
      detail: template,
    }))
  }
}

async function executeScript ({ info = {}, tab = {}, args = [], func = () => {} }) {
  return browser.scripting.executeScript({
    target: {
      tabId: tab.id,
      frameIds: [info.frameId],
    },
    func: func,
    args: args,
  })
}

async function saveAsTemplateAction (info, tab) {
  let body = info.selectionText
  try {
    const selection = await executeScript({
      info: info,
      tab: tab,
      func: getSelectedText,
    })
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
  await executeScript({
    info: info,
    tab: tab,
    func: showDialog,
    args: [config.eventShowDialog],
  })
}

async function signInAction () {
  return openPopup()
}

function insertTemplateAction (info, tab, template) {
  return executeScript({
    info: info,
    tab: tab,
    func: insertTemplate,
    args: [config.eventInsertTemplate, template],
  })
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

  // insert template
  const templates = await getTemplates()
  // BUG WORKAROUND
  // Safari turns id="3" into id=3 (Number), even if the id is a string (e.g., for the default templates).
  // even if we force the menuItem to String(id), the menuItemId still gets converted to a number.
  const menuItemId = String(info.menuItemId)
  const selected = templates.find((t) => t.id === menuItemId)
  return insertTemplateAction(info, tab, selected)
}

async function createContextMenus (menus = []) {
  await browser.contextMenus.removeAll()
  menus.forEach((m) => {
    browser.contextMenus.create(m)
  })
}

let existingMenus = []
async function setupContextMenus () {
  let signedIn = false
  try {
    await getAccount()
    signedIn = true
  } catch {
    // logged-out
  }

  // same sorting and rendering settings like the dialog
  const allTemplates = await getTemplates()
  const extensionData = await getExtensionData()
  const templates = sortTemplates(allTemplates, extensionData.dialogSort, extensionData.templatesLastUsed)

  const menus = []

  menus.push({
    contexts: ['all'],
    title: 'Briskine',
    id: parentMenu,
  })

  if (signedIn) {
    menus.push({
      contexts: ['all'],
      title: 'Open Briskine popup',
      id: signInMenu,
      parentId: parentMenu,
    })
  } else {
    menus.push({
      contexts: ['all'],
      title: 'Sign in to access your templates',
      id: signInMenu,
      parentId: parentMenu,
    })
  }

  menus.push({
    contexts: ['editable', 'selection'],
    type: 'separator',
    parentId: parentMenu,
    id: separatorMenu,
  })

  menus.push({
    contexts: ['selection'],
    title: 'Save "%s" as a template',
    parentId: parentMenu,
    id: saveAsTemplateMenu,
  })

  menus.push({
    contexts: ['editable'],
    documentUrlPatterns: documentUrlPatterns,
    title: 'Open Briskine dialog',
    parentId: parentMenu,
    id: openDialogMenu,
  })

  menus.push({
    contexts: ['editable'],
    documentUrlPatterns: documentUrlPatterns,
    title: 'Insert template',
    parentId: parentMenu,
    id: insertTemplatesMenu,
  })

  templates.slice(0, templatesLimit).forEach((template) => {
    menus.push({
      contexts: ['editable'],
      documentUrlPatterns: documentUrlPatterns,
      title: `${template.title}${template.shortcut ? ` (${template.shortcut})` : ''}`,
      parentId: insertTemplatesMenu,
      id: template.id,
    })
  })

  if (!isEqual(existingMenus, menus)) {
    existingMenus = menus
    await createContextMenus(menus)
  }
}

const watchedKeys = [
  'briskine',
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
        setupContextMenus()
        return true
      }
    }

    return false
  })
}

function enableContextMenu () {
  // context menus are not available on Firefox for Android
  if (!browser.contextMenus) {
    return
  }

  browser.runtime.onInstalled.addListener(setupContextMenus)
  browser.contextMenus.onClicked.addListener(clickContextMenu)

  const debouncedStorageChange = debounce(storageChange, 1000)
  browser.storage.local.onChanged.addListener(debouncedStorageChange)
}

enableContextMenu()
