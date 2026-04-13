import DynamicItemCard from "./DynamicItemCard";

export default function DynamicListSection({
  title,
  addLabel,
  items,
  onAdd,
  renderItem,
  error,
  maxItems = null,
  itemTitle = "Item",
}) {
  const isMaxReached = maxItems !== null && items.length >= maxItems;

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <button
          type="button"
          onClick={onAdd}
          disabled={isMaxReached}
          className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isMaxReached ? `Maximum ${maxItems} reached` : addLabel}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {items.map((item, index) => {
          const rendered = renderItem(index);

          return (
            <DynamicItemCard
              key={index}
              title={`${itemTitle} ${index + 1}`}
              disableRemove={items.length === 1}
              onRemove={rendered.onRemove}
            >
              {rendered.content}
            </DynamicItemCard>
          );
        })}
      </div>
    </div>
  );
}