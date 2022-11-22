/**
 * Keyboard Shortcut Autocomplete
 */
import {autocomplete, getSelectedWord, getSelection} from './autocomplete.js'
import {isContentEditable} from './editors/editor-contenteditable.js'
import store from '../store/store-client.js'

import {keybind, keyunbind} from './keybind.js'

let shortcutCache = []
function updateShortcutCache (templates = []) {
  shortcutCache = templates.map((t) => t.shortcut).filter((shortcut) => shortcut)
}

// is input or textarea
function isTextfield (element) {
  return ['input', 'textarea'].includes(element.tagName.toLowerCase())
}

function getTemplates () {
  return store.getTemplates()
    .then((templates) => {
      updateShortcutCache(templates)
      return templates
    })
}

// pre-populate the shortcut cache on certain websites
function populateCache () {
  const urls = [
    '://docs.google.com/spreadsheets/',
  ]

  urls.find((url) => {
    if (window.location.href.includes(url)) {
      getTemplates()
      return true
    }
  })
}

store.on('templates-updated', populateCache)
store.on('login', populateCache)
store.on('logout', populateCache)
populateCache()

function getTemplateByShortcut (shortcut) {
  return getTemplates()
    .then((templates) => {
      return templates.find((t) => {
        return t.shortcut === shortcut
      })
    })
}

function keyboardAutocomplete (e) {
  let element = e.target
  // get target from shadow dom if event is composed
  if (e.composed) {
    const composedPath = e.composedPath()
    if (composedPath[0]) {
      element = e.composedPath()[0]
    }
  }

  // if it's not an editable element
  // don't trigger anything
  if (!isTextfield(element) && !isContentEditable(element)) {
    return
  }

  const word = getSelectedWord({
    element: element
  })

  if (word.text) {
    // cache selection details
    const selection = getSelection(element)
    const focusNode = selection.focusNode
    const focusOffset = selection.focusOffset
    const anchorNode = selection.anchorNode
    const anchorOffset = selection.anchorOffset

    if (shortcutCache.includes(word.text)) {
      e.preventDefault()
      e.stopImmediatePropagation()
    }

    getTemplateByShortcut(word.text)
      .then((template) => {
        if (template) {
          // restore selection
          element.focus()
          if (anchorNode && focusNode) {
            getSelection(element).setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset)
          }

          return autocomplete({
              element: element,
              quicktext: template,
              word: word,
          })
        }
      })
  }
}

let cachedKeyboardShortcut = ''

export function setup (settings = {}) {
  cachedKeyboardShortcut = settings.expand_shortcut
  // use custom keyboard shortcuts
  if (settings.expand_enabled) {
    keybind(
      cachedKeyboardShortcut,
      keyboardAutocomplete,
    )
  }
}

export function destroy () {
  keyunbind(cachedKeyboardShortcut, keyboardAutocomplete)
}
