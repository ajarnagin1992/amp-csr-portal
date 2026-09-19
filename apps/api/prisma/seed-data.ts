// Pure generation of the demo dataset; seed.ts writes it to the database. The data is
// built as one coherent timeline per customer, so it obeys the same rules the API does:
//   - a subscription is billed on the same day and time every month, starting the day it was
//     created, and every charge lands a few minutes after its billing date;
//   - nothing is billed in the future, and a live subscription's next billing date always is;
//   - a deactivated account has no live subscriptions and nothing happens on it afterwards;
//   - a transfer ends the old subscription and starts a new one on another vehicle of the
//     same customer, continuing the same billing schedule;
//   - single washes only happen on vehicles that aren't covered by a subscription at the time.
import type {
  MobileUserStatus,
  PlanStatus,
  PurchaseStatus,
  PurchaseType,
  SubscriptionStatus,
} from '../src/generated/prisma/client.js';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const SINGLE_WASH_PRICE = 1200;
export const USER_COUNT = 45;

export const PLANS = [
  { name: 'Basic Wash', description: 'Exterior wash and dry, once a day', price: 900, status: 'ACTIVE' as const },
  { name: 'Premium Wash', description: 'Exterior wash, wax, and wheel shine, once a day', price: 1900, status: 'ACTIVE' as const },
  {
    name: 'Unlimited Deluxe',
    description: 'Every wash, every day, including interior vacuum and ceramic sealant',
    price: 2900,
    status: 'ACTIVE' as const,
  },
  { name: 'Legacy Wash Plan', description: 'Retired plan, kept for existing members', price: 1500, status: 'DISABLED' as const },
];

export interface PlanRef {
  id: number;
  name: string;
  price: number;
  status: PlanStatus;
}

export interface PurchaseSpec {
  type: PurchaseType;
  status: PurchaseStatus;
  amount: number;
  description: string;
  createdAt: Date;
}

export interface SubscriptionSpec {
  planId: number;
  status: SubscriptionStatus;
  createdAt: Date;
  // When it was cancelled or transferred, or else when it was last billed.
  lastUpdated: Date;
  nextBillingDate: Date;
  charges: PurchaseSpec[];
}

export interface VehicleSpec {
  licensePlate: string;
  state: string;
  make: string;
  model: string;
  year: number;
  createdAt: Date;
  subscription?: SubscriptionSpec;
  singleWashes: PurchaseSpec[];
}

export interface UserSpec {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: MobileUserStatus;
  createdAt: Date;
  // When a disabled account was deactivated.
  lastUpdated: Date;
  vehicles: VehicleSpec[];
}

const FIRST_NAMES = [
  'Jane', 'John', 'Maria', 'Alex', 'Priya', 'Liam', 'Sofia', 'Noah', 'Emma', 'Yusuf',
  'Olivia', 'Mateo', 'Ava', 'Kenji', 'Grace',
];

const LAST_NAMES = [
  'Doe', 'Smith', 'Garcia', 'Chen', 'Patel', 'Johnson', 'Rossi', 'Kim', 'Brown', 'Ahmed',
];

const VEHICLE_MODELS = [
  { make: 'Toyota', model: 'Corolla' },
  { make: 'Toyota', model: 'RAV4' },
  { make: 'Honda', model: 'Civic' },
  { make: 'Honda', model: 'CR-V' },
  { make: 'Ford', model: 'F-150' },
  { make: 'Chevrolet', model: 'Equinox' },
  { make: 'Tesla', model: 'Model 3' },
  { make: 'Subaru', model: 'Outback' },
  { make: 'Nissan', model: 'Altima' },
  { make: 'Jeep', model: 'Grand Cherokee' },
];

const STATES = ['CA', 'TX', 'NY', 'WA', 'CO', 'AZ', 'OR'];

function buildIdentity(index: number) {
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
  const lastName = LAST_NAMES[index % LAST_NAMES.length];
  return {
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@example.com`,
    phone: `555-${String(1000 + index).padStart(4, '0')}`,
    status: index % 7 === 0 ? ('DISABLED' as const) : ('ACTIVE' as const),
  };
}

function buildVehicleIdentity(index: number) {
  const { make, model } = VEHICLE_MODELS[index % VEHICLE_MODELS.length];
  const letters = [0, 7, 13].map((offset) => String.fromCharCode(65 + ((index * 3 + offset) % 26))).join('');
  const digits = String(1000 + ((index * 37) % 9000)).slice(0, 4);
  return {
    licensePlate: `${letters}${digits}`,
    state: STATES[index % STATES.length],
    make,
    model,
    year: 2016 + (index % 9),
  };
}

// vehicle count per user: mostly 1, sometimes 2, occasionally 3
function vehicleCountForUser(userIndex: number): number {
  if (userIndex % 5 === 4) return 0; // ~20% of users have no vehicles yet
  if (userIndex % 9 === 0) return 3;
  if (userIndex % 4 === 0) return 2;
  return 1;
}

// What each vehicle (by global index) has been through. Deactivated accounts turn ACTIVE and
// OVERDUE into a cancellation at the moment they were deactivated.
const KINDS = [
  'ACTIVE', 'ACTIVE', 'SINGLE', 'ACTIVE', 'CANCELLED',
  'OVERDUE', 'ACTIVE', 'SINGLE', 'CANCELLED', 'ACTIVE',
] as const;

// How many months back the subscription started. Anything that needs a history to make sense
// (a failed payment after successful ones, a transfer, an account deactivated weeks ago)
// draws from the longer list.
const AGE_MONTHS = [8, 6, 5, 4, 2, 1];
const LONG_AGE_MONTHS = [8, 6, 5, 4];

// Months are counted in UTC, like the API does. Billing days stop at the 28th, so no month is
// ever too short for one.
function utc(year: number, month: number, day: number, hour: number, minute: number) {
  return new Date(Date.UTC(year, month, day, hour, minute));
}

function addMonths(date: Date, months: number) {
  return utc(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes());
}

// Each subscription bills on its own day of the month (1st through 28th) and time of day.
function createSchedule(now: Date, ageMonths: number, seed: number) {
  const anchor = utc(now.getUTCFullYear(), now.getUTCMonth() - ageMonths, 1 + ((seed * 5) % 28), 9 + (seed % 9), (seed * 7) % 60);
  const delay = (2 + (seed % 40)) * MINUTE; // the processor runs a few minutes after the billing date
  const billingDate = (cycle: number) => addMonths(anchor, cycle);
  const chargeTime = (cycle: number) => new Date(billingDate(cycle).getTime() + delay);
  // How many cycles have been charged by `until`.
  const cyclesBy = (until: Date) => {
    let cycles = 0;
    while (chargeTime(cycles) <= until) cycles++;
    return cycles;
  };
  return { billingDate, chargeTime, cyclesBy };
}

type Schedule = ReturnType<typeof createSchedule>;

function chargeStatus(seed: number, cycle: number, lastCycle: number, overdue: boolean): PurchaseStatus {
  // An overdue subscription is one whose latest charge(s) failed.
  if (overdue && (cycle === lastCycle || (cycle === lastCycle - 1 && cycle > 0 && seed % 2 === 0))) return 'FAILURE';
  // Earlier cycles are mostly fine, with the odd declined card that cleared up the next cycle, and the odd refund.
  if (cycle > 0 && cycle < lastCycle) {
    if ((seed + cycle) % 9 === 4) return 'FAILURE';
    if ((seed * 3 + cycle) % 11 === 5) return 'REFUNDED';
  }
  return 'SUCCESS';
}

function singleWashStatus(seed: number): PurchaseStatus {
  if (seed % 13 === 4) return 'REFUNDED';
  if (seed % 9 === 5) return 'FAILURE';
  return 'SUCCESS';
}

const singleWash = (seed: number, createdAt: Date): PurchaseSpec => ({
  type: 'SINGLE_WASH',
  status: singleWashStatus(seed),
  amount: SINGLE_WASH_PRICE,
  description: 'Single wash',
  createdAt,
});

interface SubscriptionInput {
  plan: PlanRef;
  seed: number;
  schedule: Schedule;
  // Nothing happens after this: the present, or the moment the account was deactivated.
  horizon: Date;
  status: SubscriptionStatus;
  // A transfer's successor picks up the billing schedule where the old subscription left off.
  firstCycle?: number;
  createdAt?: Date;
  // Ended because the account was deactivated, rather than cancelled or transferred on its own.
  endedByDeactivation?: boolean;
}

interface BuiltSubscription {
  spec: SubscriptionSpec;
  // Set when it was cancelled or transferred on its own (not by deactivating the account).
  endedAt?: Date;
  // The first cycle it didn't bill.
  nextCycle: number;
}

function buildSubscription(input: SubscriptionInput): BuiltSubscription {
  const { plan, seed, schedule, horizon, status, firstCycle = 0, endedByDeactivation = false } = input;
  const createdAt = input.createdAt ?? schedule.billingDate(0);
  const elapsed = schedule.cyclesBy(horizon);
  const endsOnItsOwn = (status === 'CANCELLED' || status === 'TRANSFERRED') && !endedByDeactivation;
  // One that ends on its own stops being billed a cycle or two before the horizon.
  const nextCycle = endsOnItsOwn ? Math.max(firstCycle + 1, elapsed - 1 - (seed % 2)) : elapsed;

  const charges: PurchaseSpec[] = [];
  for (let cycle = firstCycle; cycle < nextCycle; cycle++) {
    charges.push({
      type: 'SUBSCRIPTION',
      status: chargeStatus(seed, cycle, nextCycle - 1, status === 'OVERDUE'),
      amount: plan.price,
      description: `${plan.name} monthly charge`,
      createdAt: schedule.chargeTime(cycle),
    });
  }

  // Cancelling leaves the billing date as it was, so a cancelled subscription keeps the date it
  // would have been billed next.
  const nextBillingDate = schedule.billingDate(nextCycle);
  const lastCharge = charges.at(-1)?.createdAt ?? createdAt;

  let endedAt: Date | undefined;
  if (endsOnItsOwn) {
    // Somewhere between the last charge and when the next one would have come due.
    const room = Math.max(0, Math.min(nextBillingDate.getTime(), horizon.getTime()) - lastCharge.getTime());
    endedAt = new Date(lastCharge.getTime() + room * (0.25 + ((seed * 3) % 5) / 10));
  }

  return {
    spec: {
      planId: plan.id,
      status,
      createdAt,
      lastUpdated: endedAt ?? (endedByDeactivation ? horizon : lastCharge),
      nextBillingDate,
      charges,
    },
    endedAt,
    nextCycle,
  };
}

// A vehicle nobody subscribed: a handful of one-off washes over the past few months.
function buildStandaloneWashes(seed: number, horizon: Date): PurchaseSpec[] {
  const count = 1 + (seed % 4);
  const spanDays = 150;
  return Array.from({ length: count }, (_, j) => {
    const daysBack = (spanDays * (count - j)) / (count + 1);
    const jitter = ((seed * 7 + j * 5) % 24) * HOUR;
    return singleWash(seed * 5 + j, new Date(horizon.getTime() - Math.round(daysBack * DAY) - jitter));
  });
}

// Washes on a vehicle that does have a subscription, only ever outside the time it was covered.
function buildWashesAroundSubscription(seed: number, horizon: Date, subscription: BuiltSubscription): PurchaseSpec[] {
  const washes: PurchaseSpec[] = [];
  // tried a wash before committing to a plan
  if (seed % 4 === 1) {
    washes.push(singleWash(seed, new Date(subscription.spec.createdAt.getTime() - (3 + (seed % 18)) * DAY)));
  }
  // dropped the plan, still gets the car washed now and then
  if (subscription.endedAt && seed % 2 === 0) {
    const span = horizon.getTime() - subscription.endedAt.getTime();
    if (span > 2 * DAY) {
      const offset = DAY + (((seed % 5) + 1) / 6) * (span - DAY);
      washes.push(singleWash(seed + 1, new Date(subscription.endedAt.getTime() + offset)));
    }
  }
  return washes;
}

const earliest = (dates: Date[]) => new Date(Math.min(...dates.map((date) => date.getTime())));

export function buildUsers(plans: PlanRef[], now = new Date()): UserSpec[] {
  const currentPlans = plans.filter((plan) => plan.status === 'ACTIVE');
  const legacyPlan = plans.find((plan) => plan.status === 'DISABLED');
  // Long-standing members are the ones still on the retired plan.
  const pickPlan = (vehicleIndex: number, ageMonths: number) =>
    legacyPlan && ageMonths >= 6 && vehicleIndex % 3 === 0
      ? legacyPlan
      : currentPlans[vehicleIndex % currentPlans.length];

  const users: UserSpec[] = [];
  let vehicleIndex = 0;

  for (let userIndex = 0; userIndex < USER_COUNT; userIndex++) {
    const identity = buildIdentity(userIndex);
    const disabled = identity.status === 'DISABLED';
    const disabledAt = disabled ? new Date(now.getTime() - (7 + (userIndex % 28)) * DAY) : undefined;
    const horizon = disabledAt ?? now;
    const vehicleCount = vehicleCountForUser(userIndex);
    // A transfer needs another vehicle to move to, so it only happens on multi-vehicle accounts.
    const transfers = vehicleCount >= 2 && userIndex % 3 === 0;

    const vehicles: VehicleSpec[] = [];
    let transferTarget: BuiltSubscription | undefined;

    for (let v = 0; v < vehicleCount; v++) {
      const seed = vehicleIndex++;
      const kind = KINDS[seed % KINDS.length];
      let subscription: BuiltSubscription | undefined;

      if (transfers && v === 0) {
        const ageMonths = LONG_AGE_MONTHS[seed % LONG_AGE_MONTHS.length];
        const plan = pickPlan(seed, ageMonths);
        const schedule = createSchedule(now, ageMonths, seed);
        subscription = buildSubscription({ plan, seed, schedule, horizon, status: 'TRANSFERRED' });
        // The new subscription starts the moment the old one ends and keeps the same billing schedule.
        transferTarget = buildSubscription({
          plan,
          seed,
          schedule,
          horizon,
          status: disabled ? 'CANCELLED' : 'ACTIVE',
          firstCycle: subscription.nextCycle,
          createdAt: subscription.endedAt,
          endedByDeactivation: disabled,
        });
      } else if (transfers && v === 1) {
        subscription = transferTarget;
      } else if (kind !== 'SINGLE') {
        const needsHistory = disabled || kind === 'OVERDUE';
        const ageMonths = needsHistory
          ? LONG_AGE_MONTHS[seed % LONG_AGE_MONTHS.length]
          : AGE_MONTHS[seed % AGE_MONTHS.length];
        const live = kind === 'ACTIVE' || kind === 'OVERDUE';
        subscription = buildSubscription({
          plan: pickPlan(seed, ageMonths),
          seed,
          schedule: createSchedule(now, ageMonths, seed),
          horizon,
          status: live && !disabled ? kind : 'CANCELLED',
          endedByDeactivation: live && disabled,
        });
      }

      const singleWashes = subscription
        ? buildWashesAroundSubscription(seed, horizon, subscription)
        : buildStandaloneWashes(seed, horizon);
      const firstActivity = earliest([
        ...(subscription ? [subscription.spec.createdAt] : []),
        ...singleWashes.map((wash) => wash.createdAt),
      ]);

      vehicles.push({
        ...buildVehicleIdentity(seed),
        createdAt: new Date(firstActivity.getTime() - (1 + (seed % 5)) * HOUR),
        subscription: subscription?.spec,
        singleWashes,
      });
    }

    const createdAt =
      vehicles.length > 0
        ? new Date(earliest(vehicles.map((vehicle) => vehicle.createdAt)).getTime() - (1 + (userIndex % 14)) * DAY)
        : new Date(horizon.getTime() - (3 + ((userIndex * 3) % 60)) * DAY);

    users.push({ ...identity, createdAt, lastUpdated: disabledAt ?? createdAt, vehicles });
  }

  return users;
}
