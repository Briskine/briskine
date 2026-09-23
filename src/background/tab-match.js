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

export function sortTabs (tabs = [], windowId) {
  const inView = (tab) => tab.active && tab.windowId === windowId

  return [...tabs].sort((a, b) => {
    if (inView(a) !== inView(b)) {
      return inView(a) ? -1 : 1
    }

    return (b.lastAccessed || 0) - (a.lastAccessed || 0)
  })
}

// the way the tab strip reads, the current window first, then the others
export function sortTabsByStrip (tabs = [], windowId) {
  return [...tabs].sort((a, b) => {
    if (a.windowId !== b.windowId) {
      if (a.windowId === windowId || b.windowId === windowId) {
        return a.windowId === windowId ? -1 : 1
      }

      return a.windowId - b.windowId
    }

    return a.index - b.index
  })
}
