import CharacterSearch from "../characters/search";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CharactersPage() {
  return (
    <main className="p-8 space-y-6 relative min-h-screen">
      <Link href="/">
        <ArrowLeft className="fixed h-10 w-10 transition-transform duration-200 hover:scale-110 " />
      </Link>
      <CharacterSearch />
    </main>
  );
}
