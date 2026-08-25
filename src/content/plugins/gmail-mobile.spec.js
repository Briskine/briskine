import { expect, describe, it } from 'vitest'

import { getGmailMobileData } from './gmail-mobile.js'

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

describe('gmail-mobile', () => {
  it('should get data in compose', async () => {
    const iframe = await page('/pages/gmail-mobile/gmail-mobile.html')
    const element = iframe.contentDocument.querySelector('#cmcbody')
    const data = getGmailMobileData({
      element: element,
    })

    expect(data).to.deep.equal(composeData)

    iframe.remove()
  })

  it('should get data without the generated class names', async () => {
    const iframe = await page('/pages/gmail-mobile/gmail-mobile.html')
    // gmail's class names are generated and change often,
    // make sure we don't depend on any of them.
    iframe.contentDocument.querySelectorAll('[class]').forEach(($node) => {
      $node.removeAttribute('class')
    })
    const element = iframe.contentDocument.querySelector('#cmcbody')
    const data = getGmailMobileData({
      element: element,
    })

    expect(data).to.deep.equal(composeData)

    iframe.remove()
  })

  it('should not get data without an element', async () => {
    const data = getGmailMobileData({})

    expect(data).to.deep.equal({
      from: {},
      to: [],
      cc: [],
      bcc: [],
      subject: '',
    })
  })
})
