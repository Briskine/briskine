import {test, expect, openPage, insertFromDialog} from '../fixtures.ts'

test.describe('Iframe', () => {
  test.beforeEach(async ({page}) => {
    await openPage(page, '/iframe/iframe.html')
  })

  test.afterEach(async ({page}) => {
    await page.frameLocator('#iframe').getByRole('textbox').fill('')
  })

  test('should insert template with keyboard shortcut', async ({page}) => {
    const textbox = page.frameLocator('#iframe').getByRole('textbox')
    await textbox.fill('kr')
    await textbox.press('Tab')
    await expect(textbox).toHaveText('Kind regards,\n.', {useInnerText: true})
  })

  test('should insert template from dialog', async ({page}) => {
    const frame = page.frameLocator('#iframe')
    const textbox = frame.getByRole('textbox')
    await insertFromDialog(page, textbox)
    const template = 'It was nice talking to you.'
    await expect(textbox).toHaveText(template)
  })

  test('should show the dialog in the top frame', async ({page}) => {
    const textbox = page.frameLocator('#iframe').getByRole('textbox')
    await textbox.click()
    await textbox.press('Control+ ')
    // firefox doesn't let the page read the properties of our element,
    // so check that focus moved out of the iframe, into the top frame.
    await page.waitForFunction(() => ![document.body, document.getElementById('iframe')].includes(document.activeElement))

    await page.keyboard.press('Escape')
    await expect(textbox).toBeFocused()
  })
})
