"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-client";
import type { User } from "@supabase/supabase-js";

type UserList = {
  id: string;
  name: string;
  description: string | null;
  character_count: number;
  is_character_in_list: boolean;
};

type AddToListModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: User;
  characterId: string;
  characterName: string;
};

export function AddToListModal({
  isOpen,
  onClose,
  onSuccess,
  user,
  characterId,
  characterName,
}: AddToListModalProps) {
  const [lists, setLists] = useState<UserList[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLists, setSelectedLists] = useState<Set<string>>(new Set());
  const supabase = createClient();

  useEffect(() => {
    if (!isOpen) return;

    async function loadLists() {
      setLoading(true);
      setError(null);
      setSelectedLists(new Set());

      try {
        const { data: userLists, error: listsError } = await supabase
          .from("user_lists")
          .select("id, name, description")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false });

        if (listsError) throw listsError;

        if (!userLists || userLists.length === 0) {
          setLists([]);
          setLoading(false);
          return;
        }

        const listIds = userLists.map((list) => list.id);

        const { data: listItems, error: itemsError } = await supabase
          .from("list_items")
          .select("list_id")
          .in("list_id", listIds);

        if (itemsError) throw itemsError;

        const characterInLists = new Set(
          (listItems || [])
            .filter((item) => item.list_id)
            .map((item) => item.list_id as string)
        );

        const { data: characterInListItems, error: charError } = await supabase
          .from("list_items")
          .select("list_id")
          .in("list_id", listIds)
          .eq("character_id", characterId);

        if (charError) throw charError;

        const characterAlreadyInLists = new Set(
          (characterInListItems || [])
            .filter((item) => item.list_id)
            .map((item) => item.list_id as string)
        );

        const listCounts = new Map<string, number>();
        (listItems || []).forEach((item) => {
          if (item.list_id) {
            listCounts.set(
              item.list_id,
              (listCounts.get(item.list_id) || 0) + 1
            );
          }
        });

        const mapped: UserList[] = userLists.map((list) => ({
          id: list.id,
          name: list.name,
          description: list.description,
          character_count: listCounts.get(list.id) || 0,
          is_character_in_list: characterAlreadyInLists.has(list.id),
        }));

        setLists(mapped);
        setSelectedLists(characterAlreadyInLists);
      } catch (err: any) {
        console.error("Error loading lists:", err);
        setError(err.message || "Failed to load lists");
      } finally {
        setLoading(false);
      }
    }

    loadLists();
  }, [isOpen, user.id, characterId, supabase]);

  function toggleList(listId: string) {
    setSelectedLists((prev) => {
      const next = new Set(prev);
      if (next.has(listId)) {
        next.delete(listId);
      } else {
        next.add(listId);
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const listsToAdd: string[] = [];
      const listsToRemove: string[] = [];

      lists.forEach((list) => {
        const wasInList = list.is_character_in_list;
        const shouldBeInList = selectedLists.has(list.id);

        if (!wasInList && shouldBeInList) {
          listsToAdd.push(list.id);
        } else if (wasInList && !shouldBeInList) {
          listsToRemove.push(list.id);
        }
      });

      for (const listId of listsToAdd) {
        const list = lists.find((l) => l.id === listId);
        if (!list) continue;

        if (list.character_count >= 10) {
          setError(
            `"${list.name}" is full (10/10 characters). Remove characters first.`
          );
          setSaving(false);
          return;
        }

        const { error: insertError } = await supabase
          .from("list_items")
          .insert({
            list_id: listId,
            character_id: characterId,
          });

        if (insertError) throw insertError;
      }

      for (const listId of listsToRemove) {
        const { error: deleteError } = await supabase
          .from("list_items")
          .delete()
          .eq("list_id", listId)
          .eq("character_id", characterId);

        if (deleteError) throw deleteError;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Error updating lists:", err);
      setError(err.message || "Failed to update lists");
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-md w-full mx-4 p-6 space-y-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Add {characterName} to...
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 rounded-full border-2 border-gray-300 border-t-blue-600 animate-spin" />
          </div>
        ) : lists.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You don't have any lists yet.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Create a list from your profile page first.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
              {lists.map((list) => {
                const isSelected = selectedLists.has(list.id);
                const isFull = list.character_count >= 10;
                const isDisabled = isFull && !isSelected;

                return (
                  <label
                    key={list.id}
                    className={`block border rounded-lg p-3 cursor-pointer transition-colors ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : isDisabled
                        ? "border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 opacity-50 cursor-not-allowed"
                        : "border-gray-300 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => !isDisabled && toggleList(list.id)}
                        disabled={isDisabled}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {list.name}
                          </span>
                          <span
                            className={`text-xs ${
                              isFull
                                ? "text-red-600 dark:text-red-400"
                                : "text-gray-500 dark:text-gray-400"
                            }`}
                          >
                            {list.character_count}/10
                          </span>
                        </div>
                        {list.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {list.description}
                          </p>
                        )}
                        {isFull && !isSelected && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                            List is full
                          </p>
                        )}
                        {isSelected && list.is_character_in_list && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            Already in this list
                          </p>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3 mb-4">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md text-sm"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

