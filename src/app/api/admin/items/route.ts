import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const offsetParam = searchParams.get("offset");
  const offset = offsetParam ? Number(offsetParam) : 0;

  const items = await prisma.pickupItem.findMany({
    orderBy: { id: "desc" },
    skip: offset,
    take: 50,
    include: {
      category: { select: { name: true, hazardLevel: true } },
      pickupRequest: {
        select: {
          id: true,
          address: true,
          status: true,
          createdAt: true,
          resident: { select: { name: true } },
          collector: { select: { name: true } }
        }
      }
    }
  });

  const serializedItems = items.map(item => ({
    id: item.id,
    category_id: item.categoryId,
    category_name: item.category.name,
    hazard_level: item.category.hazardLevel,
    quantity: item.quantity,
    pickup_request: {
      id: item.pickupRequest.id,
      address: item.pickupRequest.address,
      status: item.pickupRequest.status,
      created_at: item.pickupRequest.createdAt,
      resident_name: item.pickupRequest.resident.name,
      assigned_collector_name: item.pickupRequest.collector?.name || null
    }
  }));

  return new Response(JSON.stringify(serializedItems), {
    headers: { "Content-Type": "application/json", "Cache-Control": "private, max-age=15" },
    status: 200,
  });
}