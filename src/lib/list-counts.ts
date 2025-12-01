import type { SupabaseClient } from "@supabase/supabase-js";

export async function loadCharacterListCounts(
  supabase: SupabaseClient,
  userId?: string
): Promise<Map<string, number>> {
  // If userId is provided, only count items from user's lists
  let query = supabase
    .from("list_items")
    .select("character_id, list_id");

  if (userId) {
    // Get user's list IDs first
    const { data: userLists } = await supabase
      .from("user_lists")
      .select("id")
      .eq("user_id", userId);

    const listIds = userLists?.map(list => list.id) || [];
    
    if (listIds.length === 0) {
      return new Map();
    }

    query = query.in("list_id", listIds);
  }

  const { data: listItems } = await query;

  const counts = new Map<string, number>();
  
  if (listItems) {
    listItems.forEach((item) => {
      if (item.character_id) {
        const current = counts.get(item.character_id) || 0;
        counts.set(item.character_id, current + 1);
      }
    });
  }
  
  return counts;
}

