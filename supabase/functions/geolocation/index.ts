const countryNames: Record<string, string> = {
  US: "United States", GB: "United Kingdom", CA: "Canada", AU: "Australia",
  BR: "Brazil", DE: "Germany", FR: "France", IT: "Italy", ES: "Spain",
  JP: "Japan", CN: "China", IN: "India", RU: "Russia", KR: "South Korea",
  MX: "Mexico", AR: "Argentina", CL: "Chile", CO: "Colombia", PE: "Peru",
  NL: "Netherlands", BE: "Belgium", CH: "Switzerland", AT: "Austria",
  SE: "Sweden", NO: "Norway", DK: "Denmark", FI: "Finland", PL: "Poland",
  PT: "Portugal", GR: "Greece", IE: "Ireland", NZ: "New Zealand",
  ZA: "South Africa", EG: "Egypt", NG: "Nigeria", KE: "Kenya",
  SA: "Saudi Arabia", AE: "United Arab Emirates", IL: "Israel", TR: "Turkey",
  TH: "Thailand", VN: "Vietnam", PH: "Philippines", ID: "Indonesia",
  MY: "Malaysia", SG: "Singapore", HK: "Hong Kong", TW: "Taiwan",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function isPrivateIP(ip: string): boolean {
  if (!ip || typeof ip !== "string") return true;
  
  const lowerIp = ip.toLowerCase();
  
  // IPv4 private ranges
  if (ip.startsWith("127.")) return true; // Loopback
  if (ip.startsWith("10.")) return true; // Class A private
  if (ip.startsWith("192.168.")) return true; // Class C private
  // Class B private (172.16.0.0 - 172.31.255.255)
  if (ip.startsWith("172.")) {
    const parts = ip.split(".");
    if (parts.length >= 2) {
      const secondOctet = parseInt(parts[1], 10);
      if (!isNaN(secondOctet) && secondOctet >= 16 && secondOctet <= 31) return true;
    }
  }
  if (ip.startsWith("169.254.")) return true; // Link-local
  
  // IPv6 private ranges
  if (lowerIp === "::1") return true; // Loopback
  // fc00::/7 includes fc00:: to fdff:: (unique local addresses)
  if (lowerIp.startsWith("fc") || lowerIp.startsWith("fd")) {
    // Validate it looks like a valid IPv6 address (contains colon)
    if (lowerIp.includes(":")) return true;
  }
  if (lowerIp.startsWith("fe80:")) return true; // Link-local
  
  return false;
}

function getCountryName(countryCode: string): string | null {
  if (countryNames[countryCode]) {
    return countryNames[countryCode];
  }
  try {
    const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    return regionNames.of(countryCode) || null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const countryCode = 
      req.headers.get("x-country") ||
      req.headers.get("cf-ipcountry") ||
      req.headers.get("x-vercel-ip-country") ||
      req.headers.get("x-cloudflare-ip-country") ||
      req.headers.get("country-code");

    if (!countryCode) {
      const forwarded = req.headers.get("x-forwarded-for");
      const realIp = req.headers.get("x-real-ip");
      const ip = forwarded?.split(",")[0]?.trim() || realIp;
      
      if (ip && ip !== "unknown" && !isPrivateIP(ip)) {
        try {
          const geoResponse = await fetch(`https://ip-api.com/json/${ip}?fields=status,country,countryCode`);
          if (geoResponse.ok) {
            const geoData = await geoResponse.json();
            if (geoData.status === "success" && geoData.countryCode) {
              const countryName = getCountryName(geoData.countryCode) || geoData.country;
              return new Response(
                JSON.stringify({
                  country: countryName,
                  countryCode: geoData.countryCode,
                  source: "ip-api-fallback",
                }),
                {
                  status: 200,
                  headers: { "Content-Type": "application/json", ...corsHeaders },
                }
              );
            }
          }
        } catch (fallbackError) {
          console.error("Fallback geolocation error:", fallbackError);
        }
      }
      
      return new Response(
        JSON.stringify({
          country: null,
          countryCode: null,
          error: "Country code not available in headers",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const normalizedCode = countryCode.toUpperCase().trim();
    
    if (normalizedCode.length !== 2) {
      return new Response(
        JSON.stringify({
          country: null,
          countryCode: null,
          error: "Invalid country code format",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const countryName = getCountryName(normalizedCode);

    return new Response(
      JSON.stringify({
        country: countryName || normalizedCode,
        countryCode: normalizedCode,
        source: "supabase-edge-function",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error in geolocation function:", error);
    return new Response(
      JSON.stringify({
        country: null,
        countryCode: null,
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

