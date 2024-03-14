import { test, expect } from './fixtures.ts'

test('has title', async ({ page, extensionId}) => {
  await page.goto('/test/test.html');
  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/123/);
});

// test('get started link', async ({ page }) => {
//   await page.goto('https://playwright.dev/');
//
//   // Click the get started link.
//   await page.getByRole('link', { name: 'Get started' }).click();
//
//   // Expects page to have a heading with the name of Installation.
//   await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
// });
