import { expect, describe, it, vi } from 'vitest'

vi.mock('../utils/current-url.js', () => ({
  default: () => new URL('https://www.linkedin.com/sales/inbox/'),
}))

import { getPluginData } from '../plugin.js'
import loadIframe from '../../test-utils/iframe.js'

describe('linkedin sales navigator', () => {
  it('should get data in sales navigator invite', async () => {
    const iframe = await loadIframe('/pages/linkedin-sales-navigator/linkedin-sales-navigator-invite.html')
    const data = await getPluginData({document: iframe.contentDocument})

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

  it('should get data in sales navigator new message popup', async () => {
    const iframe = await loadIframe('/pages/linkedin-sales-navigator/linkedin-sales-navigator-message-popup.html')
    const data = await getPluginData({document: iframe.contentDocument})

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

  it('should get data in sales navigator new message popup, with 1 shared connection', async () => {
    const iframe = await loadIframe('/pages/linkedin-sales-navigator/linkedin-sales-navigator-message-popup-1-connection.html')
    const data = await getPluginData({document: iframe.contentDocument})

    expect(data).to.deep.equal({
      from: {
        name: 'Jennifer Briskine',
        first_name: 'Jennifer',
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

  it('should get data in sales navigator new message thread', async () => {
    const iframe = await loadIframe('/pages/linkedin-sales-navigator/linkedin-sales-navigator-message-thread-new.html')
    const data = await getPluginData({document: iframe.contentDocument})

    expect(data).to.deep.equal({
      from: {
        name: 'Jennifer Briskine',
        first_name: 'Jennifer',
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

  it('should get data in sales navigator existing message thread', async () => {
    const iframe = await loadIframe('/pages/linkedin-sales-navigator/linkedin-sales-navigator-message-thread.html')
    const data = await getPluginData({document: iframe.contentDocument})

    expect(data).to.deep.equal({
      from: {
        name: 'Jennifer Briskine',
        first_name: 'Jennifer',
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

  it('should not get data without an editor on the page', async () => {
    const data = await getPluginData({document: document.implementation.createHTMLDocument()})

    expect(data).to.deep.equal({
      from: {},
      to: [],
      subject: '',
    })
  })

})
