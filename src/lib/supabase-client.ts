// TODO: Migrate from @supabase/auth-helpers-nextjs to @supabase/ssr
// The @supabase/auth-helpers-nextjs package is deprecated.
// See: https://github.com/supabase/auth-helpers
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";

export function createClient() {
  return createPagesBrowserClient(
    {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    }
  );
}