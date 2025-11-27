import type { SupabaseClient } from "@supabase/supabase-js";

export async function loadCharacterListCounts(
  supabase: SupabaseClient
): Promise<Map<string, number>> {
  const { data: listItems } = await supabase
    .from("list_items")
    .select("character_id");

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

