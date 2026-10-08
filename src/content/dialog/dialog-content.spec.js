import {describe, it, expect, afterEach, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {render} from 'solid-js/web'

import DialogContent from './dialog-content.js'
import * as store from '../../store/store-content.js'

const templates = [
  {id: 'kr', title: 'Kind regards', body: 'Kind regards', _body_plaintext: 'Kind regards', shortcut: 'kr', tags: []},
  {id: 'nic', title: 'Nice talking to you', body: 'Nice talking to you', _body_plaintext: 'Nice talking to you', shortcut: 'nic', tags: []},
]

const searchResults = {
  nic: [templates[1]],
  kind: [templates[0], templates[1]],
}

vi.mock('../../store/store-content.js', async (importOriginal) => ({
  ...await importOriginal(),
  getTemplates: vi.fn(async () => templates),
  getTags: vi.fn(async () => []),
  getAccount: vi.fn(async () => { throw new Error('logged-out') }),
  getExtensionData: vi.fn(async () => ({})),
  searchTemplates: vi.fn(async (query) => ({query, results: searchResults[query] || []})),
  on: vi.fn(),
  off: vi.fn(),
  openPopup: vi.fn(),
}))

let dispose = () => {}

afterEach(() => {
  dispose()
  document.body.innerHTML = ''
})

function mount () {
  const container = document.createElement('div')
  document.body.appendChild(container)
  dispose = render(() => <DialogContent visible={true} />, container)
  return container
}

function activeTemplate (container) {
  return container.querySelector('.dialog-list-item.active')?.dataset.id
}

describe('DialogContent', () => {
  it('should select the top result of a new search', async () => {
    const container = mount()
    const searchField = container.querySelector('input[type=search]')

    await vi.waitFor(() => {
      expect(store.getTemplates).toHaveBeenCalled()
    })

    await userEvent.fill(searchField, 'nic')
    await vi.waitFor(() => {
      expect(activeTemplate(container)).to.equal('nic')
    })

    // replace the query, without going back to the full list
    await userEvent.fill(searchField, 'kind')
    await vi.waitFor(() => {
      expect(container.querySelectorAll('.dialog-list-item').length).to.equal(2)
    })

    expect(activeTemplate(container)).to.equal('kr')
  })

  it('should ignore search results that arrive after clearing the search', async () => {
    const container = mount()
    const searchField = container.querySelector('input[type=search]')

    await vi.waitFor(() => {
      expect(container.querySelectorAll('.dialog-list-item').length).to.equal(2)
    })

    let respond
    vi.mocked(store.searchTemplates).mockImplementationOnce((query) => {
      return new Promise((resolve) => {
        respond = () => resolve({query, results: searchResults[query]})
      })
    })

    await userEvent.fill(searchField, 'nic')
    await vi.waitFor(() => {
      expect(respond).to.be.a('function')
    })

    await userEvent.clear(searchField)
    respond()
    await new Promise((resolve) => setTimeout(resolve, 100))

    // the full list
    expect(container.querySelectorAll('.dialog-list-item').length).to.equal(2)
  })
})
