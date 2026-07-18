import type { createClient } from "@/lib/supabase/server";
import type { OrderStatus, PaymentStatus } from "@/lib/supabase/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface OrderLineDetail {
  menuItemName: string;
  spoonCount: number;
  lineTotal: number;
}

export interface OrderDetail {
  id: string;
  customerContact: string;
  cafeteriaName: string;
  destinationName: string;
  foodTotal: number;
  deliveryFee: number;
  grandTotal: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  substitutionUsed: boolean;
  substitutionNote: string | null;
  courierId: string | null;
  createdAt: string;
  primaryLines: OrderLineDetail[];
  backupLines: OrderLineDetail[];
  fundsRequestedAt: string | null;
  fundedAt: string | null;
  fundsConfirmedAt: string | null;
}

// Batch-assembles full order detail (cafeteria/destination names + itemized
// primary/backup lines) for a set of orders already scoped by RLS —
// PRD 4.2 step 1 requires the pool to show full itemized detail per order,
// which the schema spreads across three tables.
export async function attachOrderDetails(
  supabase: SupabaseServerClient,
  orders: {
    id: string;
    customer_contact: string;
    cafeteria_id: string;
    destination_id: string;
    food_total: number;
    delivery_fee: number;
    grand_total: number;
    status: OrderStatus;
    payment_status: PaymentStatus;
    substitution_used: boolean;
    substitution_note: string | null;
    courier_id: string | null;
    created_at: string;
  }[]
): Promise<OrderDetail[]> {
  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);
  const cafeteriaIds = [...new Set(orders.map((o) => o.cafeteria_id))];
  const destinationIds = [...new Set(orders.map((o) => o.destination_id))];

  const [{ data: cafeterias }, { data: destinations }, { data: lines }, { data: deliveries }] =
    await Promise.all([
      supabase.from("cafeterias").select("id, name").in("id", cafeteriaIds),
      supabase
        .from("delivery_destinations")
        .select("id, name")
        .in("id", destinationIds),
      supabase
        .from("order_lines")
        .select("order_id, menu_item_id, spoon_count, line_total, is_backup")
        .in("order_id", orderIds),
      supabase
        .from("deliveries")
        .select("order_id, funds_requested_at, funded_at, funds_confirmed_at")
        .in("order_id", orderIds),
    ]);

  const menuItemIds = [...new Set((lines ?? []).map((l) => l.menu_item_id))];
  const { data: menuItems } = await supabase
    .from("menu_items")
    .select("id, name")
    .in("id", menuItemIds);

  const cafeteriaNameById = new Map((cafeterias ?? []).map((c) => [c.id, c.name]));
  const destinationNameById = new Map((destinations ?? []).map((d) => [d.id, d.name]));
  const menuItemNameById = new Map((menuItems ?? []).map((m) => [m.id, m.name]));
  const deliveryByOrderId = new Map((deliveries ?? []).map((d) => [d.order_id, d]));

  const linesByOrderId = new Map<string, OrderLineDetail[]>();
  const backupLinesByOrderId = new Map<string, OrderLineDetail[]>();

  for (const line of lines ?? []) {
    const target = line.is_backup ? backupLinesByOrderId : linesByOrderId;
    const list = target.get(line.order_id) ?? [];
    list.push({
      menuItemName: menuItemNameById.get(line.menu_item_id) ?? "Unknown item",
      spoonCount: line.spoon_count,
      lineTotal: line.line_total,
    });
    target.set(line.order_id, list);
  }

  return orders.map((order) => ({
    id: order.id,
    customerContact: order.customer_contact,
    cafeteriaName: cafeteriaNameById.get(order.cafeteria_id) ?? "Unknown cafeteria",
    destinationName: destinationNameById.get(order.destination_id) ?? "Unknown destination",
    foodTotal: order.food_total,
    deliveryFee: order.delivery_fee,
    grandTotal: order.grand_total,
    status: order.status,
    paymentStatus: order.payment_status,
    substitutionUsed: order.substitution_used,
    substitutionNote: order.substitution_note,
    courierId: order.courier_id,
    createdAt: order.created_at,
    primaryLines: linesByOrderId.get(order.id) ?? [],
    backupLines: backupLinesByOrderId.get(order.id) ?? [],
    fundsRequestedAt: deliveryByOrderId.get(order.id)?.funds_requested_at ?? null,
    fundedAt: deliveryByOrderId.get(order.id)?.funded_at ?? null,
    fundsConfirmedAt: deliveryByOrderId.get(order.id)?.funds_confirmed_at ?? null,
  }));
}
