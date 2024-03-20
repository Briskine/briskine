import dotenv from 'dotenv'

import {test} from './fixtures.ts'
export {test, expect} from './fixtures.ts'

dotenv.config()

test.beforeEach(async ({page, extensionId}) => {
  await page.goto(`${extensionId}/popup/popup.html`)
  await page.getByRole('button').click()
  await page.getByLabel('Email').fill(process.env.TEST_EMAIL || 'MISSING EMAIL')
  await page.getByLabel('Password').fill(process.env.TEST_PASSWORD || 'MISSING PASSWORD')
  await page.getByRole('button').click()
  await page.waitForTimeout(5000)
})
