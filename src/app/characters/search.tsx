"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function CharacterSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [manualName, setManualName] = useState("");

  async function searchAniList() {
    const res = await fetch("/api/search/anilist", {
      method: "POST",
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    setResults(data.characters);
  }

  async function addCharacter(c: { id: string | null; name: string; image: string | null; source: string; }) {
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
