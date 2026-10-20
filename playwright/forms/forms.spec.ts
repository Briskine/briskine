import {test, expect, openPage, waitForForm} from '../fixtures.ts'
import login from '../login.js'

test.describe('Forms', () => {
  test.skip(({browserName}) => browserName === 'firefox', 'Auth testing not supported in Firefox.')

  test.beforeEach(async ({page, extensionId}) => {
    await login({page, extensionId})
  })

  test('should insert the template with the form values', async ({page}) => {
    await openPage(page, '/contenteditable-auth/contenteditable-auth.html')
    const textbox = page.getByRole('textbox')
    await textbox.fill('allforms')
    await textbox.press('Tab')
    await waitForForm(page)

    await page.keyboard.type('Ann')
    await page.keyboard.press('Control+Enter')

    await expect(textbox).toHaveText('Hi Ann, thanks for your order.')
  })

  test('should not insert the template on escape', async ({page}) => {
    await openPage(page, '/contenteditable-auth/contenteditable-auth.html')
    const textbox = page.getByRole('textbox')
    await textbox.fill('allforms')
    await textbox.press('Tab')
    await waitForForm(page)

    await page.keyboard.type('Ann')
    await page.keyboard.press('Escape')

    await expect(textbox).toBeFocused()
    await expect(textbox).toHaveText('allforms')
  })

  test('should show the form in the top frame for an editor in an iframe', async ({page}) => {
    await openPage(page, '/iframe/iframe.html')
    const textbox = page.frameLocator('#iframe').getByRole('textbox')
    await textbox.fill('allforms')
    await textbox.press('Tab')
    await waitForForm(page)

    await page.keyboard.type('Ann')
    await page.keyboard.press('Control+Enter')

    await expect(textbox).toHaveText('Hi Ann, thanks for your order.')
  })
})
