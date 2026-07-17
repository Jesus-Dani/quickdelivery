import Image from "next/image";
import Link from "next/link";
import { IconToolsKitchen2, IconAlertCircle } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/server";
import { Container } from "@/components/layout/container";

export const revalidate = 60;

export default async function Home() {
  const supabase = await createClient();
  const { data: cafeterias, error } = await supabase
    .from("cafeterias")
    .select("id, name, description, photo_url")
    .eq("active", true)
    .order("name");

  const count = cafeterias?.length ?? 0;
  const showComingSoonTile = count > 0 && count < 3;

  return (
    <div className="flex flex-1 flex-col bg-cream">
      <header className="bg-brand-red py-10">
        <Container>
          <h1 className="text-3xl font-bold text-white">Quick Delivery</h1>
          <p className="mt-1 text-brand-red-tint">Pick a cafeteria to start your order.</p>
        </Container>
      </header>

      <main className="flex-1 py-12">
        <Container>
          {error && (
            <p className="flex items-center gap-2 text-brand-red">
              <IconAlertCircle size={20} stroke={1.75} />
              Couldn&apos;t load cafeterias right now. Please try again shortly.
            </p>
          )}

          {!error && count === 0 && (
            <p className="text-[#2C2114]/70">No cafeterias open right now — check back soon.</p>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cafeterias?.map((cafeteria) => (
              <Link
                key={cafeteria.id}
                href={`/cafeterias/${cafeteria.id}`}
                className="flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-white no-underline transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative aspect-[4/3] w-full bg-brand-amber-soft">
                  {cafeteria.photo_url ? (
                    <Image
                      src={cafeteria.photo_url}
                      alt={cafeteria.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-brand-amber-text">
                      <IconToolsKitchen2 size={40} stroke={1.5} />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1 p-5">
                  <h2 className="font-bold text-[#2C2114] no-underline">{cafeteria.name}</h2>
                  {cafeteria.description && (
                    <p className="text-sm text-[#2C2114]/70 no-underline">
                      {cafeteria.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}

            {showComingSoonTile && (
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-red/20 p-5 text-center text-sm text-[#2C2114]/60">
                <IconToolsKitchen2 size={28} stroke={1.5} className="text-brand-red/30" />
                More cafeterias coming soon.
              </div>
            )}
          </div>
        </Container>
      </main>
    </div>
  );
}
