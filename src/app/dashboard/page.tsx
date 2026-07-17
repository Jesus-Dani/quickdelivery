import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";

export default async function DashboardIndexPage() {
  const profile = await getCurrentProfile();
  redirect(profile?.role === "operator" ? "/dashboard/payments" : "/dashboard/pool");
}
