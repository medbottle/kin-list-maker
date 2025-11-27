import { NextRequest, NextResponse } from "next/server";

// Simple in-memory cache for IP geolocation results
type GeoCacheEntry = {
  data: { country: string | null; countryCode: string | null; status: string; message?: string };
  timestamp: number;
};

// Cache: key is IP string, value is GeoCacheEntry
const geoCache = new Map<string, GeoCacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function GET(req: NextRequest) {
  try {
    const forwarded = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const ip = forwarded?.split(",")[0]?.trim() || realIp || null;

    // Use a generic cache key for unknown/local IPs
    const cacheKey =
      ip && ip !== "unknown" && !ip.startsWith("127.") && !ip.startsWith("::1") && ip !== "localhost"
        ? ip
        : "default";

    // Check cache
    const cached = geoCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      // Return cached result
      if (cached.data.status === "success" && cached.data.country && cached.data.countryCode) {
        return NextResponse.json({
          country: cached.data.country,
          countryCode: cached.data.countryCode,
          cached: true,
        });
      } else {
        return NextResponse.json(
          { country: null, countryCode: null, cached: true },
          { status: 200 }
        );
      }
    }

    let apiUrl = "https://ip-api.com/json/?fields=status,message,country,countryCode";
    if (cacheKey !== "default") {
      apiUrl = `https://ip-api.com/json/${cacheKey}?fields=status,message,country,countryCode`;
    }

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Next.js Geolocation)',
      },
    });

    if (response.status === 429) {
      // Too Many Requests - rate limit hit
      console.error("ip-api.com rate limit exceeded (429)");
      return NextResponse.json(
        { country: null, countryCode: null, error: "Rate limit exceeded" },
        { status: 200 }
      );
    }

    if (response.status === 403) {
      // Forbidden - API might be blocking the request
      console.error("ip-api.com forbidden (403) - API may be blocking requests");
      return NextResponse.json(
        { country: null, countryCode: null, error: "Geolocation service unavailable" },
        { status: 200 }
      );
    }

    if (!response.ok) {
      // Other error from ip-api.com
      console.error("ip-api.com error:", response.status, response.statusText);
      return NextResponse.json(
        { country: null, countryCode: null, error: "Geolocation API error" },
        { status: 200 }
      );
    }

    const data = await response.json();

    // Cache the result
    geoCache.set(cacheKey, { data, timestamp: Date.now() });

    console.log("IP Geolocation API response:", { ip, data });

    if (data.status === "success" && data.country && data.countryCode) {
      return NextResponse.json({
        country: data.country,
        countryCode: data.countryCode,
      });
    }

    console.error(
      "Geolocation failed - status:",
      data.status,
      "country:",
      data.country,
      "countryCode:",
      data.countryCode
    );
    return NextResponse.json({
      country: null,
      countryCode: null,
    });
  } catch (err) {
    console.error("Geolocation API error:", err);
    return NextResponse.json(
      { country: null, countryCode: null },
      { status: 500 }
    );
  }
}
