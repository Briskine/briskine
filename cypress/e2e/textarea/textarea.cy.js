/// <reference types="cypress" />

describe('Textarea', () => {
  before(() => {
    cy.visit('./cypress/e2e/textarea/textarea.html')
  })

  it('should insert template with keyboard shortcut in textarea', () => {
    cy.get('textarea').type('kr').tab()
    cy.get('textarea').should('have.value', 'Kind regards,\n.')
    cy.get('textarea').type('{selectAll}{del}')
  })

  it('should open the dialog in textarea', () => {
    cy.get('textarea').type('{ctrl} ')
    cy.get('[visible=true]').should('be.visible')
  })

  it('should insert template from dialog in textarea', () => {
    cy.focused().shadow().find('input[type=search]').type('kr{enter}', {force: true})
    cy.get('textarea').should('have.value', 'Kind regards,\n.')
  })

  it('should insert template with keyboard shortcut in input', () => {
    cy.get('input').type('kr').tab()
    cy.get('input').should('have.value', 'Kind regards,.')
    cy.get('input').type('{selectAll}{del}')
  })

  it('should insert template from dialog in input', () => {
    cy.get('input').type('{ctrl} ')
    cy.focused().shadow().find('input[type=search]').type('kr{enter}', {force: true})
    cy.get('input').should('have.value', 'Kind regards,.')
  })
})
