interface AniListCharacter {
  id: number;
  name: {
    full: string;
  };
  image: {
    large: string;
  };
  favourites: number | null;
  media: {
    nodes: Array<{
      title: {
        romaji: string | null;
        english: string | null;
        native: string | null;
      };
    }>;
  };
}

interface AniListPage {
  Page: {
    characters: AniListCharacter[];
  };
}

interface AniListResponse {
  data?: AniListPage;
  errors?: { message: string }[];
}

interface AniListSearchBody {
  query: string;
}

export async function POST(req: Request) {
  const { query }: AniListSearchBody = await req.json();

  if (!query || typeof query !== "string") {
    return Response.json(
      { error: "Missing or invalid 'query' string" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          query ($search: String) {
            Page(page: 1, perPage: 10) {
              characters(search: $search, sort: FAVOURITES_DESC) {
                id
                name { full }
                image { large }
                favourites
                media(page: 1, perPage: 1, sort: POPULARITY_DESC, type: ANIME) {
                  nodes {
                    title { romaji english native }
                  }
                }
              }
            }
          }
        `,
        variables: { search: query },
      }),
    });

    if (!response.ok) {
      return Response.json(
        { error: "Failed to reach AniList" },
        { status: 502 }
      );
    }

    const data: AniListResponse = await response.json();

    if (data.errors?.length) {
      return Response.json(
        { error: data.errors[0].message ?? "AniList returned an error" },
        { status: 502 }
      );
    }

    const characters =
      data.data?.Page.characters.map((character) => {
        const primaryMedia = character.media?.nodes?.[0];
        const mediaName =
          primaryMedia?.title?.english ||
          primaryMedia?.title?.romaji ||
          primaryMedia?.title?.native ||
          "Unknown";

        return {
          id: `anilist_${character.id}`,
          name: character.name.full,
          image: character.image.large,
          media: mediaName,
          source_api: "anilist" as const,
        };
      }) ?? [];

    return Response.json({ characters });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    return Response.json(
      { error: `AniList request failed: ${message}` },
      { status: 500 }
    );
  }
}
