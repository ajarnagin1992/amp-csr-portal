import { expect, test } from './support/test.js'
import { choose, dialog, vehicleRow } from './support/locators.js'

// Jane Doe (user 1) has three vehicles: ABC123 (ACTIVE), XYZ789 (none) and JAN555 (ACTIVE).
test.describe('Subscriptions', () => {
  test.describe('add', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/users/1')
    })

    test('is offered on a vehicle with no subscription, and not on one that has one', async ({ page }) => {
      await expect(vehicleRow(page, 'XYZ789').getByRole('button', { name: 'Add Subscription' })).toBeVisible()
      await expect(vehicleRow(page, 'ABC123').getByRole('button', { name: 'Add Subscription' })).toHaveCount(0)
    })

    test('offers only the active plans, with their monthly price', async ({ page }) => {
      await vehicleRow(page, 'XYZ789').getByRole('button', { name: 'Add Subscription' }).click()
      const modal = dialog(page, 'Add subscription — XYZ789')
      await modal.getByLabel('Plan').click()

      await expect(page.getByRole('option')).toHaveText([
        'Basic Wash — $14.99/mo',
        'Premium Plus — $49.99/mo',
        'Unlimited Monthly — $29.99/mo',
      ])
    })

    test('keeps Add disabled until a plan is chosen', async ({ page }) => {
      await vehicleRow(page, 'XYZ789').getByRole('button', { name: 'Add Subscription' }).click()
      const modal = dialog(page, 'Add subscription — XYZ789')
      const add = modal.getByRole('button', { name: 'Add', exact: true })
      await expect(add).toBeDisabled()

      await choose(page, modal.getByLabel('Plan'), /Basic Wash/)

      await expect(add).toBeEnabled()
    })

    test('subscribes the vehicle to the chosen plan and shows it straight away', async ({ page, api }) => {
      await vehicleRow(page, 'XYZ789').getByRole('button', { name: 'Add Subscription' }).click()
      const modal = dialog(page, 'Add subscription — XYZ789')
      await choose(page, modal.getByLabel('Plan'), /Premium Plus/)
      await modal.getByRole('button', { name: 'Add', exact: true }).click()

      await expect(modal).toBeHidden()
      const civic = vehicleRow(page, 'XYZ789')
      await expect(civic).toContainText('Premium Plus')
      await expect(civic).toContainText('ACTIVE')
      await expect(civic).toContainText(/[A-Z][a-z]{2} \d{1,2}, \d{4}/)
      await expect(civic.getByRole('button', { name: 'End Subscription' })).toBeVisible()
      await expect(civic.getByRole('button', { name: 'Add Subscription' })).toHaveCount(0)

      expect(api.requestsTo('POST', '/subscriptions')).toHaveLength(1)
      expect(api.requestsTo('POST', '/subscriptions')[0].body).toEqual({ vehicleId: 2, planId: 3 })
    })

    test('sets the first billing date about a month out', async ({ page, api }) => {
      await vehicleRow(page, 'XYZ789').getByRole('button', { name: 'Add Subscription' }).click()
      const modal = dialog(page, 'Add subscription — XYZ789')
      await choose(page, modal.getByLabel('Plan'), /Basic Wash/)
      await modal.getByRole('button', { name: 'Add', exact: true }).click()
      await expect(modal).toBeHidden()

      const created = api.store.subscriptions.find((s) => s.vehicleId === 2)
      expect(created).toBeDefined()
      const daysOut = (Date.parse(created!.nextBillingDate) - Date.now()) / 86_400_000
      expect(daysOut).toBeGreaterThan(27)
      expect(daysOut).toBeLessThan(32)
    })

    test('closes without subscribing on Cancel', async ({ page, api }) => {
      await vehicleRow(page, 'XYZ789').getByRole('button', { name: 'Add Subscription' }).click()
      const modal = dialog(page, 'Add subscription — XYZ789')
      await choose(page, modal.getByLabel('Plan'), /Basic Wash/)
      await modal.getByRole('button', { name: 'Cancel' }).click()

      await expect(modal).toBeHidden()
      await expect(vehicleRow(page, 'XYZ789').getByRole('button', { name: 'Add Subscription' })).toBeVisible()
      expect(api.requestsTo('POST', '/subscriptions')).toHaveLength(0)
    })

    test('forgets the previous choice when reopened', async ({ page }) => {
      const open = () => vehicleRow(page, 'XYZ789').getByRole('button', { name: 'Add Subscription' }).click()
      await open()
      const modal = dialog(page, 'Add subscription — XYZ789')
      await choose(page, modal.getByLabel('Plan'), /Basic Wash/)
      await modal.getByRole('button', { name: 'Cancel' }).click()
      await expect(modal).toBeHidden()

      await open()

      await expect(modal.getByLabel('Plan')).toHaveValue('')
      await expect(modal.getByRole('button', { name: 'Add', exact: true })).toBeDisabled()
    })

    test('keeps the dialog open and explains when the API refuses', async ({ page, api }) => {
      api.failRequests('POST', /^\/subscriptions$/, 409)
      await vehicleRow(page, 'XYZ789').getByRole('button', { name: 'Add Subscription' }).click()
      const modal = dialog(page, 'Add subscription — XYZ789')
      await choose(page, modal.getByLabel('Plan'), /Basic Wash/)
      await modal.getByRole('button', { name: 'Add', exact: true }).click()

      await expect(modal.getByRole('alert')).toContainText('Failed to add subscription: Failed to create subscription: 409')
      await expect(vehicleRow(page, 'XYZ789').getByRole('button', { name: 'Add Subscription' })).toBeVisible()
    })

    test('is refused by the API for a plan disabled after the page loaded', async ({ page, api }) => {
      await vehicleRow(page, 'XYZ789').getByRole('button', { name: 'Add Subscription' }).click()
      const modal = dialog(page, 'Add subscription — XYZ789')
      await choose(page, modal.getByLabel('Plan'), /Basic Wash/)
      // A colleague disables the plan while this CSR has the picker open.
      api.store.plans.find((plan) => plan.name === 'Basic Wash')!.status = 'DISABLED'
      await modal.getByRole('button', { name: 'Add', exact: true }).click()

      await expect(modal.getByRole('alert')).toContainText('Failed to create subscription: 400')
    })

    test('is available again on a vehicle whose subscription was cancelled', async ({ page }) => {
      await page.goto('/users/3')
      await page.getByRole('button', { name: 'Reactivate account' }).click()
      await dialog(page, 'Reactivate account').getByRole('button', { name: 'Confirm' }).click()

      const subaru = vehicleRow(page, 'PRI321')
      await expect(subaru).toContainText('CANCELLED')
      await subaru.getByRole('button', { name: 'Add Subscription' }).click()
      const modal = dialog(page, 'Add subscription — PRI321')
      await choose(page, modal.getByLabel('Plan'), /Unlimited Monthly/)
      await modal.getByRole('button', { name: 'Add', exact: true }).click()

      await expect(subaru).toContainText('ACTIVE')
      await expect(subaru).toContainText('Unlimited Monthly')
    })
  })

  test.describe('end', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/users/1')
    })

    test('is offered on active and overdue subscriptions', async ({ page }) => {
      await expect(vehicleRow(page, 'ABC123').getByRole('button', { name: 'End Subscription' })).toBeVisible()

      await page.goto('/users/2')
      await expect(vehicleRow(page, 'LEE456')).toContainText('OVERDUE')
      await expect(vehicleRow(page, 'LEE456').getByRole('button', { name: 'End Subscription' })).toBeVisible()
    })

    test('asks which vehicle before cancelling, and does nothing if the CSR goes Back', async ({ page, api }) => {
      await vehicleRow(page, 'ABC123').getByRole('button', { name: 'End Subscription' }).click()
      const modal = dialog(page, 'End subscription')
      await expect(modal).toContainText('Are you sure you want to cancel the subscription on ABC123?')
      await modal.getByRole('button', { name: 'Back' }).click()

      await expect(modal).toBeHidden()
      await expect(vehicleRow(page, 'ABC123')).toContainText('ACTIVE')
      expect(api.requestsTo('DELETE', '/subscriptions/1')).toHaveLength(0)
    })

    test('cancels the subscription and offers to add a new one', async ({ page, api }) => {
      await vehicleRow(page, 'ABC123').getByRole('button', { name: 'End Subscription' }).click()
      await dialog(page, 'End subscription').getByRole('button', { name: 'Confirm' }).click()

      await expect(dialog(page, 'End subscription')).toBeHidden()
      const corolla = vehicleRow(page, 'ABC123')
      await expect(corolla).toContainText('CANCELLED')
      await expect(corolla.getByRole('button', { name: 'Add Subscription' })).toBeVisible()
      await expect(corolla.getByRole('button', { name: 'End Subscription' })).toHaveCount(0)
      expect(api.requestsTo('DELETE', '/subscriptions/1')).toHaveLength(1)
    })

    test('leaves the customers other subscriptions alone', async ({ page }) => {
      await vehicleRow(page, 'ABC123').getByRole('button', { name: 'End Subscription' }).click()
      await dialog(page, 'End subscription').getByRole('button', { name: 'Confirm' }).click()
      await expect(vehicleRow(page, 'ABC123')).toContainText('CANCELLED')

      await expect(vehicleRow(page, 'JAN555')).toContainText('ACTIVE')
    })

    test('keeps the dialog open and explains when the API refuses', async ({ page, api }) => {
      api.failRequests('DELETE', /^\/subscriptions\/\d+$/, 500)
      await vehicleRow(page, 'ABC123').getByRole('button', { name: 'End Subscription' }).click()
      const modal = dialog(page, 'End subscription')
      await modal.getByRole('button', { name: 'Confirm' }).click()

      await expect(modal.getByRole('alert')).toContainText('Failed to cancel subscription: Failed to cancel subscription: 500')
      await expect(vehicleRow(page, 'ABC123')).toContainText('ACTIVE')
    })

    test('clears an earlier error when the dialog is opened again', async ({ page, api }) => {
      api.failRequests('DELETE', /^\/subscriptions\/\d+$/, 500)
      await vehicleRow(page, 'ABC123').getByRole('button', { name: 'End Subscription' }).click()
      const modal = dialog(page, 'End subscription')
      await modal.getByRole('button', { name: 'Confirm' }).click()
      await expect(modal.getByRole('alert')).toBeVisible()
      await modal.getByRole('button', { name: 'Back' }).click()
      await expect(modal).toBeHidden()

      await vehicleRow(page, 'ABC123').getByRole('button', { name: 'End Subscription' }).click()

      await expect(modal).toBeVisible()
      await expect(modal.getByRole('alert')).toHaveCount(0)
    })
  })

  test.describe('transfer', () => {
    test('moves a subscription to another vehicle on the same account, keeping plan and billing date', async ({
      page,
      api,
    }) => {
      await page.goto('/users/1')
      await vehicleRow(page, 'ABC123').getByRole('button', { name: 'Transfer' }).click()
      const modal = dialog(page, 'Transfer subscription — ABC123')
      await choose(page, modal.getByLabel('Transfer to vehicle'), /XYZ789/)
      await modal.getByRole('button', { name: 'Transfer', exact: true }).click()

      await expect(modal).toBeHidden()
      const from = vehicleRow(page, 'ABC123')
      await expect(from).toContainText('TRANSFERRED')
      await expect(from.getByRole('button', { name: 'Add Subscription' })).toBeVisible()

      const to = vehicleRow(page, 'XYZ789')
      await expect(to).toContainText('Unlimited Monthly')
      await expect(to).toContainText('ACTIVE')
      await expect(to).toContainText('Oct 1, 2026')

      expect(api.requestsTo('POST', '/subscriptions/1/transfer')[0].body).toEqual({ vehicleId: 2 })
    })

    test('offers only vehicles without a live subscription as targets', async ({ page }) => {
      await page.goto('/users/1')
      await vehicleRow(page, 'ABC123').getByRole('button', { name: 'Transfer' }).click()
      const modal = dialog(page, 'Transfer subscription — ABC123')
      await modal.getByLabel('Transfer to vehicle').click()

      // JAN555 already has an ACTIVE subscription and ABC123 is the source.
      await expect(page.getByRole('option')).toHaveText(['XYZ789 — Honda Civic'])
    })

    test('offers a vehicle again once its subscription has ended', async ({ page }) => {
      await page.goto('/users/1')
      await vehicleRow(page, 'JAN555').getByRole('button', { name: 'End Subscription' }).click()
      await dialog(page, 'End subscription').getByRole('button', { name: 'Confirm' }).click()
      await expect(vehicleRow(page, 'JAN555')).toContainText('CANCELLED')

      await vehicleRow(page, 'ABC123').getByRole('button', { name: 'Transfer' }).click()
      await dialog(page, 'Transfer subscription — ABC123').getByLabel('Transfer to vehicle').click()

      await expect(page.getByRole('option')).toHaveText(['XYZ789 — Honda Civic', 'JAN555 — Mazda Mazda3'])
    })

    test('keeps the dialogs Transfer button disabled until a vehicle is chosen', async ({ page }) => {
      await page.goto('/users/1')
      await vehicleRow(page, 'ABC123').getByRole('button', { name: 'Transfer' }).click()
      const modal = dialog(page, 'Transfer subscription — ABC123')
      const transfer = modal.getByRole('button', { name: 'Transfer', exact: true })
      await expect(transfer).toBeDisabled()

      await choose(page, modal.getByLabel('Transfer to vehicle'), /XYZ789/)

      await expect(transfer).toBeEnabled()
    })

    test('disables Transfer when the customer has nowhere to move the subscription', async ({ page }) => {
      await page.goto('/users/4')

      await expect(vehicleRow(page, 'SAM007').getByRole('button', { name: 'Transfer' })).toBeDisabled()
    })

    test('closes without transferring on Cancel', async ({ page, api }) => {
      await page.goto('/users/1')
      await vehicleRow(page, 'ABC123').getByRole('button', { name: 'Transfer' }).click()
      const modal = dialog(page, 'Transfer subscription — ABC123')
      await choose(page, modal.getByLabel('Transfer to vehicle'), /XYZ789/)
      await modal.getByRole('button', { name: 'Cancel' }).click()

      await expect(modal).toBeHidden()
      await expect(vehicleRow(page, 'ABC123')).toContainText('ACTIVE')
      expect(api.requestsTo('POST', '/subscriptions/1/transfer')).toHaveLength(0)
    })

    test('keeps the dialog open and explains when the API refuses', async ({ page, api }) => {
      api.failRequests('POST', /^\/subscriptions\/\d+\/transfer$/, 409)
      await page.goto('/users/1')
      await vehicleRow(page, 'ABC123').getByRole('button', { name: 'Transfer' }).click()
      const modal = dialog(page, 'Transfer subscription — ABC123')
      await choose(page, modal.getByLabel('Transfer to vehicle'), /XYZ789/)
      await modal.getByRole('button', { name: 'Transfer', exact: true }).click()

      await expect(modal.getByRole('alert')).toContainText(
        'Failed to transfer subscription: Failed to transfer subscription: 409',
      )
      await expect(vehicleRow(page, 'ABC123')).toContainText('ACTIVE')
    })

    test('carries over the plan of whichever subscription is moved', async ({ page }) => {
      await page.goto('/users/1')
      await vehicleRow(page, 'JAN555').getByRole('button', { name: 'Transfer' }).click()
      const modal = dialog(page, 'Transfer subscription — JAN555')
      await choose(page, modal.getByLabel('Transfer to vehicle'), /XYZ789/)
      await modal.getByRole('button', { name: 'Transfer', exact: true }).click()

      await expect(vehicleRow(page, 'XYZ789')).toContainText('Premium Plus')
      await expect(vehicleRow(page, 'JAN555')).toContainText('TRANSFERRED')
    })
  })
})
