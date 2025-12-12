import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return Response.json({ detail: "not found" }, { status: 404 });
  return Response.json({ id: user.id, name: user.name, email: user.email, phone: user.phone ?? null, address: user.address ?? null, role: user.role });
}
