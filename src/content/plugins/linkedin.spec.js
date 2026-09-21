import { expect, describe, it, vi } from 'vitest'

vi.mock('../utils/current-url.js', () => ({
  default: () => new URL('https://www.linkedin.com/messaging/'),
}))

import { run } from '../plugin.js'
import loadIframe from '../../test-utils/iframe.js'

describe('linkedin', () => {
  it('should get data in connect popup', async () => {
    const iframe = await loadIframe('/pages/linkedin/linkedin-connect.html')
    const data = await run('data', {document: iframe.contentDocument})

    expect(data).to.deep.equal({
      from: {
        name: 'Jane Briskine',
        first_name: 'Jane',
        last_name: 'Briskine',
        email: ''
      },
      to: [
        {
          name: 'Michael Briskine',
          first_name: 'Michael',
          last_name: 'Briskine',
          email: ''
        }
      ],
      subject: ''
    })

    iframe.remove()
  })

  it('should get data in inmail popup', async () => {
    const iframe = await loadIframe('/pages/linkedin/linkedin-inmail-popup.html')
    const data = await run('data', {document: iframe.contentDocument})

    expect(data).to.deep.equal({
      from: {
        name: 'Jane Briskine',
        first_name: 'Jane',
        last_name: 'Briskine',
        email: ''
      },
      to: [
        {
          name: 'Michael J Briskine',
          first_name: 'Michael',
          last_name: 'J Briskine',
          email: ''
        }
      ],
      subject: ''
    })

    iframe.remove()
  })

  it('should get data in message popup fully loaded', async () => {
    const iframe = await loadIframe('/pages/linkedin/linkedin-message-popup-full.html')
    const data = await run('data', {document: iframe.contentDocument})

    expect(data).to.deep.equal({
      from: {
        name: 'Jane Briskine',
        first_name: 'Jane',
        last_name: 'Briskine',
        email: ''
      },
      to: [
        {
          name: 'Jennifer Briskine',
          first_name: 'Jennifer',
          last_name: 'Briskine',
          email: ''
        }
      ],
      subject: ''
    })

    iframe.remove()
  })

  it('should get data in message popup lazy loaded', async () => {
    const iframe = await loadIframe('/pages/linkedin/linkedin-message-popup-lazy.html')
    const data = await run('data', {document: iframe.contentDocument})

    expect(data).to.deep.equal({
      from: {
        name: 'Jane Briskine',
        first_name: 'Jane',
        last_name: 'Briskine',
        email: ''
      },
      to: [
        {
          name: 'Jennifer Briskine',
          first_name: 'Jennifer',
          last_name: 'Briskine',
          email: ''
        }
      ],
      subject: ''
    })

    iframe.remove()
  })

  it('should get data in messaging thread fully loaded', async () => {
    const iframe = await loadIframe('/pages/linkedin/linkedin-messaging-full.html')
    const data = await run('data', {document: iframe.contentDocument})

    expect(data).to.deep.equal({
      from: {
        name: 'Jane Briskine',
        first_name: 'Jane',
        last_name: 'Briskine',
        email: ''
      },
      to: [
        {
          name: 'Jennifer Briskine',
          first_name: 'Jennifer',
          last_name: 'Briskine',
          email: ''
        }
      ],
      subject: ''
    })

    iframe.remove()
  })

  it('should get data in messaging thread lazy loaded', async () => {
    const iframe = await loadIframe('/pages/linkedin/linkedin-messaging-lazy.html')
    const data = await run('data', {document: iframe.contentDocument})

    expect(data).to.deep.equal({
      from: {
        name: 'Jane Briskine',
        first_name: 'Jane',
        last_name: 'Briskine',
        email: ''
      },
      to: [
        {
          name: 'Jennifer Briskine',
          first_name: 'Jennifer',
          last_name: 'Briskine',
          email: ''
        }
      ],
      subject: ''
    })

    iframe.remove()
  })

  it('should get data in inmail new message thread', async () => {
    const iframe = await loadIframe('/pages/linkedin/linkedin-messaging-inmail.html')
    const data = await run('data', {document: iframe.contentDocument})

    expect(data).to.deep.equal({
      from: {
        name: 'Jennifer Briskine',
        first_name: 'Jennifer',
        last_name: 'Briskine',
        email: ''
      },
      to: [
        {
          name: 'Michael J Briskine',
          first_name: 'Michael',
          last_name: 'J Briskine',
          email: ''
        }
      ],
      subject: ''
    })

    iframe.remove()
  })

  it('should get data in new message popup from connections page', async () => {
    const iframe = await loadIframe('/pages/linkedin/linkedin-connections-message.html')
    const data = await run('data', {document: iframe.contentDocument})

    expect(data).to.deep.equal({
      from: {
        name: 'Jane Briskine',
        first_name: 'Jane',
        last_name: 'Briskine',
        email: ''
      },
      to: [
        {
          name: 'Michael Briskine',
          first_name: 'Michael',
          last_name: 'Briskine',
          email: ''
        }
      ],
      subject: '',
    })

    iframe.remove()
  })

  it('should not get data without an editor on the page', async () => {
    const data = await run('data', {document: document.implementation.createHTMLDocument()})

    expect(data).to.deep.equal({
      from: {},
      to: [],
      subject: '',
    })
  })


  it('should ignore the notification count in the page title', async () => {
    const iframe = await loadIframe('/pages/linkedin/linkedin-connect.html')
    const doc = iframe.contentDocument
    doc.querySelector('#interop-outlet').shadowRoot.querySelector('textarea').remove()
    doc.title = `(14) ${doc.title}`

    const data = await run('data', {document: doc})

    expect(data.to[0].first_name).to.equal('Michael')

    iframe.remove()
  })

  it('should get the contact from a profile page with no editor', async () => {
    const iframe = await loadIframe('/pages/linkedin/linkedin-connect.html')
    const doc = iframe.contentDocument
    doc.querySelector('#interop-outlet').shadowRoot.querySelector('textarea').remove()

    const data = await run('data', {document: doc})

    expect(data.to).to.deep.equal([
      {
        name: 'Michael Briskine',
        first_name: 'Michael',
        last_name: 'Briskine',
        email: '',
      },
    ])

    iframe.remove()
  })

})
