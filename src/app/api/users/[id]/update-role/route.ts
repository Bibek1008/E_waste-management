import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  try {
    const { userId, role } = await req.json();

    if (!userId || !role) {
      return Response.json({ error: "Missing userId or role" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { role }
    });

    return Response.json({ 
      message: "User role updated successfully", 
      user: updatedUser 
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    return Response.json(
      { error: "Failed to update user role" },
      { status: 500 }
    );
  }
}