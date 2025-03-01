interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      // Show all pages if there are few
      for (let i = 0; i < totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always show first page
      pageNumbers.push(0);

      // Calculate start and end of page range around current page
      let start = Math.max(1, currentPage - 1);
      let end = Math.min(totalPages - 2, currentPage + 1);

      // Adjust if we're at the beginning
      if (currentPage <= 1) {
        end = 3;
      }

      // Adjust if we're at the end
      if (currentPage >= totalPages - 2) {
        start = totalPages - 4;
      }

      // Add ellipsis if needed
      if (start > 1) {
        pageNumbers.push(-1); // -1 represents ellipsis
      }

      // Add page numbers around current page
      for (let i = start; i <= end; i++) {
        pageNumbers.push(i);
      }

      // Add ellipsis if needed
      if (end < totalPages - 2) {
        pageNumbers.push(-2); // -2 represents ellipsis
      }

      // Always show last page
      pageNumbers.push(totalPages - 1);
    }

    return pageNumbers;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex justify-center items-center space-x-1">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 0}
        className="px-3 py-1.5 rounded-md text-sm font-medium
                 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
                 enabled:bg-white enabled:text-gray-700 enabled:hover:bg-gray-50
                 border border-gray-300 transition-colors"
        aria-label="Página anterior"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      {pageNumbers.map((page, index) => {
        if (page < 0) {
          // Render ellipsis
          return (
            <span
              key={`ellipsis-${index}`}
              className="px-3 py-1.5 text-gray-500"
            >
              ...
            </span>
          );
        }

        return (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                      ${
                        currentPage === page
                          ? "bg-blue-600 text-white border border-blue-600"
                          : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                      }`}
            aria-label={`Página ${page + 1}`}
            aria-current={currentPage === page ? "page" : undefined}
          >
            {page + 1}
          </button>
        );
      })}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages - 1}
        className="px-3 py-1.5 rounded-md text-sm font-medium
                 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
                 enabled:bg-white enabled:text-gray-700 enabled:hover:bg-gray-50
                 border border-gray-300 transition-colors"
        aria-label="Página siguiente"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </div>
  );
}
