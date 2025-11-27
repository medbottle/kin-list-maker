import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or API key in environment variables.");
  console.error("For sync scripts, use SUPABASE_SERVICE_ROLE_KEY (bypasses RLS)");
  process.exit(1);
}

const rawgApiKey = process.env.RAWG_API_KEY;
if (!rawgApiKey) {
  console.error("Missing RAWG_API_KEY in environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const RAWG_BASE_URL = "https://api.rawg.io/api";

async function fetchRAWGPage(page = 1) {
  const url = `${RAWG_BASE_URL}/games?key=${rawgApiKey}&page=${page}&page_size=40&ordering=-rating`;
  const response = await fetch(url);

  if (response.status === 429) {
    throw new Error("RATE_LIMIT");
  }

  if (!response.ok) {
    throw new Error(`RAWG API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

async function getExistingExternalIds() {
  const { data, error } = await supabase
    .from("characters")
    .select("external_id, source_api")
    .eq("source_api", "rawg");

  if (error) {
    console.error("Could not fetch existing RAWG IDs:", error);
    return new Set();
  }

  if (!data || data.length === 0) {
    return new Set();
  }

  const ids = new Set(data.map((row) => `rawg_${row.external_id}`));
  return ids;
}

function getStartingPage() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    return 1;
  }

  const pageArg = args[0];
  const pageNum = parseInt(pageArg, 10);

  if (isNaN(pageNum) || pageNum < 1) {
    console.error(`Invalid page number: "${pageArg}". Must be a positive integer.`);
    console.error("Usage: node sync-rawg-characters.mjs [starting_page]");
    process.exit(1);
  }

  return pageNum;
}

async function run() {
  const startingPage = getStartingPage();
  let page = startingPage;
  let totalNew = 0;
  let totalSkipped = 0;

  const existingIds = await getExistingExternalIds();
  console.log(`Loaded ${existingIds.size} existing RAWG entries`);

  while (true) {
    console.log(`Fetching page ${page}...`);

    let data;
    try {
      data = await fetchRAWGPage(page);
    } catch (error) {
      if (error.message === "RATE_LIMIT") {
        console.warn("Hit RAWG rate limit. Waiting 30 seconds before retrying...");
        await new Promise((resolve) => setTimeout(resolve, 30000));
        continue;
      }
      console.error(`Error fetching page ${page}:`, error.message);
      break;
    }

    const results = data.results || [];
    if (results.length === 0) {
      console.log("No more results. Stopping.");
      break;
    }

    const newGames = results.filter((game) => {
      const idKey = `rawg_${game.id}`;
      return !existingIds.has(idKey);
    });

    if (newGames.length === 0) {
      console.log(`Page ${page}: All games already exist. Stopping.`);
      break;
    }

    console.log(`Page ${page}: Found ${newGames.length} new games (${results.length - newGames.length} already exist)`);

    const rows = newGames.map((game) => ({
      name: game.name,
      image: game.background_image || null,
      popularity: game.rating_top || null,
      media: game.name,
      source_api: "rawg",
      external_id: String(game.id),
    }));

    const { error } = await supabase
      .from("characters")
      .upsert(rows, {
        onConflict: "external_id,source_api",
        ignoreDuplicates: false,
      });

    if (error) {
      console.error("Supabase error:", error);
      break;
    }

    rows.forEach((row) => {
      existingIds.add(`rawg_${row.external_id}`);
    });

    totalNew += rows.length;
    totalSkipped += results.length - newGames.length;

    console.log(`✓ Inserted/upserted ${rows.length} games:`);
    rows.forEach((row) => {
      console.log(`  - ${row.name}`);
    });

    if (!data.next) {
      console.log("Reached last page");
      break;
    }

    page++;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  console.log(`\n=== Sync Complete ===`);
  console.log(`Total new: ${totalNew}`);
  console.log(`Total skipped: ${totalSkipped}`);
}

run().catch(console.error);

