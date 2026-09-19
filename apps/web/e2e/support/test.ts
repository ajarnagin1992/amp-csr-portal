import { test as base } from '@playwright/test'
import { CSR, CSR_PASSWORD, FakeApi } from './fakeApi.js'

export { expect } from '@playwright/test'
export { CSR, CSR_PASSWORD, FakeApi }

/**
 * The portal's QueryClient keeps React Query's default of three retries with exponential backoff
 * (1s + 2s + 4s), so a failed *query* only surfaces as an error after ~7s. Failed mutations
 * are not retried. Use this as the `expect` timeout when asserting a load-failure message.
 */
export const RETRY_BACKOFF_TIMEOUT = 15_000

interface Fixtures {
  api: FakeApi
}

/**
 * `test` with the fake API wired in. `api` is an auto fixture, so the routes are in place before
 * the test's first `page.goto` even when it never mentions `api`; ask for it by name to inspect
 * or bend the backend (`api.store`, `api.requests`, `api.failRequests`).
 */
export const test = base.extend<Fixtures>({
  api: [
    async ({ page }, run) => {
      const api = new FakeApi()
      await api.install(page)
      await run(api)
    },
    { auto: true },
  ],
})
