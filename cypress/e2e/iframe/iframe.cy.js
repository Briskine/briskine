/// <reference types="cypress" />
/* globals cy, describe, beforeEach, it */

describe('Slate', () => {
  beforeEach(() => {
    cy.visit('./cypress/e2e/iframe/iframe.html')
  })

  it('should insert template with keyboard shortcut', () => {
    cy.get('iframe')
      .its('0.contentDocument.body')
      .find('[contenteditable]')
      .type('kr')
      .tabEvent()
      .wait(500)
      .should('have.text', 'Kind regards,.')
      .type('{selectAll}{backspace}')
  })

  it('should insert template from dialog', () => {
    cy.get('iframe')
      .its('0.contentDocument.body')
      .find('[contenteditable]')
      .type('{ctrl} ')

    cy.get('iframe')
      .its('0.contentDocument.body')
      .parent()
      .find('[visible=true]')
      .shadow()
      .find('input[type=search]')
      .type('nic', {force: true})
      .wait(500)
      .type('{enter}')

    cy.get('iframe')
      .its('0.contentDocument.body')
      .find('[contenteditable]')
      .should('have.text', 'It was nice talking to you.')
      .type('{selectAll}{del}')
  })
})
