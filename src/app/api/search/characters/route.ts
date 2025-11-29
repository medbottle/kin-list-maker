import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface SearchBody {
  query: string;
  media?: string;
}

export async function POST(req: Request) {
  const { query, media }: SearchBody = await req.json();

  if (!query || typeof query !== "string") {
    return Response.json(
      { error: "Missing or invalid 'query' string" },
      { status: 400 }
    );
  }

  const trimmed = query.trim();

  try {
    let queryBuilder = supabase
      .from("characters")
      .select("id, name, image, media, source_api")
      .ilike("name", `%${trimmed}%`);

    if (media && media !== "all") {
      queryBuilder = queryBuilder.eq("media", media);
    }

    const { data, error } = await queryBuilder
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
        id: row.id,
        name: row.name,
        image: row.image as string | null,
        media: row.media as string,
        source_api: row.source_api as string,
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


