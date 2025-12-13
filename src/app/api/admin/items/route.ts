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
      pickup: {
        select: {
          id: true,
          address: true,
          status: true,
          createdAt: true,
          residentId: true,
          assignedCollectorId: true,
          resident: { select: { id: true, name: true, email: true } },
          collector: { select: { id: true, name: true, email: true } }
        }
      }
    }
  });

  const serializedItems = items.map(item => {
    // Get resident name with fallbacks
    const residentName = item.pickup.resident?.name || 
                        (item.pickup.resident?.email ? item.pickup.resident.email.split('@')[0] : null) ||
                        `User ${item.pickup.residentId}`;
    
    // Get collector name with fallbacks
    const collectorName = item.pickup.collector?.name || 
                         (item.pickup.collector?.email ? item.pickup.collector.email.split('@')[0] : null) ||
                         null;

    return {
      id: item.id,
      category_id: item.categoryId,
      category_name: item.category.name,
      hazard_level: item.category.hazardLevel,
      quantity: item.quantity,
      pickup_request: {
        id: item.pickup.id,
        address: item.pickup.address,
        status: item.pickup.status,
        created_at: item.pickup.createdAt,
        resident_name: residentName,
        assigned_collector_name: collectorName
      }
    };
  });

  return new Response(JSON.stringify(serializedItems), {
    headers: { 
      "Content-Type": "application/json", 
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    },
    status: 200,
  });
}