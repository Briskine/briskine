/* globals process */
import dotenv from 'dotenv'

dotenv.config()

export default async function login ({page, extensionId}) {
  await page.goto(`${extensionId}/popup/popup.html`)
  await page.getByRole('button').click()
  await page.getByLabel('Email').fill(process.env.TEST_EMAIL || 'MISSING EMAIL')
  await page.getByLabel('Password').fill(process.env.TEST_PASSWORD || 'MISSING PASSWORD')
  await page.getByRole('button').click()
  // shown once the account's plan has loaded
  const premium = page.getByText('Premium', {exact: true}).or(page.getByText('Upgrade to Premium'))
  await premium.waitFor()
}
