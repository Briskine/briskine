/* globals Cypress */

Cypress.Commands.add('tabEvent', {prevSubject: true}, ($el) => {
  const eventOptions = {
    composed: true,
    bubbles: true,
    cancelable: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,

    key: 'Tab',
    code: 'Tab',
    keyCode: 9,
    which: 9,
    charCode: 0,
  }

  const element = $el.get(0)
  const keydown = new KeyboardEvent('keydown', eventOptions)

  element.dispatchEvent(keydown)
  return cy
    .now('focus', cy.$$(document.body))
    .then(() => {
      return $el
    })
})
