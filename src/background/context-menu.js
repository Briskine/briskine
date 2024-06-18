/* globals MANIFEST */
import browser from 'webextension-polyfill'

import config from '../config.js'
import {openPopup} from '../store/open-popup.js'

const saveAsTemplateMenu = 'saveAsTemplate'
const openDialogMenu = 'openDialog'
const signInMenu = 'signIn'

function getSelectedText () {
  return window.getSelection()?.toString?.()
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

async function openDialogAction (info) {
}

async function signInAction (info) {
  return openPopup()
}

async function clickContextMenu (info) {
  if (info.menuItemId === saveAsTemplateMenu) {
    return saveAsTemplateAction(info)
  }

  if (info.menuItemId === openDialogMenu) {
    return openDialogAction(info)
  }

  if (info.menuItemId === signInMenu) {
    return signInAction(info)
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

  // TODO show when no logged in
  browser.contextMenus.create({
    contexts: ['all'],
    title: 'Sign in to access your templates',
    id: signInMenu,
    parentId: parentMenu,
  })

  browser.contextMenus.create({
    contexts: ['all'],
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
    contexts: ['all'],
    title: 'Open Briskine dialog',
    parentId: parentMenu,
    id: openDialogMenu,
  })

  browser.contextMenus.onClicked.addListener(clickContextMenu)
}

browser.runtime.onInstalled.addListener(setupContextMenus)
