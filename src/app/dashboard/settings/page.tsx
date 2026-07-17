import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/dashboard/settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "bank_transfer_details")
    .maybeSingle();

  return <SettingsForm initialValue={data?.value ?? ""} />;
}
