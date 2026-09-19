import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const now = new Date();

function monthsAgo(months: number, day = 1) {
  return new Date(now.getFullYear(), now.getMonth() - months, day);
}

const firstNames = [
  'Jane', 'John', 'Maria', 'Alex', 'Priya', 'Liam', 'Sofia', 'Noah', 'Emma', 'Yusuf',
  'Olivia', 'Mateo', 'Ava', 'Kenji', 'Grace',
];

const lastNames = [
  'Doe', 'Smith', 'Garcia', 'Chen', 'Patel', 'Johnson', 'Rossi', 'Kim', 'Brown', 'Ahmed',
];

const USER_COUNT = 45;

function buildUser(index: number) {
  const firstName = firstNames[index % firstNames.length];
  const lastName = lastNames[index % lastNames.length];
  return {
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@example.com`,
    phone: `555-${String(1000 + index).padStart(4, '0')}`,
    status: index % 7 === 0 ? 'DISABLED' as const : 'ACTIVE' as const,
  };
}

const PLANS = [
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

function buildVehicle(index: number, mobileUserId: number) {
  const { make, model } = VEHICLE_MODELS[index % VEHICLE_MODELS.length];
  const letters = [0, 7, 13].map((offset) => String.fromCharCode(65 + ((index * 3 + offset) % 26))).join('');
  const digits = String(1000 + ((index * 37) % 9000)).slice(0, 4);
  return {
    mobileUserId,
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

const SUBSCRIPTION_STATUSES = [
  'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE',
  'CANCELLED', 'CANCELLED',
  'TRANSFERRED',
  'OVERDUE',
] as const;

// how many months back the subscription (and its purchase history) started
const SUBSCRIPTION_AGE_MONTHS = [8, 6, 5, 4, 2, 1];

function purchaseStatusFor(monthIndex: number): 'SUCCESS' | 'FAILURE' | 'REFUNDED' {
  if (monthIndex % 11 === 0) return 'REFUNDED';
  if (monthIndex % 7 === 0) return 'FAILURE';
  return 'SUCCESS';
}

async function main() {
  const users = [];
  for (let i = 0; i < USER_COUNT; i++) {
    const user = buildUser(i);
    const created = await prisma.mobileUser.upsert({
      where: { email: user.email },
      update: {},
      create: user,
    });
    users.push(created);
  }
  console.log(`Seeded ${users.length} mobile users.`);

  // clear dependent tables so re-running the seed doesn't pile up duplicates
  await prisma.purchase.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.plan.deleteMany();

  const plans = [];
  for (const plan of PLANS) {
    plans.push(await prisma.plan.create({ data: plan }));
  }
  console.log(`Seeded ${plans.length} plans.`);

  let vehicleIndex = 0;
  let vehicleCount = 0;
  let subscriptionCount = 0;
  let purchaseCount = 0;

  for (let userIndex = 0; userIndex < users.length; userIndex++) {
    const user = users[userIndex];
    const count = vehicleCountForUser(userIndex);

    for (let v = 0; v < count; v++) {
      const vehicle = await prisma.vehicle.create({ data: buildVehicle(vehicleIndex, user.id) });
      vehicleCount++;

      // most vehicles have a subscription; a minority are purchase-only (single-wash) customers
      const hasSubscription = vehicleIndex % 7 !== 6;

      if (hasSubscription) {
        const status = SUBSCRIPTION_STATUSES[vehicleIndex % SUBSCRIPTION_STATUSES.length];
        const ageMonths = SUBSCRIPTION_AGE_MONTHS[vehicleIndex % SUBSCRIPTION_AGE_MONTHS.length];
        const plan = plans[vehicleIndex % (plans.length - 1)]; // avoid the disabled legacy plan for current subs
        const startedAt = monthsAgo(ageMonths);
        const isEnded = status === 'CANCELLED' || status === 'TRANSFERRED';
        const nextBillingDate = isEnded ? monthsAgo(Math.max(ageMonths - 2, 0)) : monthsAgo(-1);

        const subscription = await prisma.subscription.create({
          data: {
            vehicleId: vehicle.id,
            planId: plan.id,
            status,
            nextBillingDate,
            createdAt: startedAt,
          },
        });
        subscriptionCount++;

        // several months of billing history, ending early if the subscription was cancelled/transferred
        const monthsOfHistory = isEnded ? Math.max(ageMonths - 1, 1) : ageMonths;
        for (let m = 0; m < monthsOfHistory; m++) {
          await prisma.purchase.create({
            data: {
              mobileUserId: user.id,
              vehicleId: vehicle.id,
              subscriptionId: subscription.id,
              type: 'SUBSCRIPTION',
              status: purchaseStatusFor(m),
              amount: plan.price,
              description: `${plan.name} monthly charge`,
              createdAt: monthsAgo(ageMonths - m),
            },
          });
          purchaseCount++;
        }
      } else {
        // purchase-only customer: a one-off wash instead of a subscription
        await prisma.purchase.create({
          data: {
            mobileUserId: user.id,
            vehicleId: vehicle.id,
            type: 'SINGLE_WASH',
            status: 'SUCCESS',
            amount: 1200,
            description: 'Single wash',
            createdAt: monthsAgo(1),
          },
        });
        purchaseCount++;
      }

      vehicleIndex++;
    }
  }

  console.log(`Seeded ${vehicleCount} vehicles, ${subscriptionCount} subscriptions, ${purchaseCount} purchases.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
