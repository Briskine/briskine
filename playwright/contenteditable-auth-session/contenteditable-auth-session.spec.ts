import {test, expect} from '../fixtures-auth-session.ts'

test.describe('ContentEditable Session Authenticated', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/contenteditable-auth-session/contenteditable-auth-session.html')
  })

  test.afterEach(async ({page}) => {
    await page.getByRole('textbox').clear()
  })

  test('should insert template with keyboard shortcut', async ({page}) => {
    const textbox = page.getByRole('textbox')
    await textbox.fill('w')
    await textbox.press('Tab')
    await page.waitForTimeout(500)
    await expect(textbox).toHaveText('Write emails faster.')
  })

  test('should insert template from dialog', async ({page}) => {
    const textbox = page.getByRole('textbox')
    await textbox.press('Control+ ')
    const search = page.getByRole('searchbox')
    await expect(search).toBeVisible()
    await search.fill('create')
    await page.waitForTimeout(1000)
    await search.press('Enter')
    await page.waitForTimeout(500)
    await expect(textbox).toHaveText('Create text templates and insert them with shortcuts.')
  })
})
