"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";
import { X, Plus, Edit2, ArrowLeft } from "lucide-react";
import Link from "next/link";

type ListItem = {
  id: string;
  character_id: string;
  character_name: string;
  character_image: string | null;
  character_media_title: string | null;
};

export default function ListPage() {
  const params = useParams();
  const router = useRouter();
  const listId = params.listId as string;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<{
    id: string;
    name: string;
    description: string | null;
    character_count: number;
  } | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const supabase = useMemo(() => createClient(), []);
  const hasCheckedAuth = useRef(false);

  useEffect(() => {
    if (hasCheckedAuth.current) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/");
        return;
      }
      setUser(session.user);
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
        hasCheckedAuth.current = true;
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user || !listId) return;

    async function loadList() {
      setLoading(true);
      const { data: listData, error: listError } = await supabase
        .from("user_lists")
        .select("*")
        .eq("id", listId)
        .eq("user_id", user.id)
        .single();

      if (listError || !listData) {
        router.push("/profile");
        return;
      }

      setList({
        id: listData.id,
        name: listData.name,
        description: listData.description,
        character_count: 0,
      });
      setEditedName(listData.name);
      setEditedDescription(listData.description || "");

      const { data: itemsData } = await supabase
        .from("list_items")
        .select("id, character_id")
        .eq("list_id", listId);

      if (itemsData && itemsData.length > 0) {
        const characterIds = itemsData
          .map((item) => item.character_id)
          .filter((id): id is string => id !== null);

        const { data: charactersData } = await supabase
          .from("characters")
          .select("id, name, image_url, media_title")
          .in("id", characterIds);

        const characterMap = new Map(
          (charactersData || []).map((char) => [char.id, char])
        );

        const mapped: ListItem[] = itemsData
          .filter((item) => item.character_id)
          .map((item) => {
            const character = characterMap.get(item.character_id as string);
            return {
              id: item.id,
              character_id: item.character_id as string,
              character_name: character?.name || "Unknown",
              character_image: character?.image_url || null,
              character_media_title: character?.media_title || null,
            };
          });

        setItems(mapped);
        setList((prev) =>
          prev
            ? { ...prev, character_count: mapped.length }
            : null
        );
      }

      setLoading(false);
    }

    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, listId]);

  async function updateListName() {
    if (!list || !editedName.trim() || editedName.trim() === list.name) {
      setIsEditingName(false);
      return;
    }

    const { error } = await supabase
      .from("user_lists")
      .update({ name: editedName.trim() })
      .eq("id", listId);

    if (error) {
      console.error("Error updating list name:", error);
      alert("Failed to update list name");
      return;
    }

    setList((prev) => (prev ? { ...prev, name: editedName.trim() } : null));
    setIsEditingName(false);
  }

  async function updateListDescription() {
    if (!list) {
      setIsEditingDescription(false);
      return;
    }

    const trimmed = editedDescription.trim();
    const { error } = await supabase
      .from("user_lists")
      .update({ description: trimmed || null })
      .eq("id", listId);

    if (error) {
      console.error("Error updating list description:", error);
      alert("Failed to update list description");
      return;
    }

    setList((prev) =>
      prev ? { ...prev, description: trimmed || null } : null
    );
    setIsEditingDescription(false);
  }

  async function removeCharacter(itemId: string) {
    const { error } = await supabase
      .from("list_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      console.error("Error removing character from list:", error);
      alert("Failed to remove character from list");
      return;
    }

    setItems((prev) => prev.filter((item) => item.id !== itemId));
    setList((prev) =>
      prev ? { ...prev, character_count: prev.character_count - 1 } : null
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen p-8 bg-white dark:bg-black">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="h-8 w-8 rounded-full border-2 border-gray-300 border-t-blue-600 animate-spin" />
          </div>
        </div>
      </main>
    );
  }

  if (!list) {
    return null;
  }

  return (
    <main className="min-h-screen p-8 bg-white dark:bg-black">
      <div className="max-w-5xl mx-auto space-y-6">
        <Link href="/profile" className="inline-block">
          <ArrowLeft className="h-10 w-10 transition-transform duration-200 hover:scale-110" />
        </Link>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {isEditingName ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="flex-1 text-3xl font-semibold text-gray-900 dark:text-white bg-transparent border-b-2 border-blue-500 focus:outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      updateListName();
                    } else if (e.key === "Escape") {
                      setEditedName(list.name);
                      setIsEditingName(false);
                    }
                  }}
                />
                <button
                  onClick={updateListName}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditedName(list.name);
                    setIsEditingName(false);
                  }}
                  className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
                  {list.name}
                </h1>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="p-1 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  title="Edit name"
                >
                  <Edit2 className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {isEditingDescription ? (
            <div className="flex items-start gap-2">
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                className="flex-1 text-sm text-gray-600 dark:text-gray-400 bg-transparent border-b-2 border-blue-500 focus:outline-none resize-none"
                rows={2}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setEditedDescription(list.description || "");
                    setIsEditingDescription(false);
                  }
                }}
              />
              <div className="flex flex-col gap-1">
                <button
                  onClick={updateListDescription}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditedDescription(list.description || "");
                    setIsEditingDescription(false);
                  }}
                  className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              {list.description ? (
                <p className="text-sm text-gray-600 dark:text-gray-400 flex-1">
                  {list.description}
                </p>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic flex-1">
                  No description
                </p>
              )}
              <button
                onClick={() => setIsEditingDescription(true)}
                className="p-1 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex-shrink-0"
                title="Edit description"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-500">
              {items.length} character{items.length !== 1 ? "s" : ""} ({list.character_count}/10)
            </p>
            <Link
              href="/characters"
              className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm ${
                list.character_count >= 10
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
              title={
                list.character_count >= 10
                  ? "List is full (10/10)"
                  : "Add characters"
              }
            >
              <Plus className="h-4 w-4" />
              Add Characters
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {items.length === 0 ? (
            <div className="col-span-full flex items-center justify-center h-64 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-500 italic">
                No characters in this list yet.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 flex flex-col gap-3 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 relative group"
              >
                <button
                  onClick={() => removeCharacter(item.id)}
                  className="absolute top-2 right-2 z-10 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove from list"
                >
                  <X className="h-3 w-3" />
                </button>
                {item.character_image ? (
                  <div className="relative w-full h-64 rounded-md overflow-hidden">
                    <Image
                      src={item.character_image}
                      alt={item.character_name}
                      fill
                      sizes="(min-width: 1024px) 20vw, (min-width: 768px) 25vw, 33vw, 50vw"
                      className="object-cover transition-transform duration-300 hover:scale-110"
                    />
                  </div>
                ) : (
                  <div className="w-full h-64 rounded-md bg-gray-200 dark:bg-gray-700 flex items-center justify-center border border-gray-200 dark:border-gray-700">
                    <span className="text-xs text-gray-400">?</span>
                  </div>
                )}
                <div className="flex-1 space-y-1">
                  <div className="font-semibold">{item.character_name}</div>
                  {item.character_media_title && (
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {item.character_media_title}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}

