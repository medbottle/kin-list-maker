"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-client";
import type { User } from "@supabase/supabase-js";
import { AuthStatus } from "@/components/auth-status";
import { User as UserIcon, Users, UserSearch } from "lucide-react";

type CharacterCard = {
  id: string;
  name: string;
  image: string | null;
  media: string;
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [featuredCharacters, setFeaturedCharacters] = useState<CharacterCard[]>([]);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(true);
  const supabase = createClient();

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
  }, [supabase.auth]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    async function loadFeaturedCharacters() {
      setIsLoadingCharacters(true);
      try {
        const defaultImageUrl = "https://s4.anilist.co/file/anilistcdn/character/large/default.jpg";
        
        const { count, error: countError } = await supabase
          .from("characters")
          .select("*", { count: "exact", head: true })
          .not("image", "is", null)
          .not("image", "eq", defaultImageUrl)
          .not("media", "eq", "Unknown")
          .not("media", "ilike", "%unknown%");

        if (countError || !count || count === 0) {
          console.error("Error getting character count:", countError);
          setIsLoadingCharacters(false);
          return;
        }

        const randomOffsets: number[] = [];
        while (randomOffsets.length < 3) {
          const offset = Math.floor(Math.random() * count);
          if (!randomOffsets.includes(offset)) {
            randomOffsets.push(offset);
          }
        }

        const characters = await Promise.all(
          randomOffsets.map(async (offset) => {
            const { data, error } = await supabase
              .from("characters")
              .select("id, name, image, media")
              .not("image", "is", null)
              .not("image", "eq", defaultImageUrl)
              .not("media", "eq", "Unknown")
              .not("media", "ilike", "%unknown%")
              .range(offset, offset)
              .limit(1)
              .single();

            if (error || !data) {
              return null;
            }

            const media = data.media?.trim();
            if (!media || media.toLowerCase() === "unknown") {
              return null;
            }

            if (data.image === defaultImageUrl) {
              return null;
            }

            return {
              id: data.id,
              name: data.name,
              image: data.image,
              media: data.media,
            };
          })
        );

        const validCharacters = characters.filter(
          (char): char is CharacterCard => char !== null
        );

        if (validCharacters.length > 0) {
          setFeaturedCharacters(validCharacters.slice(0, 3));
        }
      } catch (error) {
        console.error("Error fetching featured characters:", error);
      } finally {
        setIsLoadingCharacters(false);
      }
    }

    loadFeaturedCharacters();
  }, [supabase]);

  return (
    <main className="h-screen flex flex-col items-center justify-center px-4 py-12 bg-white dark:bg-black relative overflow-hidden">
      <div className="fixed top-4 right-4 z-10">
        <AuthStatus />
      </div>

      <div className="max-w-3xl w-full space-y-8 relative">
        {!isLoadingCharacters && featuredCharacters.length > 0 && (
          <div className="absolute -top-40 md:-top-48 left-1/2 -translate-x-1/2 flex justify-center gap-4 pointer-events-none">
            {featuredCharacters.map((character, index) => (
              <div
                key={character.id}
                className="relative w-24 h-32 md:w-32 md:h-40 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 shadow-lg transition-all duration-500 hover:scale-110 pointer-events-auto"
                style={{
                  animation: `fadeInUp 0.6s ease-out ${index * 0.2}s both, float 3s ease-in-out ${index * 0.3}s infinite`,
                }}
              >
                {character.image && (
                  <Image
                    src={character.image}
                    alt={character.name}
                    fill
                    sizes="(min-width: 768px) 128px, 96px"
                    className="object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-white text-xs font-medium truncate drop-shadow-lg">
                    {character.name}
                  </p>
                  {character.media && (
                    <p className="text-white/80 text-[10px] truncate drop-shadow-lg">
                      {character.media}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-center space-y-6">
          <h1 className="text-6xl md:text-7xl font-light text-gray-900 dark:text-white tracking-tight">
            Kin List Maker
          </h1>

          <p className="text-xl md:text-2xl text-gray-500 dark:text-gray-400 font-light max-w-xl mx-auto">
            an easy and simple way of managing your kin list
          </p>
        </div>

        <div className="flex justify-center items-center gap-4">
          <Link
            href={user ? "/profile" : "#"}
            onClick={(e) => {
              if (!user) {
                e.preventDefault();
              }
            }}
            className={`flex flex-col items-center gap-2 p-4 transition-all duration-300 ${
              user
                ? "text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer hover:scale-110"
                : "text-gray-400 cursor-not-allowed opacity-50"
            }`}
          >
            <UserIcon className="h-12 w-12" />
            <span className="text-sm font-medium tracking-wide">My profile</span>
          </Link>
          <div className="h-16 w-px bg-gray-300 dark:bg-gray-700"></div>
          <Link
            href="/characters"
            className="flex flex-col items-center gap-2 p-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-300 cursor-pointer hover:scale-110"
          >
            <Users className="h-12 w-12" />
            <span className="text-sm font-medium tracking-wide">Characters</span>
          </Link>
          <div className="h-16 w-px bg-gray-300 dark:bg-gray-700"></div>
          <button
            disabled
            className="flex flex-col items-center gap-2 p-4 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50 transition-all duration-300"
            title="Search users"
          >
            <UserSearch className="h-12 w-12" />
            <span className="text-sm font-medium tracking-wide">Search users</span>
          </button>
        </div>
      </div>
    </main>
  );
}
