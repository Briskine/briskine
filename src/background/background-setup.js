/* globals ENV, REGISTER_DISABLED */
import browser from 'webextension-polyfill'

import Config from '../config'

// for tabs.query auto-reload
var urlMatchPatterns = [
    '*://mail.google.com/*',
    '*://inbox.google.com/*',
    '*://*.mail.yahoo.com/*',
    '*://*.mail.live.com/*',
    '*://outlook.live.com/*',
    '*://*.linkedin.com/*',
    '*://*.facebook.com/*',
    '*://*.messenger.com/*',
    '*://*.fastmail.com/*',
    '*://*.uservoice.com/*',
    '*://*.zendesk.com/*'
];

// Called when the url of a tab changes.
var updatedTab = function () {
    // in development
    // also show for localhost
    var localhostPattern = "*://localhost/*";

    if (ENV && ENV === 'development' && urlMatchPatterns.indexOf(localhostPattern) === -1) {
        urlMatchPatterns.push(localhostPattern);
    }
    return false;
};

// Listen for any changes to the URL of any tab.
browser.tabs.onUpdated.addListener(updatedTab);

// Called after installation
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onInstalled
browser.runtime.onInstalled.addListener(function (details) {
    // All affected tabs should be reloaded if the extension was installed
    browser.tabs.query({'url': urlMatchPatterns}).then(function (tabs) {
        for (var i in tabs) {
//             browser.tabs.reload(tabs[i].id, {});
        }
    });

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
  // TODO inject the script on install as well

  const manifest = browser.runtime.getManifest();
  console.log(manifest)

  if (details.reason === 'update') {
    // TODO re-insert content scripts
    console.log('inser new content')
    const scripts = manifest.content_scripts[0].js
    const styles = manifest.content_scripts[0].css

    console.log(scripts, styles)

    browser.tabs.query({}).then((tabs) => {
      tabs.forEach((tab) => {
        const url = new URL(tab.url)
        // don't match browser specific tabs (eg. about:blank)
        if (!['http:', 'https:'].includes(url.protocol)) {
          return
        }

        // TODO remove old styles
        styles.forEach((file) => {
          browser.tabs.removeCSS(tab.id, {file: file}).then(() => {
            browser.tabs.insertCSS(tab.id, {file: file})
          })
        })

        // TODO add new scripts
        scripts.forEach((file) => {
          browser.tabs.executeScript(tab.id, {file: file})
        })
      })
    })

  }
})

browser.runtime.onConnect.addListener(() => {})

