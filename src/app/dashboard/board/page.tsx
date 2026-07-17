import { createClient } from "@/lib/supabase/server";
import { attachOrderDetails } from "@/lib/orders";
import { FundCourierButton } from "@/components/dashboard/fund-courier-button";
import { formatMoney } from "@/lib/format";

const STATUS_ORDER = ["unclaimed", "claimed", "purchased", "delivered"] as const;

export default async function DispatchBoardPage() {
  const supabase = await createClient();

  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      "id, customer_contact, cafeteria_id, destination_id, food_total, delivery_fee, grand_total, status, payment_status, substitution_used, substitution_note, courier_id, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const details = await attachOrderDetails(supabase, orders ?? []);

  const courierIds = [...new Set(details.map((o) => o.courierId).filter(Boolean))] as string[];
  const orderIds = details.map((o) => o.id);

  const [{ data: couriers }, { data: deliveries }] = await Promise.all([
    courierIds.length
      ? supabase.from("couriers").select("id, name, phone").in("id", courierIds)
      : Promise.resolve({ data: [] as { id: string; name: string; phone: string }[] }),
    orderIds.length
      ? supabase.from("deliveries").select("order_id, funded_at").in("order_id", orderIds)
      : Promise.resolve({ data: [] as { order_id: string; funded_at: string | null }[] }),
  ]);

  const courierById = new Map((couriers ?? []).map((c) => [c.id, c]));
  const fundedAtByOrderId = new Map((deliveries ?? []).map((d) => [d.order_id, d.funded_at]));

  const grouped = STATUS_ORDER.map((status) => ({
    status,
    orders: details.filter((o) => o.status === status),
  }));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <h1 className="text-lg font-bold text-black dark:text-zinc-50">Dispatch board</h1>

      {error && <p className="text-brand-red dark:text-red-400">Couldn&apos;t load orders.</p>}

      {grouped.map((group) => (
        <section key={group.status}>
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-zinc-500">
            {group.status} ({group.orders.length})
          </h2>
          <div className="flex flex-col gap-2">
            {group.orders.map((order) => {
              const courier = order.courierId ? courierById.get(order.courierId) : null;
              const fundedAt = fundedAtByOrderId.get(order.id);
              return (
                <div
                  key={order.id}
                  className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="text-sm">
                    <p className="font-medium text-black dark:text-zinc-50">
                      {order.cafeteriaName} → {order.destinationName}
                    </p>
                    <p className="tabular-nums text-zinc-600 dark:text-zinc-400">
                      {order.customerContact} · {formatMoney(order.grandTotal)} · payment:{" "}
                      {order.paymentStatus}
                    </p>
                    {courier && (
                      <p className="text-zinc-600 dark:text-zinc-400">
                        Courier: {courier.name} ({courier.phone})
                        {fundedAt ? " · funded" : " · not funded"}
                      </p>
                    )}
                  </div>
                  {order.courierId && order.status === "claimed" && !fundedAt && (
                    <FundCourierButton orderId={order.id} />
                  )}
                </div>
              );
            })}
            {group.orders.length === 0 && (
              <p className="text-sm text-zinc-500">None right now.</p>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
