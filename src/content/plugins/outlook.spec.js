/* globals describe, it */
import {expect} from 'chai'

import {getData} from './outlook.js'

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

describe.only('outlook', () => {
  it('should get data in default compose', async () => {
    const iframe = await page('pages/outlook/outlook-compose.html')
    const element = iframe.contentDocument.querySelector('[aria-multiline]')
    const data = await getData({
      element: element,
    })

    expect(data).to.deep.equal({
      from: {
        name: 'Briskine Templates',
        first_name: 'Briskine',
        last_name: 'Templates',
        email: ''
      },
      to: [
        {
          name: 'Michael Briskine',
          first_name: 'Michael',
          last_name: 'Briskine',
          email: 'michael@briskine.com'
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
    const iframe = await page('pages/outlook/outlook-compose-popup.html')
    const element = iframe.contentDocument.querySelector('[aria-multiline]')
    const data = getData({
      element: element,
    })

    expect(data).to.deep.equal({
      from: {
        name: '',
        first_name: '',
        last_name: '',
        email: ''
      },
      to: [
        {
          name: 'Michael Briskine',
          first_name: 'Michael',
          last_name: 'Briskine',
          email: 'michael@briskine.com'
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
})
