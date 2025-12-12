import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

type ReqEntity = {
  id: number;
  residentId: number;
  address: string;
  preferredTime: string | null;
  status: string;
  assignedCollectorId: number | null;
  items: { id: number; categoryId: number; quantity: number }[];
};

function serialize(req: ReqEntity) {
  return {
    id: req.id,
    resident_id: req.residentId,
    address: req.address,
    preferred_time: req.preferredTime,
    status: req.status,
    assigned_collector_id: req.assignedCollectorId,
    items: req.items.map((it) => ({ id: it.id, category_id: it.categoryId, quantity: it.quantity })),
  };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: paramId } = await params;
  const id = Number(paramId);
  const body = await req.json();
  const exists = await prisma.pickupRequest.findUnique({ where: { id }, include: { items: true } });
  if (!exists) return Response.json({ detail: "not found" }, { status: 404 });
  let status = exists.status;
  if (body.status) status = body.status;
  let assignedCollectorId = exists.assignedCollectorId;
  if (body.assigned_collector_id !== undefined) {
    const col = await prisma.user.findUnique({ where: { id: Number(body.assigned_collector_id) } });
    if (!col) return Response.json({ detail: "collector not found" }, { status: 404 });
    assignedCollectorId = Number(body.assigned_collector_id);
    if (status === "pending") status = "assigned";
  }
  const updated = await prisma.pickupRequest.update({ where: { id }, data: { status, assignedCollectorId }, include: { items: true } });
  return Response.json(serialize(updated as unknown as ReqEntity));
}
