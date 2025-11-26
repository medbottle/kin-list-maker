import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });
dotenv.config();

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment variables.");
  console.error("Checked .env.local and .env in the project root.");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const ANILIST_URL = "https://graphql.anilist.co";

async function fetchCharactersPage(page, perPage = 50) {
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `
        query ($page: Int, $perPage: Int) {
          Page(page: $page, perPage: $perPage) {
            pageInfo { hasNextPage currentPage lastPage }
            characters {
              id
              name { full }
              image { large }
              favourites
              media(page: 1, perPage: 1, sort: POPULARITY_DESC, type: ANIME) {
                nodes {
                  id
                  type
                  title { romaji english native }
                }
              }
            }
          }
        }
      `,
      variables: { page, perPage },
    }),
  });

  // Handle AniList rate limits explicitly
  if (res.status === 429) {
    throw new Error("RATE_LIMIT");
  }

  const data = await res.json();
  if (!res.ok || data.errors) {
    throw new Error(data.errors?.[0]?.message || "AniList error");
  }

  return data.data.Page;
}

async function run() {
  let page = 1; // If you get rate-limited around page N, you can restart from N manually
  const perPage = 50;
  let lastPageLogged = false;

  while (true) {
    console.log(`Fetching page ${page}...`);

    let characters;
    let pageInfo;

    try {
      ({ characters, pageInfo } = await fetchCharactersPage(page, perPage));
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      if (error.message === "RATE_LIMIT" || error.message.includes("Too Many Requests")) {
        console.warn("Hit AniList rate limit. Waiting 30 seconds before retrying this page...");
        await new Promise((r) => setTimeout(r, 30000));
        // Retry same page
        continue;
      }

      // Other errors – rethrow to stop the script
      throw error;
    }

    if (!lastPageLogged && pageInfo?.lastPage) {
      console.log(`AniList reports lastPage = ${pageInfo.lastPage}`);
      lastPageLogged = true;
    }

    if (!characters.length) break;

    const rows = characters
      .filter((c) => c.name?.full) // Filter out characters without names
      .map((c) => {
      const primaryMedia = c.media?.nodes?.[0] ?? null;
      const mediaTitle =
        primaryMedia?.title?.english ||
        primaryMedia?.title?.romaji ||
        primaryMedia?.title?.native ||
        null;

        const name = c.name?.full || `Character ${c.id}`

      return {
          name,
        image_url: c.image?.large ?? null,
        source: "AniList",
        external_id: String(c.id),
        popularity: c.favourites ?? null,
        media_id: primaryMedia?.id ?? null,
        media_title: mediaTitle,
        media_type: primaryMedia?.type ?? null,
      };
      })
      .filter((row) => row.name);

    if (rows.length === 0) {
      console.log(`Skipping page ${page} - no valid characters with names`);
      if (!pageInfo.hasNextPage) break;
      page += 1;
      continue;
    }

    const { error } = await supabase
      .from("characters")
      .upsert(rows, { onConflict: "external_id,source" });

    if (error) {
      console.error("Supabase error:", error);
      break;
    }

    console.log(`Inserted/upserted ${rows.length} characters`);

    if (!pageInfo.hasNextPage) break;
    page += 1;

    // Be nice to AniList API
    await new Promise((r) => setTimeout(r, 800)); // 0.8s delay
  }

  console.log("Done");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});