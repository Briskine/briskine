import { expect, describe, it } from 'vitest'

import {getSalesNavigatorData} from './linkedin-sales-navigator.js'

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

describe('linkedin sales navigator', () => {
  it('should get data in sales navigator invite', async () => {
    const iframe = await page('test/pages/linkedin-sales-navigator/linkedin-sales-navigator-invite.html')
    const element = iframe.contentDocument.querySelector('textarea')
    const data = getSalesNavigatorData({
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
    const iframe = await page('test/pages/linkedin-sales-navigator/linkedin-sales-navigator-message-popup.html')
    const element = iframe.contentDocument.querySelector('textarea')
    const data = getSalesNavigatorData({
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
    const iframe = await page('test/pages/linkedin-sales-navigator/linkedin-sales-navigator-message-popup-1-connection.html')
    const element = iframe.contentDocument.querySelector('textarea')
    const data = getSalesNavigatorData({
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
    const iframe = await page('test/pages/linkedin-sales-navigator/linkedin-sales-navigator-message-thread-new.html')
    const element = iframe.contentDocument.querySelector('textarea')
    const data = getSalesNavigatorData({
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

  it('should get data in sales navigator existing message thread', async () => {
    const iframe = await page('test/pages/linkedin-sales-navigator/linkedin-sales-navigator-message-thread.html')
    const element = iframe.contentDocument.querySelector('textarea')
    const data = getSalesNavigatorData({
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
