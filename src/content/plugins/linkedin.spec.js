/* globals describe, it */
import {expect} from 'chai'

import {getData} from './linkedin.js'

async function page (src = '') {
  const response = await fetch(src)
  const div = document.createElement('div')
  div.innerHTML = await response.text()
  document.body.appendChild(div)
  return div
}

describe('linkedin', () => {
  it('should get data in connect popup', async () => {
    const container = await page('pages/linkedin/linkedin-connect.html')
    const element = container.querySelector('textarea')
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

    container.remove()
  })

  it('should get data in inmail popup', async () => {
    const container = await page('pages/linkedin/linkedin-inmail-popup.html')
    const element = container.querySelector('[contenteditable]')
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

    container.remove()
  })

  it('should get data in message popup fully loaded', async () => {
    const container = await page('pages/linkedin/linkedin-message-popup-full.html')
    const element = container.querySelector('[contenteditable]')
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

    container.remove()
  })

  it('should get data in message popup lazy loaded', async () => {
    const container = await page('pages/linkedin/linkedin-message-popup-lazy.html')
    const element = container.querySelector('[contenteditable]')
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

    container.remove()
  })

  it('should get data in messaging thread fully loaded', async () => {
    const container = await page('pages/linkedin/linkedin-messaging-full.html')
    const element = container.querySelector('[contenteditable]')
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

    container.remove()
  })

  it('should get data in messaging thread fully loaded', async () => {
    const container = await page('pages/linkedin/linkedin-messaging-lazy.html')
    const element = container.querySelector('[contenteditable]')
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

    container.remove()
  })

  it('should get data in new inmail messaging thread', async () => {
    const container = await page('pages/linkedin/linkedin-messaging-inmail.html')
    const element = container.querySelector('[contenteditable]')
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

    container.remove()
  })

  it('should get data in new sales navigator invite', async () => {
    const container = await page('pages/linkedin/linkedin-sales-navigator-invite.html')
    const element = container.querySelector('textarea')
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

    container.remove()
  })

  it('should get data in new sales navigator message popup', async () => {
    const container = await page('pages/linkedin/linkedin-sales-navigator-message-popup.html')
    const element = container.querySelector('textarea')
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

    container.remove()
  })
})
