// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@courseconnect.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Securepassword@123';

    const hashedPassword = await argon2.hash(adminPassword);

    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!existingAdmin) {
      await prisma.user.create({
        data: {
          first_name: 'System',
          last_name: 'Admin',
          email: adminEmail,
          password: hashedPassword,
          role: 'ADMIN',
        },
      });
      console.log('✅ Admin user created successfully');
    } else {
      console.log('ℹ️ Admin user already exists');
    }
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
