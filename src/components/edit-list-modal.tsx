"use client";

import { useState, useEffect } from "react";

type EditListModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string | null) => void;
  onDelete: () => void;
  currentName: string;
  currentDescription: string | null;
};

export function EditListModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  currentName,
  currentDescription,
}: EditListModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [name, setName] = useState(currentName);
  const [description, setDescription] = useState(currentDescription || "");

  useEffect(() => {
    if (isOpen) {
      setName(currentName);
      setDescription(currentDescription || "");
      setShowDeleteConfirm(false);
    }
  }, [isOpen, currentName, currentDescription]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSave(name.trim(), description.trim() || null);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-md w-full mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Edit List
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

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
              required
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
              maxLength={500}
            />
          </div>

          <div className="flex gap-3 justify-between items-center">
            {showDeleteConfirm ? (
              <>
                <p className="text-sm text-red-600 dark:text-red-400">
                  Are you sure? This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDelete();
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md text-sm"
                >
                  Delete List
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!name.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Save
                  </button>
                </div>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

