interface FandomSearchBody {
  query: string;
  wikiUrl?: string;
}

export async function POST(req: Request) {
  const { query, wikiUrl = "https://hazbinhotel.fandom.com" }: FandomSearchBody = await req.json();

  if (!query || typeof query !== "string") {
    return Response.json(
      { error: "Missing or invalid 'query' string" },
      { status: 400 }
    );
  }

  try {
    const apiUrl = `${wikiUrl}/api.php`;
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      list: "search",
      srsearch: query,
      srlimit: "10",
      srnamespace: "0",
    });

    const response = await fetch(`${apiUrl}?${params.toString()}`);

    if (response.status === 429) {
      return Response.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    if (!response.ok) {
      return Response.json(
        { error: "Failed to reach Fandom wiki" },
        { status: 502 }
      );
    }

    const data = await response.json();

    if (data.error) {
      return Response.json(
        { error: data.error.info || "Fandom API error" },
        { status: 502 }
      );
    }

    const searchResults = data.query?.search || [];

    if (searchResults.length === 0) {
      return Response.json({ characters: [] });
    }

    const pageIds = searchResults.map((result: any) => result.pageid);
    const pageInfoParams = new URLSearchParams({
      action: "query",
      format: "json",
      pageids: pageIds.join("|"),
      prop: "pageimages",
      piprop: "thumbnail",
      pithumbsize: "500",
    });

    const pageInfoResponse = await fetch(`${apiUrl}?${pageInfoParams.toString()}`);
    const pageInfoData = await pageInfoResponse.json();

    const mediaName = wikiUrl
      .replace("https://", "")
      .replace(".fandom.com", "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());

    const characters = searchResults
      .filter((result: any) => {
        const title = result.title.toLowerCase();
        return !title.includes("category:") && !title.includes("template:");
      })
      .map((result: any) => {
        const pageData = pageInfoData.query?.pages?.[result.pageid];
        const imageUrl = pageData?.thumbnail?.source || null;

        return {
          id: `fandom_${result.pageid}`,
          name: result.title.replace(/ \(.*?\)$/, "").trim(),
          image: imageUrl,
          media: mediaName,
          source_api: "fandom" as const,
        };
      });

    return Response.json({ characters });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    return Response.json(
      { error: `Fandom request failed: ${message}` },
      { status: 500 }
    );
  }
}

