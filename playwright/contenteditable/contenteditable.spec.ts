import {test, expect} from '../fixtures.ts'

test.describe('ContentEditable', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/contenteditable/contenteditable.html')
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
    expect(html).toEqual('<div>Kind regards,</div><div>.</div>')
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
    expect(html).toEqual('<div>It was nice talking to you.</div>')
  })
})
