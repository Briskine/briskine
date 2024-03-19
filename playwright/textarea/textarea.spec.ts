import {test, expect} from '../fixtures.ts'

test.describe('Textarea', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/textarea/textarea.html')
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
    await search.fill('nic')
    await page.waitForTimeout(500)
    await search.press('Enter')
    await expect(textarea).toHaveValue('It was nice talking to you.')
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
    await search.fill('nic')
    await page.waitForTimeout(500)
    await search.press('Enter')
    await expect(input).toHaveValue('It was nice talking to you.')
  })

  test(`should move focus to next field when template shortcut doesn't match`, async ({page}) => {
    const input = page.getByTestId('input')
    await input.fill('mock')
    await input.press('Tab')
    await page.waitForTimeout(500)
    await expect(page.getByTestId('email')).toBeFocused()
  })
})
