import {test, expect, openPage, insertFromDialog} from '../fixtures.ts'

test.describe('CKEditor', () => {
  test.beforeEach(async ({page}) => {
    await openPage(page, '/ckeditor/ckeditor.html')
  })

  test.afterEach(async ({page}) => {
    await page.getByRole('textbox').fill('')
  })

  test('should insert template with keyboard shortcut', async ({page}) => {
    const textbox = page.getByRole('textbox')
    await textbox.fill('kr')
    await textbox.press('Tab')
    await expect(textbox).toHaveText('Kind regards,\n.', {useInnerText: true})
  })

  test('should insert template from dialog', async ({page}) => {
    // ckeditor5 restores focus to the editor, closing our dialog, if we open it
    // too soon after initializing the editor
    await new Promise((resolve) => setTimeout(resolve, 500))

    const textbox = page.getByRole('textbox')
    await insertFromDialog(page, textbox)
    const template = 'It was nice talking to you.'
    await expect(textbox).toHaveText(template)
  })
})
