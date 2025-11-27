import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or API key in environment variables.");
  console.error("For sync scripts, use SUPABASE_SERVICE_ROLE_KEY (bypasses RLS)");
  console.error("Or use NEXT_PUBLIC_SUPABASE_ANON_KEY if RLS allows inserts");
  console.error("Checked .env.local and .env in the project root.");
  process.exit(1);
}

const supabase = createClient(
  supabaseUrl,
  supabaseKey
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
            characters(sort: ID_DESC) {
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

async function getExistingCharacterNames() {
  const { data, error } = await supabase
    .from("characters")
    .select("name");

  if (error) {
    console.error("Could not fetch existing character names:", error);
    return new Set();
  }

  if (!data || data.length === 0) {
    console.log("No existing characters found in database.");
    return new Set();
  }

  // Get all character names, normalize to lowercase for case-insensitive comparison
  // Filter out null/undefined/empty names
  const names = data
    .map((row) => {
      const name = row.name;
      return name && typeof name === "string" && name.trim() !== "" 
        ? name.trim().toLowerCase() 
        : null;
    })
    .filter((name) => name != null);

  console.log(`Loaded ${names.length} existing character names (sample: ${names.slice(0, 5).join(", ")})`);
  return new Set(names);
}

function getStartingPage() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    return 1; // Default to page 1
  }

  const pageArg = args[0];
  const pageNum = parseInt(pageArg, 10);

  if (isNaN(pageNum) || pageNum < 1) {
    console.error(`Invalid page number: "${pageArg}". Must be a positive integer.`);
    console.error("Usage: node sync-anilist-characters.mjs [starting_page]");
    console.error("Example: node sync-anilist-characters.mjs 5");
    process.exit(1);
  }

  return pageNum;
}

async function run() {
  const startingPage = getStartingPage();
  
  console.log("Loading existing character names from database...");
  const existingNames = await getExistingCharacterNames();
  console.log(`Found ${existingNames.size} existing characters in database.`);
  console.log(`Starting sync from page ${startingPage}...\n`);

  let page = startingPage;
  const perPage = 50;
  let lastPageLogged = false;
  let totalNew = 0;
  let totalSkipped = 0;

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

    // Filter out characters without names first
    const charactersWithNames = characters.filter((c) => c.name?.full);

    if (charactersWithNames.length === 0) {
      console.log(`Skipping page ${page} - no characters with names`);
      if (!pageInfo.hasNextPage) break;
      page += 1;
      continue;
    }

    // Check if all characters in this page already exist by name
    const characterNames = charactersWithNames.map((c) => 
      c.name.full.trim().toLowerCase()
    );
    const existingCount = characterNames.filter((name) => existingNames.has(name)).length;
    const allExist = existingCount === characterNames.length;

    if (allExist) {
      console.log(`All ${characterNames.length} characters on page ${page} already exist. Stopping sync.`);
      break;
    }

    // Filter out existing characters by name and process only new ones
    const newCharacters = charactersWithNames.filter((c) => 
      !existingNames.has(c.name.full.trim().toLowerCase())
    );

    if (newCharacters.length === 0) {
      console.log(`Page ${page}: All characters already exist. Stopping sync.`);
      break;
    }

    console.log(`Page ${page}: Found ${newCharacters.length} new characters (${existingCount} already exist)`);

    const rows = newCharacters.map((c) => {
      const primaryMedia = c.media?.nodes?.[0] ?? null;
      const sourceName =
        primaryMedia?.title?.english ||
        primaryMedia?.title?.romaji ||
        primaryMedia?.title?.native ||
        "Unknown";

      const name = c.name.full.trim();
      const externalId = String(c.id);

      return {
        name,
        image: c.image?.large ?? null,
        media: sourceName,
        source_api: "anilist",
        external_id: externalId,
      };
    });

    const { error } = await supabase
      .from("characters")
      .upsert(rows, { 
        onConflict: "external_id,source_api",
        ignoreDuplicates: false 
      });

    if (error) {
      console.error("Supabase error:", error);
      break;
    }

    // Add newly inserted names to the existing set to avoid re-checking
    rows.forEach((row) => existingNames.add(row.name.trim().toLowerCase()));
    totalNew += rows.length;
    totalSkipped += charactersWithNames.length - newCharacters.length;

    console.log(`✓ Inserted/upserted ${rows.length} characters:`);
    rows.forEach((row) => {
      const mediaInfo = row.media ? ` (${row.media})` : "";
      console.log(`  - ${row.name}${mediaInfo}`);
    });

    if (!pageInfo.hasNextPage) {
      console.log("Reached last page.");
      break;
    }
    page += 1;

    // Be nice to AniList API
    await new Promise((r) => setTimeout(r, 800)); // 0.8s delay
  }

  console.log(`\nDone! Total new characters: ${totalNew}, Total skipped (already existed): ${totalSkipped}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});