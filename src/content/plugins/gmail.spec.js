import { expect, describe, it, vi } from 'vitest'

vi.mock('../utils/current-url.js', () => ({
  default: () => new URL('https://mail.google.com/mail/u/0/'),
}))

import { run } from '../plugin.js'
import loadIframe from '../../test-utils/iframe.js'
import './gmail.js'

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
      name: 'Briskine',
      first_name: 'Briskine',
      last_name: '',
      email: 'contact@briskine.com'
    }
  ],
  bcc: [
    {
      name: 'Briskine Support',
      first_name: 'Briskine',
      last_name: 'Support',
      email: 'notifications@briskine.com'
    }
  ],
  subject: 'subject',
}

describe('gmail', () => {
  it('should get data in compose dialog', async () => {
    const iframe = await loadIframe('/pages/gmail/gmail-compose-dialog.html')
    const data = await run('data', {document: iframe.contentDocument})

    expect(data).to.deep.equal(composeData)

    iframe.remove()
  })

  it('should get data in maximized compose', async () => {
    const iframe = await loadIframe('/pages/gmail/gmail-compose-maximized.html')
    const data = await run('data', {document: iframe.contentDocument})

    expect(data).to.deep.equal(composeData)

    iframe.remove()
  })

  it('should not get data outside a compose textfield', async () => {
    const iframe = await loadIframe('/pages/gmail/gmail-compose-dialog.html')
    const element = iframe.contentDocument.querySelector('[aria-label="Search mail"]')
    const data = await run('data', {element: element})

    expect(data).to.deep.equal({
      from: {},
      to: [],
      cc: [],
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
