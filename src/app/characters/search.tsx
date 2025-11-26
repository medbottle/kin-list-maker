"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

type CharacterResult = {
  id: number | null;
  name: string;
  image: string | null;
  source: string;
};

export default function CharacterSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CharacterResult[]>([]);
  const [manualName, setManualName] = useState("");

  async function searchAniList() {
    if (!query.trim()) return;

    try {
      const res = await fetch("/api/search/anilist", {
        method: "POST",
        body: JSON.stringify({ query }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("AniList search failed:", data?.error);
        alert(data?.error ?? "AniList search failed");
        setResults([]);
        return;
      }

      const characters = Array.isArray(data.characters)
        ? data.characters
        : [];

      setResults(characters);
    } catch (error) {
      console.error("AniList search error:", error);
      alert("Something went wrong while searching AniList.");
      setResults([]);
    }
  }

  async function addCharacter(c: CharacterResult) {
    const { error } = await supabase.from("characters").insert({
      name: c.name,
      image_url: c.image,
      source: c.source,
      external_id: c.id ?? null,
    });

    if (error) {
      console.error(error);
      alert("Error saving");
    } else {
      alert("Character added!");
    }
  }

  async function addManual() {
    if (!manualName.trim()) return;

    await addCharacter({
      id: null,
      name: manualName,
      image: null,
      source: "Manual",
    });

    setManualName("");
  }

  return (
    <div className="space-y-6">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for a character..."
        className="border p-2 w-full rounded"
      />

      <div className="flex gap-4">
        <button
          onClick={searchAniList}
          className="bg-purple-600 text-white px-3 py-2 rounded"
        >
          Search AniList
        </button>

      </div>

      <div className="border p-4 rounded space-y-3">
        <b>Manual Add</b>
        <input
          className="border p-2 w-full rounded"
          placeholder="Character name"
          value={manualName}
          onChange={(e) => setManualName(e.target.value)}
        />
        <button
          onClick={addManual}
          className="bg-blue-700 text-white px-3 py-2 rounded"
        >
          Add Manually
        </button>
      </div>

      <div className="space-y-4">
        {results.map((c) => (
          <div
            key={c.id + c.source}
            className="border p-4 rounded flex gap-4 items-center"
          >
            {c.image && (
              <img src={c.image} alt={c.name} className="w-16 rounded" />
            )}

            <div className="flex-1">
              <div className="font-bold">{c.name}</div>
              <div className="text-sm opacity-70">{c.source}</div>
            </div>

            <button
              onClick={() => addCharacter(c)}
              className="bg-blue-500 text-white px-3 py-1 rounded"
            >
              Add
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
