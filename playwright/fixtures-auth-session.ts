/* globals process */
import dotenv from 'dotenv'

import {test} from './fixtures.ts'
export {test, expect} from './fixtures.ts'

dotenv.config()

test.skip(({browserName}) => browserName === 'firefox', 'Auth testing not supported in Firefox.')

test.beforeEach(async ({page, extensionId}) => {
  await page.goto(`https://app.briskine.com/`)
  await page.getByLabel('Email').fill(process.env.TEST_EMAIL || 'MISSING EMAIL')
  await page.getByLabel('Password').fill(process.env.TEST_PASSWORD || 'MISSING PASSWORD')
  await page.getByLabel('Password').press('Enter')
  await page.waitForTimeout(5000)

  await page.goto(`${extensionId}/popup/popup.html`)
  await page.getByRole('button').click()
  await page.waitForTimeout(5000)
})
