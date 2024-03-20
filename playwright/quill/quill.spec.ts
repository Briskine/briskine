import {test, expect} from '../fixtures.ts'

test.describe('Quill', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/quill/quill.html')
  })

  test.afterEach(async ({page}) => {
    await page.getByRole('textbox').clear()
  })

  test('should insert template with keyboard shortcut', async ({page}) => {
    const textbox = page.getByRole('textbox')
    await textbox.fill('kr')
    await textbox.press('Tab')
    await page.waitForTimeout(500)
    const html = await textbox.innerHTML()
    // it includes the Tab character at the end,
    // since templates are not cached yet and preventDefault is not called.
    expect(html).toEqual('<p>Kind regards,\n.\t</p>')
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
