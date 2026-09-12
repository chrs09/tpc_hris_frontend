import { useMemo, useState } from "react";

// Client-side pagination for a list already fully loaded in memory --
// matches the pattern already used in UsersPage.jsx/StoreManagement.jsx
// before this hook existed. Does not reduce payload size (the backend
// still returns everything), only render/scroll cost; true server-side
// pagination would need page/limit params added to the relevant
// endpoints, which is a separate, larger change.
export default function usePagination(items = [], pageSize = 10) {
  const [requestedPage, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Clamp during render instead of in an effect (e.g. a filter shrinks
  // the list while on its last page) -- avoids an extra render pass.
  const page = Math.min(requestedPage, totalPages);

  const paginatedItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  );

  return { page, setPage, totalPages, paginatedItems };
}
