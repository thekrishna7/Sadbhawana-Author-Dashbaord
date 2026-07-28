import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning existing demo data from Sadbhawana Publication Database...');

  // Delete all demo data in proper order
  await prisma.activityLog.deleteMany({});
  await prisma.emailLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.changeRequest.deleteMany({});
  await prisma.fileVersion.deleteMany({});
  await prisma.file.deleteMany({});
  await prisma.bookAssignment.deleteMany({});
  await prisma.book.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Creating Official Admin Account...');

  // Official Production Admin Password: KRISHNA0011@
  const adminPasswordHash = await bcrypt.hash('KRISHNA0011@', 10);

  // Official Admin User
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'Sadbhawanapublication@gmail.com',
      passwordHash: adminPasswordHash,
      fullName: 'Sadbhawana Publication Admin',
      phone: '+977 9800000000',
      role: 'ADMIN',
      status: 'ACTIVE',
      avatarUrl: '/logo.png',
    },
  });

  console.log('Database successfully cleaned and reset!');
  console.log('==================================================');
  console.log('OFFICIAL ADMIN LOGIN CREDENTIALS:');
  console.log('Email / Username: Sadbhawanapublication@gmail.com (or username: admin)');
  console.log('Password:         KRISHNA0011@');
  console.log('==================================================');
}

main()
  .catch((e) => {
    console.error('Error seeding production database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
