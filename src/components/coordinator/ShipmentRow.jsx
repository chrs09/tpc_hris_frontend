import SearchableSelect from "../SearchableSelect";
import SearchableMultiSelect from "../SearchableMultiSelect";

const fieldStyle =
  "w-full rounded-md border border-transparent bg-transparent px-2.5 py-1.5 text-slate-800 transition focus:border-amber-400 focus:bg-amber-50/40 focus:outline-none focus:ring-2 focus:ring-amber-400/30 placeholder:text-slate-350";



export default function ShipmentRow({
    row,
    index,
    updateRow,
    deleteRow,

    drivers,
    helpers,
    vehicles,
    tripProfiles,
}) {
  return (
    <tr className="group transition hover:bg-slate-50">
      <td className="px-2 py-1.5">
        <input
          value={row.shipmentNo}
          onChange={(e) => updateRow(index, "shipmentNo", e.target.value)}
          placeholder="SH-00231"
          className={`${fieldStyle} font-mono text-[13px]`}
        />
      </td>

      <td className="px-2 py-1.5">
        <input
          value={row.dealer}
          onChange={(e) => updateRow(index, "dealer", e.target.value)}
          placeholder="Dealer name"
          className={fieldStyle}
        />
      </td>

      <td className="px-2 py-1.5">
        <SearchableSelect
            value={row.vehicle}
            options={vehicles}
            placeholder="Search plate"
            onChange={(vehicle) =>
                updateRow(index, "vehicle", vehicle)
            }
        />
      </td>

      <td className="px-2 py-1.5">
        <input
          value={row.hauler}
          onChange={(e) => updateRow(index, "hauler", e.target.value)}
          placeholder="Hauler name"
          className={fieldStyle}
        />
      </td>

      <td className="px-2 py-1.5">
        <SearchableSelect
            value={row.driver}
            options={drivers}
            placeholder="Search driver"
            onChange={(driver) =>
                updateRow(index, "driver", driver)
            }
        />
      </td>

      <td className="px-2 py-1.5">
        <SearchableMultiSelect
            value={row.helpers}
            options={helpers}
            maxSelection={row.tripProfile?.helperCount ?? 0}
            disabled={(row.tripProfile?.helperCount ?? 0) === 0}
            placeholder={
                row.tripProfile?.helperCount === 0
                    ? "No helper required"
                    : "Select helper(s)"
            }
            onChange={(selectedHelpers) =>
                updateRow(index, "helpers", selectedHelpers)
            }
        />
      </td>

      <td className="px-2 py-1.5">
        <SearchableSelect
            value={row.tripProfile}
            options={tripProfiles}
            placeholder="Trip profile"
            onChange={(profile) => {
                updateRow(index, "tripProfile", profile);

                // Reset helper selection when profile changes
                updateRow(index, "helpers", []);
            }}
        />
      </td>

      <td className="px-2 py-1.5">
        <input
          type="number"
          value={row.pallets}
          onChange={(e) => updateRow(index, "pallets", e.target.value)}
          placeholder="0"
          className={`${fieldStyle} tabular-nums`}
        />
      </td>

      <td className="px-2 py-1.5">
        <input
          type="number"
          value={row.cases}
          onChange={(e) => updateRow(index, "cases", e.target.value)}
          placeholder="0"
          className={`${fieldStyle} tabular-nums`}
        />
      </td>

      <td className="px-2 py-1.5 text-center">
        <button
          onClick={() => deleteRow(index)}
          className="rounded-md p-1.5 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
          aria-label="Remove row"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
        </button>
      </td>
    </tr>
  );
}