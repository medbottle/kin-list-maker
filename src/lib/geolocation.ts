/**
 * Get user's location using Supabase Edge Function geo headers
 * This uses built-in geo headers, no external API calls needed
 */
export async function getGeolocation(): Promise<{
  country: string | null;
  countryCode: string | null;
  error?: string;
}> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Supabase URL or Anon Key not configured");
      return { country: null, countryCode: null, error: "Configuration missing" };
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/geolocation`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.warn("Geolocation Edge Function returned error:", response.status);
      return { country: null, countryCode: null, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    return {
      country: data.country || null,
      countryCode: data.countryCode || null,
      error: data.error || undefined,
    };
  } catch (error) {
    console.error("Error fetching geolocation:", error);
    return { country: null, countryCode: null, error: "Network error" };
  }
}

