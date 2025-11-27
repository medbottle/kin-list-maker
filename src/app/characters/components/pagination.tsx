import { ChevronLeft, ChevronRight } from "lucide-react";

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
          className="p-2 rounded border border-gray-300 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Previous page"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={onNext}
          disabled={!hasMore || isLoading}
          className="p-2 rounded border border-gray-300 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Next page"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}