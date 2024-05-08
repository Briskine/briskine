import {test, expect} from '../fixtures.ts'

test.describe('CSP', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/csp/csp.html')
  })

  test.afterEach(async ({page}) => {
    await page.getByRole('textbox').fill('')
  })

  test('should insert template with keyboard shortcut', async ({page}) => {
    const textbox = page.getByRole('textbox')
    await textbox.fill('kr')
    await textbox.press('Tab')
    await expect(textbox).toHaveText('Kind regards,.')
  })
})
