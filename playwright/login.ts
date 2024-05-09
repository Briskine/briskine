/* globals process */
import dotenv from 'dotenv'

dotenv.config()

export default async function login ({page, extensionId}) {
  await page.goto(`${extensionId}/popup/popup.html`)
  await page.getByRole('button').click()
  await page.getByLabel('Email').fill(process.env.TEST_EMAIL || 'MISSING EMAIL')
  await page.getByLabel('Password').fill(process.env.TEST_PASSWORD || 'MISSING PASSWORD')
  await page.getByRole('button').click()
  const premium = page.getByText('go premium')
  await premium.waitFor()
}

