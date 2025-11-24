import {test, expect, waitForExtension} from '../fixtures.ts'

test.describe('Textarea', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/textarea/textarea.html')
    await waitForExtension(page)
  })

  test.afterEach(async ({page}) => {
    await page.getByTestId('textarea').fill('')
  })

  test('should insert template with keyboard shortcut in textarea', async ({page}) => {
    const textarea = page.getByTestId('textarea')
    await textarea.fill('kr')
    await textarea.press('Tab')
    await expect(textarea).toHaveValue('Kind regards,\n.')
  })

  test('should insert template from dialog in textarea', async ({page}) => {
    const textarea = page.getByTestId('textarea')
    await textarea.press('Control+ ')
    const search = page.getByPlaceholder('Search templates...')
    await expect(search).toBeVisible()
    await search.pressSequentially('nic', {delay: 100})
    const template = 'It was nice talking to you.'
    const list = page.getByText(template)
    await list.waitFor()
    await search.press('Enter')
    await expect(textarea).toHaveValue(template)
  })

  test('should insert template with keyboard shortcut in input', async ({page}) => {
    const input = page.getByTestId('input')
    await input.fill('kr')
    await input.press('Tab')
    await expect(input).toHaveValue('Kind regards,.')
  })

  test('should insert template from dialog in input', async ({page}) => {
    const input = page.getByTestId('input')
    await input.press('Control+ ')
    const search = page.getByPlaceholder('Search templates...')
    await search.pressSequentially('nic', {delay: 100})
    const template = 'It was nice talking to you.'
    const list = page.getByText(template)
    await list.waitFor()
    await search.press('Enter')
    await expect(input).toHaveValue(template)
  })

  test('should move focus to next field when template shortcut doesn\'t match', async ({page}) => {
    const input = page.getByTestId('input')
    await input.fill('mock')
    await input.press('Tab')
    await expect(page.getByTestId('email')).toBeFocused()
  })
})
