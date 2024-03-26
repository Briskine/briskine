import {test, expect} from '../fixtures.ts'

test.describe('CKEditor', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/ckeditor/ckeditor.html')
  })

  test.afterEach(async ({page}) => {
    await page.getByRole('textbox').fill('')
  })

  test('should insert template with keyboard shortcut', async ({page}) => {
    const textbox = page.getByRole('textbox')
    await textbox.fill('kr')
    await textbox.press('Tab')
    await page.waitForTimeout(500)
    const html = await textbox.innerHTML()
    expect(html).toEqual('<p>Kind regards,</p><p>.</p>')
  })

  test('should insert template from dialog', async ({page}) => {
    const textbox = page.getByRole('textbox')
    await textbox.press('Control+ ')
    const search = page.getByPlaceholder('Search templates...')
    await expect(search).toBeVisible()
    await search.fill('nic')
    await page.waitForTimeout(500)
    await search.press('Enter')
    await page.waitForTimeout(500)
    const html = await textbox.innerHTML()
    expect(html).toEqual('<p>It was nice talking to you.</p>')
  })
})
