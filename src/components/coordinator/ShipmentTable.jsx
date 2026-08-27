import ShipmentRow from "./ShipmentRow";

const columns = [
  { key: "shipmentNo", label: "Shipment No." },
  { key: "dealer", label: "Dealer" },
  { key: "plate", label: "Plate" },
  { key: "hauler", label: "Hauler" },
  { key: "employee", label: "Employee" },
  { key: "helper", label: "Helper" },
  { key: "tripProfile", label: "Trip Profile" },
  { key: "pallets", label: "Pallets" },
  { key: "cases", label: "Cases" },
];

export default function ShipmentTable({
  rows,
  setRows,

  drivers,
  helpers,
  vehicles,
  tripProfiles,
}) {
  const updateRow = (index, field, value) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );
  };

  const editRow = (index) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, editing: true } : row)),
    );
  };

  const saveRow = (index) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, editing: false } : row)),
    );
  };

  const deleteRow = async (index) => {
    const row = rows[index];

    // Unsaved row -> just remove from state
    if (row.isNew) {
      setRows((prev) => prev.filter((_, i) => i !== index));
      return;
    }

    // Existing row -> delete from backend later
    if (!window.confirm("Delete this shipment?")) return;

    try {
      // TODO:
      // await deleteDispatchItem(row.id);

      setRows((prev) => prev.filter((_, i) => i !== index));
    } catch (err) {
      console.error(err);
    }
  };

  // const removeRow = (index) => {
  //   setRows(rows.filter((_, i) => i !== index));
  // };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-275 border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500"
              >
                {col.label}
              </th>
            ))}
            <th className="w-10 px-2 py-3" />
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 1} className="px-4 py-12">
                <div className="flex flex-col items-center gap-2 text-center">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-slate-300"
                  >
                    <rect x="3" y="7" width="18" height="13" rx="2" />
                    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  <p className="text-sm font-medium text-slate-600">
                    No shipments planned yet
                  </p>
                  <p className="text-xs text-slate-400">
                    Add a row or upload a load plan to get started.
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <ShipmentRow
                key={`${row.dispatchId}-${row.id}`}
                row={row}
                index={index}
                updateRow={updateRow}
                editRow={editRow}
                saveRow={saveRow}
                deleteRow={deleteRow}
                drivers={drivers}
                helpers={helpers}
                vehicles={vehicles}
                tripProfiles={tripProfiles}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
