"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SettingsForm({ initialValue }: { initialValue: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    const { error: upsertError } = await supabase
      .from("app_settings")
      .upsert({ key: "bank_transfer_details", value }, { onConflict: "key" });

    setSaving(false);

    if (upsertError) {
      setError(upsertError.message);
      return;
    }

    setSaved(true);
  }

  return (
    <section className="mx-auto flex max-w-md flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h1 className="font-bold text-black dark:text-zinc-50">Bank transfer details</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Shown to customers at checkout after they place an order. Include the
        account name, number, and bank.
      </p>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        placeholder={"e.g.\nAccount name: ...\nAccount number: ...\nBank: ..."}
        className="rounded-xl border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      {error && <p className="text-sm text-brand-red dark:text-red-400">{error}</p>}
      {saved && <p className="text-sm text-success dark:text-green-400">Saved.</p>}
      <button
        type="button"
        disabled={saving}
        onClick={handleSave}
        className="self-start rounded-full bg-brand-red px-5 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-brand-red-bright"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </section>
  );
}
