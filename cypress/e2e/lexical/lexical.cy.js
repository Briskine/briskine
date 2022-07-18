/// <reference types="cypress" />
/* globals cy, describe, before, it */

describe('Lexical', () => {
  before(() => {
    cy.visit('./cypress/e2e/lexical/lexical.html')
  })

  it('should insert template with keyboard shortcut', () => {
    cy.get('[contenteditable]')
      .type('kr')
      .tabEvent()
      .wait(1000)
      .should('have.text', 'Kind regards,.')
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
