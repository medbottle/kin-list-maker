"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase-client";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";

type FavoriteCharacter = {
  id: string;
  character_id: number;
  character_name: string;
  character_image: string | null;
  character_media_title: string | null;
  created_at: string;
};

type UserList = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<FavoriteCharacter[]>([]);
  const [lists, setLists] = useState<UserList[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [listsLoading, setListsLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();
  const hasCheckedAuth = useRef(false);

  useEffect(() => {
    if (hasCheckedAuth.current) return;
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/");
        return;
      }
      setUser(session.user);
      setLoading(false);
      hasCheckedAuth.current = true;
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (!session && hasCheckedAuth.current)) {
        router.push("/");
        return;
      }
      if (session && !hasCheckedAuth.current) {
        setUser(session.user);
        setLoading(false);
        hasCheckedAuth.current = true;
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth, router]);

  useEffect(() => {
    if (!user) return;

    async function loadFavorites() {
      setFavoritesLoading(true);
      const { data: favoritesData } = await supabase
        .from("favorite_characters")
        .select("id, character_id, created_at")
        .order("created_at", { ascending: false });

      if (!favoritesData || favoritesData.length === 0) {
        setFavorites([]);
        setFavoritesLoading(false);
        return;
      }

      const characterIds = favoritesData.map((fav) => fav.character_id);

      const { data: charactersData } = await supabase
        .from("characters")
        .select("id, name, image_url, media_title")
        .in("id", characterIds);

      const characterMap = new Map(
        (charactersData || []).map((char) => [char.id, char])
      );

      const mapped = favoritesData.map((fav) => {
        const character = characterMap.get(fav.character_id);
        return {
          id: fav.id,
          character_id: fav.character_id,
          character_name: character?.name || "Unknown",
          character_image: character?.image_url || null,
          character_media_title: character?.media_title || null,
          created_at: fav.created_at,
        };
      });

      setFavorites(mapped);
      setFavoritesLoading(false);
    }

    async function loadLists() {
      setListsLoading(true);
      const { data } = await supabase
        .from("user_lists")
        .select("*")
        .order("updated_at", { ascending: false });

      setLists(data || []);
      setListsLoading(false);
    }

    loadFavorites();
    loadLists();
  }, [user, supabase]);

  if (loading) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="h-8 w-8 rounded-full border-2 border-gray-300 border-t-blue-600 animate-spin" />
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen p-8 bg-white dark:bg-black">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link href="/" className="inline-block">
          <ArrowLeft className="h-10 w-10 transition-transform duration-200 hover:scale-110" />
        </Link>

        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              My Profile
            </h1>
            <div className="space-y-2">
              <p className="text-lg text-gray-600 dark:text-gray-400">
                <span className="font-semibold">Email:</span> {user.email}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                User ID: {user.id}
              </p>
            </div>
          </div>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Favorite Characters
              </h2>
              <Link
                href="/characters"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Browse Characters →
              </Link>
            </div>

            {favoritesLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 rounded-full border-2 border-gray-300 border-t-blue-600 animate-spin" />
              </div>
            ) : favorites.length === 0 ? (
              <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-8 text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  No favorite characters yet. Start adding some from the{" "}
                  <Link
                    href="/characters"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    characters page
                  </Link>
                  !
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {favorites.map((fav) => (
                  <div
                    key={fav.id}
                    className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 flex flex-col gap-3 hover:shadow-md transition-shadow"
                  >
                    {fav.character_image && (
                      <div className="relative w-full h-48">
                        <Image
                          src={fav.character_image}
                          alt={fav.character_name}
                          fill
                          sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover rounded-md"
                        />
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="font-semibold text-sm">
                        {fav.character_name}
                      </div>
                      {fav.character_media_title && (
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {fav.character_media_title}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                My Lists
              </h2>
              <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                Create New List +
              </button>
            </div>

            {listsLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 rounded-full border-2 border-gray-300 border-t-blue-600 animate-spin" />
              </div>
            ) : lists.length === 0 ? (
              <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-8 text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  No lists created yet.
                </p>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm">
                  Create Your First List
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lists.map((list) => (
                  <div
                    key={list.id}
                    className="border border-gray-200 dark:border-gray-800 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {list.name}
                    </h3>
                    {list.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        {list.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
                      <span>
                        Created: {new Date(list.created_at).toLocaleDateString()}
                      </span>
                      <span>
                        Updated: {new Date(list.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

