
export type PaginationControlsProps = {
  page: number;
  hasMore: boolean;
  isLoading: boolean;
  onPrevious: () => void;
  onNext: () => void;
  showPageInfo?: boolean;
};

export default function PaginationControls({
  page,
  hasMore,
  isLoading,
  onPrevious,
  onNext,
  showPageInfo = true,
}: PaginationControlsProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      {showPageInfo && <h2 className="text-lg font-medium">Page {page}</h2>}
      <div className="flex items-center gap-3 text-sm">
        <button
          onClick={onPrevious}
          disabled={page === 1 || isLoading}
          className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          Previous
        </button>
        <button
          onClick={onNext}
          disabled={!hasMore || isLoading}
          className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}