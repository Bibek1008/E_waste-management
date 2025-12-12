import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  
  // Debug logging
  console.log("Registration request body:", body);
  console.log("Role received:", body.role);
  
  if (!body.email || !body.password || !body.name) return Response.json({ detail: "missing fields" }, { status: 400 });
  const exists = await prisma.user.findUnique({ where: { email: body.email } });
  if (exists) return Response.json({ detail: "email exists" }, { status: 400 });
  
  const password = await hashPassword(String(body.password));
  const roleToUse = body.role || "resident";
  
  console.log("Final role being saved:", roleToUse);
  
  const user = await prisma.user.create({ 
    data: { 
      name: body.name, 
      email: body.email, 
      address: body.address ?? null, 
      role: roleToUse, 
      password 
    } 
  });
  
  console.log("User created with role:", user.role);
  return Response.json({ id: user.id, email: user.email, role: user.role });
}
