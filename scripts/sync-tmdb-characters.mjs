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

const tmdbApiKey = process.env.TMDB_API_KEY;
if (!tmdbApiKey) {
  console.error("Missing TMDB_API_KEY in environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

async function fetchTMDBPage(type, page = 1) {
  const url = `${TMDB_BASE_URL}/${type}/popular?api_key=${tmdbApiKey}&page=${page}`;
  const response = await fetch(url);

  if (response.status === 429) {
    throw new Error("RATE_LIMIT");
  }

  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

async function fetchCredits(type, id) {
  const url = `${TMDB_BASE_URL}/${type}/${id}/credits?api_key=${tmdbApiKey}`;
  const response = await fetch(url);

  if (response.status === 429) {
    throw new Error("RATE_LIMIT");
  }

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.cast || [];
}

async function getExistingExternalIds() {
  const { data, error } = await supabase
    .from("characters")
    .select("external_id, source_api")
    .eq("source_api", "tmdb");

  if (error) {
    console.error("Could not fetch existing TMDB IDs:", error);
    return new Set();
  }

  if (!data || data.length === 0) {
    return new Set();
  }

  const ids = new Set(data.map((row) => `${row.source_api}_${row.external_id}`));
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
    console.error("Usage: node sync-tmdb-characters.mjs [starting_page]");
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
  console.log(`Loaded ${existingIds.size} existing TMDB entries`);

  const types = ["tv", "movie"];

  for (const type of types) {
    console.log(`\n=== Syncing ${type.toUpperCase()} ===`);
    page = startingPage;

    while (true) {
      console.log(`Fetching ${type} page ${page}...`);

      let data;
      try {
        data = await fetchTMDBPage(type, page);
      } catch (error) {
        if (error.message === "RATE_LIMIT") {
          console.warn("Hit TMDB rate limit. Waiting 30 seconds before retrying...");
          await new Promise((resolve) => setTimeout(resolve, 30000));
          continue;
        }
        console.error(`Error fetching ${type} page ${page}:`, error.message);
        break;
      }

      const results = data.results || [];
      if (results.length === 0) {
        console.log(`No more ${type} results. Stopping.`);
        break;
      }

      console.log(`Page ${page}: Processing ${results.length} ${type} entries...`);

      const allCharacters = [];

      for (const item of results) {
        try {
          const cast = await fetchCredits(type, item.id);
          if (!cast || cast.length === 0) {
            continue;
          }

          const mediaTitle = item.name || item.title;
          const characters = cast
            .filter((character) => character.character && character.name)
            .map((character) => {
              return {
                name: character.character,
                image_url: character.profile_path
                  ? `${TMDB_IMAGE_BASE}${character.profile_path}`
                  : null,
                source: "TMDB",
                source_name: mediaTitle,
                source_type: type === "tv" ? "tv" : "movie",
                source_api: "tmdb",
                external_id: `${type}_${item.id}_${character.id}`,
                popularity: character.popularity ? Math.round(character.popularity) : null,
              };
            });

          allCharacters.push(...characters);
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          if (error.message === "RATE_LIMIT") {
            console.warn("Hit TMDB rate limit. Waiting 30 seconds...");
            await new Promise((resolve) => setTimeout(resolve, 30000));
            continue;
          }
          console.error(`Error fetching credits for ${item.id}:`, error.message);
        }
      }

      if (allCharacters.length === 0) {
        console.log(`Page ${page}: No characters found. Moving to next page.`);
        page++;
        continue;
      }

      const newCharacters = allCharacters.filter((char) => {
        const idKey = `tmdb_${char.external_id}`;
        return !existingIds.has(idKey);
      });

      if (newCharacters.length === 0) {
        console.log(`Page ${page}: All characters already exist. Moving to next page.`);
        page++;
        continue;
      }

      console.log(`Page ${page}: Found ${newCharacters.length} new characters (${allCharacters.length - newCharacters.length} already exist)`);

      const rows = newCharacters;

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
        existingIds.add(`tmdb_${row.external_id}`);
      });

      totalNew += rows.length;
      totalSkipped += allCharacters.length - newCharacters.length;

      console.log(`✓ Inserted/upserted ${rows.length} characters from ${type}:`);
      const sample = rows.slice(0, 5);
      sample.forEach((row) => {
        console.log(`  - ${row.name} from ${row.source_name}`);
      });
      if (rows.length > 5) {
        console.log(`  ... and ${rows.length - 5} more`);
      }

      if (page >= data.total_pages) {
        console.log(`Reached last page (${data.total_pages}) for ${type}`);
        break;
      }

      page++;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  console.log(`\n=== Sync Complete ===`);
  console.log(`Total new: ${totalNew}`);
  console.log(`Total skipped: ${totalSkipped}`);
}

run().catch(console.error);

