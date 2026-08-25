import browser from 'webextension-polyfill'
import { isEqual } from 'es-toolkit'

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
const openSidebar = 'openSidebar'
const signInMenu = 'signIn'
const parentMenu = 'briskineMenu'
const separatorMenu = 'mainSeparator'
const insertTemplatesMenu = 'insertTemplates'
const toggleBubbleMenu = 'toggleBubble'
const templateSlotPrefix = 'template-'

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

  return browser.tabs.create({
    url: `${functionsUrl}/template/new?body=${encodeURIComponent(body)}`
  })
}

async function signInAction () {
  return openPopup()
}

async function toggleBubbleAction (info, tab) {
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

  if (info.menuItemId === openSidebar) {
    if (browser.sidePanel) {
      await browser.sidePanel.open({ tabId: tab.id })
    }

    if (browser.sidebarAction) {
      await browser.sidebarAction.open()
    }

    return
  }

  if (info.menuItemId === signInMenu) {
    return signInAction()
  }

  if (info.menuItemId === toggleBubbleMenu) {
    return toggleBubbleAction(info, tab)
  }

  // insert template
  const slot = Number(String(info.menuItemId).replace(templateSlotPrefix, ''))
  // templateSlots is empty after a background restart, derive the same list again
  const templates = await getTemplates()
  const templateId = templateSlots[slot] ?? (await getMenuTemplates(templates))[slot]?.id
  const selected = templates.find((t) => t.id === templateId)
  if (!selected) {
    return
  }

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

async function updateMenu (id, state) {
  // the menus might not be created yet
  try {
    await browser.contextMenus.update(id, state)
  } catch (err) {
    debug(['updateMenu', id, err], 'warn')
  }
}

function getTemplateSlotId (index) {
  return `${templateSlotPrefix}${index}`
}

// deterministic, so a slot can be mapped back to a template when it's clicked
async function getMenuTemplates (templates = []) {
  const extensionData = await getExtensionData()

  return sortTemplates(templates, extensionData.dialogSort, extensionData.templatesLastUsed)
    .slice(0, templatesLimit)
}

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

  if (browser.sidePanel || browser.sidebarAction) {
    menus.push({
      contexts: ['all'],
      documentUrlPatterns: documentUrlPatterns,
      title: 'Open sidebar',
      parentId: parentMenu,
      id: openSidebar,
    })
  }

  menus.push({
    contexts: ['editable'],
    documentUrlPatterns: documentUrlPatterns,
    title: 'Insert template',
    parentId: parentMenu,
    id: insertTemplatesMenu,
  })

  // fixed pool of template menus, created once and only updated afterwards.
  // re-creating them duplicates the menus on Safari, which doesn't reject duplicate ids.
  for (let index = 0; index < templatesLimit; index++) {
    menus.push({
      contexts: ['editable'],
      documentUrlPatterns: documentUrlPatterns,
      title: '…',
      parentId: insertTemplatesMenu,
      id: getTemplateSlotId(index),
      visible: false,
    })
  }

  await createContextMenus(menus)

  updateMenuSignin()
  updateMenuTemplates()

  const [tab] = await browser.tabs.query({active: true, lastFocusedWindow: true})
  if (tab) {
    await toggleContextMenu(tab)
  }
}

async function toggleContextMenu (tab) {
  if (!await shouldContextMenuShow(tab)) {
    return updateMenu(parentMenu, { visible: false })
  }

  // the bubble menu state is independent, it shouldn't block the parent menu
  return Promise.all([
    updateBubbleContextMenu(tab),
    updateMenu(parentMenu, { visible: true }),
  ])
}

async function updateMenuSignin() {
  try {
    await getAccount()
  } catch {
    return updateMenu(signInMenu, { title: 'Sign in to access your templates' })
  }

  return updateMenu(signInMenu, { title: 'Open Briskine popup' })
}

// slot index to template id, only used to resolve clicks
let templateSlots = []
async function updateMenuTemplates () {
  // called without awaiting, keep the templates we already have on failure
  let templates
  try {
    templates = await getMenuTemplates(await getTemplates())
  } catch (err) {
    debug(['updateMenuTemplates', err], 'warn')
    return
  }

  templateSlots = templates.map((template) => template.id)

  return Promise.all(
    Array.from({length: templatesLimit}, (item, index) => {
      const template = templates[index]
      const state = template ? {
        title: `${template.title}${template.shortcut ? ` (${template.shortcut})` : ''}`,
        visible: true,
      } : {
        visible: false,
      }

      return updateMenu(getTemplateSlotId(index), state)
    })
  )
}

async function updateBubbleContextMenu (tab) {
  // tabs.query returns no tabs when the popup has focus
  if (!tab) {
    return
  }

  let state = {
    checked: false,
    enabled: false,
    visible: false,
  }

  if (URL.canParse(tab.url)) {
    state.visible = true

    const { hostname } = URL.parse(tab.url)

    if (bubbleAllowlistPrivate(hostname)) {
      state.checked = true
    } else {
      const extensionData = await getExtensionData()
      const { bubbleAllowlist = [] } = extensionData
      const bubbleActive = bubbleAllowlist.includes(hostname)
      state.checked = bubbleActive
      state.enabled = true
    }
  }

  return updateMenu(toggleBubbleMenu, state)
}

async function isExtensionResponding (tab) {
  const res = await trigger(eventStatus, {}, tab)
  // no permission to run on this url.
  // internal browser page (e.g. chrome://)
  // or blocked from browser native settings.
  if (!res) {
    return false
  }

  // even if the extension hasn't ran startup() yet,
  // because of the startup delay,
  // and the status event isn't attached,
  // we'll still get an empty array if the content scripts are running,
  // because we attach the onMessage listener immediately in store-client.
  if (Array.isArray(res)) {
    return true
  }

  return false
}

async function shouldContextMenuShow (tab = {}) {
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

async function onTabSwitchHandler({ tabId }) {
  const tab = await browser.tabs.get(tabId)
  if (tab.status !== 'complete') {
    return
  }

  await toggleContextMenu(tab)
}

async function onTabUpdateHandler (tabId, { status }, tab) {
  if (status !== 'complete') {
    return
  }

  await toggleContextMenu(tab)
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
    'templates',
    ['briskine', 'templatesLastUsed']
  )) {
    updateMenuTemplates()
  }

  if (isStorageChanged(changes,
    ['briskine', 'bubbleAllowlist']
  )) {
    const [tab] = await browser.tabs.query({active: true, lastFocusedWindow: true})
    await updateBubbleContextMenu(tab)
  }
}

function catchErrors (fn) {
  return (...args) => fn(...args).catch((err) => debug([fn.name, err], 'warn'))
}

function enableContextMenu () {
  // context menus are not available on Firefox for Android
  if (!browser.contextMenus) {
    return
  }

  browser.runtime.onInstalled.addListener(catchErrors(setupContextMenus))
  browser.contextMenus.onClicked.addListener(catchErrors(clickContextMenu))
  browser.tabs.onActivated.addListener(catchErrors(onTabSwitchHandler))
  browser.tabs.onUpdated.addListener(catchErrors(onTabUpdateHandler))

  const onStorageChange = catchErrors(storageChange)
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

    timer = setTimeout(() => {
      // clone, in case pendingChanges changes while we await
      const pendingChangesClone = { ...pendingChanges }
      pendingChanges = {}

      onStorageChange(pendingChangesClone)
    }, 1000)
  }

  browser.storage.local.onChanged.addListener(debouncedStorageChange)
}

enableContextMenu()
