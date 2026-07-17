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
    <div className="mx-auto flex max-w-md flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <h1 className="text-lg font-medium text-black dark:text-zinc-50">
        Check your order status
      </h1>
      <label className="flex flex-col gap-1 text-sm text-black dark:text-zinc-50">
        Phone number used at checkout
        <input
          type="tel"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <button
        type="button"
        onClick={handleLookup}
        disabled={contact.trim().length === 0 || loading}
        className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
      >
        {loading ? "Checking…" : "Check status"}
      </button>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {status && (
        <div className="rounded border border-zinc-200 p-4 text-sm dark:border-zinc-800">
          <p className="text-black dark:text-zinc-50">
            <strong>Order status:</strong>{" "}
            {STATUS_LABEL[status.status] ?? status.status}
          </p>
          <p className="mt-1 text-black dark:text-zinc-50">
            <strong>Payment:</strong>{" "}
            {PAYMENT_LABEL[status.payment_status] ?? status.payment_status}
          </p>
          <p className="mt-1 text-black dark:text-zinc-50">
            <strong>Total:</strong> {formatMoney(status.grand_total)}
          </p>
          {status.substitution_used && (
            <p className="mt-1 text-zinc-600 dark:text-zinc-400">
              A substitution was used from your backup plate for this order.
            </p>
          )}
          <p className="mt-2 text-xs text-zinc-500">
            Once a courier is assigned, we&apos;ll send their phone number via
            WhatsApp so you can coordinate delivery directly.
          </p>
        </div>
      )}
    </div>
  );
}
