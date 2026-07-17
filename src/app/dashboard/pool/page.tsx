import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { attachOrderDetails } from "@/lib/orders";
import { OrderPoolCard } from "@/components/dashboard/order-pool-card";

export default async function OrderPoolPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      "id, customer_contact, cafeteria_id, destination_id, food_total, delivery_fee, grand_total, status, payment_status, substitution_used, substitution_note, courier_id, created_at"
    )
    .in("status", ["unclaimed", "claimed", "purchased"])
    .order("created_at", { ascending: true });

  const details = await attachOrderDetails(supabase, orders ?? []);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-lg font-bold text-black">Order pool</h1>

      {error && <p className="text-brand-red">Couldn&apos;t load the pool.</p>}

      {!error && details.length === 0 && (
        <p className="text-zinc-600">No open orders right now.</p>
      )}

      {details.map((order) => (
        <OrderPoolCard
          key={order.id}
          order={order}
          role={profile?.role ?? "courier"}
          currentUserId={profile?.id ?? null}
        />
      ))}
    </div>
  );
}
