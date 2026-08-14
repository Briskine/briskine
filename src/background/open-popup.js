import browser from 'webextension-polyfill'

export async function openPopup () {
  try {
    await browser.action.openPopup()
  } catch {
    // action.openPopup is not supported in all browsers yet.
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/action/openPopup
    // Open the action popup in a new tab.
    const popupUrl = browser.runtime.getURL('popup/popup.html')
    browser.tabs.create({
      url: `${popupUrl}?source=tab`
    })
  }
}
