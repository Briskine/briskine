/* globals process */
import dotenv from 'dotenv'

dotenv.config()

export default async function loginSession ({page, extensionId}) {
  await page.goto(`https://app.briskine.com/`)
  await page.getByLabel('Email').fill(process.env.TEST_EMAIL || 'MISSING EMAIL')
  await page.getByLabel('Password').fill(process.env.TEST_PASSWORD || 'MISSING PASSWORD')
  await page.getByLabel('Password').press('Enter')
  // wait for templates to load
  const title = page.getByText('Write emails faster')
  await title.waitFor()

  await page.goto(`${extensionId}/popup/popup.html`)
  await page.getByRole('button').click()
  const premium = page.getByText('Go premium')
  await premium.waitFor()
}

