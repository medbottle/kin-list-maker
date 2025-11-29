"use client";

type DeleteListModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  listName: string;
};

export function DeleteListModal({
  isOpen,
  onClose,
  onConfirm,
  listName,
}: DeleteListModalProps) {
  if (!isOpen) return null;

  function handleConfirm() {
    onConfirm();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-md w-full mx-4 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Delete List
        </h2>

        <p className="text-sm text-gray-600 dark:text-gray-400">
          Are you sure you want to delete the list <span className="font-semibold">"{listName}"</span>? This action cannot be undone and all characters in this list will be removed.
        </p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
          >
            Delete List
          </button>
        </div>
      </div>
    </div>
  );
}

