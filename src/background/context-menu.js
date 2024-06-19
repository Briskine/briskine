import browser from 'webextension-polyfill'
import isEqual from 'lodash.isequal'
import debounce from 'lodash.debounce'

import config from '../config.js'
import {getAccount, getTemplates} from '../store/store-api.js'
import {openPopup} from '../store/open-popup.js'

const saveAsTemplateMenu = 'saveAsTemplate'
const openDialogMenu = 'openDialog'
const signInMenu = 'signIn'
const parentMenu = 'briskineMenu'
const separatorMenu = 'mainSeparator'

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
  const selected = templates.find((t) => t.id === info.menuItemId)
  return insertTemplateAction(info, tab, selected)
}

async function setupContextMenus () {
  await browser.contextMenus.removeAll()

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
    id: separatorMenu,
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

  const insertTemplatesMenu = 'insertTemplates'
  browser.contextMenus.create({
    contexts: ['editable'],
    documentUrlPatterns: documentUrlPatterns,
    title: 'Insert template',
    parentId: parentMenu,
    id: insertTemplatesMenu,
  })

  // TODO sort like dialog
  const templates = await getTemplates()
  templates.forEach((template) => {
    browser.contextMenus.create({
      contexts: ['editable'],
      documentUrlPatterns: documentUrlPatterns,
      title: `${template.title} ${template.shortcut ? `(${template.shortcut})` : ''}`,
      parentId: insertTemplatesMenu,
      id: template.id,
    })
  })
}

browser.runtime.onInstalled.addListener(setupContextMenus)
browser.contextMenus.onClicked.addListener(clickContextMenu)

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
