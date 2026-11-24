/*
 * Form helpers
 *
 * {{input id="name" placeholder="Name" required=true}}
 * {{input type="number" id="amount" value=10 min=0}}
 * {{input type="checkbox" id="ps" checked=true}}
 * {{input type="datetime-local" id="when"}} {{moment @form.when format="LLLL"}}
 * {{input type="color" id="highlight" value="#ffcc00"}}
 * {{textarea id="notes" rows=3}}
 * {{#select id="tone"}}{{option "Formal"}}{{option "Casual" value="casual"}}{{/select}}
 * {{#select id="intro"}}{{#option label="Long"}}<p>Dear Sir,</p>{{/option}}{{/select}}
 * {{#if @form.ps}}P.S. ...{{/if}}
 * {{#each list}}{{this}}: {{input}}{{/each}}
 *
 * Templates with fields open in a form before they're inserted,
 * then fields are replaced by their values.
 *
 * Fields with an id share one value, available as @form.<id>.
 * Fields without an id get a key from where they're written
 * (the template text, line and column) and the loop items they render for,
 * so they keep their value while other fields appear and disappear.
 * Their values aren't in @form.
 *
 */

import { escapeExpression, SafeString, createFrame, loopEntry } from '../../briskbars/briskbars.js'
import PremiumError from '../utils/premium-error.js'

const fieldClasses = {
  checkbox: 'form-check-input',
  color: 'form-control form-control-color',
}

const inputTypes = ['text', 'number', 'email', 'url', 'tel', 'date', 'time', 'datetime-local', 'month', 'week', 'color', 'checkbox']
const attributeNames = ['placeholder', 'min', 'max', 'step', 'pattern', 'rows', 'cols', 'size']
const maxVisibleOptions = 6

// keys of fields without an id start with this, so they can't be a user id
export const generatedKeyPrefix = '~'

// ids can be numbers, like id=@index
export function isGeneratedKey (key = '') {
  return String(key).startsWith(generatedKeyPrefix)
}

// undefined when the value can't be serialized
function serialize (value) {
  try {
    return JSON.stringify(value)
  } catch {
    return undefined
  }
}

// a short id for a long string, the same one for the whole form session
function intern (ids, text) {
  if (!ids.has(text)) {
    ids.set(text, String(ids.size + 1))
  }
  return ids.get(text)
}

function renderAttributes (attributes = {}) {
  return Object.entries(attributes)
    .filter(([, value]) => value !== undefined && value !== null && value !== false)
    .map(([name, value]) => value === true ? ` ${name}` : ` ${name}="${escapeExpression(String(value))}"`)
    .join('')
}

// checked="false" is false
function toBoolean (value) {
  return value !== 'false' && Boolean(value)
}

function inputDefault (type, hash = {}) {
  if (type === 'checkbox') {
    return toBoolean(hash.checked)
  }

  if (type === 'number' && hash.value !== undefined && hash.value !== '') {
    return Number(hash.value)
  }

  return hash.value ?? ''
}

// value="..." only selects existing options
function selectDefault (hash = {}, choices = []) {
  const values = [].concat(hash.value ?? []).map(String)
    .filter((value) => choices.some((choice) => choice.value === value))

  if (toBoolean(hash.multiple)) {
    return values
  }

  return values[0] ?? choices[0]?.value ?? ''
}

export default function createForm ({
  values = {},
  fields = new Map(),
  // short ids for template texts and item paths, kept for the form session
  ids = new Map(),
  mode = 'final',
  isFree = async () => false,
} = {}) {
  const occurrences = new Map()
  // per render, since the lists are new on every render
  const listItemIds = new WeakMap()

  // the id of every item in a list, worked out once per list: a short id for
  // its content, so large items don't make long keys, and which occurrence of
  // that content it is, so two items with the same content are still two items.
  function itemIds (items) {
    if (!listItemIds.has(items)) {
      const seen = new Map()
      listItemIds.set(items, items.map((item, index) => {
        const content = serialize(item)
        if (content === undefined) {
          return `#${index}`
        }

        const id = `v${intern(ids, content)}`
        const count = (seen.get(id) ?? 0) + 1
        seen.set(id, count)
        return count > 1 ? `${id}#${count}` : id
      }))
    }
    return listItemIds.get(items)
  }

  // the item a loop iteration renders: its key for objects and Maps,
  // and its content for lists.
  function itemId (entry) {
    if (entry.items === null) {
      // object keys of a Map can't be told apart by their content
      const key = entry.key
      const primitive = key === null || (typeof key !== 'object' && typeof key !== 'function')
      const serialized = primitive ? serialize(key) : undefined
      return serialized === undefined ? `#${entry.index}` : `k${intern(ids, serialized)}`
    }

    return itemIds(entry.items)[entry.index]
  }

  // undefined for a template parsed without locations
  function generatedKey (options) {
    const loc = options.loc
    if (!loc) {
      return undefined
    }

    const site = `${intern(ids, loc.source ?? '')}:${loc.start.line}:${loc.start.column}`
    // outermost loop first
    const items = []
    for (let entry = loopEntry(options.data); entry; entry = entry.parent) {
      items.unshift(itemId(entry))
    }

    return generatedKeyPrefix + intern(ids, `${site}\n${JSON.stringify(items)}`)
  }

  // claims the field's place before any await,
  // because sibling helpers render concurrently.
  function claim (name, options) {
    let id = options.hash.id
    if (id === undefined || id === '') {
      id = generatedKey(options)
    } else if (isGeneratedKey(id)) {
      throw new Error(`{{${name}}} ids can't start with ${generatedKeyPrefix}`)
    }
    if (id === undefined) {
      throw new Error(`{{${name}}} needs an id`)
    }

    // keeps fields in template order
    if (!fields.has(id)) {
      fields.set(id, null)
    }

    const count = occurrences.get(id) ?? 0
    occurrences.set(id, count + 1)

    return {id, count}
  }

  async function checkPlan () {
    if (await isFree()) {
      throw new PremiumError('Forms are only available for Briskine Premium users.')
    }
  }

  function register ({id, count}, options, field) {
    // the first field with an id defines it
    if (count === 0) {
      fields.set(id, field)
    }

    const attributes = {
      id: `field-${id}-${count}`,
      'data-form-id': id,
      'aria-label': options.hash.label || options.hash.placeholder || (isGeneratedKey(id) ? undefined : id),
    }
    attributeNames.forEach((name) => attributes[name] = options.hash[name])
    attributes.required = toBoolean(options.hash.required)

    return {
      value: Object.hasOwn(values, id) ? values[id] : (fields.get(id) ?? field).default,
      attributes,
    }
  }

  async function input (...args) {
    const options = args.pop()
    const claimed = claim('input', options)
    await checkPlan()
    const type = inputTypes.includes(options.hash.type) ? options.hash.type : 'text'
    const {value, attributes} = register(claimed, options, {
      type,
      default: inputDefault(type, options.hash),
    })

    if (mode === 'form') {
      const state = type === 'checkbox' ? {checked: Boolean(value)} : {value}
      const inputAttributes = renderAttributes({
        type,
        class: fieldClasses[type] || 'form-control',
        ...attributes,
        ...state,
      })
      return new SafeString(`<input${inputAttributes}>`)
    }

    return type === 'checkbox' ? '' : value
  }

  async function textarea (...args) {
    const options = args.pop()
    const claimed = claim('textarea', options)
    await checkPlan()
    const {value, attributes} = register(claimed, options, {
      type: 'textarea',
      default: options.hash.value ?? '',
    })

    if (mode === 'form') {
      // the leading newline is dropped by the html parser, keeps one in the value
      const textareaAttributes = renderAttributes({
        class: 'form-control',
        ...attributes,
      })
      return new SafeString(`<textarea${textareaAttributes}>\n${escapeExpression(value)}</textarea>`)
    }

    return new SafeString(escapeExpression(value).replace(/\r?\n/g, '<br>'))
  }

  async function select (...args) {
    const options = args.pop()
    if (!options.fn) {
      throw new Error('Must pass a block to #select')
    }

    const claimed = claim('select', options)
    await checkPlan()

    const choices = []
    const frame = createFrame(options.data)
    frame.select = choices
    await options.fn(this, {data: frame})

    const duplicate = choices.find((choice, index) => choices.findIndex((c) => c.value === choice.value) !== index)
    if (duplicate) {
      // generated keys mean nothing to the person who wrote the template
      const select = isGeneratedKey(claimed.id) ? '{{#select}}' : `{{#select id="${claimed.id}"}}`
      throw new Error(`${select} has more than one option with the value "${duplicate.value}"`)
    }

    const multiple = toBoolean(options.hash.multiple)
    const {value, attributes} = register(claimed, options, {
      type: multiple ? 'select-multiple' : 'select',
      default: selectDefault(options.hash, choices),
    })
    const selected = [].concat(value ?? []).map(String)

    if (mode === 'form') {
      const optionsHtml = choices
        .map((choice) => {
          const optionAttributes = renderAttributes({
            value: choice.value,
            selected: selected.includes(choice.value),
          })
          return `<option${optionAttributes}>${escapeExpression(choice.label)}</option>`
        })
        .join('')
      const selectAttributes = renderAttributes({
        class: 'form-select',
        ...attributes,
        multiple,
        size: attributes.size ?? (multiple && Math.min(choices.length, maxVisibleOptions) || undefined),
      })
      return new SafeString(`<select${selectAttributes}>${optionsHtml}</select>`)
    }

    return new SafeString(
      selected
        .map((selectedValue) => {
          const choice = choices.find((c) => c.value === selectedValue)
          return choice?.html ?? escapeExpression(selectedValue)
        })
        .join(', ')
    )
  }

  async function option (...args) {
    const options = args.pop()
    const choices = options.data?.select
    if (!choices) {
      throw new Error('{{option}} must be used inside {{#select}}')
    }

    if (options.fn) {
      if (!options.hash.label) {
        throw new Error('{{#option}} needs a label')
      }

      // added before rendering, to keep the template order
      const choice = {
        label: String(options.hash.label),
        value: String(options.hash.value ?? options.hash.label),
        html: '',
      }
      choices.push(choice)
      choice.html = String(await options.fn(this))
      return ''
    }

    const [label = ''] = args
    choices.push({
      label: String(label),
      value: String(options.hash.value ?? label),
    })
    return ''
  }

  return {input, textarea, select, option}
}
