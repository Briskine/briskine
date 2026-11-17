import {test, expect, openPage} from '../fixtures.ts'
import type {Page} from '@playwright/test'

declare global {
  interface Window {
    closedTextarea: HTMLTextAreaElement
  }
}

// locators can't reach into closed shadow roots
const getValue = (page: Page) => page.evaluate(() => window.closedTextarea.value)
// firefox doesn't let the page read our dialog element, once it's focused
const isFocused = (page: Page) => page.evaluate(() => document.activeElement === document.getElementById('host'))

test.describe('Closed shadow root', () => {
  test.beforeEach(async ({page}) => {
    await openPage(page, '/closed-shadow/closed-shadow.html')
    await page.evaluate(() => window.closedTextarea.focus())
  })

  test('should insert template with keyboard shortcut', async ({page}) => {
    await page.keyboard.type('kr')
    await page.keyboard.press('Tab')
    await expect.poll(() => getValue(page)).toBe('Kind regards,\n.')
  })

  test('should insert template from dialog', async ({page}) => {
    await page.keyboard.press('Control+ ')
    await expect.poll(() => isFocused(page)).toBe(false)
    await page.keyboard.type('nic', {delay: 100})
    // we can't see the list, give the search time to show its results
    await page.waitForTimeout(500)
    await page.keyboard.press('Enter')
    await expect.poll(() => getValue(page)).toBe('It was nice talking to you.')
  })
})
