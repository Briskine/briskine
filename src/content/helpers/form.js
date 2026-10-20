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
 *
 * Templates with fields open in a form before they're inserted,
 * then fields are replaced by their values.
 *
 */

import { escapeExpression, SafeString, createFrame } from '../../briskbars/briskbars.js'
import PremiumError from '../utils/premium-error.js'

const fieldClasses = {
  checkbox: 'form-check-input',
  color: 'form-control form-control-color',
}

const inputTypes = ['text', 'number', 'email', 'url', 'tel', 'date', 'time', 'datetime-local', 'month', 'week', 'color', 'checkbox']
const attributeNames = ['placeholder', 'min', 'max', 'step', 'pattern', 'rows', 'cols', 'size']
const maxVisibleOptions = 6

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

function selectDefault (hash = {}, choices = []) {
  if (toBoolean(hash.multiple)) {
    return hash.value === undefined ? [] : [].concat(hash.value).map(String)
  }

  return hash.value === undefined ? (choices[0]?.value ?? '') : String(hash.value)
}

export default function createForm ({
  values = {},
  fields = new Map(),
  mode = 'final',
  isFree = async () => false,
} = {}) {
  const occurrences = new Map()

  // claims the field's place before any await,
  // because sibling helpers render concurrently.
  function claim (name, options) {
    const id = options.hash.id
    if (id === undefined || id === '') {
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
      'aria-label': options.hash.label || options.hash.placeholder || id,
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
      throw new Error(`{{#select id="${claimed.id}"}} has more than one option with the value "${duplicate.value}"`)
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
