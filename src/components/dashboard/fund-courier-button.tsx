"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function FundCourierButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFund() {
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("fund_courier", {
      p_order_id: orderId,
    });
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={handleFund}
        className="rounded-full bg-brand-red px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-brand-red-bright"
      >
        Mark courier funded
      </button>
      {error && <p className="text-xs text-brand-red dark:text-red-400">{error}</p>}
    </div>
  );
}
