/* globals MANIFEST */
import browser from 'webextension-polyfill'

const actionNamespace = (MANIFEST === '2') ? 'browserAction' : 'action'

export default function badgeUpdate(signedIn = false) {
  const suffix = signedIn ? '' : '-loggedout'

  const icons = {}
  const sizes = ['16', '32', '48']
  sizes.forEach((size) => {
    icons[size] = `/icons/icon-${size}${suffix}.png`
  })

  browser[actionNamespace].setIcon({
    path: icons
  })
}
