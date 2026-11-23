import {test, expect, openPage} from '../fixtures.ts'
import type {Page} from '@playwright/test'

declare global {
  interface Window {
    closedTextarea: HTMLTextAreaElement
    closedContentEditable: HTMLElement
  }
}

// locators can't reach into closed shadow roots
const fields = [
  {
    name: 'textarea',
    focus: () => window.closedTextarea.focus(),
    getValue: () => window.closedTextarea.value,
    atCaret: 'hello It was nice talking to you.world',
  },
  {
    name: 'contenteditable',
    focus: () => window.closedContentEditable.focus(),
    getValue: () => window.closedContentEditable.innerText.trim(),
    // the template is a block
    atCaret: 'hello\nIt was nice talking to you.\nworld',
  },
]

// firefox doesn't let the page read our dialog element, once it's focused
const isFocused = (page: Page) => page.evaluate(() => document.activeElement === document.getElementById('host'))

for (const field of fields) {
  test.describe(`Closed shadow root ${field.name}`, () => {
    test.beforeEach(async ({page}) => {
      await openPage(page, '/closed-shadow/closed-shadow.html')
      await page.evaluate(field.focus)
    })

    test('should insert template with keyboard shortcut', async ({page}) => {
      await page.keyboard.type('kr')
      await page.keyboard.press('Tab')
      await expect.poll(() => page.evaluate(field.getValue)).toBe('Kind regards,\n.')
    })

    test('should insert template from dialog', async ({page}) => {
      await page.keyboard.press('Control+ ')
      await expect.poll(() => isFocused(page)).toBe(false)
      await page.keyboard.type('nic', {delay: 100})
      // we can't see the list, give the search time to show its results
      await page.waitForTimeout(500)
      await page.keyboard.press('Enter')
      await expect.poll(() => page.evaluate(field.getValue)).toBe('It was nice talking to you.')
    })

    test('should insert template from dialog at the caret', async ({page}) => {
      await page.keyboard.type('hello world')
      for (let i = 0; i < 'world'.length; i++) {
        await page.keyboard.press('ArrowLeft')
      }
      await page.keyboard.press('Control+ ')
      await expect.poll(() => isFocused(page)).toBe(false)
      await page.keyboard.type('nic', {delay: 100})
      await page.waitForTimeout(500)
      await page.keyboard.press('Enter')
      await expect.poll(() => page.evaluate(field.getValue)).toBe(field.atCaret)
    })
  })
}
