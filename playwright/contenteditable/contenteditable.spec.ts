import {test, expect, openPage, insertFromDialog} from '../fixtures.ts'

test.describe('ContentEditable', () => {
  test.beforeEach(async ({page}) => {
    await openPage(page, '/contenteditable/contenteditable.html')
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

  test('should keep the caret when closing the dialog, after tabbing into the editor', async ({page}) => {
    const textbox = page.getByRole('textbox')
    // tab from a field before the editor,
    // focus with the keyboard puts the caret at the start of the editor.
    await textbox.evaluate((element: HTMLElement) => {
      const field = document.createElement('button')
      element.before(field)
      field.focus()
      window.getSelection().removeAllRanges()
    })
    await page.keyboard.press('Tab')
    await expect(textbox).toBeFocused()

    await textbox.press('Control+ ')
    await expect(textbox).not.toBeFocused()
    await page.keyboard.press('Escape')
    await expect(textbox).toBeFocused()

    const hasCaret = await textbox.evaluate((element: HTMLElement) => {
      const selection = window.getSelection()
      return selection.rangeCount > 0 && element.contains(selection.getRangeAt(0).startContainer)
    })
    expect(hasCaret).toBe(true)
  })

  test('should insert template from dialog', async ({page}) => {
    const textbox = page.getByRole('textbox')
    await insertFromDialog(page, textbox)
    const template = 'It was nice talking to you.'
    await expect(textbox).toHaveText(template)
  })
})
