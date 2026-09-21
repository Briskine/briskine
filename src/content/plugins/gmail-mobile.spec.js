import { expect, describe, it, vi } from 'vitest'

vi.mock('../utils/current-url.js', () => ({
  default: () => new URL('https://mail.google.com/mail/mu/0/'),
}))

import { getPluginData } from '../plugin.js'
import loadIframe from '../../test-utils/iframe.js'

const composeData = {
  from: {
    name: 'John Briskine',
    first_name: 'John',
    last_name: 'Briskine',
    email: 'john@briskine.com'
  },
  to: [
    {
      name: 'Jane Briskine',
      first_name: 'Jane',
      last_name: 'Briskine',
      email: 'jane@briskine.com'
    }
  ],
  cc: [
    {
      name: 'Briskine Support',
      first_name: 'Briskine',
      last_name: 'Support',
      email: 'support@briskine.com'
    }
  ],
  bcc: [
    {
      name: '',
      first_name: '',
      last_name: '',
      email: 'notifications@briskine.com'
    }
  ],
  subject: 'subject',
}

describe('gmail-mobile', () => {
  it('should get data in compose', async () => {
    const iframe = await loadIframe('/pages/gmail-mobile/gmail-mobile.html')
    const data = await getPluginData({document: iframe.contentDocument})

    expect(data).to.deep.equal(composeData)

    iframe.remove()
  })

  it('should get data without the generated class names', async () => {
    const iframe = await loadIframe('/pages/gmail-mobile/gmail-mobile.html')
    // gmail's class names are generated and change often,
    // make sure we don't depend on any of them.
    iframe.contentDocument.querySelectorAll('[class]').forEach(($node) => {
      $node.removeAttribute('class')
    })
    const data = await getPluginData({document: iframe.contentDocument})

    expect(data).to.deep.equal(composeData)

    iframe.remove()
  })

  it('should not get data without an editor on the page', async () => {
    const data = await getPluginData({document: document.implementation.createHTMLDocument()})

    expect(data).to.deep.equal({
      from: {},
      to: [],
      cc: [],
      bcc: [],
      subject: '',
    })
  })
})
