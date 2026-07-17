import { createClient } from "@/lib/supabase/server";
import { PaymentQueueItem } from "@/components/dashboard/payment-queue-item";

export default async function PaymentsQueuePage() {
  const supabase = await createClient();

  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      "id, customer_contact, cafeteria_id, food_total, delivery_fee, grand_total, payment_proof_url, created_at"
    )
    .eq("payment_status", "pending")
    .order("created_at", { ascending: true });

  const { data: cafeterias } = await supabase.from("cafeterias").select("id, name");
  const cafeteriaNameById = new Map((cafeterias ?? []).map((c) => [c.id, c.name]));

  const ordersWithProofUrls = await Promise.all(
    (orders ?? []).map(async (order) => {
      let signedProofUrl: string | null = null;
      if (order.payment_proof_url) {
        const { data } = await supabase.storage
          .from("payment-proofs")
          .createSignedUrl(order.payment_proof_url, 300);
        signedProofUrl = data?.signedUrl ?? null;
      }
      return {
        ...order,
        cafeteriaName: cafeteriaNameById.get(order.cafeteria_id) ?? "Unknown cafeteria",
        signedProofUrl,
      };
    })
  );

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-lg font-semibold text-black dark:text-zinc-50">
        Payment confirmation queue
      </h1>

      {error && (
        <p className="text-red-600 dark:text-red-400">Couldn&apos;t load the queue.</p>
      )}

      {!error && ordersWithProofUrls.length === 0 && (
        <p className="text-zinc-600 dark:text-zinc-400">No payments waiting on confirmation.</p>
      )}

      {ordersWithProofUrls.map((order) => (
        <PaymentQueueItem key={order.id} order={order} />
      ))}
    </div>
  );
}
