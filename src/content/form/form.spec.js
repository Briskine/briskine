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
    if (type === 'isFreePlan') {
      return false
    }

    if (type === 'frameRelay') {
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
  // some tests expect a rejection, after it happened
  filled.catch(() => {})
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

  describe('fields without an id in loops', () => {
    function keys (html) {
      return [...html.matchAll(/data-form-id="([^"]+)"/g)].map((match) => match[1])
    }

    // the keys once the defaults are filled in. autocomplete renders the
    // template once before it opens the form dialog, open() doesn't.
    async function rendered (id) {
      return keys((await send(eventFormRender, {id, values: {}})).html)
    }

    it('should carry a value over when the text of an item is edited', async () => {
      const {id} = await open('{{input id="tags" value="Gm,Outlook"}}{{#each (text @form.tags "split" ",")}}[{{this}}:{{input}}]{{/each}}')
      const [, gm] = await rendered(id)

      await send(eventFormRender, {id, values: {[gm]: 'g'}})
      // the form dialog sends every value changed since it opened
      const response = await send(eventFormRender, {id, values: {[gm]: 'g', tags: 'Gma,Outlook'}})

      expect(response.html).to.match(/\[Gma:<input[^>]*value="g"/)
    })

    it('should not carry a value over when a select changes', async () => {
      const {id} = await open('{{#select id="sites" multiple=true value="Gmail"}}{{option "Gmail"}}{{option "Outlook"}}{{/select}}{{#each @form.sites}}[{{this}}:{{input}}]{{/each}}')
      const [, gmail] = await rendered(id)
      expect(gmail).to.be.a('string')

      await send(eventFormRender, {id, values: {[gmail]: 'g'}})
      const response = await send(eventFormRender, {id, values: {[gmail]: 'g', sites: ['Outlook']}})

      expect(response.html).to.match(/\[Outlook:<input[^>]*value=""/)
    })

    it('should not let an old value from the form dialog undo a carried-over value', async () => {
      const {session, id} = await open('{{input id="tags" value="Gm"}}{{input id="other"}}{{#each (text @form.tags "split" ",")}}[{{this}}:{{input}}]{{/each}}')
      const [, , gm] = await rendered(id)

      // the form dialog keeps every value changed since it opened
      const values = {[gm]: 'old'}
      await send(eventFormRender, {id, values: {...values}})
      values.tags = 'Gma'
      const carried = await send(eventFormRender, {id, values: {...values}})
      const [, , gma] = keys(carried.html)

      values[gma] = 'new'
      await send(eventFormRender, {id, values: {...values}})
      values.tags = 'Gm'
      await send(eventFormRender, {id, values: {...values}})
      expect(session.values[gm]).to.equal('new')

      // still sends the out of date value for gm
      values.other = 'x'
      const response = await send(eventFormRender, {id, values: {...values}})
      expect(session.values[gm]).to.equal('new')
      expect(response.html).to.match(/\[Gm:<input[^>]*value="new"/)
    })

    it('should carry a value over on insert', async () => {
      const {session, filled, id} = await open('{{input id="tags" value="Gm"}}{{#each (text @form.tags "split" ",")}}[{{this}}:{{input}}]{{/each}}')
      const [, gm] = await rendered(id)
      await send(eventFormRender, {id, values: {[gm]: 'g'}})

      // edited and inserted before the form dialog rendered it
      await send(eventFormClose, {id, values: {[gm]: 'g', tags: 'Gma'}, insert: true})
      expect(await filled).to.equal(true)
      expect(session.textEdit).to.equal(true)
    })
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

  it('should cancel when another form is open', async () => {
    showResponse = false
    const {filled} = await open()

    expect(await filled).to.equal(false)
  })

  it('should fail when the top frame does not answer', async () => {
    showResponse = null
    const {filled} = await open()

    await expect(filled).rejects.toThrow('can\'t be shown on this page')
  })

  it('should fail when the top frame can not be reached', async () => {
    showResponse = new Error('Could not establish connection')
    const {filled} = await open()

    await expect(filled).rejects.toThrow('can\'t be shown on this page')
  })

  it('should cancel open forms when destroyed', async () => {
    const {filled} = await open()

    destroy()

    expect(await filled).to.equal(false)
  })
})
