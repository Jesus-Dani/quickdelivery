"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY = "quickdelivery_menu_manager_passcode";

export function PasscodeGate({
  children,
}: {
  children: (passcode: string) => React.ReactNode;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [checking, setChecking] = useState(true);
  const [passcode, setPasscode] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setChecking(false);
      return;
    }
    supabase.rpc("menu_manager_verify_passcode", { p_passcode: stored }).then(({ data }) => {
      if (data) {
        setPasscode(stored);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
      setChecking(false);
    });
  }, [supabase]);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("menu_manager_verify_passcode", {
      p_passcode: input,
    });
    setSubmitting(false);

    if (rpcError || !data) {
      setError("That passcode isn't right — try again.");
      return;
    }

    localStorage.setItem(STORAGE_KEY, input);
    setPasscode(input);
  }

  if (checking) {
    return null;
  }

  if (!passcode) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-cream px-6 py-16">
        <div className="w-full max-w-sm rounded-2xl border border-black/5 bg-white p-6">
          <h1 className="text-lg font-bold text-[#2C2114]">Menu manager</h1>
          <p className="mt-1 text-sm text-[#2C2114]/70">
            Enter the passcode to add or edit cafeterias, items, and prices.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="mt-4 flex flex-col gap-3"
          >
            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Passcode"
              autoFocus
              className="rounded-full border border-zinc-300 px-4 py-2"
            />
            {error && <p className="text-sm text-error">{error}</p>}
            <button
              type="submit"
              disabled={!input || submitting}
              className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-on-brand disabled:opacity-40"
            >
              {submitting ? "Checking…" : "Unlock"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children(passcode)}</>;
}
