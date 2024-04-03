import {test, expect} from '../fixtures.ts'

test.describe('CKEditor', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/ckeditor4/ckeditor4.html')
    // wait for briskine to load in editor frame
    await page.waitForTimeout(500)
  })

  test.afterEach(async ({page}) => {
    await page.getByRole('textbox').fill('')
  })

  test('should insert template with keyboard shortcut', async ({page}) => {
    const frame = page.frameLocator('.cke_wysiwyg_frame')
    const textbox = frame.getByRole('textbox')
    await textbox.fill('kr')
    await textbox.press('Tab')
    await expect(textbox).toHaveText('Kind regards,.')
  })

  test('should insert template from dialog', async ({page}) => {
    const frame = page.frameLocator('.cke_wysiwyg_frame')
    const textbox = frame.getByRole('textbox')
    await textbox.press('Control+ ')
    const search = frame.getByPlaceholder('Search templates...')
    await expect(search).toBeVisible()
    await search.pressSequentially('nic', {delay: 100})
    const template = 'It was nice talking to you.'
    const list = frame.getByText(template)
    await list.waitFor()
    await search.press('Enter')
    await expect(textbox).toHaveText(template)
  })
})
