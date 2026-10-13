import { expect, describe, it, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest'

import { eventFormRender, eventFormClose } from '../../config.js'
import { respondToShow, destroy } from './form-dialog.js'

// the shadow root is closed, keep a reference to it
let root = null
const attachShadow = Element.prototype.attachShadow

let requests = []
let respond = async () => null

function dialog () {
  return root.querySelector('dialog')
}

function field (id, index = 0) {
  return root.getElementById(`field-${id}-${index}`)
}

function typeIn (input, value) {
  input.value = value
  input.dispatchEvent(new Event('input', {bubbles: true, composed: true}))
}

function relayed (event) {
  return requests.filter((request) => request.event === event)
}

const form = {
  id: 'form',
  frameId: 3,
  title: 'Order',
  html: 'Hi <input type="text" id="field-name-0" data-form-id="name" value="" required>',
}

describe('form dialog', () => {
  beforeAll(() => {
    Element.prototype.attachShadow = function (init) {
      root = attachShadow.call(this, init)
      return root
    }
  })

  beforeEach(() => {
    requests = []
    respond = async () => null
    window.browser.runtime.sendMessage = async ({type, data}) => {
      if (type === 'formRelay') {
        // the dialog keeps changing its values object
        requests.push(structuredClone(data))
        return respond(data)
      }
      return []
    }
  })

  afterEach(() => {
    destroy()
    delete window.browser.runtime.sendMessage
  })

  afterAll(() => {
    Element.prototype.attachShadow = attachShadow
  })

  it('should show the form', () => {
    expect(respondToShow(form)).to.equal(true)

    expect(dialog().open).to.equal(true)
    expect(root.querySelector('.briskine-form-header').textContent).to.equal('Order')
    expect(field('name')).to.be.instanceOf(HTMLInputElement)
    expect(root.activeElement).to.equal(field('name'))
  })

  it('should show one form at a time', () => {
    respondToShow(form)
    expect(respondToShow({...form, id: 'other'})).to.equal(false)
  })

  it('should sanitize the template', () => {
    respondToShow({
      ...form,
      html: '<form><button>b</button></form><style>*{}</style><img src="x" onerror="alert(1)"><dialog></dialog><script>alert(1)</script>ok',
    })

    const content = root.querySelector('.briskine-form-content')
    expect(content.innerHTML).to.equal('b<img src="x">ok')
  })

  it('should render again when a field changes', async () => {
    respond = async () => ({html: 'Hi <input type="text" id="field-name-0" data-form-id="name" value="Jane"> Jane'})
    respondToShow(form)

    typeIn(field('name'), 'Jane')

    await vi.waitFor(() => expect(root.querySelector('.briskine-form-content').textContent).to.contain('Jane'))
    expect(relayed(eventFormRender)).to.deep.equal([{
      event: eventFormRender,
      details: {
        id: 'form',
        values: {name: 'Jane'},
      },
      frameId: 3,
    }])
  })

  it('should keep the value of the focused field', async () => {
    respond = async () => ({html: 'Hi <input type="text" id="field-name-0" data-form-id="name" value="J">'})
    respondToShow(form)
    const input = field('name')
    input.focus()

    typeIn(input, 'Jane')
    await vi.waitFor(() => expect(relayed(eventFormRender).length).to.equal(1))
    await new Promise((resolve) => setTimeout(resolve))

    expect(field('name')).to.equal(input)
    expect(input.value).to.equal('Jane')
  })

  it('should read the value of each field type', async () => {
    respondToShow({
      ...form,
      html: `
        <input type="checkbox" id="field-ps-0" data-form-id="ps">
        <input type="number" id="field-amount-0" data-form-id="amount">
        <select id="field-tools-0" data-form-id="tools" multiple><option value="a">A</option><option value="b">B</option></select>
      `,
    })

    field('ps').checked = true
    field('ps').dispatchEvent(new Event('input', {bubbles: true, composed: true}))
    typeIn(field('amount'), '25')
    field('tools').options[1].selected = true
    field('tools').dispatchEvent(new Event('input', {bubbles: true, composed: true}))
    typeIn(field('amount'), '')

    await vi.waitFor(() => expect(relayed(eventFormRender).length).to.equal(4))
    expect(relayed(eventFormRender).map((request) => request.details.values)).to.deep.equal([
      {ps: true},
      {ps: true, amount: 25},
      {ps: true, amount: 25, tools: ['b']},
      {ps: true, amount: '', tools: ['b']},
    ])
  })

  it('should ignore an older render', async () => {
    let first
    respond = ({details}) => {
      if (details.values.name === 'J') {
        return new Promise((resolve) => first = resolve)
      }
      return Promise.resolve({html: 'newer'})
    }
    respondToShow(form)

    typeIn(field('name'), 'J')
    typeIn(field('name'), 'Jane')
    await vi.waitFor(() => expect(root.querySelector('.briskine-form-content').textContent).to.equal('newer'))

    first({html: 'older'})
    await new Promise((resolve) => setTimeout(resolve))
    expect(root.querySelector('.briskine-form-content').textContent).to.equal('newer')
  })

  it('should show render errors', async () => {
    respond = async () => ({error: 'Missing helper'})
    respondToShow(form)
    const error = root.querySelector('.briskine-form-error')
    expect(error.hidden).to.equal(true)

    typeIn(field('name'), 'Jane')

    await vi.waitFor(() => expect(error.hidden).to.equal(false))
    expect(error.textContent).to.equal('Missing helper')
    expect(field('name')).to.be.instanceOf(HTMLInputElement)
  })

  it('should insert on submit', async () => {
    respondToShow(form)
    typeIn(field('name'), 'Jane')

    root.querySelector('form').requestSubmit()

    await vi.waitFor(() => expect(relayed(eventFormClose).length).to.equal(1))
    expect(relayed(eventFormClose)[0]).to.deep.equal({
      event: eventFormClose,
      details: {
        id: 'form',
        values: {name: 'Jane'},
        insert: true,
      },
      frameId: 3,
    })
    expect(dialog().open).to.equal(false)
    expect(root.querySelector('.briskine-form-content').childNodes.length).to.equal(0)
  })

  it('should not insert with invalid fields', async () => {
    respondToShow(form)

    root.querySelector('form').requestSubmit()

    await new Promise((resolve) => setTimeout(resolve))
    expect(relayed(eventFormClose).length).to.equal(0)
    expect(dialog().open).to.equal(true)
  })

  it('should insert with ctrl+enter', async () => {
    respondToShow(form)
    typeIn(field('name'), 'Jane')

    field('name').dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter',
      ctrlKey: true,
      bubbles: true,
      composed: true,
    }))

    await vi.waitFor(() => expect(relayed(eventFormClose).length).to.equal(1))
    expect(relayed(eventFormClose)[0].details.insert).to.equal(true)
  })

  it('should cancel with the cancel button', async () => {
    respondToShow(form)

    root.querySelector('.briskine-form-cancel').click()

    await vi.waitFor(() => expect(relayed(eventFormClose).length).to.equal(1))
    expect(relayed(eventFormClose)[0].details.insert).to.equal(false)
    expect(dialog().open).to.equal(false)
  })

  it('should cancel with escape', async () => {
    respondToShow(form)

    dialog().dispatchEvent(new Event('cancel', {cancelable: true}))

    await vi.waitFor(() => expect(relayed(eventFormClose).length).to.equal(1))
    expect(relayed(eventFormClose)[0].details.insert).to.equal(false)
  })

  it('should keep key events from the page', () => {
    const pageListener = vi.fn()
    window.addEventListener('keydown', pageListener)
    respondToShow(form)

    field('name').dispatchEvent(new KeyboardEvent('keydown', {
      key: 'c',
      bubbles: true,
      composed: true,
    }))

    window.removeEventListener('keydown', pageListener)
    expect(pageListener).not.toHaveBeenCalled()
  })

  it('should show new fields for the next form', async () => {
    respondToShow(form)
    const input = field('name')
    root.querySelector('.briskine-form-cancel').click()

    respondToShow({...form, id: 'next'})

    expect(field('name')).not.to.equal(input)
  })
})
