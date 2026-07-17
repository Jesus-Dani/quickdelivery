"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PhotoUpload } from "./photo-upload";
import { CafeteriaManager } from "./cafeteria-manager";

interface Destination {
  id: string;
  name: string;
}

// PRD 4.5: "one continuous flow — name and photo first, then add items one
// after another without leaving the page or re-opening a form each time."
// This component covers both halves in one client-side view: create the
// cafeteria, then immediately hand off to the same item/fee editor used for
// existing cafeterias, with no navigation in between.
export function NewCafeteriaFlow({ destinations }: { destinations: Destination[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cafeteriaId, setCafeteriaId] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) {
      setError("Enter a cafeteria name.");
      return;
    }
    setCreating(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from("cafeterias")
      .insert({ name: name.trim(), photo_url: photoUrl })
      .select("id")
      .single();

    setCreating(false);

    if (insertError || !data) {
      setError(insertError?.message ?? "Couldn't create cafeteria.");
      return;
    }

    setCafeteriaId(data.id);
  }

  if (cafeteriaId) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <Link href="/dashboard/cms" className="text-sm text-blue-600 underline dark:text-blue-400">
          ← Back to CMS
        </Link>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {name} created. Add its items and delivery fees below.
        </p>
        <CafeteriaManager
          cafeteriaId={cafeteriaId}
          initialName={name}
          initialPhotoUrl={photoUrl}
          initialActive={true}
          initialItems={[]}
          destinations={destinations}
          initialFees={{}}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <h1 className="text-lg font-semibold text-black dark:text-zinc-50">Add cafeteria</h1>
      <div className="flex items-center gap-4">
        <PhotoUpload currentUrl={photoUrl} onUploaded={setPhotoUrl} />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Cafeteria name"
          className="flex-1 rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="button"
        disabled={creating}
        onClick={handleCreate}
        className="self-start rounded-full bg-black px-5 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
      >
        {creating ? "Creating…" : "Create cafeteria & add items"}
      </button>
    </div>
  );
}
