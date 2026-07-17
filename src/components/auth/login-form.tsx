"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Tab = "signin" | "courier-signup";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const [tab, setTab] = useState<Tab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setLoading(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push(searchParams.get("next") ?? "/dashboard");
    router.refresh();
  }

  async function handleCourierSignUp() {
    setLoading(true);
    setError(null);
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: "courier", name, phone },
      },
    });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="mb-4 flex gap-4 border-b border-zinc-200">
          <button
            type="button"
            onClick={() => setTab("signin")}
            className={`pb-2 text-sm font-medium ${
              tab === "signin"
                ? "border-b-2 border-brand-red text-brand-red"
                : "text-zinc-500"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setTab("courier-signup")}
            className={`pb-2 text-sm font-medium ${
              tab === "courier-signup"
                ? "border-b-2 border-brand-red text-brand-red"
                : "text-zinc-500"
            }`}
          >
            Courier sign up
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (tab === "signin") {
              handleSignIn();
            } else {
              handleCourierSignUp();
            }
          }}
          className="flex flex-col gap-3"
        >
          {tab === "courier-signup" && (
            <>
              <label className="flex flex-col gap-1 text-sm text-black">
                Full name
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-full border border-zinc-300 px-4 py-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-black">
                Phone number
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="rounded-full border border-zinc-300 px-4 py-2"
                />
              </label>
            </>
          )}

          <label className="flex flex-col gap-1 text-sm text-black">
            Email
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-full border border-zinc-300 px-4 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-black">
            Password
            <input
              required
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-full border border-zinc-300 px-4 py-2"
            />
          </label>

          {error && <p className="text-sm text-brand-red">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-full bg-brand-red px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {loading
              ? "Please wait…"
              : tab === "signin"
                ? "Sign in"
                : "Create courier account"}
          </button>
        </form>

        {tab === "courier-signup" && (
          <p className="mt-4 text-xs text-zinc-500">
            Operator accounts are created directly by the business — if
            you&apos;re an operator, sign in with the account you were given.
          </p>
        )}
      </div>
    </div>
  );
}
