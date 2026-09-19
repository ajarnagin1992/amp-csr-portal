import type { Page } from '@playwright/test'
import { RETRY_BACKOFF_TIMEOUT, expect, test } from './support/test.js'
import { choose, dialog, vehicleRow } from './support/locators.js'

const planRow = (page: Page, name: string) => page.getByRole('row', { name: new RegExp(name) })

test.describe('Plans', () => {
  test.describe('listing', () => {
    test('shows every plan, disabled ones included, sorted by name', async ({ page }) => {
      await page.goto('/plans')

      await expect(page.getByRole('heading', { name: 'Plans' })).toBeVisible()
      await expect(page.getByRole('columnheader')).toHaveText(['Name', 'Description', 'Monthly Price', 'Status', 'Actions'])
      await expect(page.locator('tbody tr td:first-child')).toHaveText([
        'Basic Wash',
        'Legacy Wash Plan',
        'Premium Plus',
        'Unlimited Monthly',
      ])
    })

    test('shows each plans description, price and status', async ({ page }) => {
      await page.goto('/plans')

      const unlimited = planRow(page, 'Unlimited Monthly')
      await expect(unlimited).toContainText('Unlimited exterior washes')
      await expect(unlimited).toContainText('$29.99')
      await expect(unlimited).toContainText('ACTIVE')

      const legacy = planRow(page, 'Legacy Wash Plan')
      await expect(legacy).toContainText('$15.00')
      await expect(legacy).toContainText('DISABLED')
    })

    test('shows a dash for a plan with no description', async ({ page }) => {
      await page.goto('/plans')

      await expect(planRow(page, 'Premium Plus').getByRole('cell').nth(1)).toHaveText('—')
    })

    test('says so when there are no plans', async ({ page, api }) => {
      api.store.plans.length = 0
      await page.goto('/plans')

      await expect(page.getByText('No plans')).toBeVisible()
    })

    test('shows an error when the plans fail to load', async ({ page, api }) => {
      api.failRequests('GET', /^\/plans$/, 500)
      await page.goto('/plans')

      await expect(page.getByText('Failed to load plans')).toBeVisible({ timeout: RETRY_BACKOFF_TIMEOUT })
    })

    test('asks the API for disabled plans as well', async ({ page, api }) => {
      await page.goto('/plans')
      await expect(planRow(page, 'Legacy Wash Plan')).toBeVisible()

      expect(api.requestsTo('GET', '/plans')[0].query).toEqual({ includeDisabled: 'true' })
    })
  })

  test.describe('creating', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/plans')
      await page.getByRole('button', { name: 'New plan' }).click()
    })

    test('opens an empty form with Save disabled', async ({ page }) => {
      const modal = dialog(page, 'New plan')

      await expect(modal.getByLabel('Name')).toHaveValue('')
      await expect(modal.getByLabel('Description')).toHaveValue('')
      await expect(modal.getByLabel('Monthly price')).toHaveValue('')
      await expect(modal.getByRole('button', { name: 'Save' })).toBeDisabled()
    })

    test('needs both a name and a price before it can be saved', async ({ page }) => {
      const modal = dialog(page, 'New plan')
      const save = modal.getByRole('button', { name: 'Save' })

      await modal.getByLabel('Name').fill('Weekend Special')
      await expect(save).toBeDisabled()

      await modal.getByLabel('Monthly price').fill('9.99')
      await expect(save).toBeEnabled()

      await modal.getByLabel('Name').fill('   ')
      await expect(save).toBeDisabled()
    })

    test('creates an active plan and lists it', async ({ page, api }) => {
      const modal = dialog(page, 'New plan')
      await modal.getByLabel('Name').fill('Weekend Special')
      await modal.getByLabel('Description').fill('Saturdays and Sundays only')
      await modal.getByLabel('Monthly price').fill('9.99')
      await modal.getByRole('button', { name: 'Save' }).click()

      await expect(modal).toBeHidden()
      const created = planRow(page, 'Weekend Special')
      await expect(created).toContainText('Saturdays and Sundays only')
      await expect(created).toContainText('$9.99')
      await expect(created).toContainText('ACTIVE')
      expect(api.requestsTo('POST', '/plans')[0].body).toEqual({
        name: 'Weekend Special',
        description: 'Saturdays and Sundays only',
        price: 999,
      })
    })

    test('sends the price in whole cents, without floating-point drift', async ({ page, api }) => {
      const modal = dialog(page, 'New plan')
      await modal.getByLabel('Name').fill('Drift Check')
      // 19.99 * 100 === 1998.9999999999998 in floating point.
      await modal.getByLabel('Monthly price').fill('19.99')
      await modal.getByRole('button', { name: 'Save' }).click()

      await expect(planRow(page, 'Drift Check')).toContainText('$19.99')
      expect(api.requestsTo('POST', '/plans')[0].body).toMatchObject({ price: 1999 })
    })

    test('does not accept a negative price', async ({ page }) => {
      const modal = dialog(page, 'New plan')
      await modal.getByLabel('Name').fill('Bad Plan')
      await modal.getByLabel('Monthly price').fill('-5')

      await expect(modal.getByLabel('Monthly price')).not.toHaveValue(/-/)
    })

    test('closes without creating anything on Cancel', async ({ page, api }) => {
      const modal = dialog(page, 'New plan')
      await modal.getByLabel('Name').fill('Never Saved')
      await modal.getByRole('button', { name: 'Cancel' }).click()

      await expect(modal).toBeHidden()
      await expect(planRow(page, 'Never Saved')).toHaveCount(0)
      expect(api.requestsTo('POST', '/plans')).toHaveLength(0)
    })

    test('starts blank again after being cancelled part-way', async ({ page }) => {
      const modal = dialog(page, 'New plan')
      await modal.getByLabel('Name').fill('Half Done')
      await modal.getByRole('button', { name: 'Cancel' }).click()
      await expect(modal).toBeHidden()

      await page.getByRole('button', { name: 'New plan' }).click()

      await expect(dialog(page, 'New plan').getByLabel('Name')).toHaveValue('')
    })

    test('keeps the form open and explains when the API refuses', async ({ page, api }) => {
      api.failRequests('POST', /^\/plans$/, 500)
      const modal = dialog(page, 'New plan')
      await modal.getByLabel('Name').fill('Doomed')
      await modal.getByLabel('Monthly price').fill('5.55')
      await modal.getByRole('button', { name: 'Save' }).click()

      await expect(modal.getByRole('alert')).toContainText('Failed to save: Failed to create plan: 500')
      await expect(modal.getByLabel('Name')).toHaveValue('Doomed')
    })
  })

  test.describe('editing', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/plans')
      await page.getByRole('button', { name: 'Edit Basic Wash' }).click()
    })

    test('opens a form prefilled with the plans current values', async ({ page }) => {
      const modal = dialog(page, 'Edit plan — Basic Wash')

      await expect(modal.getByLabel('Name')).toHaveValue('Basic Wash')
      await expect(modal.getByLabel('Description')).toHaveValue('One exterior wash a week')
      await expect(modal.getByLabel('Monthly price')).toHaveValue('$14.99')
    })

    test('keeps Save disabled until something changes, and again if the change is undone', async ({ page }) => {
      const modal = dialog(page, 'Edit plan — Basic Wash')
      const save = modal.getByRole('button', { name: 'Save' })
      await expect(save).toBeDisabled()

      await modal.getByLabel('Monthly price').fill('15.99')
      await expect(save).toBeEnabled()

      await modal.getByLabel('Monthly price').fill('14.99')
      await expect(save).toBeDisabled()
    })

    test('saves a new name, description and price', async ({ page, api }) => {
      const modal = dialog(page, 'Edit plan — Basic Wash')
      await modal.getByLabel('Name').fill('Basic Plus')
      await modal.getByLabel('Description').fill('Two washes a week')
      await modal.getByLabel('Monthly price').fill('19.99')
      await modal.getByRole('button', { name: 'Save' }).click()

      await expect(modal).toBeHidden()
      const row = planRow(page, 'Basic Plus')
      await expect(row).toContainText('Two washes a week')
      await expect(row).toContainText('$19.99')
      await expect(planRow(page, 'Basic Wash')).toHaveCount(0)
      expect(api.requestsTo('PATCH', '/plans/2')[0].body).toEqual({
        name: 'Basic Plus',
        description: 'Two washes a week',
        price: 1999,
      })
    })

    test('can clear a description', async ({ page }) => {
      const modal = dialog(page, 'Edit plan — Basic Wash')
      await modal.getByLabel('Description').fill('')
      await modal.getByRole('button', { name: 'Save' }).click()

      await expect(modal).toBeHidden()
      await expect(planRow(page, 'Basic Wash').getByRole('cell').nth(1)).toHaveText('—')
    })

    test('does not touch the plans status', async ({ page, api }) => {
      const modal = dialog(page, 'Edit plan — Basic Wash')
      await modal.getByLabel('Name').fill('Renamed')
      await modal.getByRole('button', { name: 'Save' }).click()
      await expect(modal).toBeHidden()

      expect(api.requestsTo('PATCH', '/plans/2')[0].body).not.toHaveProperty('status')
      await expect(planRow(page, 'Renamed')).toContainText('ACTIVE')
    })

    test('discards changes on Cancel, and reopens from the saved values', async ({ page, api }) => {
      const modal = dialog(page, 'Edit plan — Basic Wash')
      await modal.getByLabel('Name').fill('Scratch That')
      await modal.getByRole('button', { name: 'Cancel' }).click()
      await expect(modal).toBeHidden()

      await page.getByRole('button', { name: 'Edit Basic Wash' }).click()

      await expect(dialog(page, 'Edit plan — Basic Wash').getByLabel('Name')).toHaveValue('Basic Wash')
      expect(api.requestsTo('PATCH', '/plans/2')).toHaveLength(0)
    })

    test('keeps the form open and explains when the API refuses', async ({ page, api }) => {
      api.failRequests('PATCH', /^\/plans\/\d+$/, 500)
      const modal = dialog(page, 'Edit plan — Basic Wash')
      await modal.getByLabel('Name').fill('Renamed')
      await modal.getByRole('button', { name: 'Save' }).click()

      await expect(modal.getByRole('alert')).toContainText('Failed to save: Failed to update plan: 500')
    })
  })

  // KNOWN BUG. With `fixedDecimalScale`, Mantine's NumberInput reports a price ending in zero
  // ("5.00", "7.50", "10.00") to `onChange` as a *string*, and PlanFormModal only accepts
  // `typeof dollars === 'number'`, so Save stays disabled. A CSR can't create a $10 plan or set
  // an existing one to $15.00; only prices like $9.99 work. These tests describe the intended
  // behaviour and are expected to fail until it is fixed. Once it is, Playwright reports them as
  // "unexpectedly passed": delete the `test.fail` line below and they become ordinary tests.
  test.describe('round prices', () => {
    test.fail(true, 'PlanFormModal rejects prices ending in zero (NumberInput emits a string)')

    for (const [typed, cents] of [
      ['10', 1000],
      ['7.50', 750],
      ['0', 0],
    ] as const) {
      test(`creates a plan priced at $${typed}`, async ({ page, api }) => {
        await page.goto('/plans')
        await page.getByRole('button', { name: 'New plan' }).click()
        const modal = dialog(page, 'New plan')
        await modal.getByLabel('Name').fill('Round Price')
        await modal.getByLabel('Monthly price').pressSequentially(typed)
        await expect(modal.getByRole('button', { name: 'Save' })).toBeEnabled({ timeout: 2_000 })
        await modal.getByRole('button', { name: 'Save' }).click()

        await expect(modal).toBeHidden()
        expect(api.requestsTo('POST', '/plans')[0].body).toMatchObject({ price: cents })
      })
    }

    test('edits an existing plan to a round price', async ({ page, api }) => {
      await page.goto('/plans')
      await page.getByRole('button', { name: 'Edit Basic Wash' }).click()
      const modal = dialog(page, 'Edit plan — Basic Wash')
      await modal.getByLabel('Monthly price').fill('15')
      await expect(modal.getByRole('button', { name: 'Save' })).toBeEnabled({ timeout: 2_000 })
      await modal.getByRole('button', { name: 'Save' }).click()

      await expect(modal).toBeHidden()
      expect(api.requestsTo('PATCH', '/plans/2')[0].body).toMatchObject({ price: 1500 })
    })
  })

  test.describe('disabling and enabling', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/plans')
    })

    test('offers Disable on an active plan and Enable on a disabled one', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Disable Unlimited Monthly' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Enable Legacy Wash Plan' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Enable Unlimited Monthly' })).toHaveCount(0)
    })

    test('explains the consequence and does nothing if the CSR cancels', async ({ page, api }) => {
      await page.getByRole('button', { name: 'Disable Unlimited Monthly' }).click()

      const modal = dialog(page, 'Disable plan')
      await expect(modal).toContainText(
        'Disable Unlimited Monthly? Members already on it keep it, but it can no longer be added to new subscriptions.',
      )
      await modal.getByRole('button', { name: 'Cancel' }).click()

      await expect(modal).toBeHidden()
      await expect(planRow(page, 'Unlimited Monthly')).toContainText('ACTIVE')
      expect(api.requestsTo('PATCH', '/plans/1')).toHaveLength(0)
    })

    test('disables a plan, and only sends the status', async ({ page, api }) => {
      await page.getByRole('button', { name: 'Disable Unlimited Monthly' }).click()
      await dialog(page, 'Disable plan').getByRole('button', { name: 'Confirm' }).click()

      const row = planRow(page, 'Unlimited Monthly')
      await expect(row).toContainText('DISABLED')
      await expect(row.getByRole('button', { name: 'Enable Unlimited Monthly' })).toBeVisible()
      expect(api.requestsTo('PATCH', '/plans/1')[0].body).toEqual({ status: 'DISABLED' })
    })

    test('enables a disabled plan', async ({ page, api }) => {
      await page.getByRole('button', { name: 'Enable Legacy Wash Plan' }).click()
      const modal = dialog(page, 'Enable plan')
      await expect(modal).toContainText('Enable Legacy Wash Plan? It will be available for new subscriptions again.')
      await modal.getByRole('button', { name: 'Confirm' }).click()

      const row = planRow(page, 'Legacy Wash Plan')
      await expect(row).toContainText('ACTIVE')
      await expect(row.getByRole('button', { name: 'Disable Legacy Wash Plan' })).toBeVisible()
      expect(api.requestsTo('PATCH', '/plans/4')[0].body).toEqual({ status: 'ACTIVE' })
    })

    test('keeps the dialog open and explains when the API refuses', async ({ page, api }) => {
      api.failRequests('PATCH', /^\/plans\/\d+$/, 500)
      await page.getByRole('button', { name: 'Disable Unlimited Monthly' }).click()
      const modal = dialog(page, 'Disable plan')
      await modal.getByRole('button', { name: 'Confirm' }).click()

      await expect(modal.getByRole('alert')).toContainText('Failed to update plan: Failed to update plan: 500')
      await expect(planRow(page, 'Unlimited Monthly')).toContainText('ACTIVE')
    })
  })

  // A plan edit ripples out to the customer pages, which is the part most likely to break silently.
  test.describe('effect on customers', () => {
    async function openJanesFreeVehicleForm(page: Page) {
      await page.getByRole('link', { name: 'Customers' }).click()
      await page.getByRole('link', { name: 'Jane Doe' }).click()
      await vehicleRow(page, 'XYZ789').getByRole('button', { name: 'Add Subscription' }).click()
      return dialog(page, 'Add subscription — XYZ789')
    }

    test('a disabled plan can no longer be picked for a new subscription', async ({ page }) => {
      await page.goto('/plans')
      await page.getByRole('button', { name: 'Disable Basic Wash' }).click()
      await dialog(page, 'Disable plan').getByRole('button', { name: 'Confirm' }).click()
      await expect(planRow(page, 'Basic Wash')).toContainText('DISABLED')

      const modal = await openJanesFreeVehicleForm(page)
      await modal.getByLabel('Plan').click()

      await expect(page.getByRole('option')).toHaveText(['Premium Plus — $49.99/mo', 'Unlimited Monthly — $29.99/mo'])
    })

    test('a re-enabled plan can be picked again', async ({ page }) => {
      await page.goto('/plans')
      await page.getByRole('button', { name: 'Enable Legacy Wash Plan' }).click()
      await dialog(page, 'Enable plan').getByRole('button', { name: 'Confirm' }).click()
      await expect(planRow(page, 'Legacy Wash Plan')).toContainText('ACTIVE')

      const modal = await openJanesFreeVehicleForm(page)
      await choose(page, modal.getByLabel('Plan'), /Legacy Wash Plan — \$15\.00\/mo/)

      await expect(modal.getByRole('button', { name: 'Add', exact: true })).toBeEnabled()
    })

    test('a newly created plan appears in the subscription picker', async ({ page }) => {
      await page.goto('/plans')
      await page.getByRole('button', { name: 'New plan' }).click()
      const form = dialog(page, 'New plan')
      await form.getByLabel('Name').fill('Aardvark Special')
      await form.getByLabel('Monthly price').fill('7.55')
      await form.getByRole('button', { name: 'Save' }).click()
      await expect(planRow(page, 'Aardvark Special')).toBeVisible()

      const modal = await openJanesFreeVehicleForm(page)
      await modal.getByLabel('Plan').click()

      await expect(page.getByRole('option').first()).toHaveText('Aardvark Special — $7.55/mo')
    })

    test('a renamed plan shows its new name on a customer already subscribed to it', async ({ page }) => {
      await page.goto('/users/1')
      await expect(vehicleRow(page, 'ABC123')).toContainText('Unlimited Monthly')

      await page.getByRole('link', { name: 'Plans' }).click()
      await page.getByRole('button', { name: 'Edit Unlimited Monthly' }).click()
      const form = dialog(page, 'Edit plan — Unlimited Monthly')
      await form.getByLabel('Name').fill('Unlimited Deluxe')
      await form.getByRole('button', { name: 'Save' }).click()
      await expect(planRow(page, 'Unlimited Deluxe')).toBeVisible()

      await page.getByRole('link', { name: 'Customers' }).click()
      await page.getByRole('link', { name: 'Jane Doe' }).click()

      await expect(vehicleRow(page, 'ABC123')).toContainText('Unlimited Deluxe')
    })

    test('disabling a plan leaves existing members on it', async ({ page }) => {
      await page.goto('/plans')
      await page.getByRole('button', { name: 'Disable Unlimited Monthly' }).click()
      await dialog(page, 'Disable plan').getByRole('button', { name: 'Confirm' }).click()
      await expect(planRow(page, 'Unlimited Monthly')).toContainText('DISABLED')

      await page.getByRole('link', { name: 'Customers' }).click()
      await page.getByRole('link', { name: 'Jane Doe' }).click()

      await expect(vehicleRow(page, 'ABC123')).toContainText('Unlimited Monthly')
      await expect(vehicleRow(page, 'ABC123')).toContainText('ACTIVE')
    })
  })
})
