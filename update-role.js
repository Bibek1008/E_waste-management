const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

async function updateUserRole() {
  try {
    // Get all users
    const users = await prisma.user.findMany();
    console.log('Current users:', users);

    // Update the second user (id: 2) to be a collector
    const updatedUser = await prisma.user.update({
      where: { id: 2 },
      data: { role: 'collector' }
    });

    console.log('Updated user:', updatedUser);

    // Verify the update
    const verifyUser = await prisma.user.findUnique({
      where: { id: 2 }
    });

    console.log('Verification - User role is now:', verifyUser?.role);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateUserRole();