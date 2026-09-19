import { CSR, CSR_PASSWORD, expect, test } from './support/test.js'

test.describe('Authentication', () => {
  test('opens straight onto the portal when a session exists', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible()
  })

  test('shows the login page without a session, then signs in', async ({ page, api }) => {
    api.signedIn = false
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()

    await page.getByLabel('Email').fill(CSR.email)
    await page.getByLabel('Password').fill(CSR_PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible()
  })

  test('rejects a wrong password', async ({ page, api }) => {
    api.signedIn = false
    await page.goto('/')

    await page.getByLabel('Email').fill(CSR.email)
    await page.getByLabel('Password').fill('wrong')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Customers' })).toBeHidden()
  })

  test('signing out returns to the login page', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Sign out' }).click()

    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })
})
