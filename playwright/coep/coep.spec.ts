import {test, expect, openPage} from '../fixtures.ts'

test.describe('Cross-Origin-Embedder-Policy=require-corp', () => {
  test.beforeEach(async ({page}) => {
    const coepHeaders = {
      'Cross-Origin-Embedder-Policy': 'require-corp',
    }

    await page.route('/coep/coep.html', async (route) => {
      const response = await page.request.fetch(route.request())
      const body = await response.body()
      await route.fulfill({
        status: response.status(),
        headers: {
          ...response.headers(),
          ...coepHeaders
        },
        body: body
      })
    })

    await openPage(page, '/coep/coep.html')
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
