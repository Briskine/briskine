import {test, expect, openPage} from '../fixtures.ts'
import type {Page, Frame, Locator} from '@playwright/test'

// the bubble's shadow root is closed, and firefox doesn't let the page read our element.
// find it by its position, in the top-end corner of the textarea.
const bubbleInset = 19

async function bubblePoint (textarea: Locator) {
  const box = await textarea.boundingBox()
  return {
    x: box.x + box.width - bubbleInset,
    y: box.y + bubbleInset,
  }
}

// the bubble is the element on top of the textarea, at its position
function isBubbleShown (frame: Page | Frame) {
  return frame.evaluate((inset) => {
    const textarea = document.querySelector('textarea')
    const rect = textarea.getBoundingClientRect()
    const element = document.elementFromPoint(rect.right - inset, rect.top + inset)
    return Boolean(element) && element !== textarea
  }, bubbleInset)
}

async function insertFromBubble (page: Page, frame: Page | Frame, textarea: Locator) {
  await textarea.focus()
  await expect.poll(() => isBubbleShown(frame)).toBe(true)

  const {x, y} = await bubblePoint(textarea)
  await page.mouse.click(x, y)
  await expect(textarea).not.toBeFocused()

  await page.keyboard.type('nic', {delay: 100})
  // we can't see the list, give the search time to show its results
  await page.waitForTimeout(500)
  await page.keyboard.press('Enter')
  await expect(textarea).toHaveValue('It was nice talking to you.')
}

test.describe('Bubble', () => {
  test('should insert template from the bubble', async ({page}) => {
    await openPage(page, '/bubble/bubble.html')
    const textarea = page.locator('textarea')
    await insertFromBubble(page, page, textarea)
  })

  test('should insert template from the bubble in a modal dialog', async ({page}) => {
    await openPage(page, '/bubble/bubble-modal.html')
    const textarea = page.locator('textarea')
    await insertFromBubble(page, page, textarea)
  })

  test('should insert template from the bubble in an iframe', async ({page}) => {
    await openPage(page, '/bubble/bubble-iframe.html')
    const frame = page.frames()[1]
    const textarea = page.frameLocator('#iframe').locator('textarea')
    await insertFromBubble(page, frame, textarea)
  })
})
