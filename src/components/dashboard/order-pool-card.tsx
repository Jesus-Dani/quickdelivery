"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/format";
import type { OrderDetail } from "@/lib/orders";

function LineList({ title, lines }: { title: string; lines: OrderDetail["primaryLines"] }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{title}</p>
      <ul className="text-sm text-black">
        {lines.map((line, i) => (
          <li key={i} className="tabular-nums">
            {line.spoonCount}× {line.menuItemName} — {formatMoney(line.lineTotal)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OrderPoolCard({
  order,
  role,
  currentUserId,
}: {
  order: OrderDetail;
  role: "operator" | "courier";
  currentUserId: string | null;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [substitutionUsed, setSubstitutionUsed] = useState(false);
  const [substitutionNote, setSubstitutionNote] = useState("");

  const isMine = order.courierId === currentUserId;

  async function run(
    fn: () => PromiseLike<{ error: { message: string } | null }>
  ) {
    setBusy(true);
    setError(null);
    const { error: rpcError } = await fn();
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-black">{order.cafeteriaName}</p>
          <p className="tabular-nums text-sm text-zinc-600">
            Deliver to {order.destinationName} · {formatMoney(order.grandTotal)}
          </p>
          <p className="text-xs text-zinc-500">
            {new Date(order.createdAt).toLocaleString()} · status: {order.status}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <LineList title="Plate" lines={order.primaryLines} />
        <LineList title="Backup" lines={order.backupLines} />
      </div>

      {order.substitutionUsed && (
        <p className="text-sm text-brand-amber-text">
          Substitution used{order.substitutionNote ? `: ${order.substitutionNote}` : ""}
        </p>
      )}

      {error && <p className="text-sm text-brand-red">{error}</p>}

      {role === "courier" && order.status === "unclaimed" && (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(() => supabase.rpc("claim_order", { p_order_id: order.id }))
          }
          className="self-start rounded-full bg-brand-red px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Claim order
        </button>
      )}

      {role === "courier" && isMine && order.status === "claimed" && (
        <div className="flex flex-col gap-2 border-t border-zinc-200 pt-3">
          <label className="flex items-center gap-2 text-sm text-black">
            <input
              type="checkbox"
              checked={substitutionUsed}
              onChange={(e) => setSubstitutionUsed(e.target.checked)}
            />
            A backup substitution was used
          </label>
          {substitutionUsed && (
            <input
              type="text"
              placeholder="Optional note"
              value={substitutionNote}
              onChange={(e) => setSubstitutionNote(e.target.value)}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm"
            />
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(() =>
                supabase.rpc("mark_order_purchased", {
                  p_order_id: order.id,
                  p_substitution_used: substitutionUsed,
                  p_substitution_note: substitutionUsed ? substitutionNote || null : null,
                })
              )
            }
            className="self-start rounded-full bg-brand-red px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            Mark purchased
          </button>
        </div>
      )}

      {role === "courier" && isMine && order.status === "purchased" && (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(() => supabase.rpc("mark_order_delivered", { p_order_id: order.id }))
          }
          className="self-start rounded-full bg-brand-red px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Mark delivered
        </button>
      )}
    </div>
  );
}
