"use client";

import CharacterSearch from "../characters/search";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CharactersPage() {
  const router = useRouter();

  return (
    <main className="p-8 space-y-6 relative min-h-screen">
      <button
        onClick={() => router.back()}
        className="fixed"
        title="Go back"
        aria-label="Go back"
      >
        <ArrowLeft className="h-10 w-10 transition-transform duration-200 hover:scale-110" />
      </button>
      <CharacterSearch />
    </main>
  );
}
