import { expect, describe, it, vi } from 'vitest'

vi.mock('../utils/current-url.js', () => ({
  default: () => new URL('https://outlook.live.com/mail/0/'),
}))

import { run } from '../plugin.js'
import loadIframe from '../../test-utils/iframe.js'

describe('outlook', () => {
  it('should get data in default compose', async () => {
    const iframe = await loadIframe('/pages/outlook/outlook-compose.html')
    const data = await run('data', {document: iframe.contentDocument})

    expect(data).to.deep.equal({
      from: {
        name: 'Briskine Templates',
        first_name: 'Briskine',
        last_name: 'Templates',
        email: ''
      },
      to: [
        {
          name: '',
          first_name: '',
          last_name: '',
          email: 'john+2@briskine.com'
        },
        {
          name: 'Michael Briskine',
          first_name: 'Michael',
          last_name: 'Briskine',
          email: ''
        }
      ],
      cc: [
        {
          name: 'John Briskine',
          first_name: 'John',
          last_name: 'Briskine',
          email: 'john@briskine.com'
        }
      ],
      bcc: [],
      subject: '',
    })

    iframe.remove()
  })

  it('should get data in compose popup', async () => {
    const iframe = await loadIframe('/pages/outlook/outlook-compose-popup.html')
    const data = await run('data', {document: iframe.contentDocument})

    expect(data).to.deep.equal({
      from: {
        name: '',
        first_name: '',
        last_name: '',
        email: ''
      },
      to: [
        {
          name: '',
          first_name: '',
          last_name: '',
          email: 'john+2@briskine.com'
        },
        {
          name: 'Michael Briskine',
          first_name: 'Michael',
          last_name: 'Briskine',
          email: ''
        }
      ],
      cc: [
        {
          name: 'John Briskine',
          first_name: 'John',
          last_name: 'Briskine',
          email: 'john@briskine.com'
        }
      ],
      bcc: [],
      subject: '',
    })

    iframe.remove()
  })

  it('should not get data without an editor on the page', async () => {
    const data = await run('data', {document: document.implementation.createHTMLDocument()})

    expect(data).to.deep.equal({
      from: {},
      to: [],
      cc: [],
      bcc: [],
      subject: '',
    })
  })

})
