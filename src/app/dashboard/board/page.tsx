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

  const { data: couriers } = courierIds.length
    ? await supabase.from("couriers").select("id, name, phone").in("id", courierIds)
    : { data: [] as { id: string; name: string; phone: string }[] };

  const courierById = new Map((couriers ?? []).map((c) => [c.id, c]));

  const grouped = STATUS_ORDER.map((status) => ({
    status,
    orders: details.filter((o) => o.status === status),
  }));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <h1 className="text-lg font-bold text-black">Dispatch board</h1>

      {error && <p className="text-error">Couldn&apos;t load orders.</p>}

      {grouped.map((group) => (
        <section key={group.status}>
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-zinc-500">
            {group.status} ({group.orders.length})
          </h2>
          <div className="flex flex-col gap-2">
            {group.orders.map((order) => {
              const courier = order.courierId ? courierById.get(order.courierId) : null;
              return (
                <div
                  key={order.id}
                  className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="text-sm">
                    <p className="font-medium text-black">
                      {order.cafeteriaName} → {order.destinationName}
                    </p>
                    <p className="tabular-nums text-zinc-600">
                      {order.customerContact} · {formatMoney(order.grandTotal)} · payment:{" "}
                      {order.paymentStatus}
                    </p>
                    {courier && (
                      <p className="text-zinc-600">
                        Courier: {courier.name} ({courier.phone})
                        {order.fundedAt
                          ? " · funded"
                          : order.fundsRequestedAt
                            ? " · funds requested"
                            : " · not funded"}
                      </p>
                    )}
                  </div>
                  {order.courierId &&
                    order.status === "claimed" &&
                    order.fundsRequestedAt &&
                    !order.fundedAt && <FundCourierButton orderId={order.id} />}
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
