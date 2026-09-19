import { expect, test } from './support/test.js'
import { dialog, section, vehicleRow } from './support/locators.js'

test.describe('Navigation', () => {
  test('has a descriptive page title', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveTitle('AMP Customer Service Representative Portal')
  })

  test('opens on the customers list', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible()
  })

  test('moves between Customers and Plans from the header without a page load', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => ((window as unknown as { __marker: string }).__marker = 'still-here'))

    await page.getByRole('link', { name: 'Plans' }).click()
    await expect(page).toHaveURL('/plans')
    await expect(page.getByRole('heading', { name: 'Plans' })).toBeVisible()

    await page.getByRole('link', { name: 'Customers' }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible()

    // A full page load would have wiped the marker: this is a single-page app.
    expect(await page.evaluate(() => (window as unknown as { __marker?: string }).__marker)).toBe('still-here')
  })

  test('takes the CSR home from the CSR Portal title, even from a customer page', async ({ page }) => {
    await page.goto('/users/1')

    await page.getByRole('link', { name: 'CSR Portal' }).click()

    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible()
  })

  test('keeps the header on every page', async ({ page }) => {
    for (const url of ['/', '/plans', '/users/1']) {
      await page.goto(url)
      await expect(page.getByRole('link', { name: 'CSR Portal' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Customers' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Plans' })).toBeVisible()
    }
  })

  test('supports opening a customer or the plans page directly by URL', async ({ page }) => {
    await page.goto('/users/2')
    await expect(page.getByRole('heading', { level: 2, name: 'Marcus Lee' })).toBeVisible()

    await page.goto('/plans')
    await expect(page.getByRole('heading', { name: 'Plans' })).toBeVisible()
  })

  test('supports the browser back and forward buttons', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Jane Doe' }).click()
    await expect(page).toHaveURL('/users/1')

    await page.goBack()
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible()

    await page.goForward()
    await expect(page).toHaveURL('/users/1')
    await expect(page.getByRole('heading', { level: 2, name: 'Jane Doe' })).toBeVisible()
  })

  test('starts the customers list fresh when returning from a customer', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Search').fill('Marcus')
    await page.getByRole('link', { name: 'Marcus Lee' }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Marcus Lee' })).toBeVisible()

    await page.getByRole('link', { name: 'Customers' }).click()

    // The list remounts on return, so it starts fresh rather than showing a stale filter.
    await expect(page.getByLabel('Search')).toHaveValue('')
    await expect(page.locator('tbody tr')).toHaveCount(20)
  })
})

test.describe('Smoke', () => {
  test('a full tour of the portal raises no console errors or uncaught exceptions', async ({ page }) => {
    const problems: string[] = []
    page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(`console.error: ${message.text()}`)
    })

    await page.goto('/')
    await expect(page.locator('tbody tr')).toHaveCount(20)
    await page.getByLabel('Search').fill('Jane')
    await page.getByRole('link', { name: 'Jane Doe' }).click()

    // Open and dismiss each modal on the customer page.
    await vehicleRow(page, 'ABC123').getByRole('button', { name: 'Transfer' }).click()
    await dialog(page, 'Transfer subscription — ABC123').getByRole('button', { name: 'Cancel' }).click()
    await vehicleRow(page, 'ABC123').getByRole('button', { name: 'End Subscription' }).click()
    await dialog(page, 'End subscription').getByRole('button', { name: 'Back' }).click()
    await vehicleRow(page, 'XYZ789').getByRole('button', { name: 'Add Subscription' }).click()
    await dialog(page, 'Add subscription — XYZ789').getByRole('button', { name: 'Cancel' }).click()
    await page.getByRole('button', { name: 'Edit' }).click()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(section(page, 'Account')).toBeVisible()

    await page.getByRole('link', { name: 'Plans' }).click()
    await page.getByRole('button', { name: 'New plan' }).click()
    await dialog(page, 'New plan').getByRole('button', { name: 'Cancel' }).click()
    await page.getByRole('button', { name: 'Edit Basic Wash' }).click()
    await dialog(page, 'Edit plan — Basic Wash').getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('heading', { name: 'Plans' })).toBeVisible()

    expect(problems).toEqual([])
  })
})
