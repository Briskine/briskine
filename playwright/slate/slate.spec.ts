import {test, expect, openPage} from '../fixtures.ts'

test.describe('Slate', () => {
  test.beforeEach(async ({page}) => {
    await openPage(page, '/slate/slate.html')
  })

  test.afterEach(async ({page}) => {
    await page.getByRole('textbox').clear()
  })

  test('should insert template with keyboard shortcut', async ({page}) => {
    const textbox = page.getByRole('textbox')
    await textbox.pressSequentially('kr')
    await textbox.press('Tab')
    await expect(textbox).toHaveText('Kind regards,\n.')
  })

  test('should insert template from dialog', async ({page}) => {
    const textbox = page.getByRole('textbox')
    await textbox.press('Control+ ')
    const search = page.getByPlaceholder('Search templates...')
    await expect(search).toBeVisible()
    await search.pressSequentially('nic', {delay: 100})
    const template = 'It was nice talking to you.'
    const list = page.getByText(template)
    await list.waitFor()
    await search.press('Enter')
    await expect(textbox).toHaveText(template)
  })
})
