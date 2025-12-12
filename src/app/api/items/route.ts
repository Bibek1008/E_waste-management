import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.itemCategory.findMany();
    return Response.json(
      items.map(i => ({ id: i.id, name: i.name, hazard_level: i.hazardLevel, description: i.description ?? null })),
      { headers: { "Cache-Control": "private, max-age=15" } }
    );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const item = await prisma.itemCategory.create({ data: { name: body.name, hazardLevel: body.hazard_level ?? 0, description: body.description ?? null } });
  return Response.json({ id: item.id, name: item.name, hazard_level: item.hazardLevel, description: item.description ?? null });
}
