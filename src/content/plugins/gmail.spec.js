import { expect, describe, it } from 'vitest'

import { getGmailData } from './gmail.js'

async function page (src = '') {
  const iframe = document.createElement('iframe')
  let resolve, reject
  const promise = new Promise((res, rej) => {
    [resolve, reject] = [res, rej]
  })
  iframe.onload = () => {
    resolve(iframe)
  }
  iframe.onerror = reject
  iframe.src = src
  document.body.appendChild(iframe)
  return promise
}

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
    const iframe = await page('/pages/gmail/gmail-compose-dialog.html')
    const element = iframe.contentDocument.querySelector('[aria-label="Message Body"][contenteditable="true"]')
    const data = getGmailData({
      element: element,
    })

    expect(data).to.deep.equal(composeData)

    iframe.remove()
  })

  it('should get data in maximized compose', async () => {
    const iframe = await page('/pages/gmail/gmail-compose-maximized.html')
    const element = iframe.contentDocument.querySelector('[aria-label="Message Body"][contenteditable="true"]')
    const data = getGmailData({
      element: element,
    })

    expect(data).to.deep.equal(composeData)

    iframe.remove()
  })

  it('should not get data outside a compose textfield', async () => {
    const iframe = await page('/pages/gmail/gmail-compose-dialog.html')
    const element = iframe.contentDocument.querySelector('[aria-label="Search mail"]')
    const data = getGmailData({
      element: element,
    })

    expect(data).to.deep.equal({
      from: {},
      to: [],
      cc: [],
      bcc: [],
      subject: '',
    })

    iframe.remove()
  })
})
