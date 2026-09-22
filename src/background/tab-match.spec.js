import { expect, describe, it } from 'vitest'

import { toUrlPattern, testUrl, pickTab } from './tab-match.js'

function matchesUrl (url, pattern) {
  return testUrl(toUrlPattern(pattern), url)
}

describe('tab-match', () => {
  describe('matchesUrl', () => {
    const matches = [
      // host, with and without subdomains
      ['https://briskine.com/feed/', 'briskine.com'],
      ['https://www.briskine.com/messaging/', 'briskine.com'],
      ['https://mail.google.com/mail/u/0/', 'google.com'],
      // path prefixes
      ['https://www.briskine.com/sales/inbox/', 'briskine.com/sales'],
      ['https://mail.google.com/mail/u/0/', 'mail.google.com/mail/u/0'],
      // wildcards
      ['https://www.briskine.com/messaging/', 'briskine.com/*'],
      ['https://www.briskine.com/sales/inbox/', 'briskine.com/*'],
      // /* matches the bare root too
      ['https://www.briskine.com/', 'briskine.com/*'],
      ['https://www.briskine.com/a/sales/', 'briskine.com/*/sales'],
      ['https://www.briskine.com/a/b/sales/', 'briskine.com/*/sales'],
      ['https://www.briskine.com/in/someone/', 'briskine.com/in/*'],
      ['https://mail.google.com/mail/u/0/', 'mail.google.com/mail/*/0'],
      // scheme, www. and *. are insignificant
      ['https://briskine.com/feed/', 'www.briskine.com'],
      ['https://www.briskine.com/feed/', 'https://www.briskine.com'],
      ['https://www.briskine.com/feed/', '*.briskine.com'],
      ['https://www.briskine.com/messaging/', 'briskine.com/'],
      // subdomains at any depth
      ['https://a.b.briskine.com/feed/', 'briskine.com'],
      // URLPattern named groups
      ['https://www.briskine.com/in/someone/', 'briskine.com/in/:profile'],
      // optional modifiers
      ['https://www.briskine.com/in/', 'briskine.com/in/:profile?'],
      ['https://www.briskine.com/in/someone/', 'briskine.com/in/:profile?'],
      ['https://www.briskine.com/sales/', 'briskine.com/sales{/inbox}?'],
      ['https://www.briskine.com/sales/inbox/', 'briskine.com/sales{/inbox}?'],
      // query strings are still dropped
      ['https://www.briskine.com/sales/', 'briskine.com/sales?foo=1'],
    ]

    for (const [url, pattern] of matches) {
      it(`should match ${pattern} against ${url}`, () => {
        expect(matchesUrl(url, pattern)).to.equal(true)
      })
    }

    const rejects = [
      // paths break on a slash
      ['https://www.briskine.com/messaging/', 'briskine.com/sales'],
      ['https://www.briskine.com/salesforce/', 'briskine.com/sales'],
      // * has to match something
      ['https://www.briskine.com/sales/', 'briskine.com/*/sales'],
      // lookalike hosts
      ['https://mybriskine.com/', 'briskine.com'],
      ['https://briskine.com.evil.test/', 'briskine.com'],
      ['https://briskine.com.evil.test/sales', 'briskine.com/sales'],
      // anywhere other than host + path
      ['https://evil.test/briskine.com', 'briskine.com'],
      ['https://evil.test/?next=briskine.com', 'briskine.com'],
      ['https://evil.test/#briskine.com', 'briskine.com'],
      ['https://briskine.com@evil.test/', 'briskine.com'],
      // the host is literal, and names a domain
      ['https://www.briskine.com/', 'com'],
      ['https://www.briskine.com/', 'briskine'],
      ['https://www.briskine.com/', '*'],
      ['https://www.briskine.com/', '*.com'],
      ['https://www.briskine.com/', '*.*'],
      // a modifier only reaches a group, not a literal
      ['https://www.briskine.com/sales/', 'briskine.com/sales?'],
      // the query is dropped, it never widens the path
      ['https://www.briskine.com/sales/', 'briskine.com/messaging?next=/sales'],
      ['https://www.briskine.com/salesforce/', 'briskine.com/sales{/inbox}?'],
      // regex groups would hang the service worker
      ['https://www.briskine.com/aaaa/', 'briskine.com/(a+)+b'],
      // malformed
      ['https://www.briskine.com/a/', 'briskine.com/{unclosed'],
      ['https://www.briskine.com/', '{*.}?briskine.com'],
      ['https://www.briskine.com/', ':host.com'],
      // unparseable, or nothing to match
      ['about:blank', 'briskine.com'],
      ['', 'briskine.com'],
      ['https://briskine.com/', ''],
    ]

    for (const [url, pattern] of rejects) {
      it(`should not match ${pattern || '(empty)'} against ${url || '(empty)'}`, () => {
        expect(matchesUrl(url, pattern)).to.equal(false)
      })
    }
  })

  describe('pickTab', () => {
    const tabs = [
      {id: 1, active: false, windowId: 1, lastAccessed: 30},
      {id: 2, active: true, windowId: 2, lastAccessed: 10},
      {id: 3, active: false, windowId: 1, lastAccessed: 20},
    ]

    it('should prefer the active tab in the current window', () => {
      expect(pickTab(tabs, 2)?.id).to.equal(2)
    })

    it('should fall back to the most recently accessed tab', () => {
      expect(pickTab(tabs, 1)?.id).to.equal(1)
    })

    it('should not mutate the tabs it was given', () => {
      const original = tabs.map((tab) => tab.id)
      pickTab(tabs, 99)
      expect(tabs.map((tab) => tab.id)).to.deep.equal(original)
    })

    it('should return null when there are no tabs', () => {
      expect(pickTab([], 1)).to.equal(null)
    })
  })
})
