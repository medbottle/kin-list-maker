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

const FANDOM_BASE_URL = process.env.FANDOM_WIKI_URL || "https://hazbinhotel.fandom.com";
const FANDOM_API_URL = `${FANDOM_BASE_URL}/api.php`;

async function fetchCategoryMembers(categoryName, continueToken = null) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    list: "categorymembers",
    cmtitle: `Category:${categoryName}`,
    cmlimit: "500",
    cmnamespace: "0",
  });

  if (continueToken) {
    params.set("cmcontinue", continueToken);
  }

  const response = await fetch(`${FANDOM_API_URL}?${params.toString()}`);
  
  if (response.status === 429) {
    throw new Error("RATE_LIMIT");
  }

  if (!response.ok) {
    throw new Error(`Fandom API error: ${response.statusText}`);
  }

  return await response.json();
}

async function fetchPageInfo(pageIds) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    pageids: pageIds.join("|"),
    prop: "pageimages",
    piprop: "thumbnail",
    pithumbsize: "500",
  });

  const response = await fetch(`${FANDOM_API_URL}?${params.toString()}`);
  
  if (response.status === 429) {
    throw new Error("RATE_LIMIT");
  }

  if (!response.ok) {
    throw new Error(`Fandom API error: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`Fandom API error: ${data.error.info || JSON.stringify(data.error)}`);
  }

  return data;
}

async function getExistingExternalIds() {
  const { data, error } = await supabase
    .from("characters")
    .select("external_id, source_api")
    .eq("source_api", "fandom");

  if (error) {
    console.error("Could not fetch existing Fandom IDs:", error);
    return new Set();
  }

  if (!data || data.length === 0) {
    return new Set();
  }

  const ids = new Set(data.map((row) => `fandom_${row.external_id}`));
  return ids;
}

function extractCharacterName(pageTitle) {
  return pageTitle.replace(/ \(.*?\)$/, "").trim();
}

function getMediaName(wikiUrl) {
  try {
    const url = new URL(wikiUrl);
    const hostname = url.hostname;
    const parts = hostname.split(".");
    if (parts.length >= 2) {
      return parts[0].replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    }
    return "Unknown";
  } catch {
    return "Unknown";
  }
}

async function run() {
  const categoryName = process.argv[2] || "Characters";
  const startingPage = parseInt(process.argv[3] || "1", 10);

  console.log(`=== Fandom Character Sync ===`);
  console.log(`Wiki: ${FANDOM_BASE_URL}`);
  console.log(`Category: ${categoryName}`);
  console.log(`Starting from page: ${startingPage}\n`);

  const existingIds = await getExistingExternalIds();
  console.log(`Loaded ${existingIds.size} existing Fandom entries\n`);

  let continueToken = null;
  let page = 0;
  let totalNew = 0;
  let totalSkipped = 0;
  const mediaName = getMediaName(FANDOM_BASE_URL);

  while (true) {
    page++;
    
    if (page < startingPage) {
      console.log(`Skipping page ${page} (starting from ${startingPage})...`);
      continue;
    }

    console.log(`Fetching category members (page ${page})...`);

    let data;
    try {
      data = await fetchCategoryMembers(categoryName, continueToken);
    } catch (error) {
      if (error.message === "RATE_LIMIT") {
        console.warn("Hit Fandom rate limit. Waiting 30 seconds before retrying...");
        await new Promise((resolve) => setTimeout(resolve, 30000));
        continue;
      }
      console.error(`Error fetching category members:`, error.message);
      break;
    }

    const members = data.query?.categorymembers || [];
    
    if (members.length === 0) {
      console.log("No more category members. Stopping.");
      break;
    }

    console.log(`Found ${members.length} pages in category`);

    const rows = [];
    const pageIdBatches = [];
    
    for (let i = 0; i < members.length; i += 50) {
      pageIdBatches.push(members.slice(i, i + 50));
    }

    for (const batch of pageIdBatches) {
      const pageIds = batch.map((m) => String(m.pageid));
      let pageInfo;
      try {
        pageInfo = await fetchPageInfo(pageIds);
      } catch (error) {
        console.error(`Error fetching page info:`, error.message);
        continue;
      }

      for (const member of batch) {
        const idKey = `fandom_${member.pageid}`;
        
        if (existingIds.has(idKey)) {
          totalSkipped++;
          continue;
        }

        const pageIdStr = String(member.pageid);
        const pageData = pageInfo.query?.pages?.[pageIdStr];
        
        const characterName = extractCharacterName(member.title);
        const imageUrl = pageData?.thumbnail?.source || null;

        rows.push({
          name: characterName,
          image: imageUrl,
          media: mediaName,
          source_api: "fandom",
          external_id: pageIdStr,
        });

        existingIds.add(idKey);
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (rows.length > 0) {
      const { error } = await supabase.from("characters").upsert(rows, {
        onConflict: "external_id,source_api",
        ignoreDuplicates: false,
      });

      if (error) {
        console.error("Supabase error:", error);
        break;
      }

      totalNew += rows.length;
      console.log(`✓ Inserted/upserted ${rows.length} characters`);
    } else {
      console.log(`All characters on this page already exist`);
    }

    continueToken = data.continue?.cmcontinue || null;
    
    if (!continueToken) {
      console.log("Reached last page.");
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log(`\n=== Sync Complete ===`);
  console.log(`Total new: ${totalNew}`);
  console.log(`Total skipped: ${totalSkipped}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
