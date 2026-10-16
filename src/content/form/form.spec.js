import { expect, describe, it, beforeEach, afterEach } from 'vitest'

import { eventFormShow, eventFormRender, eventFormClose } from '../../config.js'
import { trigger } from '../../store/store-content.js'
import { createSession } from '../utils/parse-template.js'
import { cursorMarker } from '../cursors/cursors.js'
import fillForm, { setup, destroy } from './form.js'

let relayed = []
let showResponse = true

function respondToRelay () {
  window.browser.runtime.sendMessage = async ({type, data}) => {
    if (type === 'getPlan') {
      return 'team'
    }

    if (type === 'formRelay') {
      relayed.push(data)
      if (showResponse instanceof Error) {
        throw showResponse
      }
      return showResponse
    }

    return []
  }
}

// the show request, once fillForm sent it
async function shown () {
  for (let i = 0; i < 50 && !relayed.length; i++) {
    await new Promise((resolve) => setTimeout(resolve))
  }
  return relayed[0]
}

// answer like the top frame would, through the background
async function send (event, details) {
  const [response] = await trigger(event, details)
  return response
}

async function open (template = 'Hi {{input id="name" value="there"}}{{cursor}}') {
  const session = await createSession()
  const filled = fillForm({
    template,
    session,
    title: 'Title',
  })
  const {details} = await shown()
  return {session, filled, id: details.id}
}

describe('form', () => {
  beforeEach(() => {
    relayed = []
    showResponse = true
    respondToRelay()
    setup()
  })

  afterEach(() => {
    destroy()
    delete window.browser.runtime.sendMessage
  })

  it('should show the form in the top frame', async () => {
    await open()

    const [request] = relayed
    expect(request.event).to.equal(eventFormShow)
    expect(request.frameId).to.equal(0)
    expect(request.details.title).to.equal('Title')
    expect(request.details.id).to.be.a('string')
    expect(request.details.html).to.equal('Hi <input type="text" class="form-control" id="field-name-0" data-form-id="name" aria-label="name" value="there">')
  })

  it('should strip cursor markers from the form', async () => {
    await open()
    expect(relayed[0].details.html).not.to.contain(cursorMarker)
  })

  it('should render the form with new values', async () => {
    const {session, id} = await open()

    const response = await send(eventFormRender, {
      id,
      values: {name: 'Jane'},
    })

    expect(response.html).to.contain('value="Jane"')
    expect(session.values.name).to.equal('Jane')
  })

  it('should return render errors', async () => {
    const {id} = await open('{{input type="checkbox" id="broken"}}{{#if @form.broken}}{{option "a"}}{{/if}}')

    expect(await send(eventFormRender, {
      id,
      values: {broken: true},
    })).to.deep.equal({error: '{{option}} must be used inside {{#select}}'})
  })

  it('should not render unknown forms', async () => {
    await open()
    expect(await send(eventFormRender, {id: 'unknown'})).to.equal(null)
  })

  it('should resolve true on insert, with the last values', async () => {
    const {session, filled, id} = await open()

    await send(eventFormClose, {
      id,
      values: {name: 'Jane'},
      insert: true,
    })

    expect(await filled).to.equal(true)
    expect(session.values.name).to.equal('Jane')
  })

  it('should resolve false on cancel', async () => {
    const {filled, id} = await open()

    await send(eventFormClose, {id})

    expect(await filled).to.equal(false)
  })

  it('should not render a closed form', async () => {
    const {filled, id} = await open()
    await send(eventFormClose, {id})
    await filled

    expect(await send(eventFormRender, {id})).to.equal(null)
  })

  it('should cancel when the top frame does not show the form', async () => {
    showResponse = null
    const {filled} = await open()

    expect(await filled).to.equal(false)
  })

  it('should cancel when the top frame can not be reached', async () => {
    showResponse = new Error('Could not establish connection')
    const {filled} = await open()

    expect(await filled).to.equal(false)
  })

  it('should cancel open forms when destroyed', async () => {
    const {filled} = await open()

    destroy()

    expect(await filled).to.equal(false)
  })
})
