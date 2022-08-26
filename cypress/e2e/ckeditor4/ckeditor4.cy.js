/// <reference types="cypress" />
/* globals cy, describe, before, it */

describe('CKEditor', () => {
  before(() => {
    cy.visit('./cypress/e2e/ckeditor4/ckeditor4.html')
      .wait(1000)
  })

  it('should insert template with keyboard shortcut', () => {
    cy.get('.cke_wysiwyg_frame')
      .its('0.contentDocument.body')
      .type('kr')
      .tab()
      .wait(500)
      .should('have.text', 'Kind regards,.')
      .type('{selectAll}{del}')
  })

  it('should insert template from dialog', () => {
    cy.get('.cke_wysiwyg_frame')
      .its('0.contentDocument.body')
      .type('{ctrl}')
    cy.get('[visible=true]').should('be.visible')
    cy.focused()
      .shadow()
      .find('input[type=search]')
      .type('nic', {force: true})
      .wait(500)
      .type('{enter}')

    cy.get('.cke_wysiwyg_frame')
      .its('0.contentDocument.body')
      .should('have.text', 'It was nice talking to you.')
      .type('{selectAll}{del}')
  })
})
