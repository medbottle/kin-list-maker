"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-client";
import type { User } from "@supabase/supabase-js";

type CreateListModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: User;
  currentListCount: number;
};

export function CreateListModal({
  isOpen,
  onClose,
  onSuccess,
  user,
  currentListCount,
}: CreateListModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      setName("");
      setDescription("");
      setError(null);
    }
  }, [isOpen]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (currentListCount >= 3) {
        setError("You can only have 3 lists. Delete one first.");
        setLoading(false);
        return;
      }

      if (!name.trim()) {
        setError("List name is required");
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase
        .from("user_lists")
        .insert({
          user_id: user.id,
          name: name.trim(),
          description: description.trim() || null,
        });

      if (insertError) {
        throw insertError;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Error creating list:", err);
      setError(err.message || "Failed to create list");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const isLimitReached = currentListCount >= 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-md w-full mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Create New List
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {isLimitReached && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              You have reached the limit of 3 lists. Delete one to create a new
              list.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="list-name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              List Name *
            </label>
            <input
              id="list-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome List"
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading || isLimitReached}
              maxLength={100}
            />
          </div>

          <div>
            <label
              htmlFor="list-description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Description (optional)
            </label>
            <textarea
              id="list-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this list about?"
              rows={3}
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              disabled={loading || isLimitReached}
              maxLength={500}
            />
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md text-sm"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || isLimitReached || !name.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? "Creating..." : "Create List"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

