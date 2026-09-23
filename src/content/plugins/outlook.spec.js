import { expect, describe, it, vi } from 'vitest'

vi.mock('../utils/current-url.js', () => ({
  default: () => new URL('https://outlook.live.com/mail/0/'),
}))

// a fixture can't show the field after the click,
// so the wait for it times out and gets logged
vi.mock('../../debug.js', () => ({
  default: () => {},
}))

import { getPluginData, runPluginActions } from '../plugin.js'
import loadIframe from '../../test-utils/iframe.js'

// relabel the fixture's cc and bcc buttons,
// for multi-language support
function watchFieldButtons (doc) {
  const labels = {Cc: '抄送', Bcc: '密件抄送'}
  const clicked = []
  for (const $button of doc.querySelectorAll('[id^="docking_InitVisiblePart"] .fui-Input button')) {
    const name = $button.textContent.trim()
    $button.textContent = labels[name]
    $button.addEventListener('click', () => clicked.push(name))
  }
  return clicked
}

async function runActionsInFixture (doc, template) {
  const element = doc.querySelector('[role=textbox][aria-multiline=true]')
  // a fixture can't show the field after the click,
  // skip waiting for it
  vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']})
  const done = runPluginActions({element: element, template: template, data: {}})
  await vi.runAllTimersAsync()
  await done
  vi.useRealTimers()
}

describe('outlook', () => {
  it('should get data in default compose', async () => {
    const iframe = await loadIframe('/pages/outlook/outlook-compose.html')
    const data = await getPluginData({document: iframe.contentDocument})

    expect(data).to.deep.equal({
      from: {
        name: 'Briskine Templates',
        first_name: 'Briskine',
        last_name: 'Templates',
        email: 'briskine@outlook.com'
      },
      to: [
        {
          name: '',
          first_name: '',
          last_name: '',
          email: 'john+2@briskine.com'
        },
        {
          name: 'Michael Briskine',
          first_name: 'Michael',
          last_name: 'Briskine',
          email: ''
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
    const iframe = await loadIframe('/pages/outlook/outlook-compose-popup.html')
    const data = await getPluginData({document: iframe.contentDocument})

    expect(data).to.deep.equal({
      from: {
        name: '',
        first_name: '',
        last_name: '',
        email: 'briskine@outlook.com'
      },
      to: [
        {
          name: '',
          first_name: '',
          last_name: '',
          email: 'john+2@briskine.com'
        },
        {
          name: 'Michael Briskine',
          first_name: 'Michael',
          last_name: 'Briskine',
          email: ''
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

  it('should get data in reply', async () => {
    const iframe = await loadIframe('/pages/outlook/outlook-reply.html')
    const data = await getPluginData({document: iframe.contentDocument})

    // the reading pane above has its own to, from and subject
    expect(data).to.deep.equal({
      from: {
        name: 'Briskine Templates',
        first_name: 'Briskine',
        last_name: 'Templates',
        email: 'briskine@outlook.com'
      },
      to: [
        {
          name: 'Michael Briskine',
          first_name: 'Michael',
          last_name: 'Briskine',
          email: 'michael@briskine.com'
        }
      ],
      cc: [],
      bcc: [],
      subject: 'Re: test',
    })

    iframe.remove()
  })

  it('should get data with only bcc shown', async () => {
    // bcc is the second recipient field
    const iframe = await loadIframe('/pages/outlook/outlook-compose-bcc.html')
    const data = await getPluginData({document: iframe.contentDocument})

    expect(data).to.deep.equal({
      from: {
        name: 'Briskine Templates',
        first_name: 'Briskine',
        last_name: 'Templates',
        email: 'briskine@outlook.com'
      },
      to: [],
      cc: [],
      bcc: [
        {
          name: '',
          first_name: '',
          last_name: '',
          email: 'bcc@briskine.com'
        }
      ],
      subject: '',
    })

    iframe.remove()
  })

  it('should click the bcc button in any language', async () => {
    const iframe = await loadIframe('/pages/outlook/outlook-reply.html')
    const clicked = watchFieldButtons(iframe.contentDocument)

    await runActionsInFixture(iframe.contentDocument, {bcc: 'bcc@briskine.com'})
    expect(clicked).to.deep.equal(['Bcc'])

    iframe.remove()
  })

  it('should click the bcc button when cc is already shown', async () => {
    // bcc is the only button left, so the first one
    const iframe = await loadIframe('/pages/outlook/outlook-compose.html')
    const clicked = watchFieldButtons(iframe.contentDocument)

    await runActionsInFixture(iframe.contentDocument, {bcc: 'bcc@briskine.com'})
    expect(clicked).to.deep.equal(['Bcc'])

    iframe.remove()
  })

  it('should click the cc button when bcc is already shown', async () => {
    // cc is the only button left, so the first one
    const iframe = await loadIframe('/pages/outlook/outlook-compose-bcc.html')
    const clicked = watchFieldButtons(iframe.contentDocument)

    await runActionsInFixture(iframe.contentDocument, {cc: 'cc@briskine.com'})
    expect(clicked).to.deep.equal(['Cc'])

    iframe.remove()
  })

  it('should only add the recipients missing from a field', async () => {
    // bcc@briskine.com is already in bcc, and includes c@briskine.com
    const iframe = await loadIframe('/pages/outlook/outlook-compose-bcc.html')
    const doc = iframe.contentDocument
    const inserted = []
    vi.spyOn(doc, 'queryCommandEnabled').mockReturnValue(true)
    vi.spyOn(doc, 'execCommand').mockImplementation((command, ui, value) => inserted.push(value))

    await runActionsInFixture(doc, {bcc: 'bcc@briskine.com, c@briskine.com'})
    expect(inserted).to.deep.equal(['c@briskine.com', ','])

    iframe.remove()
  })

  it('should not get data without an editor on the page', async () => {
    const data = await getPluginData({document: document.implementation.createHTMLDocument()})

    expect(data).to.deep.equal({
      from: {},
      to: [],
      cc: [],
      bcc: [],
      subject: '',
    })
  })

})
