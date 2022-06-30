/// <reference types="cypress" />
/* globals cy, describe, before, it, expect */

describe('ProseMirror', () => {
  before(() => {
    cy.visit('./cypress/e2e/prosemirror/prosemirror.html')
  })

  it('should insert template with keyboard shortcut', () => {
    cy.get('[contenteditable]')
      .type('kr')
      .tab()
      .wait(500)
      .then(($el) => {
        expect($el.html()).to.equal('<p>Kind regards,<br>.</p>')
        return $el
      })
      .type('{selectAll}{del}')
  })

  it('should insert template from dialog', () => {
    cy.get('[contenteditable]').type('{ctrl} ')
    cy.get('[visible=true]').should('be.visible')
    cy.focused()
      .shadow()
      .find('input[type=search]')
      .type('nic', {force: true})
      .wait(500)
      .type('{enter}')

    cy.get('[contenteditable]')
      .then(($el) => {
        expect($el.html()).to.equal('<p>It was nice talking to you.</p>')
        return $el
      })
      .type('{selectAll}{del}')
  })
})
