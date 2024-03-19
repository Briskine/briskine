import {test, expect} from '../fixtures.ts'

test.describe('CKEditor', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/ckeditor4/ckeditor4.html')
  })

  test.afterEach(async ({page}) => {
    await page.getByRole('textbox').fill('')
  })

  test('should insert template with keyboard shortcut', async ({page}) => {
    const textbox = page.frameLocator('.cke_wysiwyg_frame').getByRole('textbox')
    await textbox.fill('kr')
    await page.waitForTimeout(500)
    await textbox.press('Tab')
    await expect(textbox).toHaveText('Kind regards,.')
  })

  test('should insert template from dialog', async ({page}) => {
    const frame = page.frameLocator('.cke_wysiwyg_frame')
    const textbox = frame.getByRole('textbox')
    await page.waitForTimeout(500)
    await textbox.press('Control+ ')
    const search = frame.getByPlaceholder('Search templates...')
    await expect(search).toBeVisible()
    await search.fill('nic')
    await page.waitForTimeout(500)
    await search.press('Enter')
    await page.waitForTimeout(500)
    await expect(textbox).toHaveText('It was nice talking to you.')
  })
})
