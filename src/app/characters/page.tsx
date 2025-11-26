import CharacterSearch from "../characters/search";

export default function CharactersPage() {
  return (
    <main className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Add Characters</h1>
      <CharacterSearch />
    </main>
  );
}
