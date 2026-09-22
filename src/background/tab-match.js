/*
 * Pick the tab a {{#site}} block reads from.
 */

// briskine.com, briskine.com/sales, briskine.com/*/sales, briskine.com/in/:profile
function normalize (pattern = '') {
  return pattern
    .trim()
    .replace(/^[a-z]+:\/\//i, '')
    // a ? before a / or the end is a modifier, anything else starts the query
    .replace(/\?(?![/]|$).*$/, '')
    .replace(/#.*$/, '')
    .replace(/^\*\./, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '')
}

// a literal domain, never a wildcard or a bare label,
// so a pattern can't reach a lookalike host or every tab at once
const domain = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i

// a bad one would hang the service worker
const regexGroup = /[()]/

export function toUrlPattern (pattern = '') {
  const [host, ...path] = normalize(pattern).split('/')
  if (!domain.test(host)) {
    return null
  }

  const pathname = path.join('/')
  if (regexGroup.test(pathname)) {
    return null
  }

  try {
    return new URLPattern({
      hostname: `{*.}?${host}`,
      // /sales covers /sales/inbox, but not /salesforce
      pathname: pathname ? `/${pathname}{/*}?` : '/*',
    })
  } catch {
    return null
  }
}

export function testUrl (urlPattern, url = '') {
  if (!urlPattern || !url) {
    return false
  }

  try {
    return urlPattern.test(url)
  } catch {
    return false
  }
}

export function pickTab (tabs = [], windowId) {
  const active = tabs.find((tab) => tab.active && tab.windowId === windowId)
  if (active) {
    return active
  }

  return [...tabs]
    .sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))
    .at(0) || null
}
