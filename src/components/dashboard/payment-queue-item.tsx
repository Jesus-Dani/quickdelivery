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
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-black">{order.cafeteriaName}</p>
        <p className="tabular-nums text-sm text-zinc-600">
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
            className="mt-1 inline-block text-sm text-brand-red underline"
          >
            View payment proof
          </a>
        ) : (
          <p className="mt-1 inline-flex items-center rounded-full bg-brand-amber-soft px-2 py-0.5 text-xs font-medium text-brand-amber-text">
            No payment proof uploaded yet
          </p>
        )}
        {error && <p className="mt-1 text-sm text-brand-red">{error}</p>}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => handleDecision("reject_payment")}
          className="rounded-full border border-brand-red/40 px-4 py-2 text-sm font-medium text-brand-red disabled:opacity-40"
        >
          Reject
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => handleDecision("confirm_payment")}
          className="rounded-full bg-brand-red px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
