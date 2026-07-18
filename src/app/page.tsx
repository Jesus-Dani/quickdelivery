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
      <header className="bg-brand py-10">
        <Container>
          <h1 className="text-3xl font-bold text-on-brand">Quick Delivery</h1>
          <p className="mt-1 text-on-brand">Pick a cafeteria to start your order.</p>
        </Container>
      </header>

      <main className="flex-1 py-12">
        <Container>
          {error && (
            <p className="flex items-center gap-2 text-error">
              <IconAlertCircle size={20} stroke={1.75} />
              Couldn&apos;t load cafeterias right now. Please try again shortly.
            </p>
          )}

          {!error && count === 0 && (
            <p className="text-[#2C2114]/70">No cafeterias open right now — check back soon.</p>
          )}

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 lg:gap-6">
            {cafeterias?.map((cafeteria) => (
              <Link
                key={cafeteria.id}
                href={`/cafeterias/${cafeteria.id}`}
                className="flex flex-col overflow-hidden rounded-xl border border-black/5 bg-brand-accent no-underline transition hover:-translate-y-0.5 hover:shadow-md sm:rounded-2xl"
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
                      <IconToolsKitchen2 size={28} stroke={1.5} className="sm:hidden" />
                      <IconToolsKitchen2 size={40} stroke={1.5} className="hidden sm:block" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-0.5 p-2.5 sm:gap-1 sm:p-5">
                  <h2 className="text-sm font-bold text-[#2C2114] no-underline sm:text-base">
                    {cafeteria.name}
                  </h2>
                  {cafeteria.description && (
                    <p className="line-clamp-2 text-xs text-[#2C2114]/70 no-underline sm:text-sm">
                      {cafeteria.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}

            {showComingSoonTile && (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-accent/50 p-2.5 text-center text-xs text-[#2C2114]/60 sm:rounded-2xl sm:p-5 sm:text-sm">
                <IconToolsKitchen2 size={28} stroke={1.5} className="text-brand-accent" />
                More cafeterias coming soon.
              </div>
            )}
          </div>
        </Container>
      </main>
    </div>
  );
}
