"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase-client";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, X, Trash2 } from "lucide-react";
import Image from "next/image";
import { ProfileEditModal } from "@/components/profile-edit-modal";
import { CreateListModal } from "@/components/create-list-modal";
import { AddToListModal } from "@/components/add-to-list-modal";
import { extractProfileData, type ProfileData } from "@/lib/profile-utils";

type FavoriteCharacter = {
  id: string;
  character_id: string;
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
  character_count: number;
};

type ListItem = {
  id: string;
  character_id: string;
  character_name: string;
  character_image: string | null;
  character_media_title: string | null;
};

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<FavoriteCharacter[]>([]);
  const [lists, setLists] = useState<UserList[]>([]);
  const [listItems, setListItems] = useState<Map<string, ListItem[]>>(
    new Map()
  );
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [listsLoading, setListsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateListModalOpen, setIsCreateListModalOpen] = useState(false);
  const [isAddToListModalOpen, setIsAddToListModalOpen] = useState(false);
  const [selectedCharacterForList, setSelectedCharacterForList] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [profileData, setProfileData] = useState<ProfileData>({
    displayName: null,
    gender: null,
    profilePicture: null,
    userNumber: null,
  });
  const supabase = useMemo(() => createClient(), []);
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
      setProfileData(extractProfileData(session.user));
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
      if (event === "USER_UPDATED" && session) {
        setUser(session.user);
        setProfileData(extractProfileData(session.user));
      } else if (session && !hasCheckedAuth.current) {
        setUser(session.user);
        setProfileData(extractProfileData(session.user));
        setLoading(false);
        hasCheckedAuth.current = true;
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const { data: listsData } = await supabase
        .from("user_lists")
        .select("*")
        .order("updated_at", { ascending: false });

      if (!listsData || listsData.length === 0) {
        setLists([]);
        setListItems(new Map());
        setListsLoading(false);
        return;
      }

      const listIds = listsData.map((list) => list.id);

      const { data: itemsData } = await supabase
        .from("list_items")
        .select("id, list_id, character_id")
        .in("list_id", listIds);

        const characterIds = new Set<string>();
        (itemsData || []).forEach((item) => {
          if (item.character_id) {
            characterIds.add(item.character_id);
          }
        });

        const { data: charactersData } = await supabase
          .from("characters")
          .select("id, name, image_url, media_title")
          .in("id", Array.from(characterIds));

      const characterMap = new Map(
        (charactersData || []).map((char) => [char.id, char])
      );

      const itemsMap = new Map<string, ListItem[]>();
      const countMap = new Map<string, number>();

      (itemsData || []).forEach((item) => {
        if (!item.list_id || !item.character_id) return;

        const character = characterMap.get(item.character_id);
        if (!character) return;

        const listItem: ListItem = {
          id: item.id,
          character_id: item.character_id,
          character_name: character.name,
          character_image: character.image_url,
          character_media_title: character.media_title,
        };

        if (!itemsMap.has(item.list_id)) {
          itemsMap.set(item.list_id, []);
        }
        itemsMap.get(item.list_id)!.push(listItem);

        countMap.set(item.list_id, (countMap.get(item.list_id) || 0) + 1);
      });

      setListItems(itemsMap);

      const mapped: UserList[] = listsData.map((list) => ({
        id: list.id,
        name: list.name,
        description: list.description,
        created_at: list.created_at,
        updated_at: list.updated_at,
        character_count: countMap.get(list.id) || 0,
      }));

      setLists(mapped);
      setListsLoading(false);
    }

    loadFavorites();
    loadLists();
  }, [user, supabase]);

  async function removeFavorite(favoriteId: string, characterId: string) {
    const { error } = await supabase
      .from("favorite_characters")
      .delete()
      .eq("id", favoriteId);

    if (error) {
      console.error("Error removing favorite:", error);
      alert("Failed to remove favorite");
      return;
    }

    setFavorites((prev) => prev.filter((fav) => fav.id !== favoriteId));
  }

  async function removeFromList(listId: string, itemId: string) {
    const { error } = await supabase
      .from("list_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      console.error("Error removing from list:", error);
      alert("Failed to remove character from list");
      return;
    }

    setListItems((prev) => {
      const next = new Map(prev);
      const items = next.get(listId) || [];
      next.set(
        listId,
        items.filter((item) => item.id !== itemId)
      );
      return next;
    });

    setLists((prev) =>
      prev.map((list) =>
        list.id === listId
          ? { ...list, character_count: list.character_count - 1 }
          : list
      )
    );
  }

  async function deleteList(listId: string) {
    if (!confirm("Are you sure you want to delete this list? This cannot be undone.")) {
      return;
    }

    const { error } = await supabase
      .from("user_lists")
      .delete()
      .eq("id", listId);

    if (error) {
      console.error("Error deleting list:", error);
      alert("Failed to delete list");
      return;
    }

    setLists((prev) => prev.filter((list) => list.id !== listId));
    setListItems((prev) => {
      const next = new Map(prev);
      next.delete(listId);
      return next;
    });
  }

  function refreshData() {
    if (!user) return;

    async function refresh() {
      const { data: favoritesData } = await supabase
        .from("favorite_characters")
        .select("id, character_id, created_at")
        .order("created_at", { ascending: false });

      if (favoritesData && favoritesData.length > 0) {
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
      } else {
        setFavorites([]);
      }

      const { data: listsData } = await supabase
        .from("user_lists")
        .select("*")
        .order("updated_at", { ascending: false });

      if (listsData && listsData.length > 0) {
        const listIds = listsData.map((list) => list.id);
        const { data: itemsData } = await supabase
          .from("list_items")
          .select("id, list_id, character_id")
          .in("list_id", listIds);

        const characterIds = new Set<string>();
        (itemsData || []).forEach((item) => {
          if (item.character_id) {
            characterIds.add(item.character_id);
          }
        });

        const { data: charactersData } = await supabase
          .from("characters")
          .select("id, name, image_url, media_title")
          .in("id", Array.from(characterIds));

        const characterMap = new Map(
          (charactersData || []).map((char) => [char.id, char])
        );

        const itemsMap = new Map<string, ListItem[]>();
        const countMap = new Map<string, number>();

        (itemsData || []).forEach((item) => {
          if (!item.list_id || !item.character_id) return;

          const character = characterMap.get(item.character_id);
          if (!character) return;

          const listItem: ListItem = {
            id: item.id,
            character_id: item.character_id,
            character_name: character.name,
            character_image: character.image_url,
            character_media_title: character.media_title,
          };

          if (!itemsMap.has(item.list_id)) {
            itemsMap.set(item.list_id, []);
          }
          itemsMap.get(item.list_id)!.push(listItem);

          countMap.set(item.list_id, (countMap.get(item.list_id) || 0) + 1);
        });

        setListItems(itemsMap);

        const mapped: UserList[] = listsData.map((list) => ({
          id: list.id,
          name: list.name,
          description: list.description,
          created_at: list.created_at,
          updated_at: list.updated_at,
          character_count: countMap.get(list.id) || 0,
        }));

        setLists(mapped);
      } else {
        setLists([]);
        setListItems(new Map());
      }
    }

    refresh();
  }

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
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {profileData.profilePicture ? (
                <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                  <Image
                    src={profileData.profilePicture}
                    alt="Profile picture"
                    fill
                    className="object-cover"
                    unoptimized
                    onError={(e) => {
                      // Optionally, report the error to an error tracking service here.
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-gray-400 text-2xl">👤</span>
                </div>
              )}
              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  {profileData.displayName || user.email}
                  {profileData.displayName && profileData.userNumber && (
                    <span className="text-2xl text-gray-500 dark:text-gray-400 font-normal ml-2">
                      #{profileData.userNumber}
                    </span>
                  )}
                </h1>
                <div className="space-y-2">
                  <p className="text-lg text-gray-600 dark:text-gray-400">
                    <span className="font-semibold">Email:</span> {user.email}
                  </p>
                  {profileData.gender && profileData.gender.trim() !== "" && (
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      <span className="font-semibold">Gender:</span>{" "}
                      {profileData.gender.charAt(0).toUpperCase() +
                        profileData.gender.slice(1).replace(/-/g, " ")}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
            >
              Edit Profile
            </button>
          </div>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Favorite Characters
                {favorites.length > 0 && (
                  <span className="text-lg font-normal text-gray-500 dark:text-gray-400 ml-2">
                    ({favorites.length}/5)
                  </span>
                )}
              </h2>
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
                    className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 flex flex-col gap-3 hover:shadow-md transition-shadow relative"
                  >
                    <button
                      onClick={() => removeFavorite(fav.id, fav.character_id)}
                      className="absolute top-2 right-2 z-10 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      title="Remove from favorites"
                    >
                      <X className="h-3 w-3" />
                    </button>
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
                    <button
                      onClick={() => {
                        setSelectedCharacterForList({
                          id: fav.character_id,
                          name: fav.character_name,
                        });
                        setIsAddToListModalOpen(true);
                      }}
                      className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Add to List
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                My Lists
                {lists.length > 0 && (
                  <span className="text-lg font-normal text-gray-500 dark:text-gray-400 ml-2">
                    ({lists.length}/3)
                  </span>
                )}
              </h2>
              <button
                onClick={() => setIsCreateListModalOpen(true)}
                disabled={lists.length >= 3}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                title={
                  lists.length >= 3
                    ? "You can only have 3 lists. Delete one first."
                    : "Create a new list"
                }
              >
                Create List
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
                <button
                  onClick={() => setIsCreateListModalOpen(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
                >
                  Create Your First List
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {lists.map((list) => {
                  const items = listItems.get(list.id) || [];
                  return (
                    <div
                      key={list.id}
                      className="border border-gray-200 dark:border-gray-800 rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {list.name}
                            </h3>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              ({list.character_count}/10)
                            </span>
                          </div>
                          {list.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {list.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                            <span>
                              Created:{" "}
                              {new Date(list.created_at).toLocaleDateString()}
                            </span>
                            <span>
                              Updated:{" "}
                              {new Date(list.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteList(list.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                          title="Delete list"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mb-4">
                        <Link
                          href="/characters"
                          className={`inline-block text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                            list.character_count >= 10
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                          title={
                            list.character_count >= 10
                              ? "List is full (10/10)"
                              : "Go to characters page to add characters"
                          }
                        >
                          Add Characters
                        </Link>
                      </div>

                      {items.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-500 italic">
                          No characters in this list yet.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 relative group"
                            >
                              <button
                                onClick={() => removeFromList(list.id, item.id)}
                                className="absolute top-1 right-1 z-10 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                title="Remove from list"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                              {item.character_image && (
                                <div className="relative w-full h-32 mb-2">
                                  <Image
                                    src={item.character_image}
                                    alt={item.character_name}
                                    fill
                                    sizes="(min-width: 768px) 25vw, 33vw, 50vw"
                                    className="object-cover rounded"
                                  />
                                </div>
                              )}
                              <div className="text-xs font-medium text-gray-900 dark:text-white truncate">
                                {item.character_name}
                              </div>
                              {item.character_media_title && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {item.character_media_title}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      <ProfileEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentDisplayName={profileData.displayName}
        currentGender={profileData.gender}
        currentProfilePicture={profileData.profilePicture}
        onUpdate={async () => {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.user) {
            setUser(session.user);
            setProfileData(extractProfileData(session.user));
          }
        }}
      />

      {user && (
        <>
          <CreateListModal
            isOpen={isCreateListModalOpen}
            onClose={() => setIsCreateListModalOpen(false)}
            onSuccess={refreshData}
            user={user}
            currentListCount={lists.length}
          />

          {selectedCharacterForList && (
            <AddToListModal
              isOpen={isAddToListModalOpen}
              onClose={() => {
                setIsAddToListModalOpen(false);
                setSelectedCharacterForList(null);
              }}
              onSuccess={refreshData}
              user={user}
              characterId={selectedCharacterForList.id}
              characterName={selectedCharacterForList.name}
            />
          )}
        </>
      )}
    </main>
  );
}

