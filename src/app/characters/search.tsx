 "use client";

 import Image from "next/image";
 import { useEffect, useState } from "react";
 import { supabase } from "../../lib/supabase";

 type CharacterResult = {
   id: number | null;
   name: string;
   image: string | null;
   popularity?: number | null;
   mediaTitle?: string | null;
 };

type PaginationControlsProps = {
  page: number;
  hasMore: boolean;
  isLoading: boolean;
  onPrevious: () => void;
  onNext: () => void;
  showPageInfo?: boolean;
};

function PaginationControls({
  page,
  hasMore,
  isLoading,
  onPrevious,
  onNext,
  showPageInfo = true,
}: PaginationControlsProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      {showPageInfo && <h2 className="text-lg font-medium">Page {page}</h2>}
      <div className="flex items-center gap-3 text-sm">
        <button
          onClick={onPrevious}
          disabled={page === 1 || isLoading}
          className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          Previous
        </button>
        <button
          onClick={onNext}
          disabled={!hasMore || isLoading}
          className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}

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
          name: string;
          image_url: string | null;
          popularity: number | null;
          media_title: string | null;
        };

        const mapped: CharacterResult[] =
          (data as Row[] | null)?.map((row) => ({
            id: null, // we don't need external_id here
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
  }, [pageSize, page]);

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
            onNext={() => {
              if (hasMore && !catalogueLoading) {
                setPage((p) => p + 1);
              }
            }}
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
            {catalogue.map((c, index) => (
              <div
                key={`${c.name}-${index}`}
                className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 flex flex-col gap-3 transform transition-transform duration-200 hover:scale-105 hover:shadow-md"
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
              </div>
            ))}
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

              {results.map((c) => (
                <div
                  key={c.id ?? c.name}
                  className="border border-gray-200 dark:border-gray-800 rounded p-3 flex gap-3 items-center"
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
                </div>
                
              ))}
            </div>
          </div>
        </div>
      )}
      
      <PaginationControls
        page={page}
        hasMore={hasMore}
        isLoading={catalogueLoading}
        onPrevious={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => {
          if (hasMore && !catalogueLoading) {
            setPage((p) => p + 1);
          }
        }}
      />

    </div>
  );
}
