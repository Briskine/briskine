import {describe, it, expect, afterEach} from 'vitest'
import {createSignal, Show} from 'solid-js'
import {render} from 'solid-js/web'

import DialogList from './dialog-list.js'

const templates = [
  {id: 'one', title: 'One', body: 'one', _body_plaintext: 'one', shortcut: 'o', tags: []},
  {id: 'two', title: 'Two', body: 'two', _body_plaintext: 'two', shortcut: 't', tags: []},
]

let dispose = () => {}

afterEach(() => {
  dispose()
  document.body.innerHTML = ''
})

function mount (component) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  dispose = render(component, container)
}

describe('DialogList', () => {
  it('should select the active template', () => {
    const selected = []
    let controls
    mount(() => (
      <DialogList
        list={templates}
        callbackSelectItem={(id) => selected.push(id)}
        controls={(c) => controls = c}
        />
    ))

    controls.move('next')
    controls.selectActive()

    expect(selected).to.deep.equal(['two'])
  })

  it('should not select a template when the list is emptied', () => {
    const selected = []
    let controls
    const [list, setList] = createSignal(templates)
    mount(() => (
      <DialogList
        list={list()}
        callbackSelectItem={(id) => selected.push(id)}
        controls={(c) => controls = c}
        />
    ))

    setList([])
    controls.selectActive()

    expect(selected).to.deep.equal([])
  })

  it('should not select a template from an empty list', () => {
    const selected = []
    let controls
    mount(() => (
      <DialogList
        list={[]}
        callbackSelectItem={(id) => selected.push(id)}
        controls={(c) => controls = c}
        />
    ))

    controls.selectActive()

    expect(selected).to.deep.equal([])
  })

  it('should clear the controls when removed', () => {
    let controls
    const [visible, setVisible] = createSignal(true)
    mount(() => (
      <Show when={visible()}>
        <DialogList
          list={templates}
          controls={(c) => controls = c}
          />
      </Show>
    ))

    expect(controls).to.be.an('object')
    setVisible(false)
    expect(controls).to.equal(null)
  })

  it('should keep the controls of the list that replaced it', () => {
    const selected = []
    let controls
    const [search, setSearch] = createSignal(false)
    mount(() => (
      <Show
        when={search()}
        fallback={(
          <DialogList
            list={templates}
            callbackSelectItem={(id) => selected.push(`full-${id}`)}
            controls={(c) => controls = c}
            />
        )}
        >
        <DialogList
          list={templates.slice(1)}
          callbackSelectItem={(id) => selected.push(`search-${id}`)}
          controls={(c) => controls = c}
          />
      </Show>
    ))

    setSearch(true)
    controls.selectActive()
    setSearch(false)
    controls.selectActive()

    expect(selected).to.deep.equal(['search-two', 'full-one'])
  })
})
