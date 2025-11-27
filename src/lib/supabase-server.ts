import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export async function createServerClientInstance() {
  const cookieStore = await cookies();

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          Cookie: cookieStore.toString(),
        },
      },
    }
  );
}
