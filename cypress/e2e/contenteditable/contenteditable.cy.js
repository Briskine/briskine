/// <reference types="cypress" />
/* globals cy, describe, before, it */

describe('ContentEditable', () => {
  before(() => {
    cy.visit('./cypress/e2e/contenteditable/contenteditable.html')
  })

  it('should insert template with keyboard shortcut in contenteditable', () => {
    cy.get('[contenteditable]')
      .type('kr')
      .tab()
      .wait(500)
      .then(($el) => {
        expect($el.html()).to.equal('<div>Kind regards,</div><div>.</div>')
        $el.html('')
        return $el
      })
  })

  it('should insert template from dialog in contenteditable', () => {
    cy.get('[contenteditable]').type('{ctrl} ')
    cy.get('[visible=true]').should('be.visible')
    cy.focused().shadow().find('input[type=search]').type('kr{enter}', {force: true})
    cy.get('[contenteditable]')
      .then(($el) => {
        expect($el.html()).to.equal('<div>Kind regards,</div><div>.</div>')
        $el.html('')
        return $el
      })
  })
})
