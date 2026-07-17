import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrderBuilder } from "@/components/order/order-builder";
import { Container } from "@/components/layout/container";

export default async function CafeteriaOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: cafeteria },
    { data: menuItems },
    { data: fees },
    { data: allDestinations },
    { data: bankSetting },
  ] = await Promise.all([
    supabase
      .from("cafeterias")
      .select("id, name, description")
      .eq("id", id)
      .eq("active", true)
      .maybeSingle(),
    supabase
      .from("menu_items")
      .select("id, name, price_per_spoon, photo_url")
      .eq("cafeteria_id", id)
      .eq("active", true)
      .order("name"),
    supabase.from("delivery_fees").select("destination_id, fee").eq("cafeteria_id", id),
    supabase.from("delivery_destinations").select("id, name").eq("active", true),
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "bank_transfer_details")
      .maybeSingle(),
  ]);

  if (!cafeteria) {
    notFound();
  }

  const destinationNameById = new Map(
    (allDestinations ?? []).map((d) => [d.id, d.name])
  );

  const destinations = (fees ?? [])
    .map((row) => {
      const name = destinationNameById.get(row.destination_id);
      return name ? { id: row.destination_id, name, fee: row.fee } : null;
    })
    .filter((d): d is { id: string; name: string; fee: number } => d !== null)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-1 flex-col bg-cream">
      <header className="bg-brand-red py-9">
        <Container>
          <h1 className="text-2xl font-bold text-white">{cafeteria.name}</h1>
          {cafeteria.description && (
            <p className="mt-1 text-sm text-brand-red-tint">{cafeteria.description}</p>
          )}
        </Container>
      </header>

      <main className="flex-1 py-12">
        <Container className="max-w-2xl">
          <OrderBuilder
            cafeteriaId={cafeteria.id}
            menuItems={menuItems ?? []}
            destinations={destinations}
            bankTransferDetails={bankSetting?.value ?? null}
          />
        </Container>
      </main>
    </div>
  );
}
