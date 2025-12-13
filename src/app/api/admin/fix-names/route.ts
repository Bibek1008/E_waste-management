import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // Find users with null or empty names
    const usersWithoutNames = await prisma.user.findMany({
      where: {
        name: { equals: '' }
      }
    });
    
    console.log(`Found ${usersWithoutNames.length} users without proper names`);
    
    // Update each user to have a name based on their email
    const updates = [];
    for (const user of usersWithoutNames) {
      const nameFromEmail = user.email.split('@')[0];
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { name: nameFromEmail }
      });
      updates.push({
        id: user.id,
        oldName: user.name,
        newName: nameFromEmail,
        email: user.email
      });
    }
    
    return Response.json({ 
      message: `Fixed ${updates.length} user names`,
      updates
    });
  } catch (error) {
    console.error('Error fixing user names:', error);
    return Response.json({ 
      error: 'Failed to fix user names',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}