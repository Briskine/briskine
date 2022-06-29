/* globals Cypress */

Cypress.Commands.add('tabEvent', {prevSubject: true},($el) => {
  $el.get(0).dispatchEvent(new KeyboardEvent('keydown', {
    key: 'Tab',
    code: 'Tab',
    keyCode: 9,
    which: 9,
    charCode: 0,
  }))
  return $el
})

