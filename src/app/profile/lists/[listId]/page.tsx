"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";
import { X, Plus, Edit2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EditListModal } from "@/components/edit-list-modal";

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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
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
      if (!user) return;
      
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

  async function handleSaveList(name: string, description: string | null) {
    if (!list) return;

    const { error } = await supabase
      .from("user_lists")
      .update({
        name: name.trim(),
        description: description,
      })
      .eq("id", listId);

    if (error) {
      console.error("Error updating list:", error);
      alert("Failed to update list");
      return;
    }

    setList((prev) =>
      prev
        ? {
            ...prev,
            name: name.trim(),
            description: description,
          }
        : null
    );
  }

  async function handleDeleteList() {
    if (!list) return;

    const { error } = await supabase
      .from("user_lists")
      .delete()
      .eq("id", listId);

    if (error) {
      console.error("Error deleting list:", error);
      alert("Failed to delete list");
      return;
    }

    router.push("/profile");
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
      <button
        onClick={() => router.back()}
        className="fixed top-24 left-8"
        title="Go back"
        aria-label="Go back"
      >
        <ArrowLeft className="h-10 w-10 transition-transform duration-200 hover:scale-110" />
      </button>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
              {list.name}
            </h1>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="p-1 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title="Edit list"
            >
              <Edit2 className="h-5 w-5" />
            </button>
          </div>

          {list.description ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {list.description}
            </p>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">
              No description
            </p>
          )}

          <div className="flex items-center justify-end">
            {list.character_count >= 10 ? (
              <button
                disabled
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md opacity-50 cursor-not-allowed transition-colors text-sm"
                title="List is full (10/10)"
              >
                <Plus className="h-4 w-4" />
                Add Characters
              </button>
            ) : (
              <Link
                href="/characters"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                title="Add characters"
              >
                <Plus className="h-4 w-4" />
                Add Characters
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
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
                className="rounded-lg p-4 flex flex-col gap-3 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 relative group"
              >
                <button
                  onClick={() => removeCharacter(item.id)}
                  className="absolute top-2 right-2 z-10 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove from list"
                >
                  <X className="h-3 w-3" />
                </button>
                {item.character_image ? (
                  <div className="relative w-full h-56 rounded-md overflow-hidden">
                    <Image
                      src={item.character_image}
                      alt={item.character_name}
                      fill
                      sizes="(min-width: 1024px) 20vw, (min-width: 768px) 25vw, 33vw, 50vw"
                      className="object-cover transition-transform duration-300 hover:scale-110"
                    />
                  </div>
                ) : (
                  <div className="w-full h-56 rounded-md bg-gray-200 dark:bg-gray-700 flex items-center justify-center border border-gray-200 dark:border-gray-700">
                    <span className="text-xs text-gray-400">?</span>
                  </div>
                )}
                <div className="flex-1 space-y-1 text-center">
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

      {list && (
        <EditListModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveList}
          onDelete={handleDeleteList}
          currentName={list.name}
          currentDescription={list.description}
        />
      )}
    </main>
  );
}

