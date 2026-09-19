import { RETRY_BACKOFF_TIMEOUT, expect, test } from './support/test.js'
import { dialog, section, vehicleRow } from './support/locators.js'

test.describe('Customer detail', () => {
  test.describe('reading', () => {
    test('shows the customer, their account details, vehicles and purchases', async ({ page }) => {
      await page.goto('/users/1')

      await expect(page.getByRole('heading', { level: 2, name: 'Jane Doe' })).toBeVisible()

      const account = section(page, 'Account')
      await expect(account.getByRole('row', { name: /Email/ })).toContainText('jane.doe@example.com')
      await expect(account.getByRole('row', { name: /Phone/ })).toContainText('555-0100')
      await expect(account.getByRole('row', { name: /Status/ })).toContainText('ACTIVE')
    })

    test('lists every vehicle with its plan, status and next billing date', async ({ page }) => {
      await page.goto('/users/1')

      await expect(section(page, 'Vehicles').getByRole('columnheader')).toHaveText([
        'License Plate',
        'State',
        'Make',
        'Model',
        'Year',
        'Plan',
        'Subscription Status',
        'Next Billing Date',
        'Actions',
      ])
      await expect(section(page, 'Vehicles').locator('tbody tr')).toHaveCount(3)

      const corolla = vehicleRow(page, 'ABC123')
      for (const text of ['CA', 'Toyota', 'Corolla', '2020', 'Unlimited Monthly', 'ACTIVE', 'Oct 1, 2026']) {
        await expect(corolla).toContainText(text)
      }
    })

    test('shows a dash for a vehicle that has never had a subscription', async ({ page }) => {
      await page.goto('/users/1')

      const civic = vehicleRow(page, 'XYZ789')
      await expect(civic.getByRole('cell').nth(5)).toHaveText('—')
      await expect(civic.getByRole('cell').nth(6)).toHaveText('—')
      await expect(civic.getByRole('cell').nth(7)).toHaveText('—')
    })

    test('shows an overdue subscription as OVERDUE', async ({ page }) => {
      await page.goto('/users/2')

      const truck = vehicleRow(page, 'LEE456')
      await expect(truck).toContainText('Basic Wash')
      await expect(truck).toContainText('OVERDUE')
    })

    test('lists purchases newest first, with type, status and amount in dollars', async ({ page }) => {
      await page.goto('/users/1')

      const purchases = section(page, 'Purchase History')
      await expect(purchases.locator('tbody tr')).toHaveCount(2)

      const [newest, oldest] = await purchases.locator('tbody tr').all()
      for (const text of ['Sep 1, 2026', 'ABC123', 'Unlimited Monthly', 'SUBSCRIPTION', 'SUCCESS', '$29.99']) {
        await expect(newest).toContainText(text)
      }
      for (const text of ['Aug 15, 2026', 'XYZ789', 'Single wash', 'SINGLE_WASH', 'SUCCESS', '$15.00']) {
        await expect(oldest).toContainText(text)
      }
    })

    test('shows a failed payment as FAILURE', async ({ page }) => {
      await page.goto('/users/2')

      await expect(section(page, 'Purchase History').getByRole('row', { name: /LEE456/ })).toContainText('FAILURE')
    })

    test('says so when a customer has no vehicles or purchases', async ({ page }) => {
      await page.goto('/users/5')

      await expect(page.getByRole('heading', { level: 2, name: 'Nora Kim' })).toBeVisible()
      await expect(section(page, 'Vehicles')).toContainText('No vehicles')
      await expect(section(page, 'Purchase History')).toContainText('No purchases')
    })

    test('shows an error for a customer that does not exist', async ({ page }) => {
      await page.goto('/users/9999')

      await expect(page.getByText('Failed to load user')).toBeVisible({ timeout: RETRY_BACKOFF_TIMEOUT })
    })

    test('shows a spinner while the customer loads', async ({ page }) => {
      let release!: () => void
      const gate = new Promise<void>((resolve) => (release = resolve))
      await page.route(
        (url) => url.pathname === '/api/users/1',
        async (route) => {
          await gate
          await route.fallback()
        },
      )

      await page.goto('/users/1')
      await expect(page.getByLabel('Loading')).toBeVisible()

      release()
      await expect(page.getByRole('heading', { level: 2, name: 'Jane Doe' })).toBeVisible()
    })
  })

  test.describe('editing account details', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/users/1')
    })

    test('opens a form prefilled with the current details', async ({ page }) => {
      await page.getByRole('button', { name: 'Edit' }).click()

      await expect(page.getByLabel('First Name')).toHaveValue('Jane')
      await expect(page.getByLabel('Last Name')).toHaveValue('Doe')
      await expect(page.getByLabel('Email')).toHaveValue('jane.doe@example.com')
      await expect(page.getByLabel('Phone')).toHaveValue('555-0100')
    })

    test('keeps Save disabled until something changes, and again if the change is undone', async ({ page }) => {
      await page.getByRole('button', { name: 'Edit' }).click()
      const save = page.getByRole('button', { name: 'Save' })
      await expect(save).toBeDisabled()

      await page.getByLabel('Phone').fill('555-9999')
      await expect(save).toBeEnabled()

      await page.getByLabel('Phone').fill('555-0100')
      await expect(save).toBeDisabled()
    })

    test('saves the changes and shows them without a reload', async ({ page, api }) => {
      await page.getByRole('button', { name: 'Edit' }).click()
      await page.getByLabel('First Name').fill('Janet')
      await page.getByLabel('Phone').fill('555-9999')
      await page.getByRole('button', { name: 'Save' }).click()

      await expect(page.getByRole('heading', { level: 2, name: 'Janet Doe' })).toBeVisible()
      await expect(section(page, 'Account').getByRole('row', { name: /Phone/ })).toContainText('555-9999')
      await expect(page.getByLabel('First Name')).toHaveCount(0)

      expect(api.requestsTo('PATCH', '/users/1')).toHaveLength(1)
      expect(api.requestsTo('PATCH', '/users/1')[0].body).toEqual({
        firstName: 'Janet',
        lastName: 'Doe',
        email: 'jane.doe@example.com',
        phone: '555-9999',
      })
    })

    test('keeps the change when the page is reloaded', async ({ page }) => {
      await page.getByRole('button', { name: 'Edit' }).click()
      await page.getByLabel('Email').fill('janet@example.com')
      await page.getByRole('button', { name: 'Save' }).click()
      await expect(section(page, 'Account').getByRole('row', { name: /Email/ })).toContainText('janet@example.com')

      await page.reload()

      await expect(section(page, 'Account').getByRole('row', { name: /Email/ })).toContainText('janet@example.com')
    })

    test('discards edits on Cancel, and starts from the saved values next time', async ({ page, api }) => {
      await page.getByRole('button', { name: 'Edit' }).click()
      await page.getByLabel('First Name').fill('Someone Else')
      await page.getByRole('button', { name: 'Cancel' }).click()

      await expect(page.getByRole('heading', { level: 2, name: 'Jane Doe' })).toBeVisible()
      await page.getByRole('button', { name: 'Edit' }).click()
      await expect(page.getByLabel('First Name')).toHaveValue('Jane')
      expect(api.requestsTo('PATCH', '/users/1')).toHaveLength(0)
    })

    test('stays in the form and explains when the email is already taken', async ({ page }) => {
      await page.getByRole('button', { name: 'Edit' }).click()
      await page.getByLabel('Email').fill('marcus.lee@example.com')
      await page.getByRole('button', { name: 'Save' }).click()

      await expect(page.getByRole('alert')).toContainText('Failed to save: Failed to update user: 409')
      await expect(page.getByLabel('Email')).toHaveValue('marcus.lee@example.com')
    })

    test('stays in the form when the API rejects the values as invalid', async ({ page }) => {
      await page.getByRole('button', { name: 'Edit' }).click()
      await page.getByLabel('Email').fill('not-an-email')
      await page.getByRole('button', { name: 'Save' }).click()

      await expect(page.getByRole('alert')).toContainText('Failed to save: Failed to update user: 400')
    })
  })

  test.describe('deactivating and reactivating', () => {
    test('asks for confirmation, and does nothing if the CSR backs out', async ({ page, api }) => {
      await page.goto('/users/1')
      await page.getByRole('button', { name: 'Deactivate account' }).click()

      const confirm = dialog(page, 'Deactivate account')
      await expect(confirm).toContainText('Are you sure you want to deactivate this account?')
      await confirm.getByRole('button', { name: 'Cancel' }).click()

      await expect(confirm).toBeHidden()
      await expect(section(page, 'Account').getByRole('row', { name: /Status/ })).toContainText('ACTIVE')
      expect(api.requestsTo('DELETE', '/users/1')).toHaveLength(0)
    })

    test('deactivates the account and cancels its subscriptions', async ({ page }) => {
      await page.goto('/users/1')
      await page.getByRole('button', { name: 'Deactivate account' }).click()
      await dialog(page, 'Deactivate account').getByRole('button', { name: 'Confirm' }).click()

      const account = section(page, 'Account')
      await expect(account.getByRole('row', { name: /Status/ })).toContainText('DISABLED')
      await expect(page.getByRole('button', { name: 'Reactivate account' })).toBeVisible()
      await expect(account).toContainText('This account is disabled. Reactivate it to edit details or manage subscriptions.')

      // Deactivating cancels every live subscription, and the vehicles table reflects that.
      await expect(vehicleRow(page, 'ABC123')).toContainText('CANCELLED')
      await expect(vehicleRow(page, 'JAN555')).toContainText('CANCELLED')
    })

    test('freezes editing and subscription actions while the account is disabled', async ({ page }) => {
      await page.goto('/users/3')

      await expect(page.getByRole('button', { name: 'Edit' })).toBeDisabled()
      await expect(section(page, 'Vehicles').getByText('Reactivate account to manage')).toBeVisible()
      await expect(section(page, 'Vehicles').getByRole('button')).toHaveCount(0)
    })

    test('reactivates a disabled account and restores editing and subscription actions', async ({ page }) => {
      await page.goto('/users/3')
      await page.getByRole('button', { name: 'Reactivate account' }).click()

      const confirm = dialog(page, 'Reactivate account')
      await expect(confirm).toContainText('Are you sure you want to reactivate this account?')
      await confirm.getByRole('button', { name: 'Confirm' }).click()

      await expect(section(page, 'Account').getByRole('row', { name: /Status/ })).toContainText('ACTIVE')
      await expect(page.getByRole('button', { name: 'Edit' })).toBeEnabled()
      await expect(page.getByRole('button', { name: 'Deactivate account' })).toBeVisible()
      // Reactivating does not resurrect the subscription that deactivating cancelled.
      await expect(vehicleRow(page, 'PRI321')).toContainText('CANCELLED')
      await expect(vehicleRow(page, 'PRI321').getByRole('button', { name: 'Add Subscription' })).toBeVisible()
    })

    test('shows the new status on the customers list too', async ({ page }) => {
      await page.goto('/users/1')
      await page.getByRole('button', { name: 'Deactivate account' }).click()
      await dialog(page, 'Deactivate account').getByRole('button', { name: 'Confirm' }).click()
      await expect(page.getByRole('button', { name: 'Reactivate account' })).toBeVisible()

      await page.getByRole('link', { name: 'Customers' }).click()

      await expect(page.getByRole('row', { name: /Jane Doe/ })).toContainText('DISABLED')
    })
  })
})
