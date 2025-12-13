const { PrismaClient } = require('./src/generated/prisma/client.js');

const prisma = new PrismaClient();

async function fixUserNames() {
  console.log('Checking users without names...');
  
  // Find users with null or empty names
  const usersWithoutNames = await prisma.user.findMany({
    where: {
      OR: [
        { name: null },
        { name: '' },
        { name: { equals: '' } }
      ]
    }
  });
  
  console.log(`Found ${usersWithoutNames.length} users without proper names`);
  
  // Update each user to have a name based on their email
  for (const user of usersWithoutNames) {
    const nameFromEmail = user.email.split('@')[0];
    await prisma.user.update({
      where: { id: user.id },
      data: { name: nameFromEmail }
    });
    console.log(`Updated user ${user.id}: ${user.email} -> name: ${nameFromEmail}`);
  }
  
  console.log('Done!');
}

fixUserNames()
  .then(() => {
    console.log('Fixed user names successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error fixing user names:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });