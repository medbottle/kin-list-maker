import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or API key in environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const ANILIST_URL = "https://graphql.anilist.co";

class AniListSync {
  constructor() {
    this.page = 1;
    this.perPage = 50;
    this.existingNames = new Set();
    this.totalNew = 0;
    this.totalSkipped = 0;
    this.done = false;
  }

  async initialize() {
    const { data } = await supabase.from("characters").select("name").eq("source_api", "anilist");
    if (data) {
      this.existingNames = new Set(
        data
          .map((row) => row.name?.trim().toLowerCase())
          .filter((name) => name)
      );
    }
    console.log(`[AniList] Loaded ${this.existingNames.size} existing characters`);
  }

  async fetchPage() {
    if (this.done) return null;

    const res = await fetch(ANILIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          query ($page: Int, $perPage: Int) {
            Page(page: $page, perPage: $perPage) {
              pageInfo { hasNextPage currentPage }
              characters(sort: ID_DESC) {
                id
                name { full }
                image { large }
                media(page: 1, perPage: 1, sort: POPULARITY_DESC, type: ANIME) {
                  nodes {
                    title { romaji english native }
                  }
                }
              }
            }
          }
        `,
        variables: { page: this.page, perPage: this.perPage },
      }),
    });

    if (res.status === 429) {
      throw new Error("RATE_LIMIT");
    }

    const data = await res.json();
    if (!res.ok || data.errors) {
      throw new Error(data.errors?.[0]?.message || "AniList error");
    }

    return data.data.Page;
  }

  async processPage() {
    try {
      const pageData = await this.fetchPage();
      if (!pageData) return false;

      const { characters, pageInfo } = pageData;

      const newCharacters = characters.filter((c) => {
        const name = c.name.full.trim().toLowerCase();
        return !this.existingNames.has(name);
      });

      if (newCharacters.length === 0 && characters.length > 0) {
        console.log(`[AniList] Page ${this.page}: All characters already exist`);
        if (!pageInfo.hasNextPage) {
          this.done = true;
          return false;
        }
        this.page++;
        return true;
      }

      const rows = newCharacters.map((c) => {
        const primaryMedia = c.media?.nodes?.[0];
        const sourceName =
          primaryMedia?.title?.english ||
          primaryMedia?.title?.romaji ||
          primaryMedia?.title?.native ||
          "Unknown";
        const name = c.name.full.trim();

        return {
          name,
          image: c.image?.large ?? null,
          media: sourceName,
          source_api: "anilist",
          external_id: String(c.id),
        };
      });

      if (rows.length > 0) {
        const { error } = await supabase.from("characters").upsert(rows, {
          onConflict: "external_id,source_api",
          ignoreDuplicates: false,
        });

        if (error) {
          console.error("[AniList] Supabase error:", error);
          return false;
        }

        rows.forEach((row) => {
          this.existingNames.add(row.name.toLowerCase());
        });

        this.totalNew += rows.length;
        this.totalSkipped += characters.length - newCharacters.length;

        console.log(`[AniList] Page ${this.page}: +${rows.length} new, ${this.totalSkipped} skipped`);
      }

      if (!pageInfo.hasNextPage) {
        console.log(`[AniList] Reached last page. Total: +${this.totalNew} new`);
        this.done = true;
        return false;
      }

      this.page++;
      return true;
    } catch (error) {
      if (error.message === "RATE_LIMIT") {
        console.warn("[AniList] Rate limit hit, will retry next cycle");
        return true;
      }
      console.error(`[AniList] Error on page ${this.page}:`, error.message);
      this.done = true;
      return false;
    }
  }
}

class RAWGSync {
  constructor() {
    this.page = 1;
    this.existingIds = new Set();
    this.totalNew = 0;
    this.totalSkipped = 0;
    this.done = true;
  }

  async initialize() {
    console.log("[RAWG] Skipped (not working)");
  }

  async processPage() {
    return false;
  }
}

async function run() {
  console.log("=== Starting Multi-API Character Sync ===\n");

  const anilist = new AniListSync();
  const rawg = new RAWGSync();

  await anilist.initialize();
  await rawg.initialize();

  console.log("\nStarting round-robin sync...\n");

  let activeCount = 0;
  if (!anilist.done) activeCount++;
  if (!rawg.done) activeCount++;

  while (activeCount > 0) {
    let anyProgress = false;

    if (!anilist.done) {
      const progress = await anilist.processPage();
      if (progress) anyProgress = true;
      if (anilist.done) activeCount--;
      await new Promise((r) => setTimeout(r, 800));
    }

    if (!rawg.done) {
      const progress = await rawg.processPage();
      if (progress) anyProgress = true;
      if (rawg.done) activeCount--;
    }

    if (!anyProgress && activeCount > 0) {
      console.log("No progress made, waiting 5 seconds...");
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  console.log("\n=== Sync Complete ===");
  console.log(`AniList: +${anilist.totalNew} new`);
  console.log(`RAWG: +${rawg.totalNew} new (skipped)`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

