import {test, expect, waitForExtension} from '../fixtures.ts'

test.describe('Content-Security-Policy="default-src self\'', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/csp/csp.html')
    await waitForExtension(page)
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
