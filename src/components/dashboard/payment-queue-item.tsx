"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/format";

interface OrderSummary {
  id: string;
  customer_contact: string;
  cafeteriaName: string;
  food_total: number;
  delivery_fee: number;
  grand_total: number;
  signedProofUrl: string | null;
  created_at: string;
}

export function PaymentQueueItem({ order }: { order: OrderSummary }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDecision(action: "confirm_payment" | "reject_payment") {
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc(action, { p_order_id: order.id });
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-950">
      <div>
        <p className="font-medium text-black dark:text-zinc-50">{order.cafeteriaName}</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {order.customer_contact} · {formatMoney(order.grand_total)}
        </p>
        <p className="text-xs text-zinc-500">
          {new Date(order.created_at).toLocaleString()}
        </p>
        {order.signedProofUrl ? (
          <a
            href={order.signedProofUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-sm text-blue-600 underline dark:text-blue-400"
          >
            View payment proof
          </a>
        ) : (
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
            No payment proof uploaded yet
          </p>
        )}
        {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => handleDecision("reject_payment")}
          className="rounded-full border border-red-300 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-40 dark:border-red-800 dark:text-red-400"
        >
          Reject
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => handleDecision("confirm_payment")}
          className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
