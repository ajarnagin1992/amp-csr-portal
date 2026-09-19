import type { Page, Route } from '@playwright/test'
import type { ZodType } from 'zod'
import {
  createPlanSchema,
  createSubscriptionSchema,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  loginSchema,
  transferSubscriptionSchema,
  updatePlanSchema,
  updateUserSchema,
  type CsrUserDto,
  type MobileUserDto,
  type PlanDto,
  type SubscriptionDto,
  type UserDetailDto,
} from '@amp-csr/shared'
import { createSeed, type Store, type SubscriptionRecord } from './seed.js'

const LIVE = new Set<SubscriptionRecord['status']>(['ACTIVE', 'OVERDUE'])
const TERMINAL = new Set<SubscriptionRecord['status']>(['CANCELLED', 'TRANSFERRED'])

/** The one CSR the fake knows; `login` succeeds only with this email and password. */
export const CSR: CsrUserDto = { id: 1, username: 'csr', email: 'csr@example.com' }
export const CSR_PASSWORD = 'correct-horse'

class HttpError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

interface Reply {
  status: number
  body?: unknown
}

interface Ctx {
  params: number[]
  query: URLSearchParams
  body: unknown
}

type Handler = (ctx: Ctx) => Reply

interface Failure {
  method: string
  pattern: RegExp
  status: number
}

export interface RecordedRequest {
  method: string
  path: string
  query: Record<string, string>
  body: unknown
}

// `/api/...` only. A glob like `**/api/**` would also swallow Vite's `/src/api/*.ts` modules.
const isApiRequest = (url: URL) => url.pathname.startsWith('/api/')

function parseWith<T>(schema: ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body)
  if (!result.success) throw new HttpError(400, 'Validation failed')
  return result.data
}

/**
 * An in-memory stand-in for the NestJS API, served through `page.route`.
 *
 * It enforces the same rules as the real services (one live subscription per vehicle, disabled
 * accounts are frozen, disabled plans can't be subscribed to, transfers stay within one customer)
 * and validates request bodies with the real Zod schemas from `@amp-csr/shared`. So the portal
 * is exercised end to end (real bundle, real fetch calls, real cache invalidation) without a
 * database. Each test gets its own instance and therefore its own data.
 */
export class FakeApi {
  readonly store: Store = createSeed()
  /** Every API call the browser made, in order. Lets a test assert what went over the wire. */
  readonly requests: RecordedRequest[] = []

  /** Whether the browser holds a session. Starts true so tests open on the portal, not the login page. */
  signedIn = true

  private readonly failures: Failure[] = []
  private seq = 100
  private readonly routes: Array<[method: string, pattern: RegExp, handler: Handler]> = [
    ['GET', /^\/auth\/me$/, () => this.currentCsr()],
    ['POST', /^\/auth\/login$/, (ctx) => this.login(ctx)],
    ['POST', /^\/auth\/logout$/, () => this.logout()],
    ['GET', /^\/users$/, (ctx) => this.listUsers(ctx)],
    ['GET', /^\/users\/(\d+)$/, (ctx) => this.getUser(ctx)],
    ['PATCH', /^\/users\/(\d+)$/, (ctx) => this.updateUser(ctx)],
    ['DELETE', /^\/users\/(\d+)$/, (ctx) => this.deactivateUser(ctx)],
    ['POST', /^\/users\/(\d+)\/reactivate$/, (ctx) => this.reactivateUser(ctx)],
    ['GET', /^\/plans$/, (ctx) => this.listPlans(ctx)],
    ['POST', /^\/plans$/, (ctx) => this.createPlan(ctx)],
    ['PATCH', /^\/plans\/(\d+)$/, (ctx) => this.updatePlan(ctx)],
    ['POST', /^\/subscriptions$/, (ctx) => this.createSubscription(ctx)],
    ['DELETE', /^\/subscriptions\/(\d+)$/, (ctx) => this.cancelSubscription(ctx)],
    ['POST', /^\/subscriptions\/(\d+)\/transfer$/, (ctx) => this.transferSubscription(ctx)],
  ]

  async install(page: Page): Promise<void> {
    await page.route(isApiRequest, (route) => this.handle(route))
  }

  /** Answer every matching request with `status`, for exercising the portal's error states. */
  failRequests(method: string, pattern: RegExp, status = 500): void {
    this.failures.push({ method, pattern, status })
  }

  /** The requests a test cares about, e.g. `api.requestsTo('POST', '/plans')`. */
  requestsTo(method: string, path: string): RecordedRequest[] {
    return this.requests.filter((request) => request.method === method && request.path === path)
  }

  private async handle(route: Route): Promise<void> {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace(/^\/api/, '')
    const method = request.method()
    const body = request.postData() ? (request.postDataJSON() as unknown) : undefined
    this.requests.push({ method, path, query: Object.fromEntries(url.searchParams), body })

    const failure = this.failures.find((f) => f.method === method && f.pattern.test(path))
    if (failure) {
      return route.fulfill({ status: failure.status, json: { statusCode: failure.status, message: 'Injected failure' } })
    }

    // Like the real API, everything but the auth endpoints needs a session.
    if (!this.signedIn && !path.startsWith('/auth/')) {
      return route.fulfill({ status: 401, json: { statusCode: 401, message: 'Unauthorized' } })
    }

    for (const [routeMethod, pattern, handler] of this.routes) {
      const match = method === routeMethod ? pattern.exec(path) : undefined
      if (!match) continue
      try {
        const reply = handler({ params: match.slice(1).map(Number), query: url.searchParams, body })
        return await route.fulfill({ status: reply.status, json: reply.body })
      } catch (error) {
        if (!(error instanceof HttpError)) throw error
        return await route.fulfill({ status: error.status, json: { statusCode: error.status, message: error.message } })
      }
    }

    return route.fulfill({ status: 404, json: { statusCode: 404, message: `No fake for ${method} ${path}` } })
  }

  // ---- auth -------------------------------------------------------------------------------

  private currentCsr(): Reply {
    if (!this.signedIn) throw new HttpError(401, 'Unauthorized')
    return { status: 200, body: CSR }
  }

  private login({ body }: Ctx): Reply {
    const { email, password } = parseWith(loginSchema, body)
    if (email !== CSR.email || password !== CSR_PASSWORD) throw new HttpError(401, 'Invalid credentials')
    this.signedIn = true
    return { status: 200, body: CSR }
  }

  private logout(): Reply {
    this.signedIn = false
    return { status: 204 }
  }

  // ---- users ------------------------------------------------------------------------------

  private listUsers({ query }: Ctx): Reply {
    const page = Number(query.get('page') ?? DEFAULT_PAGE)
    const pageSize = Number(query.get('pageSize') ?? DEFAULT_PAGE_SIZE)
    const search = query.get('search')?.toLowerCase()

    const matches = search
      ? this.store.users.filter(
          (user) =>
            [user.firstName, user.lastName, user.email, user.phone].some((field) => field.toLowerCase().includes(search)) ||
            this.store.vehicles.some(
              (vehicle) => vehicle.mobileUserId === user.id && vehicle.licensePlate.toLowerCase().includes(search),
            ),
        )
      : this.store.users

    return { status: 200, body: { data: matches.slice((page - 1) * pageSize, page * pageSize), total: matches.length } }
  }

  private getUser({ params: [id] }: Ctx): Reply {
    const user = this.findUser(id)
    const vehicles = this.store.vehicles
      .filter((vehicle) => vehicle.mobileUserId === user.id)
      .map(({ id: vehicleId, licensePlate, state, make, model, year }) => ({
        id: vehicleId,
        licensePlate,
        state,
        make,
        model,
        year,
        subscription: this.currentSubscription(vehicleId),
      }))
    const purchases = this.store.purchases
      .filter((purchase) => purchase.mobileUserId === user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(({ id: purchaseId, type, status, amount, description, createdAt, subscriptionId, vehicle }) => ({
        id: purchaseId,
        type,
        status,
        amount,
        description,
        createdAt,
        subscriptionId,
        vehicle,
      }))

    const detail: UserDetailDto = { ...user, vehicles, purchases }
    return { status: 200, body: detail }
  }

  private updateUser({ params: [id], body }: Ctx): Reply {
    const user = this.findUser(id)
    const data = parseWith(updateUserSchema, body)
    if (user.status === 'DISABLED') throw new HttpError(409, 'User is disabled')
    if (data.email && this.store.users.some((other) => other.id !== id && other.email === data.email)) {
      throw new HttpError(409, 'Email is already in use')
    }
    Object.assign(user, data, { lastUpdated: new Date().toISOString() })
    return { status: 200, body: user }
  }

  // Cancels every live subscription on the customer's vehicles, then disables the account.
  private deactivateUser({ params: [id] }: Ctx): Reply {
    const user = this.findUser(id)
    const vehicleIds = new Set(this.store.vehicles.filter((v) => v.mobileUserId === id).map((v) => v.id))
    for (const subscription of this.store.subscriptions) {
      if (vehicleIds.has(subscription.vehicleId) && !TERMINAL.has(subscription.status)) {
        subscription.status = 'CANCELLED'
      }
    }
    user.status = 'DISABLED'
    return { status: 200, body: user }
  }

  private reactivateUser({ params: [id] }: Ctx): Reply {
    const user = this.findUser(id)
    user.status = 'ACTIVE'
    return { status: 200, body: user }
  }

  // ---- plans ------------------------------------------------------------------------------

  private listPlans({ query }: Ctx): Reply {
    const includeDisabled = query.get('includeDisabled') === 'true'
    const plans = this.store.plans
      .filter((plan) => includeDisabled || plan.status === 'ACTIVE')
      .sort((a, b) => a.name.localeCompare(b.name))
    return { status: 200, body: plans }
  }

  private createPlan({ body }: Ctx): Reply {
    const data = parseWith(createPlanSchema, body)
    const plan: PlanDto = { id: this.nextId(), description: '', ...data, status: 'ACTIVE' }
    this.store.plans.push(plan)
    return { status: 201, body: plan }
  }

  private updatePlan({ params: [id], body }: Ctx): Reply {
    const data = parseWith(updatePlanSchema, body)
    const plan = this.store.plans.find((p) => p.id === id)
    if (!plan) throw new HttpError(404, `Plan ${id} not found`)
    Object.assign(plan, data)
    return { status: 200, body: plan }
  }

  // ---- subscriptions ----------------------------------------------------------------------

  private createSubscription({ body }: Ctx): Reply {
    const { vehicleId, planId } = parseWith(createSubscriptionSchema, body)
    const plan = this.store.plans.find((p) => p.id === planId)
    if (!plan) throw new HttpError(404, `Plan ${planId} not found`)
    if (plan.status === 'DISABLED') throw new HttpError(400, 'Cannot subscribe to a disabled plan')

    const vehicle = this.store.vehicles.find((v) => v.id === vehicleId)
    if (!vehicle) throw new HttpError(404, `Vehicle ${vehicleId} not found`)
    if (this.findUser(vehicle.mobileUserId).status === 'DISABLED') {
      throw new HttpError(409, 'User is disabled; reactivate the account before adding a subscription')
    }
    if (this.hasLiveSubscription(vehicleId)) throw new HttpError(409, `Vehicle ${vehicleId} already has an active subscription`)

    const nextBillingDate = new Date()
    nextBillingDate.setUTCMonth(nextBillingDate.getUTCMonth() + 1)
    const subscription = this.addSubscription(vehicleId, planId, nextBillingDate.toISOString())
    return { status: 201, body: this.toDto(subscription) }
  }

  private cancelSubscription({ params: [id] }: Ctx): Reply {
    const subscription = this.findSubscription(id)
    if (subscription.status === 'CANCELLED') return { status: 200, body: this.toDto(subscription) }
    if (TERMINAL.has(subscription.status)) {
      throw new HttpError(409, `Subscription ${id} is ${subscription.status} and cannot be cancelled`)
    }
    subscription.status = 'CANCELLED'
    return { status: 200, body: this.toDto(subscription) }
  }

  // The old subscription is closed as TRANSFERRED and a new ACTIVE one opens on the target vehicle.
  private transferSubscription({ params: [id], body }: Ctx): Reply {
    const { vehicleId } = parseWith(transferSubscriptionSchema, body)
    const subscription = this.findSubscription(id)
    if (TERMINAL.has(subscription.status)) {
      throw new HttpError(409, `Subscription ${id} is ${subscription.status} and cannot be transferred`)
    }

    const source = this.store.vehicles.find((v) => v.id === subscription.vehicleId)
    if (!source) throw new HttpError(404, 'Vehicle not found')
    if (this.findUser(source.mobileUserId).status === 'DISABLED') {
      throw new HttpError(409, 'User is disabled; reactivate the account before transferring a subscription')
    }

    const target = this.store.vehicles.find((v) => v.id === vehicleId)
    if (!target) throw new HttpError(404, `Vehicle ${vehicleId} not found`)
    if (target.mobileUserId !== source.mobileUserId) {
      throw new HttpError(400, 'Cannot transfer a subscription to a vehicle owned by a different customer')
    }
    if (this.hasLiveSubscription(vehicleId)) throw new HttpError(409, `Vehicle ${vehicleId} already has an active subscription`)

    subscription.status = 'TRANSFERRED'
    const moved = this.addSubscription(vehicleId, subscription.planId, subscription.nextBillingDate)
    return { status: 201, body: this.toDto(moved) }
  }

  // ---- helpers ----------------------------------------------------------------------------

  private nextId(): number {
    return ++this.seq
  }

  private findUser(id: number): MobileUserDto {
    const user = this.store.users.find((u) => u.id === id)
    if (!user) throw new HttpError(404, `User ${id} not found`)
    return user
  }

  private findSubscription(id: number): SubscriptionRecord {
    const subscription = this.store.subscriptions.find((s) => s.id === id)
    if (!subscription) throw new HttpError(404, `Subscription ${id} not found`)
    return subscription
  }

  private hasLiveSubscription(vehicleId: number): boolean {
    return this.store.subscriptions.some((s) => s.vehicleId === vehicleId && LIVE.has(s.status))
  }

  private addSubscription(vehicleId: number, planId: number, nextBillingDate: string): SubscriptionRecord {
    const subscription: SubscriptionRecord = {
      id: this.nextId(),
      seq: this.nextId(),
      vehicleId,
      planId,
      status: 'ACTIVE',
      nextBillingDate,
    }
    this.store.subscriptions.push(subscription)
    return subscription
  }

  // A vehicle's subscription is its newest one, whatever its status (so a cancelled one still shows).
  private currentSubscription(vehicleId: number): SubscriptionDto | undefined {
    const newest = this.store.subscriptions
      .filter((s) => s.vehicleId === vehicleId)
      .sort((a, b) => b.seq - a.seq)[0]
    return newest ? this.toDto(newest) : undefined
  }

  private toDto({ id, status, nextBillingDate, planId }: SubscriptionRecord): SubscriptionDto {
    const plan = this.store.plans.find((p) => p.id === planId)
    if (!plan) throw new HttpError(500, `Plan ${planId} missing`)
    return { id, status, nextBillingDate, plan }
  }
}
