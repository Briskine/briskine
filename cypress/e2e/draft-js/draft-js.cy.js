/// <reference types="cypress" />
/* globals cy, describe, before, it */

describe('Draft.js', () => {
  before(() => {
    cy.visit('./cypress/e2e/draft-js/draft-js.html')
  })

  it('should insert template with keyboard shortcut', () => {
    cy.get('[contenteditable]')
      .type('kr')
      .tabEvent()
      .wait(500)
      .then(($el) => {
        expect($el.text()).to.equal('Kind regards,.')
        return $el
      })
      .type('{selectAll}{del}')
  })

  it('should insert template from dialog', () => {
    cy.get('[contenteditable]').type('{ctrl} ')
    cy.get('[visible=true]').should('be.visible')
    cy.focused().shadow().find('input[type=search]').type('kr{enter}', {force: true})
    cy.get('[contenteditable]')
      .then(($el) => {
        expect($el.text()).to.equal('Kind regards,.')
        return $el
      })
      .type('{selectAll}{del}')
  })
})
