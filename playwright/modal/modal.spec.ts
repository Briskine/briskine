import {test, expect, openPage, insertFromDialog} from '../fixtures.ts'
import type {Page} from '@playwright/test'

// locators look inside shadow roots,
// and firefox doesn't let the page read our element.
const isModalOpen = (page: Page) => page.evaluate(() => (document.getElementById('modal') as HTMLDialogElement).open)

test.describe('Modal dialog', () => {
  test.beforeEach(async ({page}) => {
    await openPage(page, '/modal/modal.html')
  })

  test('should insert template from dialog', async ({page}) => {
    const textbox = page.getByTestId('textarea')
    await insertFromDialog(page, textbox)
    await expect(textbox).toHaveValue('It was nice talking to you.')
  })

  test('should keep the page modal open when closing the dialog with escape', async ({page}) => {
    const textbox = page.getByTestId('textarea')
    await textbox.press('Control+ ')
    await expect(textbox).not.toBeFocused()

    await page.keyboard.press('Escape')
    await expect(textbox).toBeFocused()
    expect(await isModalOpen(page)).toBe(true)
  })

  test('should close the dialog when clicking outside it', async ({page}) => {
    const textbox = page.getByTestId('textarea')
    await textbox.press('Control+ ')
    await expect(textbox).not.toBeFocused()

    await page.mouse.click(5, 5)
    await expect(textbox).toBeFocused()
    expect(await isModalOpen(page)).toBe(true)
  })
})
