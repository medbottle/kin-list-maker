import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface SearchBody {
  query: string;
}

export async function POST(req: Request) {
  const { query }: SearchBody = await req.json();

  if (!query || typeof query !== "string") {
    return Response.json(
      { error: "Missing or invalid 'query' string" },
      { status: 400 }
    );
  }

  const trimmed = query.trim();

  try {
    const { data, error } = await supabase
      .from("characters")
      .select("id, name, image_url, source, external_id, popularity, media_title")
      .ilike("name", `%${trimmed}%`)
      .order("popularity", { ascending: false, nullsFirst: false })
      .order("name")
      .limit(25);

    if (error) {
      return Response.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const characters =
      data?.map((row) => ({
        id: row.external_id ?? row.id,
        name: row.name,
        image: row.image_url as string | null,
        source: row.source as string,
        popularity: (row as any).popularity as number | null,
        mediaTitle: (row as any).media_title as string | null,
      })) ?? [];

    return Response.json({ characters });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    return Response.json(
      { error: `Database search failed: ${message}` },
      { status: 500 }
    );
  }
}


