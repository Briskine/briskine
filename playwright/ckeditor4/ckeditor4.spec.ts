import {test, expect, openPage} from '../fixtures.ts'

test.describe('CKEditor4', () => {
  test.beforeEach(async ({page}) => {
    await openPage(page, '/ckeditor4/ckeditor4.html')
  })

  test('should insert template with keyboard shortcut', async ({page}) => {
    const frame = page.frameLocator('.cke_wysiwyg_frame')
    const textbox = frame.getByRole('textbox')
    await textbox.fill('')
    await textbox.fill('kr')
    await textbox.press('Tab')
    await expect(textbox).toHaveText('Kind regards,\n.', {useInnerText: true})
  })

  test('should insert template from dialog', async ({page}) => {
    // ckeditor4 restores focus to the editor, closing our dialog, if we open it
    // too soon after initializing the editor.
    // could also be caused by firefox altering the ckeditor4 iframe load timing
    // for compatibility with its browser detection.
    await new Promise((resolve) => setTimeout(resolve, 500))

    const frame = page.frameLocator('.cke_wysiwyg_frame')
    const textbox = frame.getByRole('textbox')
    await textbox.fill('')
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
