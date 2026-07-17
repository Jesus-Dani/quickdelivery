import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";
import { supabaseUrl, supabaseAnonKey } from "./env";

// Next.js 16: cookies() is async, so this factory is too.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component with no request context to write
          // to (e.g. during static rendering) — safe to ignore because
          // middleware/proxy refreshes the session on every request.
        }
      },
    },
  });
}
