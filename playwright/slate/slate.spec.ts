import {test, expect} from '../fixtures.ts'

test.describe('Slate', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/slate/slate.html')
  })

  test.afterEach(async ({page}) => {
    await page.getByRole('textbox').clear()
  })

  test('should insert template with keyboard shortcut', async ({page}) => {
    const textbox = page.getByRole('textbox')
    await textbox.pressSequentially('kr')
    await textbox.press('Tab')
    await page.waitForTimeout(500)
    const text = await textbox.innerText()
    expect(text).toEqual('Kind regards,\n.')
  })

  test('should insert template from dialog', async ({page}) => {
    const textbox = page.getByRole('textbox')
    await textbox.press('Control+ ')
    const search = page.getByPlaceholder('Search templates...')
    await expect(search).toBeVisible()
    await search.fill('nic')
    await page.waitForTimeout(500)
    await search.press('Enter')
    await page.waitForTimeout(500)
    await expect(textbox).toHaveText('It was nice talking to you.')
  })
})
