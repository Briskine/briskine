import browser from 'webextension-polyfill'

import {getSignedInUser} from '../store/store-api.js'

export function badgeUpdate(signedIn = false) {
  const suffix = signedIn ? '' : '-loggedout'

  const icons = {}
  const sizes = ['16', '32', '48']
  sizes.forEach((size) => {
    icons[size] = `/icons/icon-${size}${suffix}.png`
  })

  browser.action.setIcon({
    path: icons
  })
}

async function setInitialBadge () {
  try {
    await getSignedInUser()
  } catch {
    badgeUpdate(false)
  }
}

browser.runtime.onStartup.addListener(setInitialBadge)
browser.runtime.onInstalled.addListener(setInitialBadge)

