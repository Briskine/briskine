import browser from 'webextension-polyfill'
import isEqual from 'lodash.isequal'
import debounce from 'lodash.debounce'

import {functionsUrl, eventToggleBubble, eventShowDialog, eventInsertTemplate} from '../config.js'
import {getAccount, getTemplates, getExtensionData, setExtensionData, getSettings} from '../store/store-api.js'
import sortTemplates from '../store/sort-templates.js'
import trigger from './background-trigger.js'
import {openPopup} from '../background/open-popup.js'
import {isBlocklisted} from '../content/blocklist.js'
import bubbleAllowlistPrivate from '../content/bubble/bubble-allowlist-private.js'

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
  '<all_urls>',
]

function getSelectedText () {
  return window.getSelection()?.toString?.()
}

async function saveAsTemplateAction (info, tab) {
  let body = info.selectionText
  try {
    // executeScript workaround is required because of Chrome bug
    // https://issues.chromium.org/issues/40740672
    const selection = await browser.scripting.executeScript({
      target: {
        tabId: tab.id,
        frameIds: [info.frameId],
      },
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
    url: `${functionsUrl}/template/new?body=${encodeURIComponent(body)}`
  })
}

async function signInAction () {
  return openPopup()
}

async function toggleBubbleAction (info, tab) {
  if (!URL.canParse(tab.url)) {
    return
  }

  const { hostname } = URL.parse(tab.url)

  const extensionData = await getExtensionData()
  const { bubbleAllowlist = [] } = extensionData
  const { checked } = info

  let enableBubble = false
  if (checked && !bubbleAllowlist.includes(hostname)) {
    bubbleAllowlist.push(hostname)
    enableBubble = true
  } else if (!checked && bubbleAllowlist.includes(hostname)) {
    bubbleAllowlist.splice(bubbleAllowlist.indexOf(hostname), 1)
  } else {
    return false
  }

  await setExtensionData({
    bubbleAllowlist: bubbleAllowlist,
  })

  return trigger(eventToggleBubble, {enabled: enableBubble}, tab.id, info.frameId)
}

async function clickContextMenu (info = {}, tab = {}) {
  if (info.menuItemId === saveAsTemplateMenu) {
    return saveAsTemplateAction(info, tab)
  }

  if (info.menuItemId === openDialogMenu) {
    return trigger(eventShowDialog, {}, tab.id, info.frameId)
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

  return trigger(eventInsertTemplate, {template: cleanTemplate}, tab.id, info.frameId)
}

async function createContextMenus (menus = []) {
  await browser.contextMenus.removeAll()
  await Promise.all(menus.map((m) => browser.contextMenus.create(m)))
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
    contexts: ['all'],
    title: 'Show bubble on this site',
    documentUrlPatterns: documentUrlPatterns,
    type: 'checkbox',
    id: toggleBubbleMenu,
    parentId: parentMenu,
  })

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

async function updateBubbleContextMenu (urlString) {
  if (!URL.canParse(urlString)) {
    return
  }

  const { hostname } = URL.parse(urlString)

  const settings = await getSettings()
  if (isBlocklisted(settings, urlString)) {
    return browser.contextMenus.update(
      toggleBubbleMenu,
      {
        checked: false,
        enabled: false
      }
    )
  }

  if (bubbleAllowlistPrivate(hostname)) {
    return browser.contextMenus.update(
      toggleBubbleMenu,
      {
        checked: true,
        enabled: false
      }
    )
  }

  const extensionData = await getExtensionData()
  const { bubbleAllowlist = [] } = extensionData
  const bubbleActive = bubbleAllowlist.includes(hostname)

  return browser.contextMenus.update(
    toggleBubbleMenu,
    {
      checked: bubbleActive,
      enabled: true
    }
  )
}

async function onTabSwitchHandler () {
  const [tab] = await browser.tabs.query({active: true, lastFocusedWindow: true})

  await updateBubbleContextMenu(tab.url)
}

async function onTabUpdateHandler (tabId, changeInfo, tab) {
  if (changeInfo?.status !== 'complete') {
    return
  }

  await updateBubbleContextMenu(tab.url)
}

const watchedKeys = [
  'briskine',
  'firebaseUser',
  'templatesOwned',
  'templatesShared',
  'templatesEveryone',
]

async function storageChange (changes = {}) {
  const changedItems = Object.keys(changes)
  const diff = changedItems.some((item) => {
    if (watchedKeys.includes(item)) {
      const oldValue = changes[item].oldValue
      const newValue = changes[item].newValue
      if (!isEqual(oldValue, newValue)) {
        return true
      }
    }

    return false
  })

  if (diff) {
    await setupContextMenus()
  }
}

function enableContextMenu () {
  // context menus are not available on Firefox for Android
  if (!browser.contextMenus) {
    return
  }

  browser.runtime.onInstalled.addListener(setupContextMenus)
  browser.contextMenus.onClicked.addListener(clickContextMenu)
  browser.tabs.onActivated.addListener(onTabSwitchHandler)
  browser.tabs.onUpdated.addListener(onTabUpdateHandler)

  const debouncedStorageChange = debounce(storageChange, 1000)
  browser.storage.local.onChanged.addListener(debouncedStorageChange)
}

enableContextMenu()
