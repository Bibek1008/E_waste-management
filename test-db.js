import { prisma } from './src/lib/prisma.js';

async function checkData() {
  console.log('=== Users in database ===');
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true }
  });
  console.log('Users:', JSON.stringify(users, null, 2));

  console.log('\n=== Pickup Requests with Relations ===');
  const pickups = await prisma.pickupRequest.findMany({
    take: 3,
    include: {
      resident: { select: { id: true, name: true } },
      collector: { select: { id: true, name: true } }
    }
  });
  console.log('Pickups:', JSON.stringify(pickups, null, 2));
}

checkData().then(() => {
  console.log('Done!');
  process.exit(0);
}).catch(console.error);