import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CafeteriaManager } from "@/components/cms/cafeteria-manager";

export default async function CmsCafeteriaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: cafeteria }, { data: items }, { data: destinations }, { data: fees }] =
    await Promise.all([
      supabase.from("cafeterias").select("id, name, photo_url, active").eq("id", id).maybeSingle(),
      supabase
        .from("menu_items")
        .select("id, name, price_per_spoon, photo_url, active")
        .eq("cafeteria_id", id)
        .order("name"),
      supabase.from("delivery_destinations").select("id, name").order("name"),
      supabase.from("delivery_fees").select("destination_id, fee").eq("cafeteria_id", id),
    ]);

  if (!cafeteria) {
    notFound();
  }

  const initialFees = Object.fromEntries(
    (fees ?? []).map((f) => [f.destination_id, f.fee])
  );

  return (
    <CafeteriaManager
      cafeteriaId={cafeteria.id}
      initialName={cafeteria.name}
      initialPhotoUrl={cafeteria.photo_url}
      initialActive={cafeteria.active}
      initialItems={items ?? []}
      destinations={destinations ?? []}
      initialFees={initialFees}
    />
  );
}
