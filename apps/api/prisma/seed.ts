import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

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

async function main() {
  for (let i = 0; i < USER_COUNT; i++) {
    const user = buildUser(i);
    await prisma.mobileUser.upsert({
      where: { email: user.email },
      update: {},
      create: user,
    });
  }
  console.log(`Seeded ${USER_COUNT} mobile users.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
