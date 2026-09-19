import type { Page } from '@playwright/test'
import { RETRY_BACKOFF_TIMEOUT, expect, test } from './support/test.js'

test.describe('Customers list', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('shows the first page of customers with their contact details and status', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible()
    await expect(page.getByRole('columnheader')).toHaveText(['Name', 'Email', 'Phone', 'Status'])

    const rows = page.locator('tbody tr')
    await expect(rows).toHaveCount(20)

    const jane = page.getByRole('row', { name: /Jane Doe/ })
    await expect(jane).toContainText('jane.doe@example.com')
    await expect(jane).toContainText('555-0100')
    await expect(jane).toContainText('ACTIVE')
  })

  test('shows a disabled account as DISABLED', async ({ page }) => {
    await expect(page.getByRole('row', { name: /Priya Patel/ })).toContainText('DISABLED')
  })

  test('links each customer to their detail page', async ({ page }) => {
    await page.getByRole('link', { name: 'Marcus Lee' }).click()

    await expect(page).toHaveURL('/users/2')
    await expect(page.getByRole('heading', { level: 2, name: 'Marcus Lee' })).toBeVisible()
  })

  test.describe('pagination', () => {
    test('splits 45 customers into three pages of 20, 20 and 5', async ({ page }) => {
      const pagination = page.getByTestId('pagination')
      await expect(pagination.getByRole('button', { name: '1', exact: true })).toBeVisible()
      await expect(pagination.getByRole('button', { name: '3', exact: true })).toBeVisible()
      await expect(pagination.getByRole('button', { name: '4', exact: true })).toHaveCount(0)

      await pagination.getByRole('button', { name: '2', exact: true }).click()
      await expect(page.getByRole('row', { name: /Member N26/ })).toBeVisible()
      await expect(page.locator('tbody tr')).toHaveCount(20)

      await pagination.getByRole('button', { name: '3', exact: true }).click()
      await expect(page.getByRole('row', { name: /Member N45/ })).toBeVisible()
      await expect(page.locator('tbody tr')).toHaveCount(5)
    })

    test('requests the page the user asked for', async ({ page, api }) => {
      await page.getByTestId('pagination').getByRole('button', { name: '2', exact: true }).click()
      await expect(page.getByRole('row', { name: /Member N26/ })).toBeVisible()

      expect(api.requestsTo('GET', '/users').at(-1)?.query).toEqual({ page: '2', pageSize: '20' })
    })

    test('hides the pager when every match fits on one page', async ({ page }) => {
      await page.getByLabel('Search').fill('Jane')

      await expect(page.locator('tbody tr')).toHaveCount(1)
      await expect(page.getByTestId('pagination')).toHaveCount(0)
    })
  })

  test.describe('search', () => {
    const search = (page: Page) => page.getByLabel('Search')

    test('finds a customer by first name, case-insensitively', async ({ page }) => {
      await search(page).fill('jANe')

      await expect(page.locator('tbody tr')).toHaveCount(1)
      await expect(page.getByRole('row', { name: /Jane Doe/ })).toBeVisible()
    })

    test('finds a customer by last name', async ({ page }) => {
      await search(page).fill('Patel')

      await expect(page.locator('tbody tr')).toHaveCount(1)
      await expect(page.getByRole('link', { name: 'Priya Patel' })).toBeVisible()
    })

    test('finds a customer by email', async ({ page }) => {
      await search(page).fill('marcus.lee@')

      await expect(page.locator('tbody tr')).toHaveCount(1)
      await expect(page.getByRole('link', { name: 'Marcus Lee' })).toBeVisible()
    })

    test('finds a customer by phone number', async ({ page }) => {
      await search(page).fill('555-0103')

      await expect(page.locator('tbody tr')).toHaveCount(1)
      await expect(page.getByRole('link', { name: 'Sam Rivera' })).toBeVisible()
    })

    test('finds the owner of a license plate, case-insensitively', async ({ page }) => {
      await search(page).fill('lee456')

      await expect(page.locator('tbody tr')).toHaveCount(1)
      await expect(page.getByRole('link', { name: 'Marcus Lee' })).toBeVisible()
    })

    test('finds an owner by any one of several vehicles', async ({ page }) => {
      await search(page).fill('JAN555')

      await expect(page.locator('tbody tr')).toHaveCount(1)
      await expect(page.getByRole('link', { name: 'Jane Doe' })).toBeVisible()
    })

    test('says so when nothing matches', async ({ page }) => {
      await search(page).fill('zzz-no-such-customer')

      await expect(page.getByText('No users')).toBeVisible()
      await expect(page.locator('tbody tr')).toHaveCount(0)
    })

    test('sends the term to the API, and omits it once the box is cleared', async ({ page, api }) => {
      await search(page).fill('Jane')
      await expect(page.locator('tbody tr')).toHaveCount(1)
      await search(page).clear()
      await expect(page.locator('tbody tr')).toHaveCount(20)

      const [initial, searched, cleared] = api.requestsTo('GET', '/users')
      expect(initial.query).not.toHaveProperty('search')
      expect(searched.query).toMatchObject({ search: 'Jane', page: '1' })
      expect(cleared.query).not.toHaveProperty('search')
    })

    test('returns to page one when the term changes', async ({ page }) => {
      const pagination = page.getByTestId('pagination')
      await pagination.getByRole('button', { name: '3', exact: true }).click()
      await expect(page.locator('tbody tr')).toHaveCount(5)

      // 40 filler customers match, so results span two pages. The list must not stay on page 3.
      await search(page).fill('Member')

      await expect(page.locator('tbody tr')).toHaveCount(20)
      await expect(page.getByRole('row', { name: /Member N06/ })).toBeVisible()
    })
  })

  test.describe('loading and failure', () => {
    test('shows a spinner while the customers load', async ({ page }) => {
      let release!: () => void
      const gate = new Promise<void>((resolve) => (release = resolve))
      await page.route(
        (url) => url.pathname === '/api/users',
        async (route) => {
          await gate
          await route.fallback()
        },
      )

      await page.goto('/')
      await expect(page.getByLabel('Loading')).toBeVisible()

      release()
      await expect(page.getByLabel('Loading')).toBeHidden()
      await expect(page.locator('tbody tr')).toHaveCount(20)
    })

    test('shows an error when the API fails', async ({ page, api }) => {
      api.failRequests('GET', /^\/users$/, 500)
      await page.goto('/')

      // React Query retries a failed query three times (1s, 2s, 4s) before the error surfaces.
      await expect(page.getByText('Failed to load users')).toBeVisible({ timeout: RETRY_BACKOFF_TIMEOUT })
    })
  })
})
