import browser from 'webextension-polyfill'

export default function badgeUpdate(user = null) {
  const suffix = user ? '' : '-loggedout'

  const icons = {}
  const sizes = ['16', '32', '48']
  sizes.forEach((size) => {
    icons[size] = `icons/icon-${size}${suffix}.png`
  })

  browser.browserAction.setIcon({
    path: icons
  })
}
