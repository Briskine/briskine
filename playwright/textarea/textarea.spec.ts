import { test, expect } from '../fixtures.ts'

test.beforeEach(async ({page}) => {
  await page.goto('/textarea/textarea.html')
})

test('should insert template with keyboard shortcut in textarea', async ({page}) => {
  await page.getByTestId('textarea').fill('kr')
  // TODO BUG triggering keydown/up immediately, with no delay, causes the template to be inserted twice
  // probably caused by mousetrap attaching events to both
  // in the real-world, we'll always have at least a 10ms delay, so probably not a real issue
  await page.getByTestId('textarea').press('Tab', {delay: 10})
  await expect(page.getByTestId('textarea')).toHaveValue('Kind regards,\n.')

  // cy.get('textarea').type('kr').tab()
  // cy.get('textarea').should('have.value', 'Kind regards,\n.')
  // cy.get('textarea').type('{selectAll}{del}')
})
