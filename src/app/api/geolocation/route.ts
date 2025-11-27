import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const forwarded = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const ip = forwarded?.split(",")[0]?.trim() || realIp || null;

    let apiUrl = "http://ip-api.com/json/?fields=status,message,country,countryCode";
    if (ip && ip !== "unknown" && !ip.startsWith("127.") && !ip.startsWith("::1") && ip !== "localhost") {
      apiUrl = `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode`;
    }

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.status === "success" && data.country) {
      return NextResponse.json({ 
        country: data.country,
        countryCode: data.countryCode 
      });
    }

    return NextResponse.json({ 
      country: null,
      countryCode: null 
    });
  } catch (error) {
    return NextResponse.json({ 
      country: null,
      countryCode: null 
    }, { status: 500 });
  }
}
