/*
 * The @site a {{#site}} or {{#eachSite}} block exposes for a tab.
 *
 * https://test.com/my/page?foo=1#part
 * protocol: https, domain: test.com, path: /my/page, query: ?foo=1, hash: #part
 *
 */

function urlParts (url = '') {
  try {
    const parsed = new URL(url)
    return {
      protocol: parsed.protocol.replace(/:$/, ''),
      domain: parsed.hostname,
      path: parsed.pathname,
      query: parsed.search,
      hash: parsed.hash,
    }
  } catch {
    return {protocol: '', domain: '', path: '', query: '', hash: ''}
  }
}

export default function siteFrame (context = {}) {
  return {
    // nested helpers read the tab from here
    tabId: context.tabId,
    url: context.url,
    title: context.title,
    ...urlParts(context.url),
  }
}
