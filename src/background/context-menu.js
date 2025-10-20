import browser from 'webextension-polyfill'
import isEqual from 'lodash.isequal'
import debounce from 'lodash.debounce'

import config from '../config.js'
import {getAccount, getTemplates, getExtensionData, setExtensionData} from '../store/store-api.js'
import sortTemplates from '../store/sort-templates.js'
import {openPopup} from '../store/open-popup.js'
import {isBlocklisted} from '../content/blocklist.js'
import {getSettings} from '../store/store-api.js'

const saveAsTemplateMenu = 'saveAsTemplate'
const openDialogMenu = 'openDialog'
const signInMenu = 'signIn'
const parentMenu = 'briskineMenu'
const separatorMenu = 'mainSeparator'
const insertTemplatesMenu = 'insertTemplates'
const toggleBubbleMenu = 'toggleBubble'

const templatesLimit = 30
// context menus will show up on blocklisted sites as well
const documentUrlPatterns = [
  'https://*/*',
  'http://*/*',
]
let settingsCache = {}

function getSelectedText () {
  return window.getSelection()?.toString?.()
}

function showDialog (eventShowDialog) {
  // TODO won't work in shadow dom
  if (document.activeElement) {
    document.activeElement.dispatchEvent(new CustomEvent(eventShowDialog, {
      bubbles: true,
      composed: true,
    }))
  }
}

function insertTemplate (eventInsertTemplate, template) {
  // TODO won't work in shadow dom
  if (document.activeElement) {
    document.activeElement.dispatchEvent(new CustomEvent(eventInsertTemplate, {
      bubbles: true,
      composed: true,
      detail: template,
    }))
  }
}

function toggleBubble (eventToggleBubble, enable) {
  // TODO won't work in shadow dom
  document.activeElement.dispatchEvent(new CustomEvent(eventToggleBubble, {
    bubbles: true,
    composed: true,
    detail: enable,
  }))
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

async function toggleBubbleAction(info, tab) {
  const { hostname } = URL.parse(tab.url)
  if (!hostname)
    return

  const extensionData = await getExtensionData()
  const { bubbleAllowlist = [] } = extensionData
  const { checked } = info

  let enableBubble = false
  if (checked && !bubbleAllowlist.includes(hostname)) {
    bubbleAllowlist.push(hostname)
    enableBubble = true
  } else
  if (!checked && bubbleAllowlist.includes(hostname)) {
    bubbleAllowlist.splice(bubbleAllowlist.indexOf(hostname), 1)
  } else {
    return false
  }

  await setExtensionData({
    bubbleAllowlist: bubbleAllowlist,
  })

  await executeScript({
    info: info,
    tab: tab,
    func: toggleBubble,
    args: [config.eventToggleBubble, enableBubble],
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

  if (info.menuItemId == toggleBubbleMenu) {
    return toggleBubbleAction(info, tab)
  }

  // insert template
  const templates = await getTemplates()

  // BUG WORKAROUND
  // Safari turns id="3" into id=3 (Number), even if the id is a string (e.g., for the default templates).
  // even if we force the menuItem to String(id), the menuItemId still gets converted to a number.
  const menuItemId = String(info.menuItemId)
  const selected = templates.find((t) => t.id === menuItemId)

  // BUG WORKAROUND
  // Safari will throw an error about the template being non JSON-serializable if it contains dates.
  const cleanTemplate = {
    ...selected,
    created_datetime: null,
    modified_datetime: null,
  }

  return insertTemplateAction(info, tab, cleanTemplate)
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

  menus.push({
    contexts: ['all'],
    title: 'show bubble on this site',
    documentUrlPatterns: documentUrlPatterns,
    type: 'checkbox',
    id: toggleBubbleMenu,
    parentId: parentMenu,
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

function isOnPredefinedLocation (hostname) {
  const urls = [
    'mail.google.com',
    'www.linkedin.com',
    'outlook.live.com',
    'outlook.office365.com',
  ]

  return (
      urls.some((url) => hostname === url)
  )
}

async function enableBubbleForHostname(urlString) {
  const { hostname } = URL.parse(urlString)
  if (!hostname)
    return

  if (!settingsCache.length) {
    const settings = await getSettings()
    settingsCache = Object.assign({}, settings)
  }

  if (isBlocklisted(settingsCache, urlString)) {
    browser.contextMenus.update(
      toggleBubbleMenu,
      {
        checked: false,
        enabled: false
      }
    )

    return
  }

  if (isOnPredefinedLocation(hostname)) {
    browser.contextMenus.update(
      toggleBubbleMenu,
      {
        checked: true,
        enabled: false
      }
    )

    return
  }

  const extensionData = await getExtensionData()
  const { bubbleAllowlist = [] } = extensionData
  const bubbleActive = bubbleAllowlist.includes(hostname)

  browser.contextMenus.update(
    toggleBubbleMenu,
    {
      checked: bubbleActive,
      enabled: true
    }
  )
}

async function onTabSwitchHandler() {
  const [tab] = await browser.tabs.query({active: true, lastFocusedWindow: true})

  enableBubbleForHostname(tab.url)
}

async function onTabUpdatehHandler(tabId, changeInfo, tab) {
  if (!changeInfo.status === 'complete')
    return

  enableBubbleForHostname(tab.url)
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
  browser.tabs.onActivated.addListener(onTabSwitchHandler)
  browser.tabs.onUpdated.addListener(onTabUpdatehHandler)

  const debouncedStorageChange = debounce(storageChange, 1000)
  browser.storage.local.onChanged.addListener(debouncedStorageChange)
}

enableContextMenu()
