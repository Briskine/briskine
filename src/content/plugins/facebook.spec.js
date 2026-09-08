import { expect, describe, it, vi } from 'vitest'

vi.mock('../utils/current-url.js', () => ({
  default: () => new URL('https://www.messenger.com/'),
}))

import { run } from '../plugin.js'
import './facebook.js'

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

describe('facebook', () => {
  it('should get data when composing a new message', async () => {
    const iframe = await page('/pages/facebook/facebook-messenger-full-page-thread-new.html')
    const data = await run('data', {document: iframe.contentDocument})

    expect(data).to.deep.equal({
      from: {
        name: 'John Briskine',
        first_name: 'John',
        last_name: 'Briskine',
        email: '',
      },
      // the recipient is a chip in the to field
      to: [
        {
          name: 'Jane Briskine',
          first_name: 'Jane',
          last_name: 'Briskine',
          email: '',
        },
      ],
    })

    iframe.remove()
  })

  it('should get data when replying in a thread', async () => {
    const iframe = await page('/pages/facebook/facebook-messenger-full-page-thread-reply.html')
    const data = await run('data', {document: iframe.contentDocument})

    expect(data).to.deep.equal({
      from: {
        name: 'John Briskine',
        first_name: 'John',
        last_name: 'Briskine',
        email: '',
      },
      // no chip here, the contact is the profile link in the conversation heading
      to: [
        {
          name: 'Emma Briskine',
          first_name: 'Emma',
          last_name: 'Briskine',
          email: '',
        },
      ],
    })

    iframe.remove()
  })

})
