"use client";

type RemoveFavoriteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  characterName: string;
};

export function RemoveFavoriteModal({
  isOpen,
  onClose,
  onConfirm,
  characterName,
}: RemoveFavoriteModalProps) {
  if (!isOpen) return null;

  function handleConfirm() {
    onConfirm();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-md w-full mx-4 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Remove from Favorites
        </h2>

        <p className="text-sm text-gray-600 dark:text-gray-400">
          Are you sure you want to remove <span className="font-semibold">"{characterName}"</span> from your favorites?
        </p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="p-2 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="p-2 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm text-red-600 dark:text-red-500"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

