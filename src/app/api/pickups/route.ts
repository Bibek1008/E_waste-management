import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

type ReqEntity = {
  id: number;
  residentId: number;
  address: string;
  preferredTime: string | null;
  urgency: string;
  status: string;
  assignedCollectorId: number | null;
  items: { id: number; categoryId: number; quantity: number }[];
  resident: { name: string };
  assignedCollector: { name: string } | null;
};

function serialize(req: ReqEntity) {
  return {
    id: req.id,
    resident_id: req.residentId,
    resident_name: req.resident.name,
    address: req.address,
    preferred_time: req.preferredTime,
    urgency: req.urgency,
    status: req.status,
    assigned_collector_id: req.assignedCollectorId,
    assigned_collector_name: req.assignedCollector?.name || null,
    items: req.items.map((it) => ({ id: it.id, category_id: it.categoryId, quantity: it.quantity })),
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");
  const userId = searchParams.get("user_id");
  const offsetParam = searchParams.get("offset");
  const offset = offsetParam ? Number(offsetParam) : 0;
  const where: any = {};
  if (role === "resident" && userId) where.residentId = Number(userId);
  if (role === "collector" && userId) where.assignedCollectorId = Number(userId);
  const reqs = await prisma.pickupRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: offset,
    take: 20,
    include: { 
      items: { select: { id: true, categoryId: true, quantity: true } },
      resident: { select: { name: true } },
      assignedCollector: { select: { name: true } }
    }
  });
  const payload = reqs.map(r => serialize(r as unknown as ReqEntity));
  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json", "Cache-Control": "private, max-age=10" },
    status: 200,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const resident = await prisma.user.findUnique({ where: { id: Number(body.resident_id) } });
  if (!resident) return Response.json({ detail: "resident not found" }, { status: 404 });
  const created = await prisma.pickupRequest.create({
    data: {
      residentId: Number(body.resident_id),
      address: body.address,
      preferredTime: body.preferred_time ?? null,
      urgency: body.urgency ?? 'standard',
      items: {
        create: (body.items || []).map((it: { category_id: number; quantity?: number }) => ({
          categoryId: Number(it.category_id),
          quantity: Number(it.quantity ?? 1)
        }))
      }
    },
    include: { items: true }
  });
  return Response.json(serialize(created as unknown as ReqEntity));
}
