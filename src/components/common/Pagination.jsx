export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center items-center gap-2 mt-6">
      <button
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="px-3 py-1 rounded-lg border border-border text-fg hover:bg-surface-hover disabled:opacity-40"
      >
        Prev
      </button>

      {[...Array(totalPages)].map((_, index) => {
        const page = index + 1;

        return (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-3 py-1 rounded-lg border border-border ${
              currentPage === page
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-surface text-fg hover:bg-surface-hover"
            }`}
          >
            {page}
          </button>
        );
      })}

      <button
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="px-3 py-1 rounded-lg border border-border text-fg hover:bg-surface-hover disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}
