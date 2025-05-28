/* globals describe, it */
import {expect} from 'chai'

import {getData} from './outlook.js'

async function page (src = '') {
  const response = await fetch(src)
  const div = document.createElement('div')
  div.innerHTML = await response.text()
  document.body.appendChild(div)
  return div
}

describe('outlook', () => {
  it('should get data in default compose', async () => {
    const container = await page('pages/outlook/outlook-compose.html')
    const element = container.querySelector('[aria-multiline]')
    const data = getData({
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
          email: ''
        }
      ],
      cc: [],
      bcc: [],
      subject: '',
    })

    container.remove()
  })

  it('should get data in compose popup', async () => {
    const container = await page('pages/outlook/outlook-compose-popup.html')
    const element = container.querySelector('[aria-multiline]')
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
          email: ''
        }
      ],
      cc: [],
      bcc: [],
      subject: '',
    })

    container.remove()
  })
})
