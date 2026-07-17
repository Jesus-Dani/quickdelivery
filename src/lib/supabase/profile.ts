import { createClient } from "./server";

export type Profile =
  | { role: "operator"; id: string; name: string }
  | { role: "courier"; id: string; name: string }
  | null;

// Role is derived from which profile table has a row for this user, never
// trusted from a client-supplied value — RLS on operators/couriers only
// lets a user read their own row (or, for operators, any row).
export async function getCurrentProfile(): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: operator } = await supabase
    .from("operators")
    .select("id, name")
    .eq("id", user.id)
    .maybeSingle();

  if (operator) {
    return { role: "operator", id: operator.id, name: operator.name };
  }

  const { data: courier } = await supabase
    .from("couriers")
    .select("id, name")
    .eq("id", user.id)
    .maybeSingle();

  if (courier) {
    return { role: "courier", id: courier.id, name: courier.name };
  }

  return null;
}
