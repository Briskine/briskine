/// <reference types="cypress" />
/* globals cy, describe, before, it */

describe('Slate', () => {
  before(() => {
    cy.visit('./cypress/e2e/shadow/shadow.html')
  })

  it('should insert template with keyboard shortcut', () => {
    cy.get('editor-shadow')
      .shadow()
      .find('[contenteditable]')
      .type('kr')
      .tabEvent()
      .wait(500)
      .should('have.text', 'Kind regards,.')
      .type('{selectAll}{backspace}')
  })

  it('should insert template from dialog', () => {
    cy.get('editor-shadow')
      .shadow()
      .find('[contenteditable]')
      .type('{ctrl} ')
    cy.get('[visible=true]').should('be.visible')
    cy.focused()
      .shadow()
      .find('input[type=search]')
      .type('nic', {force: true})
      .wait(500)
      .type('{enter}')

    cy.get('editor-shadow')
      .shadow()
      .find('[contenteditable]')
      .should('have.text', 'It was nice talking to you.')
      .type('{selectAll}{del}')
  })
})
