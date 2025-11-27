import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const forwarded = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const ip = forwarded?.split(",")[0]?.trim() || realIp || null;

    let apiUrl = "https://ip-api.com/json/?fields=status,message,country,countryCode";
    if (ip && ip !== "unknown" && !ip.startsWith("127.") && !ip.startsWith("::1") && ip !== "localhost") {
      apiUrl = `https://ip-api.com/json/${ip}?fields=status,message,country,countryCode`;
    }

    const response = await fetch(apiUrl);
    const data = await response.json();

    console.log("IP Geolocation API response:", { ip, data });

    if (data.status === "success" && data.country && data.countryCode) {
      return NextResponse.json({ 
        country: data.country,
        countryCode: data.countryCode 
      });
    }

    console.error("Geolocation failed - status:", data.status, "country:", data.country, "countryCode:", data.countryCode);
    return NextResponse.json({ 
      country: null,
      countryCode: null 
    });
  } catch {
    return NextResponse.json({ 
      country: null,
      countryCode: null 
    }, { status: 500 });
  }
}
