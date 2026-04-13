export default function DynamicItemCard({
  title,
  onRemove,
  disableRemove = false,
  children,
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <button
          type="button"
          onClick={onRemove}
          disabled={disableRemove}
          className="text-sm font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
        >
          Remove
        </button>
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">{children}</div>
    </div>
  );
}