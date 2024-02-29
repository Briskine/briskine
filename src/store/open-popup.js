/* globals MANIFEST */
import browser from 'webextension-polyfill'

const actionNamespace = (MANIFEST === '2') ? 'browserAction' : 'action'

export async function openPopup () {
  try {
    await browser[actionNamespace].openPopup()
  } catch (err) {
    // browserAction.openPopup is not supported in all browsers yet.
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/action/openPopup
    // Open the action popup in a new tab.
    const popupUrl = browser.runtime.getURL('popup/popup.html')
    browser.tabs.create({
      url: `${popupUrl}?source=tab`
    })
  }
}
