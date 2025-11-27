import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const mediaSet = new Set<string>();
    let hasMore = true;
    let page = 0;
    const pageSize = 1000;

    while (hasMore) {
      const { data, error } = await supabase
        .from("characters")
        .select("media")
        .not("media", "is", null)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        return Response.json(
          { error: error.message },
          { status: 500 }
        );
      }

      if (!data || data.length === 0) {
        hasMore = false;
        break;
      }

      data.forEach((row) => {
        if (row.media && typeof row.media === "string") {
          mediaSet.add(row.media);
        }
      });

      if (data.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    }

    const mediaList = Array.from(mediaSet).sort();

    return Response.json({ media: mediaList });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    return Response.json(
      { error: `Failed to fetch media: ${message}` },
      { status: 500 }
    );
  }
}

