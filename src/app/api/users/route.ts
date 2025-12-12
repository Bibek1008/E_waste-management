import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const users = await prisma.user.findMany();
  return Response.json(
    users.map(u => ({ id: u.id, name: u.name, email: u.email, phone: u.phone ?? null, address: u.address ?? null, role: u.role })),
    { headers: { "Cache-Control": "private, max-age=15" } }
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) return Response.json({ detail: "email exists" }, { status: 400 });
  const user = await prisma.user.create({ data: { name: body.name, email: body.email, phone: body.phone ?? null, address: body.address ?? null, role: body.role ?? "resident" } });
  return Response.json({ id: user.id, name: user.name, email: user.email, phone: user.phone ?? null, address: user.address ?? null, role: user.role });
}
