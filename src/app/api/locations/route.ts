import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const locs = await prisma.dropoffLocation.findMany();
  return Response.json(locs.map(l => ({ id: l.id, name: l.name, address: l.address, lat: l.lat, lon: l.lon })));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const loc = await prisma.dropoffLocation.create({ data: { name: body.name, address: body.address, lat: body.lat ?? null, lon: body.lon ?? null } });
  return Response.json({ id: loc.id, name: loc.name, address: loc.address, lat: loc.lat, lon: loc.lon });
}
