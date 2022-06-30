/// <reference types="cypress" />
/* globals cy, describe, before, it, expect */

describe('ContentEditable', () => {
  before(() => {
    cy.visit('./cypress/e2e/contenteditable/contenteditable.html')
  })

  it('should insert template with keyboard shortcut', () => {
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
      .then(($el) => {
        expect($el.html()).to.equal('<div>It was nice talking to you.</div>')
        $el.html('')
        return $el
      })
  })
})
