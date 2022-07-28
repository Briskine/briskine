/// <reference types="cypress" />
/* globals cy, describe, before, it */

describe('Draft.js', () => {
  before(() => {
    cy.visit('./cypress/e2e/draft-js/draft-js.html')
  })

  // draft.js insert does not work on Firefox
  it('should insert template with keyboard shortcut', {browser: 'chrome'}, () => {
    cy.get('[contenteditable]')
      .type('kr')
      .tabEvent()
      .wait(500)
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
