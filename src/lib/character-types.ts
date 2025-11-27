export type SourceType = "anime" | "tv" | "movie" | "game";
export type SourceAPI = "anilist" | "tmdb" | "rawg";

export interface Character {
  id: string;
  name: string;
  image: string | null;
  source_name: string;
  source_type: SourceType;
  popularity: number | null;
  source_api: SourceAPI;
}

export interface CharacterRow {
  id: string;
  name: string;
  image_url: string | null;
  source_name: string;
  source_type: SourceType;
  popularity: number | null;
  source_api: SourceAPI;
}

