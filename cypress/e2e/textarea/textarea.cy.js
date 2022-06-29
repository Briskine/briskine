/// <reference types="cypress" />
/* globals cy, describe, before, it */

describe('Textarea', () => {
  before(() => {
    cy.visit('./cypress/e2e/textarea/textarea.html')
  })

  it('should insert template with keyboard shortcut in textarea', () => {
    cy.get('textarea').type('kr').tab()
    cy.get('textarea').should('have.value', 'Kind regards,\n.')
    cy.get('textarea').type('{selectAll}{del}')
  })

  it('should insert template from dialog in textarea', () => {
    cy.get('textarea').type('{ctrl} ')
    cy.get('[visible=true]').should('be.visible')
    cy.focused()
      .shadow()
      .find('input[type=search]')
      .type('nic', {force: true})
      .wait(500)
      .type('{enter}')

    cy.get('textarea').should('have.value', 'It was nice talking to you.')
  })

  it('should insert template with keyboard shortcut in input', () => {
    cy.get('input').type('kr').tab()
    cy.get('input').should('have.value', 'Kind regards,.')
    cy.get('input').type('{selectAll}{del}')
  })

  it('should insert template from dialog in input', () => {
    cy.get('input').type('{ctrl} ')
    cy.focused()
      .shadow()
      .find('input[type=search]')
      .type('nic', {force: true})
      .wait(500)
      .type('{enter}')
    cy.get('input').should('have.value', 'It was nice talking to you.')
  })
})
