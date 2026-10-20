import { expect, describe, it, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest'
import { Idiomorph } from 'idiomorph'

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

function pressEscape () {
  field('name').dispatchEvent(new KeyboardEvent('keydown', {
    key: 'Escape',
    bubbles: true,
    composed: true,
  }))
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

  it('should show the next form when one fails to open', () => {
    // creates the dialog
    respondToShow(form)
    root.querySelector('.briskine-form-cancel').click()
    vi.spyOn(dialog(), 'showModal').mockImplementationOnce(() => {
      throw new DOMException('Invalid state', 'InvalidStateError')
    })

    expect(respondToShow(form)).to.equal(null)
    expect(dialog().open).to.equal(false)
    expect(field('name')).to.equal(null)

    expect(respondToShow({...form, id: 'other'})).to.equal(true)
    expect(dialog().open).to.equal(true)
  })

  it('should show the form when the page removed the dialog', () => {
    respondToShow(form)
    root.querySelector('.briskine-form-cancel').click()
    const host = root.host

    host.remove()
    expect(respondToShow(form)).to.equal(true)
    expect(dialog().open).to.equal(true)
    root.querySelector('.briskine-form-cancel').click()

    host.remove()
    document.body.appendChild(host)
    expect(respondToShow({...form, id: 'other'})).to.equal(true)
    expect(dialog().open).to.equal(true)
    expect(document.querySelectorAll(host.tagName).length).to.equal(1)
  })

  it('should sanitize the template', () => {
    respondToShow({
      ...form,
      html: '<form><button>b</button></form><style>*{}</style><img src="x" onerror="alert(1)"><dialog></dialog><script>alert(1)</script>ok',
    })

    const content = root.querySelector('.briskine-form-content')
    expect(content.innerHTML).to.equal('b<img src="x">ok')
  })

  describe('hidden blocks', () => {
    const start = '<span data-briskine-hidden="start"></span>'
    const end = '<span data-briskine-hidden="end"></span>'

    function content () {
      return root.querySelector('.briskine-form-content').innerHTML
    }

    it('should highlight hidden blocks', () => {
      respondToShow({
        ...form,
        html: `a${start}<b>note</b>${end}b`,
      })

      expect(content()).to.equal('a<div class="briskine-form-hidden"><b>note</b></div>b')
    })

    it('should highlight hidden blocks over several lines', () => {
      respondToShow({
        ...form,
        html: `<div>${start}</div><div>note</div><div>${end}</div><div>text</div>`,
      })

      // the lines the block starts and ends in are left empty
      expect(content()).to.equal('<div></div><div class="briskine-form-hidden"><div></div><div>note</div><div></div></div><div></div><div>text</div>')
    })

    it('should highlight nested hidden blocks', () => {
      respondToShow({
        ...form,
        html: `${start}a${start}b${end}c${end}`,
      })

      expect(content()).to.equal('<div class="briskine-form-hidden">a<div class="briskine-form-hidden">b</div>c</div>')
    })

    it('should keep the fields in hidden blocks when rendering again', async () => {
      const html = `${start}<input type="checkbox" id="field-ps-0" data-form-id="ps">${end}`
      respond = async () => ({html: html})
      respondToShow({...form, html})
      const checkbox = field('ps')

      checkbox.checked = true
      checkbox.dispatchEvent(new Event('input', {bubbles: true, composed: true}))
      await vi.waitFor(() => expect(relayed(eventFormRender).length).to.equal(1))
      await new Promise((resolve) => setTimeout(resolve))

      expect(field('ps')).to.equal(checkbox)
      expect(checkbox.parentElement.className).to.equal('briskine-form-hidden')
    })
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

    const rendered = (count) => vi.waitFor(() => expect(relayed(eventFormRender).length).to.equal(count))

    field('ps').checked = true
    field('ps').dispatchEvent(new Event('input', {bubbles: true, composed: true}))
    await rendered(1)
    typeIn(field('amount'), '25')
    await rendered(2)
    field('tools').options[1].selected = true
    field('tools').dispatchEvent(new Event('input', {bubbles: true, composed: true}))
    await rendered(3)
    typeIn(field('amount'), '')
    await rendered(4)

    expect(relayed(eventFormRender).map((request) => request.details.values)).to.deep.equal([
      {ps: true},
      {ps: true, amount: 25},
      {ps: true, amount: 25, tools: ['b']},
      {ps: true, amount: '', tools: ['b']},
    ])
  })

  it('should render once more with the latest values', async () => {
    let first
    respond = ({details}) => {
      if (details.values.name === 'J') {
        return new Promise((resolve) => first = resolve)
      }
      return Promise.resolve({html: 'newer'})
    }
    respondToShow(form)

    typeIn(field('name'), 'J')
    typeIn(field('name'), 'Ja')
    typeIn(field('name'), 'Jan')
    typeIn(field('name'), 'Jane')
    expect(relayed(eventFormRender).length).to.equal(1)

    first({html: 'older'})
    await vi.waitFor(() => expect(root.querySelector('.briskine-form-content').textContent).to.equal('newer'))
    expect(relayed(eventFormRender).map((request) => request.details.values.name)).to.deep.equal(['J', 'Jane'])
  })

  it('should not show a render when values changed during it', async () => {
    let first
    let second
    respond = ({details}) => {
      if (details.values.name === 'J') {
        return new Promise((resolve) => first = resolve)
      }
      return new Promise((resolve) => second = resolve)
    }
    respondToShow(form)

    typeIn(field('name'), 'J')
    typeIn(field('name'), 'Jane')
    first({html: 'older'})
    await vi.waitFor(() => expect(second).to.be.a('function'))
    expect(root.querySelector('.briskine-form-content').textContent).not.to.equal('older')

    second({html: 'newer'})
    await vi.waitFor(() => expect(root.querySelector('.briskine-form-content').textContent).to.equal('newer'))
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

  it('should show a failed render, and render again', async () => {
    respond = async ({details}) => ({html: details.values.name})
    vi.spyOn(Idiomorph, 'morph').mockImplementationOnce(() => {
      throw new Error('morph')
    })
    respondToShow(form)

    const error = root.querySelector('.briskine-form-error')

    typeIn(field('name'), 'J')
    await vi.waitFor(() => expect(error.textContent).to.equal('morph'))
    expect(error.hidden).to.equal(false)

    typeIn(field('name'), 'Jane')
    await vi.waitFor(() => expect(root.querySelector('.briskine-form-content').textContent).to.equal('Jane'))
    expect(error.hidden).to.equal(true)
    vi.restoreAllMocks()
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

  it('should cancel with the close button', async () => {
    respondToShow(form)

    root.querySelector('.briskine-form-close').click()

    await vi.waitFor(() => expect(relayed(eventFormClose).length).to.equal(1))
    expect(relayed(eventFormClose)[0].details.insert).to.equal(false)
    expect(dialog().open).to.equal(false)
  })

  it('should cancel when the dialog is destroyed', async () => {
    respondToShow(form)

    destroy()

    await vi.waitFor(() => expect(relayed(eventFormClose).length).to.equal(1))
    expect(relayed(eventFormClose)[0].details.insert).to.equal(false)
  })

  it('should cancel with escape', async () => {
    respondToShow(form)

    dialog().dispatchEvent(new Event('cancel', {cancelable: true}))

    await vi.waitFor(() => expect(relayed(eventFormClose).length).to.equal(1))
    expect(relayed(eventFormClose)[0].details.insert).to.equal(false)
  })

  it('should cancel when the browser closes the dialog', async () => {
    respondToShow(form)

    dialog().close()

    await vi.waitFor(() => expect(relayed(eventFormClose).length).to.equal(1))
    expect(relayed(eventFormClose)[0].details.insert).to.equal(false)
    expect(respondToShow({...form, id: 'other'})).to.equal(true)
  })

  it('should close the form once', async () => {
    respondToShow(form)

    root.querySelector('.briskine-form-cancel').click()
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(relayed(eventFormClose).length).to.equal(1)
  })

  it('should keep the escape keyup from the page', () => {
    const keyups = []
    const listener = (e) => keyups.push(e.key)
    document.addEventListener('keyup', listener)
    vi.useFakeTimers()

    respondToShow(form)
    pressEscape()
    // without a cancel event, like chrome without user activation
    dialog().close()

    document.body.dispatchEvent(new KeyboardEvent('keyup', {key: 'a', bubbles: true}))
    document.body.dispatchEvent(new KeyboardEvent('keyup', {key: 'Escape', bubbles: true}))
    document.body.dispatchEvent(new KeyboardEvent('keyup', {key: 'Escape', bubbles: true}))
    expect(keyups).to.deep.equal(['a', 'Escape'])

    vi.useRealTimers()
    document.removeEventListener('keyup', listener)
  })

  it('should stop waiting for the escape keyup', () => {
    const keyups = []
    const listener = (e) => keyups.push(e.key)
    document.addEventListener('keyup', listener)
    vi.useFakeTimers()

    respondToShow(form)
    pressEscape()
    dialog().close()
    vi.advanceTimersByTime(1000)

    document.body.dispatchEvent(new KeyboardEvent('keyup', {key: 'Escape', bubbles: true}))
    expect(keyups).to.deep.equal(['Escape'])

    vi.useRealTimers()
    document.removeEventListener('keyup', listener)
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
