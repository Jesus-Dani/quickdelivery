import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";

export default async function CmsCafeteriaListPage() {
  const supabase = await createClient();
  const { data: cafeterias, error } = await supabase
    .from("cafeterias")
    .select("id, name, photo_url, active")
    .order("name");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-black dark:text-zinc-50">Menu CMS</h1>
        <Link
          href="/dashboard/cms/new"
          className="rounded-full bg-brand-red px-4 py-2 text-sm font-medium text-white dark:bg-brand-red-bright"
        >
          Add cafeteria
        </Link>
      </div>

      {error && <p className="text-brand-red dark:text-red-400">Couldn&apos;t load cafeterias.</p>}

      <div className="flex flex-col gap-2">
        {cafeterias?.map((cafeteria) => (
          <Link
            key={cafeteria.id}
            href={`/dashboard/cms/${cafeteria.id}`}
            className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-brand-amber-soft dark:bg-zinc-800">
              {cafeteria.photo_url ? (
                <Image src={cafeteria.photo_url} alt="" fill className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg">🍽️</div>
              )}
            </div>
            <span className="font-medium text-black dark:text-zinc-50">{cafeteria.name}</span>
            {!cafeteria.active && (
              <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                inactive
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
