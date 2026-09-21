import { expect, describe, it } from 'vitest'

import { toUrlPattern, testUrl, pickTab } from './tab-match.js'

function matchesUrl (url, pattern) {
  return testUrl(toUrlPattern(pattern), url)
}

describe('tab-match', () => {
  describe('matchesUrl', () => {
    const matches = [
      // host, with and without subdomains
      ['https://linkedin.com/feed/', 'linkedin.com'],
      ['https://www.linkedin.com/messaging/', 'linkedin.com'],
      ['https://mail.google.com/mail/u/0/', 'google.com'],
      // path prefixes
      ['https://www.linkedin.com/sales/inbox/', 'linkedin.com/sales'],
      ['https://mail.google.com/mail/u/0/', 'mail.google.com/mail/u/0'],
      // wildcards
      ['https://www.linkedin.com/messaging/', 'linkedin.com/*'],
      ['https://www.linkedin.com/sales/inbox/', 'linkedin.com/*'],
      // /* matches the bare root too
      ['https://www.linkedin.com/', 'linkedin.com/*'],
      ['https://www.linkedin.com/a/sales/', 'linkedin.com/*/sales'],
      ['https://www.linkedin.com/a/b/sales/', 'linkedin.com/*/sales'],
      ['https://www.linkedin.com/in/someone/', 'linkedin.com/in/*'],
      ['https://mail.google.com/mail/u/0/', 'mail.google.com/mail/*/0'],
      // scheme, www. and *. are insignificant
      ['https://linkedin.com/feed/', 'www.linkedin.com'],
      ['https://www.linkedin.com/feed/', 'https://www.linkedin.com'],
      ['https://www.linkedin.com/feed/', '*.linkedin.com'],
      ['https://www.linkedin.com/messaging/', 'linkedin.com/'],
      // subdomains at any depth
      ['https://a.b.linkedin.com/feed/', 'linkedin.com'],
      // URLPattern named groups
      ['https://www.linkedin.com/in/someone/', 'linkedin.com/in/:profile'],
    ]

    for (const [url, pattern] of matches) {
      it(`should match ${pattern} against ${url}`, () => {
        expect(matchesUrl(url, pattern)).to.equal(true)
      })
    }

    const rejects = [
      // paths break on a slash
      ['https://www.linkedin.com/messaging/', 'linkedin.com/sales'],
      ['https://www.linkedin.com/salesforce/', 'linkedin.com/sales'],
      // * has to match something
      ['https://www.linkedin.com/sales/', 'linkedin.com/*/sales'],
      // lookalike hosts
      ['https://mylinkedin.com/', 'linkedin.com'],
      ['https://linkedin.com.evil.test/', 'linkedin.com'],
      ['https://linkedin.com.evil.test/sales', 'linkedin.com/sales'],
      // anywhere other than host + path
      ['https://evil.test/linkedin.com', 'linkedin.com'],
      ['https://evil.test/?next=linkedin.com', 'linkedin.com'],
      ['https://evil.test/#linkedin.com', 'linkedin.com'],
      ['https://linkedin.com@evil.test/', 'linkedin.com'],
      // the host is literal, and names a domain
      ['https://www.linkedin.com/', 'com'],
      ['https://www.linkedin.com/', 'linkedin'],
      ['https://www.linkedin.com/', '*'],
      ['https://www.linkedin.com/', '*.com'],
      ['https://www.linkedin.com/', '*.*'],
      // regex groups would hang the service worker
      ['https://www.linkedin.com/aaaa/', 'linkedin.com/(a+)+b'],
      // malformed
      ['https://www.linkedin.com/a/', 'linkedin.com/{unclosed'],
      ['https://www.linkedin.com/', '{*.}?linkedin.com'],
      ['https://www.linkedin.com/', ':host.com'],
      // unparseable, or nothing to match
      ['about:blank', 'linkedin.com'],
      ['', 'linkedin.com'],
      ['https://linkedin.com/', ''],
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
