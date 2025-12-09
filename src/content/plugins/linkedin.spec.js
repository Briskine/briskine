/* globals describe, it */
import {expect} from 'chai'

import {getData} from './linkedin.js'

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

describe('linkedin', () => {
  it('should get data in connect popup', async () => {
    const iframe = await page('pages/linkedin/linkedin-connect.html')
    const element = iframe.contentDocument.querySelector('textarea')
    const data = getData({
      element: element,
    })

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
    const iframe = await page('pages/linkedin/linkedin-inmail-popup.html')
    const element = iframe.contentDocument.querySelector('[contenteditable]')
    const data = getData({
      element: element,
    })

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
    const iframe = await page('pages/linkedin/linkedin-message-popup-full.html')
    const element = iframe.contentDocument.querySelector('[contenteditable]')
    const data = getData({
      element: element,
    })

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
    const iframe = await page('pages/linkedin/linkedin-message-popup-lazy.html')
    const element = iframe.contentDocument.querySelector('[contenteditable]')
    const data = getData({
      element: element,
    })

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
    const iframe = await page('pages/linkedin/linkedin-messaging-full.html')
    const element = iframe.contentDocument.querySelector('[contenteditable]')
    const data = getData({
      element: element,
    })

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
    const iframe = await page('pages/linkedin/linkedin-messaging-lazy.html')
    const element = iframe.contentDocument.querySelector('[contenteditable]')
    const data = getData({
      element: element,
    })

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
    const iframe = await page('pages/linkedin/linkedin-messaging-inmail.html')
    const element = iframe.contentDocument.querySelector('[contenteditable]')
    const data = getData({
      element: element,
    })

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

  it('should get data in sales navigator invite', async () => {
    const iframe = await page('pages/linkedin/linkedin-sales-navigator-invite.html')
    const element = iframe.contentDocument.querySelector('textarea')
    const data = getData({
      element: element,
    })

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
    const iframe = await page('pages/linkedin/linkedin-sales-navigator-message-popup.html')
    const element = iframe.contentDocument.querySelector('textarea')
    const data = getData({
      element: element,
    })

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
    const iframe = await page('pages/linkedin/linkedin-sales-navigator-message-popup-1-connection.html')
    const element = iframe.contentDocument.querySelector('textarea')
    const data = getData({
      element: element,
    })

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
    const iframe = await page('pages/linkedin/linkedin-sales-navigator-message-thread.html')
    const element = iframe.contentDocument.querySelector('textarea')
    const data = getData({
      element: element,
    })

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
})
