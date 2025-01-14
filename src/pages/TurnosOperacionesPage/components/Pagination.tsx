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
  const pages = Array.from({ length: totalPages }, (_, i) => i);

  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center items-center space-x-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 0}
        className="px-3 py-1 rounded-md text-sm font-medium
                 disabled:bg-gray-100 disabled:text-gray-400
                 enabled:bg-white enabled:text-gray-700 enabled:hover:bg-gray-50
                 border border-gray-300"
      >
        Anterior
      </button>

      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-3 py-1 rounded-md text-sm font-medium
                    ${
                      currentPage === page
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    } border border-gray-300`}
        >
          {page + 1}
        </button>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages - 1}
        className="px-3 py-1 rounded-md text-sm font-medium
                 disabled:bg-gray-100 disabled:text-gray-400
                 enabled:bg-white enabled:text-gray-700 enabled:hover:bg-gray-50
                 border border-gray-300"
      >
        Siguiente
      </button>
    </div>
  );
}
