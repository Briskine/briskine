import browser from 'webextension-polyfill'
import isEqual from 'lodash.isequal'

import {functionsUrl, eventToggleBubble, eventShowDialog, eventInsertTemplate} from '../config.js'
import {getAccount, getTemplates, getExtensionData, setExtensionData, getSettings} from '../store/store-api.js'
import sortTemplates from '../store/sort-templates.js'
import trigger from './background-trigger.js'
import {openPopup} from '../background/open-popup.js'
import {isBlocklisted} from '../blocklist.js'
import bubbleAllowlistPrivate from '../content/bubble/bubble-allowlist-private.js'
import { eventStatus } from '../config.js'
import debug from '../debug.js'

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

  // truncate for url safety
  body = body?.substring?.(0, 1500)

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

  return trigger(eventToggleBubble, {enabled: enableBubble}, tab, info.frameId)
}

async function clickContextMenu (info = {}, tab = {}) {
  if (info.menuItemId === saveAsTemplateMenu) {
    return saveAsTemplateAction(info, tab)
  }

  if (info.menuItemId === openDialogMenu) {
    return trigger(eventShowDialog, {}, tab, info.frameId)
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

  return trigger(eventInsertTemplate, {template: cleanTemplate}, tab, info.frameId)
}

async function createContextMenus (menus = []) {
  await browser.contextMenus.removeAll()
  return Promise.all(
    menus.map((m) => {
      return new Promise((resolve) => {
        // browser.contextMenus.create does not return a promise,
        // but uses a callback.
        browser.contextMenus.create(m, resolve)
      })
    })
  )
}

function getInsertTemplatesMenu () {
  return {
    contexts: ['editable'],
    documentUrlPatterns: documentUrlPatterns,
    title: 'Insert template',
    parentId: parentMenu,
    id: insertTemplatesMenu,
  }
}

let existingTemplateList = []
async function setupContextMenus () {
  const menus = []

  menus.push({
    contexts: ['all'],
    title: 'Briskine',
    id: parentMenu,
  })

  menus.push({
    contexts: ['all'],
    title: 'Sign in to access your templates',
    id: signInMenu,
    parentId: parentMenu,
  })

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

  menus.push(getInsertTemplatesMenu())

  await createContextMenus(menus)

  updateMenuSignin()
  updateMenuTemplates()
  updateBubbleContextMenu()
}

function updateMenuSignin() {
  getAccount()
    .then(() => {
      browser.contextMenus.update(signInMenu, { title: 'Open Briskine popup' })
    })
    .catch(() => {
      browser.contextMenus.update(signInMenu, { title: 'Sign in to access your templates' })
    })
}

async function updateMenuTemplates () {
  const [allTemplates, extensionData] = await Promise.all([
    getTemplates(),
    getExtensionData()
  ])

  const templates = sortTemplates(allTemplates, extensionData.dialogSort, extensionData.templatesLastUsed)
  const newTemplateList = templates.slice(0, templatesLimit)
  const newTemplateListIds = newTemplateList.map(tpl => tpl.id)

  if (!isEqual(existingTemplateList, newTemplateListIds)) {
    // re-create the parent insert template menu,
    // in case existingTemplateList has been re-initialized on service worker restart
    const parent = getInsertTemplatesMenu()

    // in case the menu isn't ready yet
    try {
      await browser.contextMenus.remove(parent.id)
    } catch (err) {
      debug(['updateMenuTemplates', err], 'warn')
    }

    browser.contextMenus.create(parent, () => {
      // browser.contextMenus.create does not return a promise,
      // but uses a callback.
      newTemplateList.forEach((template) => {
        browser.contextMenus.create({
          contexts: ['editable'],
          documentUrlPatterns: documentUrlPatterns,
          title: `${template.title}${template.shortcut ? ` (${template.shortcut})` : ''}`,
          parentId: parent.id,
          id: template.id,
        })
      })
    })

    existingTemplateList = newTemplateListIds
  }
}

async function updateBubbleContextMenu (pUrlString) {
  let urlString = pUrlString
  if (!urlString) {
    const [tab] = await browser.tabs.query({active: true, lastFocusedWindow: true})
    if (!tab) {
      return
    }
    urlString = tab.url
  }

  const { hostname } = URL.parse(urlString)

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

async function isExtensionResponding (tab) {
  return trigger(eventStatus, {}, tab)
}

async function shouldContextMenuShow (tab) {
  const tabUrl = tab.url
  if (!URL.canParse(tabUrl)) {
    return false
  }

  const settings = await getSettings()
  if (isBlocklisted(settings, tabUrl)) {
    return false
  }

  const isExtensionOn = await isExtensionResponding(tab)
  if (!isExtensionOn) {
    return false
  }

  return true
}

async function onTabSwitchHandler () {
  const [tab] = await browser.tabs.query({active: true, lastFocusedWindow: true})
  if (!tab) {
    return
  }

  if (await shouldContextMenuShow(tab)) {
    browser.contextMenus.update(parentMenu, { visible: true })
    await updateBubbleContextMenu(tab.url)
  } else {
    browser.contextMenus.update(parentMenu, { visible: false })
  }
}

async function onTabUpdateHandler (tabId, changeInfo, tab) {
  if (changeInfo?.status !== 'complete') {
    return
  }

  if (await shouldContextMenuShow(tab)) {
    browser.contextMenus.update(parentMenu, { visible: true })
    await updateBubbleContextMenu(tab.url)
  } else {
    browser.contextMenus.update(parentMenu, { visible: false })
  }
}

function isStorageChanged (changes, ...params) {
  const values = params.map((param => {
    if (Array.isArray(param)) {
      const [mainKey, subKey] = param
      return {
        newValue: changes?.[mainKey]?.newValue?.[subKey],
        oldValue: changes?.[mainKey]?.oldValue?.[subKey],
      }
    } else {
      return changes?.[param]
    }
  }))

  return values.some((val) => (val && !isEqual(val.oldValue, val.newValue)))
}

async function storageChange (changes = {}) {
  if (isStorageChanged(changes,
    'firebaseUser',
    ['briskine', 'lastSync']
  )) {
    updateMenuSignin()
  }

  if (isStorageChanged(changes,
    'templatesOwned',
    'templatesShared',
    'templatesEveryone',
    ['briskine', 'templatesLastUsed']
  )) {
    updateMenuTemplates()
  }

  if (isStorageChanged(changes,
    ['briskine', 'bubbleAllowlist']
  )) {
    updateBubbleContextMenu()
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

  let timer
  let pendingChanges = {}
  function debouncedStorageChange (changes = {}) {
    clearTimeout(timer)

    // merge changes into pending,
    // to avoid losing changes because of debounce.
    for (const [key, value] of Object.entries(changes)) {
      pendingChanges[key] = {
        oldValue: pendingChanges[key]?.oldValue ?? value.oldValue,
        newValue: value.newValue,
      }
    }

    timer = setTimeout(async () => {
      // clone, in case pendingChanges changes while we await
      const pendingChangesClone = { ...pendingChanges }
      pendingChanges = {}

      await storageChange(pendingChangesClone)
    }, 1000)
  }

  browser.storage.local.onChanged.addListener(debouncedStorageChange)
}

enableContextMenu()
