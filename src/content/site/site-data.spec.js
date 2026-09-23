import { expect, describe, it, vi, beforeEach, afterEach } from 'vitest'

const { getPluginData } = vi.hoisted(() => ({ getPluginData: vi.fn() }))

vi.mock('../plugin.js', () => ({
  getPluginData: getPluginData,
  runPluginActions: vi.fn(),
}))

// the failing plugins and selectors below get logged
vi.mock('../../debug.js', () => ({
  default: () => {},
}))

import { eventSiteData, eventSiteMatches } from '../../config.js'
import { trigger } from '../../store/store-content.js'
import { setup, destroy } from './site-data.js'

let container = null
function markup (html = '') {
  container = document.createElement('div')
  container.innerHTML = html
  document.body.appendChild(container)
  return container
}

describe('site-data', () => {
  beforeEach(() => {
    getPluginData.mockReset().mockResolvedValue({})
    setup()
  })

  afterEach(() => {
    destroy()
    container?.remove()
    container = null
  })

  it('should answer with the plugin data of this page', async () => {
    getPluginData.mockResolvedValue({subject: 'hello'})

    expect(await trigger(eventSiteData)).to.deep.equal([{subject: 'hello'}])
  })

  it('should answer with an empty object when the plugins throw', async () => {
    getPluginData.mockRejectedValue(new Error('boom'))

    expect(await trigger(eventSiteData)).to.deep.equal([{}])
  })

  it('should pass no element when nothing is focused', async () => {
    await trigger(eventSiteData)

    expect(getPluginData).toHaveBeenCalledWith({})
  })

  it('should pass the focused editor when there is one', async () => {
    const $container = markup('<textarea class="field"></textarea>')
    const editor = $container.querySelector('.field')
    editor.focus()

    await trigger(eventSiteData)

    expect(getPluginData).toHaveBeenCalledWith({element: editor})
  })

  it('should answer with the matches of a selector', async () => {
    markup('<div class="item">one</div><div class="item">two</div>')

    const [matches] = await trigger(eventSiteMatches, {selector: '.item'})

    expect(matches.map((match) => match.text)).to.deep.equal(['one', 'two'])
  })

  it('should answer with no matches for an invalid selector', async () => {
    expect(await trigger(eventSiteMatches, {selector: '!!!'})).to.deep.equal([[]])
  })

  it('should stop answering after destroy', async () => {
    destroy()

    expect(await trigger(eventSiteData)).to.deep.equal([])
    expect(await trigger(eventSiteMatches, {selector: '.item'})).to.deep.equal([])
  })
})
