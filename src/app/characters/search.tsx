"use client";

import Image from "next/image";
import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase-client";
import type { User } from "@supabase/supabase-js";
import { Heart } from "lucide-react";
import { AddToListModal } from "@/components/add-to-list-modal";
import PaginationControls from "./components/pagination";

type CharacterResult = {
  id: string;
  name: string;
  image: string | null;
  popularity?: number | null;
  mediaTitle?: string | null;
};

export default function CharacterSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CharacterResult[]>([]);

  const [catalogue, setCatalogue] = useState<CharacterResult[]>([]);
  const [catalogueLoading, setCatalogueLoading] = useState(true);
  const [catalogueError, setCatalogueError] = useState<string | null>(null);

  const [pageSize, setPageSize] = useState<20 | 40 | 60 | 80 | 100>(40);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [isAddingFavorite, setIsAddingFavorite] = useState(false);
  const [isAddToListModalOpen, setIsAddToListModalOpen] = useState(false);
  const [selectedCharacterForList, setSelectedCharacterForList] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!user) {
      setFavoriteIds(new Set());
      setFavoriteCount(0);
      return;
    }

    async function loadFavorites() {
      const { data } = await supabase
        .from("favorite_characters")
        .select("character_id");

      if (data) {
        const ids = new Set(data.map((fav) => fav.character_id));
        setFavoriteIds(ids);
        setFavoriteCount(ids.size);
      }
    }

    loadFavorites();
  }, [user, supabase]);

  useEffect(() => {
    async function loadCatalogue() {
      setCatalogueLoading(true);
      setCatalogueError(null);
      try {
        const { data, error } = await supabase
          .from("characters")
          .select("id, name, image_url, popularity, media_title")
          .order("popularity", { ascending: false })
          .range((page - 1) * pageSize, page * pageSize - 1);

        if (error) {
          console.error("Error loading catalogue:", error);
          setCatalogueError("Failed to load characters.");
          setCatalogue([]);
          return;
        }

        type Row = {
          id: string;
          name: string;
          image_url: string | null;
          popularity: number | null;
          media_title: string | null;
        };

        const mapped: CharacterResult[] =
          (data as Row[] | null)?.map((row) => ({
            id: row.id,
            name: row.name,
            image: row.image_url,
            popularity: row.popularity,
            mediaTitle: row.media_title,
          })) ?? [];

        setCatalogue(mapped);
        setHasMore((data?.length ?? 0) === pageSize);
      } finally {
        setCatalogueLoading(false);
      }
    }

    void loadCatalogue();
  }, [pageSize, page, supabase]);

  async function searchCharactersInDb() {
    if (!query.trim()) return;

    try {
      const res = await fetch("/api/search/characters", {
        method: "POST",
        body: JSON.stringify({ query }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Search failed:", data?.error);
        alert(data?.error ?? "Search failed");
        setResults([]);
        return;
      }

      const characters = Array.isArray(data.characters)
        ? data.characters
        : [];

      setResults(characters);
    } catch (error) {
      console.error("Search error:", error);
      alert("Something went wrong while searching.");
      setResults([]);
    }
  }

  async function toggleFavorite(characterId: string, characterName: string) {
    if (!user) {
      alert("Please log in to add favorites");
      return;
    }

    if (isAddingFavorite) return;
    setIsAddingFavorite(true);

    try {
      const isFavorited = favoriteIds.has(characterId);

      if (isFavorited) {
        const { error } = await supabase
          .from("favorite_characters")
          .delete()
          .eq("character_id", characterId)
          .eq("user_id", user.id);

        if (error) throw error;

        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(characterId);
          return next;
        });
        setFavoriteCount((prev) => prev - 1);
      } else {
        if (favoriteCount >= 5) {
          alert("You can only have 5 favorite characters. Remove one first.");
          setIsAddingFavorite(false);
          return;
        }

        const { error } = await supabase
          .from("favorite_characters")
          .insert({
            user_id: user.id,
            character_id: characterId,
          });

        if (error) throw error;

        setFavoriteIds((prev) => new Set(prev).add(characterId));
        setFavoriteCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      alert("Failed to update favorite");
    } finally {
      setIsAddingFavorite(false);
    }
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4">

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Characters Catalogue</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            all characters currently in the database.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Page {page}</h2>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Showing:
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(
                  Number(e.target.value) as 20 | 40 | 60 | 80 | 100
                );
                setPage(1);
              }}
              className="border border-gray-300 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-800 text-sm"
            >
              <option value={20}>20</option>
              <option value={40}>40</option>
              <option value={60}>60</option>
              <option value={80}>80</option>
              <option value={100}>100</option>
            </select>
            <span className="text-gray-600 dark:text-gray-400">
              characters
            </span>
          </div>

          <PaginationControls
            page={page}
            hasMore={hasMore}
            isLoading={catalogueLoading}
            onPrevious={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => p + 1)}
            showPageInfo={false}
          />
        </div>
        
        {catalogueError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {catalogueError}
          </p>
        )}

        {catalogueLoading && (
          <div className="flex justify-center py-4">
            <div className="h-5 w-5 rounded-full border-2 border-gray-300 border-t-purple-600 animate-spin" />
          </div>
        )}

        {!catalogueLoading && !catalogueError && catalogue.length === 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No characters found yet.
          </p>
        )}

        <div
          className={`transition-all duration-300 ${
            catalogueLoading
              ? "opacity-0 translate-y-2 pointer-events-none"
              : "opacity-100 translate-y-0"
          }`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {catalogue.map((c, index) => {
              const isFavorited = favoriteIds.has(c.id);
              const canAddFavorite = user && favoriteCount < 5;
              return (
                <div
                  key={`${c.name}-${index}`}
                  className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 flex flex-col gap-3 transform transition-transform duration-200 hover:scale-105 hover:shadow-md relative"
                >
                  {c.image && (
                    <div className="relative w-full h-64">
                      <Image
                        src={c.image}
                        alt={c.name}
                        fill
                        sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover rounded-md"
                      />
                    </div>
                  )}
                    <div className="flex-1 space-y-1">
                      <div className="font-semibold">{c.name}</div>
                      {c.mediaTitle && (
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {c.mediaTitle}
                        </div>
                      )}
                      {typeof c.popularity === "number" && (
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                          Popularity: {c.popularity}
                        </div>
                      )}
                    </div>
                    {user && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleFavorite(c.id, c.name)}
                          disabled={isAddingFavorite || (!isFavorited && !canAddFavorite)}
                          className={`p-2 rounded-full transition-colors ${
                            isFavorited
                              ? "bg-red-500 text-white hover:bg-red-600"
                              : canAddFavorite
                              ? "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                              : "bg-gray-300 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50"
                          }`}
                          title={
                            isFavorited
                              ? "Remove from favorites"
                              : canAddFavorite
                              ? "Add to favorites"
                              : "Favorite limit reached (5/5)"
                          }
                        >
                          <Heart
                            className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`}
                          />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCharacterForList({ id: c.id, name: c.name });
                            setIsAddToListModalOpen(true);
                          }}
                          className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Add to List
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </section>

      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-xl w-full mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Search Characters</h2>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for a character by name"
                className="border border-gray-300 dark:border-gray-700 p-2 w-full rounded bg-white dark:bg-gray-800 text-sm"
              />
              <button
                onClick={searchCharactersInDb}
                className="w-full bg-purple-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-purple-700 transition-colors"
              >
                Search
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {results.length === 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No results yet. Try searching for a character.
                </p>
              )}

              {results.map((c) => {
                if (!c.id) return null;
                const isFavorited = favoriteIds.has(c.id);
                const canAddFavorite = user && favoriteCount < 5;
                return (
                  <div
                    key={c.id ?? c.name}
                    className="border border-gray-200 dark:border-gray-800 rounded p-3 flex gap-3 items-center relative"
                  >
                    {c.image && (
                      <div className="relative w-12 h-12 flex-shrink-0">
                        <Image
                          src={c.image}
                          alt={c.name}
                          fill
                          sizes="48px"
                          className="rounded object-cover"
                        />
                      </div>
                    )}

                    <div className="flex-1">
                      <div className="font-medium text-sm">{c.name}</div>
                      {c.mediaTitle && (
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {c.mediaTitle}
                        </div>
                      )}
                      {typeof c.popularity === "number" && (
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                          Popularity: {c.popularity}
                        </div>
                      )}
                    </div>
                    {user && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleFavorite(c.id!, c.name)}
                          disabled={isAddingFavorite || (!isFavorited && !canAddFavorite)}
                          className={`p-1.5 rounded-full transition-colors ${
                            isFavorited
                              ? "bg-red-500 text-white hover:bg-red-600"
                              : canAddFavorite
                              ? "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                              : "bg-gray-300 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50"
                          }`}
                          title={
                            isFavorited
                              ? "Remove from favorites"
                              : canAddFavorite
                              ? "Add to favorites"
                              : "Favorite limit reached (5/5)"
                          }
                        >
                          <Heart
                            className={`h-3 w-3 ${isFavorited ? "fill-current" : ""}`}
                          />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCharacterForList({ id: c.id!, name: c.name });
                            setIsAddToListModalOpen(true);
                          }}
                          className="text-xs bg-blue-600 text-white px-2 py-1 rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Add to List
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {user && selectedCharacterForList && (
        <AddToListModal
          isOpen={isAddToListModalOpen}
          onClose={() => {
            setIsAddToListModalOpen(false);
            setSelectedCharacterForList(null);
          }}
          onSuccess={() => {
            // Refresh favorite status if needed
          }}
          user={user}
          characterId={selectedCharacterForList.id}
          characterName={selectedCharacterForList.name}
        />
      )}
      
      <PaginationControls
        page={page}
        hasMore={hasMore}
        isLoading={catalogueLoading}
        onPrevious={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => p + 1)}
      />

    </div>
  );
}
