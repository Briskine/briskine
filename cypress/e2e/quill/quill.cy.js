/// <reference types="cypress" />
/* globals cy, describe, beforeEach, it, expect */

describe('Quill', () => {
  beforeEach(() => {
    cy.visit('./cypress/e2e/quill/quill.html')
  })

  it('should insert template with keyboard shortcut', () => {
    cy.get('.ql-editor')
      .type('kr')
      .tabEvent()
      .wait(500)
      .then(($el) => {
        // it includes the Tab character at the end,
        // since templates are not cached yet and preventDefault is not called.
        expect($el.html()).to.equal('<p>Kind regards,\n.\t</p>')
        return $el
      })
      .type('{selectAll}{del}')
  })

  it('should insert template from dialog', () => {
    cy.get('.ql-editor').type('{ctrl} ')
    cy.get('[visible=true]').should('be.visible')
    cy.focused()
      .shadow()
      .find('input[type=search]')
      .type('nic', {force: true})
      .wait(500)
      .type('{enter}')

    cy.get('.ql-editor')
      .then(($el) => {
        expect($el.html()).to.equal('<p>It was nice talking to you.</p>')
        return $el
      })
      .type('{selectAll}{del}')
  })
})
