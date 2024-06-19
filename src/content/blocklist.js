const blocklistPrivate = [
  '.briskine.com',
]

function getBlocklist (settings = {}) {
  return blocklistPrivate.concat(settings.blacklist)
}

export function isBlocklisted (settings = {}, currentUrl = '') {
  return getBlocklist(settings).find((url) => {
    return url && currentUrl.includes(url)
  })
}

