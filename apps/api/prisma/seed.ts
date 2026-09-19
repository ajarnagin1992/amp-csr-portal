import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { hashPassword } from '../src/auth/password.js';
import { PLANS, buildUsers, type PurchaseSpec } from './seed-data.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

// The one CSR account the demo signs in with. Sign-in is by email; username is the display name.
// The seed never deletes CSR users, so re-seeding doesn't lock anyone out, and it resets this
// account's password each run. Set SEED_CSR_PASSWORD to use something other than the demo password.
const CSR = { username: 'username', email: 'csr@example.com' };
const DEMO_CSR_PASSWORD = 'password';

async function seedCsrUser() {
  const passwordHash = await hashPassword(process.env.SEED_CSR_PASSWORD ?? DEMO_CSR_PASSWORD);
  await prisma.csrUser.upsert({
    where: { email: CSR.email },
    update: { username: CSR.username, passwordHash, status: 'ACTIVE' },
    create: { ...CSR, passwordHash },
  });
  console.log(`Seeded CSR ${CSR.email}${process.env.SEED_CSR_PASSWORD ? '' : ` with the demo password "${DEMO_CSR_PASSWORD}"`}.`);
}

async function main() {
  await seedCsrUser();

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

  let vehicleCount = 0;
  let subscriptionCount = 0;
  let purchaseCount = 0;

  const users = buildUsers(plans);
  for (const { vehicles, ...userData } of users) {
    // re-running updates existing users in place, so their status and dates match this run's data
    const user = await prisma.mobileUser.upsert({
      where: { email: userData.email },
      update: userData,
      create: userData,
    });

    for (const { subscription, singleWashes, ...vehicleData } of vehicles) {
      const vehicle = await prisma.vehicle.create({ data: { ...vehicleData, mobileUserId: user.id } });
      vehicleCount++;

      const purchases: (PurchaseSpec & { subscriptionId?: number })[] = [...singleWashes];
      if (subscription) {
        const { charges, ...subscriptionData } = subscription;
        const created = await prisma.subscription.create({ data: { ...subscriptionData, vehicleId: vehicle.id } });
        subscriptionCount++;
        purchases.push(...charges.map((charge) => ({ ...charge, subscriptionId: created.id })));
      }

      await prisma.purchase.createMany({
        data: purchases.map((purchase) => ({ ...purchase, mobileUserId: user.id, vehicleId: vehicle.id })),
      });
      purchaseCount += purchases.length;
    }
  }

  console.log(
    `Seeded ${users.length} mobile users, ${vehicleCount} vehicles, ${subscriptionCount} subscriptions, ${purchaseCount} purchases.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
