import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;

export default async function Home() {
  const supabase = await createClient();
  const { data: cafeterias, error } = await supabase
    .from("cafeterias")
    .select("id, name, description, photo_url")
    .eq("active", true)
    .order("name");

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200 px-6 py-8 dark:border-zinc-800">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          Campus Food Delivery
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Pick a cafeteria to start your order.
        </p>
      </header>

      <main className="flex-1 px-6 py-8">
        {error && (
          <p className="text-red-600 dark:text-red-400">
            Couldn&apos;t load cafeterias right now. Please try again shortly.
          </p>
        )}

        {!error && cafeterias?.length === 0 && (
          <p className="text-zinc-600 dark:text-zinc-400">
            No cafeterias are available yet — check back soon.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cafeterias?.map((cafeteria) => (
            <Link
              key={cafeteria.id}
              href={`/cafeterias/${cafeteria.id}`}
              className="flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white transition hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600"
            >
              <div className="relative h-40 w-full bg-zinc-100 dark:bg-zinc-900">
                {cafeteria.photo_url && (
                  <Image
                    src={cafeteria.photo_url}
                    alt={cafeteria.name}
                    fill
                    className="object-cover"
                  />
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1 p-4">
                <h2 className="font-medium text-black dark:text-zinc-50">
                  {cafeteria.name}
                </h2>
                {cafeteria.description && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {cafeteria.description}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
