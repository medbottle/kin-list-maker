import { createClient } from "@supabase/supabase-js";

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
            pageInfo { hasNextPage currentPage }
            characters {
              id
              name { full }
              image { large }
            }
          }
        }
      `,
      variables: { page, perPage },
    }),
  });

  const data = await res.json();
  if (!res.ok || data.errors) {
    throw new Error(data.errors?.[0]?.message || "AniList error");
  }

  return data.data.Page;
}

async function run() {
  let page = 1;
  const perPage = 50;

  while (true) {
    console.log(`Fetching page ${page}...`);
    const { characters, pageInfo } = await fetchCharactersPage(page, perPage);

    if (!characters.length) break;

    const rows = characters.map((c) => ({
      name: c.name.full,
      image_url: c.image?.large ?? null,
      source: "AniList",
      external_id: String(c.id),
    }));

    const { error } = await supabase
      .from("characters")
      .upsert(rows, { onConflict: "external_id" });

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