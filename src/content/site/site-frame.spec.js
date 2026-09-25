import { expect, describe, it } from 'vitest'

import siteFrame from './site-frame.js'

describe('siteFrame', () => {
  it('should split the url into its parts', () => {
    expect(siteFrame({tabId: 7, url: 'https://test.com/my/page?foo=1#part', title: 'Test'})).to.deep.equal({
      tabId: 7,
      url: 'https://test.com/my/page?foo=1#part',
      title: 'Test',
      protocol: 'https',
      domain: 'test.com',
      path: '/my/page',
      query: '?foo=1',
      hash: '#part',
    })
  })

  it('should keep the subdomain and drop the port', () => {
    const frame = siteFrame({url: 'http://www.briskine.com:8080/'})
    expect(frame.domain).to.equal('www.briskine.com')
    expect(frame.protocol).to.equal('http')
    expect(frame.path).to.equal('/')
  })

  it('should leave missing parts empty', () => {
    const frame = siteFrame({url: 'https://briskine.com/'})
    expect(frame.query).to.equal('')
    expect(frame.hash).to.equal('')
  })

  it('should leave every part empty for a url that does not parse', () => {
    for (const url of ['', undefined, 'not a url']) {
      expect(siteFrame({tabId: 7, url: url})).to.include({
        tabId: 7,
        protocol: '',
        domain: '',
        path: '',
        query: '',
        hash: '',
      })
    }
  })
})
