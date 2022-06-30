/// <reference types="cypress" />
/* globals cy, describe, before, it */

describe('Slate', () => {
  before(() => {
    cy.visit('./cypress/e2e/slate/slate.html')
  })

  it('should insert template with keyboard shortcut', () => {
    cy.get('[contenteditable]')
      .type('kr')
      .tab()
      .wait(500)
      .should('have.text', 'Kind regards,\n.')
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
      .should('have.text', 'It was nice talking to you.')
      .type('{selectAll}{del}')
  })
})
