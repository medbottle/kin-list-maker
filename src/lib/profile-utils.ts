import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateUserNumber } from "./user-number";

export type ProfileData = {
  displayName: string | null;
  gender: string | null;
  profilePicture: string | null;
  userNumber: string | null;
  countryCode: string | null;
  subscribed: boolean;
};

export async function getProfileData(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfileData | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, gender, profile_picture_url, user_number, country_code, subscribed")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching profile:", error);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    displayName: data.display_name,
    gender: data.gender,
    profilePicture: data.profile_picture_url,
    userNumber: data.user_number,
    countryCode: data.country_code,
    subscribed: data.subscribed ?? false,
  };
}

// Legacy function for backward compatibility - extracts from user metadata as fallback
export function extractProfileData(user: User): ProfileData {
  const userNumber = user.user_metadata?.user_number || generateUserNumber(user.id);
  return {
    displayName: user.user_metadata?.display_name || null,
    gender: user.user_metadata?.gender || null,
    profilePicture: user.user_metadata?.profile_picture || null,
    userNumber: userNumber,
    countryCode: user.user_metadata?.country_code || null,
    subscribed: false,
  };
}

