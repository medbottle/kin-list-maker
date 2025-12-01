import { createServerClient as createServerClientSSR } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerClient() {
  const cookieStore = await cookies();

  return createServerClientSSR(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
          }
        },
      },
    }
  );
}

export async function getUserDetails(userId: string) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("user_details_view")
    .select(
      "user_id, email, join_date, display_name, gender, country_code, user_number, subscribed, favorite_characters_count, lists_count, list_items_count"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching user details:", error);
    throw error;
  }

  return data;
}

export const createServerClientInstance = createServerClient;
