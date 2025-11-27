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
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const countryCode = 
      req.headers.get("x-country") ||
      req.headers.get("cf-ipcountry") ||
      req.headers.get("x-vercel-ip-country") ||
      req.headers.get("x-cloudflare-ip-country") ||
      req.headers.get("country-code");
    
    const allHeaders: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      allHeaders[key] = value;
    });
    console.log("Available headers:", JSON.stringify(allHeaders));

    if (!countryCode) {
      const forwarded = req.headers.get("x-forwarded-for");
      const realIp = req.headers.get("x-real-ip");
      const ip = forwarded?.split(",")[0]?.trim() || realIp;
      
      if (ip && ip !== "unknown" && !ip.startsWith("127.") && !ip.startsWith("::1")) {
        try {
          const geoResponse = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode`);
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
                  headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                  },
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
          debug: { headers: Object.keys(allHeaders) },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
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
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
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
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
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
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});

