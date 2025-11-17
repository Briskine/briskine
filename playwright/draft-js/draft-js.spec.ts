import {test, expect, waitForExtension} from '../fixtures.ts'

test.describe('Draft.js', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/draft-js/draft-js.html')
    await waitForExtension(page);
  })

  test.afterEach(async ({page}) => {
    await page.getByRole('textbox').fill('')
  })

  test('should insert template with keyboard shortcut', async ({page}) => {
    const textbox = page.getByRole('textbox')
    await textbox.fill('kr')
    await textbox.press('Tab')
    await expect(textbox).toHaveText('Kind regards,.')
  })

  test('should insert template from dialog', async ({page, browserName}) => {
    // skip dialog tests on Firefox,
    // until they fix the Permission Denied bug when accessing any properties
    // on custom elements in content scripts.
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1492002
    test.skip(browserName === 'firefox', 'Dialog testing not supported in Firefox.')

    const textbox = page.getByRole('textbox')
    await textbox.press('Control+ ')
    const search = page.getByPlaceholder('Search templates...')
    await expect(search).toBeVisible()
    await search.pressSequentially('nic', {delay: 100})
    const template = 'It was nice talking to you.'
    const list = page.getByText(template)
    await list.waitFor()
    await search.press('Enter')
    await expect(textbox).toHaveText('It was nice talking to you.')
  })
})
