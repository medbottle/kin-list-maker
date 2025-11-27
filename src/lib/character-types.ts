export type SourceAPI = "anilist" | "tmdb" | "rawg";

export interface Character {
  id: string;
  name: string;
  image: string | null;
  media: string;
  source_api: SourceAPI;
}

export interface CharacterRow {
  id: string;
  name: string;
  image: string | null;
  media: string;
  source_api: SourceAPI;
}

