/// <reference types="cypress" />
/* globals cy, describe, before, it, expect */

describe('ContentEditable', () => {
  before(() => {
    cy.visit('./cypress/e2e/ckeditor/ckeditor.html')
  })

  it('should insert template with keyboard shortcut in ckeditor', () => {
    cy.get('[contenteditable]')
      .type('kr')
      .tab()
      .wait(500)
      .then(($el) => {
        expect($el.html()).to.equal('<p>Kind regards,</p><p>.</p>')
        return $el
      })
      .type('{selectAll}{del}')
  })

  it('should insert template from dialog in contenteditable', () => {
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
