"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = {
  unclaimed: "Waiting for a courier",
  claimed: "Courier assigned — heading to the cafeteria",
  purchased: "Purchased — on the way to you",
  delivered: "Delivered",
};

const PAYMENT_LABEL: Record<string, string> = {
  pending: "Payment proof received, awaiting confirmation",
  confirmed: "Payment confirmed",
  rejected: "Payment rejected — contact us to resolve",
};

interface OrderStatus {
  status: string;
  payment_status: string;
  substitution_used: boolean;
  grand_total: number;
  created_at: string;
}

export function OrderStatusLookup({ orderId }: { orderId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<OrderStatus | null>(null);

  async function handleLookup() {
    setLoading(true);
    setError(null);
    setStatus(null);

    const { data, error: rpcError } = await supabase.rpc("get_order_status", {
      p_order_id: orderId,
      p_customer_contact: contact.trim(),
    });

    setLoading(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      setError("No order found for that phone number.");
      return;
    }

    setStatus(row as OrderStatus);
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-2xl border border-black/5 bg-white p-6">
      <h1 className="text-lg font-bold text-[#2C2114]">Check your order status</h1>
      <label className="flex flex-col gap-1 text-sm text-[#2C2114]">
        Phone number used at checkout
        <input
          type="tel"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          className="rounded-full border border-zinc-300 px-4 py-2"
        />
      </label>
      <button
        type="button"
        onClick={handleLookup}
        disabled={contact.trim().length === 0 || loading}
        className="rounded-full bg-brand-red px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
      >
        {loading ? "Checking…" : "Check status"}
      </button>

      {error && <p className="text-sm text-brand-red">{error}</p>}

      {status && (
        <div className="rounded-xl bg-brand-amber-soft p-4 text-sm text-brand-amber-text">
          <p>
            <strong>Order status:</strong>{" "}
            {STATUS_LABEL[status.status] ?? status.status}
          </p>
          <p className="mt-1">
            <strong>Payment:</strong>{" "}
            {PAYMENT_LABEL[status.payment_status] ?? status.payment_status}
          </p>
          <p className="mt-1 tabular-nums">
            <strong>Total:</strong> {formatMoney(status.grand_total)}
          </p>
          {status.substitution_used && (
            <p className="mt-1 opacity-80">
              A substitution was used from your backup plate for this order.
            </p>
          )}
          <p className="mt-2 text-xs opacity-70">
            Once a courier is assigned, we&apos;ll send their phone number via
            WhatsApp so you can coordinate delivery directly.
          </p>
        </div>
      )}
    </div>
  );
}
