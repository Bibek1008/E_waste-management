import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("auth")?.value;
  if (!token) return Response.json({ authenticated: false }, { status: 401 });
  try {
    const payload = await verifyToken(token);
    return Response.json({ authenticated: true, user: { id: payload.sub, email: payload.email, role: payload.role } });
  } catch {
    return Response.json({ authenticated: false }, { status: 401 });
  }
}
