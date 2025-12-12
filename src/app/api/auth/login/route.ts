import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user || !user.password) return Response.json({ detail: "Invalid email or password" }, { status: 401 });
  const ok = await verifyPassword(String(body.password), user.password);
  if (!ok) return Response.json({ detail: "Invalid email or password" }, { status: 401 });
  const token = await signToken({ sub: user.id, email: user.email, role: user.role });
  const res = NextResponse.json({ id: user.id, email: user.email });
  res.cookies.set("auth", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 7 * 24 * 60 * 60 });
  return res;
}
