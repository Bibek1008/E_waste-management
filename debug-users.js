// Test script to check users in database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        password: true,
        createdAt: true
      }
    });

    console.log("Users in database:", users);
    console.log("Total users:", users.length);

    // Check if specific user exists
    const specificUser = await prisma.user.findUnique({
      where: { email: "bibekbhandari9848@gmail.com" }
    });

    if (specificUser) {
      console.log("\nSpecific user found:", {
        id: specificUser.id,
        name: specificUser.name,
        email: specificUser.email,
        role: specificUser.role,
        hasPassword: !!specificUser.password,
        passwordLength: specificUser.password?.length || 0
      });
    } else {
      console.log("\nSpecific user NOT found");
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();