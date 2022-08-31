/// <reference types="cypress" />
/* globals cy, describe, before, it */

describe('CKEditor', () => {
  before(() => {
    cy.visit('./cypress/e2e/ckeditor4/ckeditor4.html')
      .wait(1000)
  })

  function getEditorFrame () {
    return cy
      .get('iframe')
      .its('0.contentDocument')
  }

  it('should insert template with keyboard shortcut', () => {
    getEditorFrame()
      .its('body')
      .type('kr')
      .tab()
      .wait(500)
      .should('have.text', 'Kind regards,.')
      .type('{selectAll}{del}')
  })

  it('should insert template from dialog', () => {
    getEditorFrame()
      .its('body')
      .type('{ctrl} ')

    getEditorFrame()
      .then(($el) => {
        return $el.querySelector('[visible=true]')
      })
      .should('be.visible')
      .shadow()
      .find('input[type=search]')
      .type('nic', {force: true})
      .wait(500)
      .type('{enter}')

    getEditorFrame()
      .its('body')
      .should('have.text', 'It was nice talking to you.')
      .then(($el) => {
        $el.innerHTML = ''
        return $el
      })
  })
})
