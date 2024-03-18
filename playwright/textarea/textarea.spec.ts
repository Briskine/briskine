import { test, expect } from '../fixtures.ts'

test.describe('Textarea', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/textarea/textarea.html')
  })

  test.afterEach(async ({page}) => {
    await page.getByTestId('textarea').fill('')
  })

  test('should insert template with keyboard shortcut in textarea', async ({page}) => {
    await page.getByTestId('textarea').fill('kr')
    await page.getByTestId('textarea').press('Tab')
    await expect(page.getByTestId('textarea')).toHaveValue('Kind regards,\n.')
  })

  test('should insert template from dialog in textarea', async ({page}) => {
    await page.getByTestId('textarea').press('Control+ ')
    await expect(page.getByPlaceholder('Search templates...')).toBeVisible()

    // cy.get('textarea').type('{ctrl} ')
    // cy.get('[visible=true]').should('be.visible')
    // cy.focused()
    //   .shadow()
    //   .find('input[type=search]')
    //   .type('nic', {force: true})
    //   .wait(500)
    //   .type('{enter}')
    //
    // cy.get('textarea').should('have.value', 'It was nice talking to you.')
  })

})
