import {test, expect} from '../fixtures.ts'

test.describe('Iframe', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/iframe/iframe.html')
  })

  test.afterEach(async ({page}) => {
    await page.frameLocator('#iframe').getByRole('textbox').fill('')
  })

  test('should insert template with keyboard shortcut', async ({page}) => {
    const textbox = page.frameLocator('#iframe').getByRole('textbox')
    await textbox.fill('kr')
    await textbox.press('Tab')
    await expect(textbox).toHaveText('Kind regards,.')
  })

  test('should insert template from dialog', async ({page}) => {
    const frame = page.frameLocator('#iframe')
    const textbox = frame.getByRole('textbox')
    await textbox.press('Control+ ')
    const search = frame.getByPlaceholder('Search templates...')
    await expect(search).toBeVisible()
    await search.pressSequentially('nic', {delay: 100})
    const template = 'It was nice talking to you.'
    const list = frame.getByText(template)
    await list.waitFor()
    await search.press('Enter')
    await expect(textbox).toHaveText('It was nice talking to you.')
  })
})
