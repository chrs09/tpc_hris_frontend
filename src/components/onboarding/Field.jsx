import SearchSelect from "../SearchSelect";

export default function Field({
  label,
  value,
  onChange,
  name,
  type = "text",
  options = null,
  placeholder = "",
  error = "",
  required = false,
}) {
  const isSelect = Array.isArray(options) && options.length > 0;

  const getOptionValue = (option) => option?.value ?? option?.id ?? option;

  const selectedOption = isSelect
    ? options.find((option) => String(getOptionValue(option)) === String(value))
    : null;

  const baseClass =
    "w-full rounded-2xl px-4 py-3 outline-none focus:ring-2 transition";
  const normalClass =
    "border border-gray-300 focus:border-black focus:ring-black/10";
  const errorClass =
    "border border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-200";

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {isSelect ? (
        <SearchSelect
          value={selectedOption || null}
          options={options}
          onChange={(option) =>
            onChange({
              target: { name, value: getOptionValue(option) },
            })
          }
          placeholder={placeholder || `Select ${label}`}
        />
      ) : type === "textarea" ? (
        <textarea
          name={name}
          value={value || ""}
          onChange={onChange}
          placeholder={placeholder}
          rows={4}
          className={`${baseClass} resize-none ${
            error ? errorClass : normalClass
          }`}
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value || ""}
          onChange={onChange}
          placeholder={placeholder}
          className={`${baseClass} ${error ? errorClass : normalClass}`}
        />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
