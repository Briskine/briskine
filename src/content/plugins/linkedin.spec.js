import {expect} from 'chai'

import {getData} from './linkedin.js'

async function page (src = '') {
  const response = await fetch(src)
  const div = document.createElement('div')
  div.innerHTML = await response.text()
  document.body.appendChild(div)
  return div
}

describe.only('linkedin', () => {
  it('should get data in connect popup', async () => {
    const container = await page('pages/linkedin-connect.html')
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


})
