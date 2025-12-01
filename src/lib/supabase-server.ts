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

  // Get profile data
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, display_name, gender, country_code, user_number, subscribed, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    console.error("Error fetching profile:", profileError);
    throw profileError;
  }

  if (!profile) {
    return null;
  }

  // Get user lists first to count list items
  const { data: userLists } = await supabase
    .from("user_lists")
    .select("id")
    .eq("user_id", userId);

  const listIds = userLists?.map(list => list.id) || [];

  // Get counts
  const [favoritesResult, listsResult, listItemsResult] = await Promise.all([
    supabase
      .from("favorite_characters")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("user_lists")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    listIds.length > 0
      ? supabase
          .from("list_items")
          .select("id", { count: "exact", head: true })
          .in("list_id", listIds)
      : { count: 0, error: null },
  ]);

  return {
    user_id: profile.id,
    email: profile.email,
    join_date: profile.created_at,
    display_name: profile.display_name,
    gender: profile.gender,
    country_code: profile.country_code,
    user_number: profile.user_number,
    subscribed: profile.subscribed,
    favorite_characters_count: favoritesResult.count || 0,
    lists_count: listsResult.count || 0,
    list_items_count: listItemsResult.count || 0,
  };
}

export const createServerClientInstance = createServerClient;
