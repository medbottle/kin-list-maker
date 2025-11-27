import type { User } from "@supabase/supabase-js";
import { generateUserNumber } from "./user-number";

export type ProfileData = {
  displayName: string | null;
  gender: string | null;
  profilePicture: string | null;
  userNumber: string | null;
};

export function extractProfileData(user: User): ProfileData {
  const userNumber = user.user_metadata?.user_number || generateUserNumber(user.id);
  return {
    displayName: user.user_metadata?.display_name || null,
    gender: user.user_metadata?.gender || null,
    profilePicture: user.user_metadata?.profile_picture || null,
    userNumber: userNumber,
  };
}

