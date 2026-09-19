import type { Locator, Page } from '@playwright/test'

/** A titled card on the customer page: "Account", "Vehicles" or "Purchase History". */
export const section = (page: Page, title: string): Locator =>
  page.locator('section', { has: page.getByRole('heading', { name: title, exact: true }) })

/**
 * A row of the Vehicles table. Scoped to that section because the same plate also appears
 * in Purchase History.
 */
export const vehicleRow = (page: Page, licensePlate: string): Locator =>
  section(page, 'Vehicles').getByRole('row', { name: new RegExp(licensePlate) })

/** A Mantine modal, found by its title. */
export const dialog = (page: Page, title: string): Locator => page.getByRole('dialog', { name: title })

/** Picks an option from a Mantine `Select` (its dropdown renders in a portal, outside the modal). */
export async function choose(page: Page, select: Locator, option: string | RegExp): Promise<void> {
  await select.click()
  await page.getByRole('option', { name: option }).click()
}
