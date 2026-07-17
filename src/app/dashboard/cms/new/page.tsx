import { createClient } from "@/lib/supabase/server";
import { NewCafeteriaFlow } from "@/components/cms/new-cafeteria-flow";

export default async function NewCafeteriaPage() {
  const supabase = await createClient();
  const { data: destinations } = await supabase
    .from("delivery_destinations")
    .select("id, name")
    .order("name");

  return <NewCafeteriaFlow destinations={destinations ?? []} />;
}
