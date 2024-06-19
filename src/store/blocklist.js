const blocklistPrivate = [
  '.briskine.com',
]

export function isBlocklisted (settings = {}, currentUrl = '') {
  // create the full blocklist
  // from the editable and private one
  const blocklist = blocklistPrivate.concat(settings.blacklist)
  return blocklist.find((url) => {
    return url && currentUrl.includes(url)
  })
}

