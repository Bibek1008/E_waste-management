import { prisma } from "@/lib/prisma";

export async function GET() {
  const total = await prisma.pickupRequest.count();
  const completed = await prisma.pickupRequest.count({ where: { status: "completed" } });
  const pending = await prisma.pickupRequest.count({ where: { status: "pending" } });
  const itemsAggregate = await prisma.pickupItem.aggregate({
    _sum: {
      quantity: true
    }
  });
  const totalItems = itemsAggregate._sum.quantity || 0;
  const payload = { total_pickups: total, completed_pickups: completed, pending_pickups: pending, total_items: totalItems };
  return new Response(JSON.stringify(payload), { headers: { "Content-Type": "application/json", "Cache-Control": "private, max-age=10" } });
}
