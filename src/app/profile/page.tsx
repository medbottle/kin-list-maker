"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase-client";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, X, Edit2, Plus, UserPlus, Star, List } from "lucide-react";
import Image from "next/image";
import { ProfileEditModal } from "@/components/profile-edit-modal";
import { CreateListModal } from "@/components/create-list-modal";
import { AddToListModal } from "@/components/add-to-list-modal";
import { DeleteListModal } from "@/components/delete-list-modal";
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
  const [isDeleteListModalOpen, setIsDeleteListModalOpen] = useState(false);
  const [listToDelete, setListToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
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
    
    async function loadUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const userToSet = currentUser || session.user;
      if (userToSet) {
        setUser(userToSet);
        setProfileData(extractProfileData(userToSet));
      }
      setLoading(false);
      hasCheckedAuth.current = true;
    }
    
    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (!session && hasCheckedAuth.current)) {
        router.push("/");
        return;
      }
      if (event === "USER_UPDATED" && session) {
        supabase.auth.getUser().then(({ data: { user: updatedUser } }) => {
          if (updatedUser) {
            setUser(updatedUser);
            setProfileData(extractProfileData(updatedUser));
          } else if (session.user) {
            setUser(session.user);
            setProfileData(extractProfileData(session.user));
          }
        });
      } else if (session && !hasCheckedAuth.current) {
        async function loadUserForSession() {
          const { data: { user: sessionUser } } = await supabase.auth.getUser();
          if (sessionUser) {
            setUser(sessionUser);
            setProfileData(extractProfileData(sessionUser));
          } else if (session?.user) {
            setUser(session.user);
            setProfileData(extractProfileData(session.user));
          }
          setLoading(false);
          hasCheckedAuth.current = true;
        }
        loadUserForSession();
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

  async function removeFavorite(favoriteId: string) {
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


  async function deleteList(listId: string) {
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

  function handleDeleteClick(listId: string, listName: string) {
    setListToDelete({ id: listId, name: listName });
    setIsDeleteListModalOpen(true);
  }

  function handleListNameClick(listId: string) {
    router.push(`/profile/lists/${listId}`);
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
      <div className="max-w-6xl mx-auto space-y-8">
        <Link href="/" className="inline-block">
          <ArrowLeft className="h-10 w-10 transition-transform duration-200 hover:scale-110" />
        </Link>

        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {profileData.profilePicture ? (
                <div className="relative w-24 h-24 rounded-full overflow-hidden transition-transform duration-300 hover:scale-110 cursor-pointer">
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
                <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center transition-transform duration-300 hover:scale-110 cursor-pointer">
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
                {profileData.gender && profileData.gender.trim() !== "" && (
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    <span className="font-semibold">Gender:</span>{" "}
                    {profileData.gender.charAt(0).toUpperCase() +
                      profileData.gender.slice(1).replace(/-/g, " ")}
                  </p>
                )}
                {user && (
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    <span className="font-semibold">Joined:</span>{" "}
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "Loading..."}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition-colors"
              title="Edit Profile"
            >
              <Edit2 className="h-5 w-5" />
            </button>
          </div>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Star className="h-6 w-6" />
                Favorite Characters
                {favorites.length > 0 && (
                  <span className="text-lg font-normal text-gray-500 dark:text-gray-400 ml-2">
                    ({favorites.length}/5)
                  </span>
                )}
              </h2>
              <Link
                href="/characters"
                className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                title="Go to character catalogue"
              >
                <UserPlus className="h-5 w-5" />
              </Link>
            </div>

            {favoritesLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 rounded-full border-2 border-gray-300 border-t-blue-600 animate-spin" />
              </div>
            ) : favorites.length === 0 ? (
              <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-8 text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  No favorite characters yet.
                </p>
              </div>
            ) : (
              <div className="flex justify-center flex-wrap gap-4">
                {favorites.map((fav) => (
                  <div
                    key={fav.id}
                    className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 flex flex-col gap-3 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 relative"
                    style={{ width: '180px' }}
                  >
                    <button
                      onClick={() => removeFavorite(fav.id)}
                      className="absolute top-2 right-2 z-10 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      title="Remove from favorites"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    {fav.character_image && (
                      <div className="relative w-full h-48 rounded-md overflow-hidden">
                        <Image
                          src={fav.character_image}
                          alt={fav.character_name}
                          fill
                          sizes="(min-width: 1024px) 20vw, 25vw"
                          className="object-cover transition-transform duration-300 hover:scale-110"
                        />
                      </div>
                    )}
                    <div className="space-y-1 text-center">
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
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <List className="h-6 w-6" />
                My Lists
                {lists.length > 0 && (
                  <span className="text-lg font-normal text-gray-500 dark:text-gray-400 ml-2">
                    ({lists.length}/3)
                  </span>
                )}
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsCreateListModalOpen(true)}
                  disabled={lists.length >= 3}
                  className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title={
                    lists.length >= 3
                      ? "You can only have 3 lists. Delete one first."
                      : "Create a new list"
                  }
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>

            {listsLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 rounded-full border-2 border-gray-300 border-t-blue-600 animate-spin" />
              </div>
            ) : lists.length === 0 ? (
              <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-8 text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  No lists created yet.
                </p>
              </div>
            ) : (
              <div className="flex justify-center flex-wrap gap-6">
                {lists.map((list) => {
                  const items = listItems.get(list.id) || [];
                  return (
                    <div
                      key={list.id}
                      className="border border-gray-200 dark:border-gray-800 rounded-lg p-6 flex flex-col gap-4 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 bg-white dark:bg-gray-900"
                      style={{ width: '100%', maxWidth: '350px' }}
                    >
                      <div className="flex items-center justify-between">
                        <h3
                          className="text-xl font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          onClick={() => handleListNameClick(list.id)}
                          title="Click to view and edit list"
                        >
                          {list.name}
                        </h3>
                        <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          ({list.character_count}/10)
                        </span>
                      </div>

                      {items.length === 0 ? (
                        <div className="flex items-center justify-center h-64 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                          <p className="text-sm text-gray-500 dark:text-gray-500 italic">
                            No characters yet
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          {items.slice(0, 4).map((item) => (
                            <div
                              key={item.id}
                              className="rounded-lg overflow-hidden hover:shadow-lg hover:scale-110 transition-all duration-300 cursor-pointer aspect-square"
                            >
                              {item.character_image ? (
                                <div className="relative w-full h-full">
                                  <Image
                                    src={item.character_image}
                                    alt={item.character_name}
                                    fill
                                    sizes="(min-width: 1024px) 50vw, 50vw"
                                    className="object-cover transition-transform duration-300 hover:scale-110"
                                  />
                                </div>
                              ) : (
                                <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                  <span className="text-xs text-gray-400">?</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {list.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {list.description}
                        </p>
                      )}

                      <div className="mt-auto pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          Created: {new Date(list.created_at).toLocaleDateString()}
                        </span>
                        <div className="flex gap-2 flex-shrink-0">
                          <Link
                            href="/characters"
                            className={`text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap ${
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
                          <button
                            onClick={() => handleDeleteClick(list.id, list.name)}
                            className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700 transition-colors whitespace-nowrap"
                            title="Delete list"
                          >
                            Delete List
                          </button>
                        </div>
                    </div>
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

          {listToDelete && (
            <DeleteListModal
              isOpen={isDeleteListModalOpen}
              onClose={() => {
                setIsDeleteListModalOpen(false);
                setListToDelete(null);
              }}
              onConfirm={() => {
                if (listToDelete) {
                  deleteList(listToDelete.id);
                }
              }}
              listName={listToDelete.name}
            />
          )}

        </>
      )}
    </main>
  );
}

