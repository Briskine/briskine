import {test, expect, openPage, insertFromDialog} from '../fixtures.ts'

test.describe('Squire', () => {
  test.beforeEach(async ({page}) => {
    await openPage(page, '/squire/squire.html')
  })

  test.afterEach(async ({page}) => {
    await page.getByRole('textbox').clear()
  })

  test('should insert template with keyboard shortcut', async ({page}) => {
    const textbox = page.getByRole('textbox')
    await textbox.fill('kr')
    await textbox.press('Tab')
    await expect(textbox).toHaveText('Kind regards,\n.', {useInnerText: true})
  })

  test('should insert template from dialog', async ({page}) => {
    const textbox = page.getByRole('textbox')
    await insertFromDialog(page, textbox)
    const template = 'It was nice talking to you.'
    await expect(textbox).toHaveText(template)
  })
})
