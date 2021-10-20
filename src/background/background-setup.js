/* globals REGISTER_DISABLED */
import browser from 'webextension-polyfill'

import Config from '../config'

// TODO move and refactor the context menu
// Called after installation
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onInstalled
browser.runtime.onInstalled.addListener(function (details) {
    // Context menus
    browser.contextMenus.create({
        "title": 'Save \'%s\' as a template',
        "contexts": ['editable', 'selection']
    });

    // rather than using the contextMenu onclick function, we attach
    // an event to the onClicked event.
    // this fixes issues with the onclick function not being triggered
    // or the new tab not being opened.
    browser.contextMenus.onClicked.addListener(function (info, tab) {
        // get the HTML selection
        browser.tabs.executeScript(tab.id, {
            code: "var getHtmlSelection = function() { var selection = window.getSelection(); if (selection && selection.rangeCount > 0) { range = selection.getRangeAt(0); var clonedSelection = range.cloneContents(); var div = document.createElement('div'); div.appendChild(clonedSelection); return div.innerHTML; } else { return ''; } }; getHtmlSelection();"
        }).then(function (selection) {
            var body = encodeURIComponent(selection[0]);
            browser.tabs.create({
                url: `${Config.functionsUrl}/#/list?id=new&body=${body}`
            });
        });
    });

    if (!REGISTER_DISABLED) {
        if (details.reason === "install") {
            browser.tabs.create({
                url: `${Config.functionsUrl}/welcome`
            });
        }
    }
});

browser.runtime.onMessage.addListener(function (request) {
    // Open new template window
    if (request.request === 'new') {
        browser.tabs.create({
            url: `${Config.functionsUrl}/#/list?id=new&src=qa-button`
        });
    }
    return true;
});

browser.runtime.onInstalled.addListener((details) => {
  const manifest = browser.runtime.getManifest()

  // on install or update,
  // insert the content scripts
  if (['update', 'installed'].includes(details.reason)) {
    const contentScripts = manifest.content_scripts[0]
    const scripts = contentScripts.js
    const styles = contentScripts.css

    browser.tabs.query({
      url: contentScripts.matches
    }).then((tabs) => {
      tabs.forEach((tab) => {
        // remove and insert new content styles
        styles.forEach((file) => {
          browser.tabs.removeCSS(tab.id, {file: file}).then(() => {
            browser.tabs.insertCSS(tab.id, {file: file})
          })
        })

        // insert new content scripts
        scripts.forEach((file) => {
          browser.tabs.executeScript(tab.id, {file: file})
        })
      })
    })

  }
})

browser.runtime.onConnect.addListener(() => {})
