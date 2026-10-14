import SearchSelect from "../SearchSelect";
import { UNIT_REASONS, unitOptionLabel } from "../../utils/unitReasons";

// Vehicle unit picker for Trip Assignment / Edit Trip: the driver's own
// unit (or why it can't go), units under repair blocked with the reason
// from Vehicle Maintenance, a required reason when the unit isn't theirs,
// and the Urgent label.
export default function UnitChoice({
  units,
  ownUnit,
  driverSelected,
  value,
  onChange,
  needsReason,
  reasonType,
  onReasonType,
  reasonNote,
  onReasonNote,
  isUrgent,
  onUrgent,
  inputClassName,
}) {
  const selected = units.find((u) => String(u.id) === String(value));

  let ownNote = null;
  if (driverSelected) {
    if (!ownUnit) {
      ownNote = { tone: "muted", text: "No assigned unit (new driver) -- pick a unit." };
    } else if (ownUnit.in_repair) {
      ownNote = {
        tone: "danger",
        text: `Assigned unit ${ownUnit.plate_number}: ${ownUnit.in_repair.text} Pick another unit.`,
      };
    } else if (ownUnit.is_available === false && String(ownUnit.id) !== String(value)) {
      ownNote = { tone: "warning", text: `Assigned unit ${ownUnit.plate_number} is on another trip.` };
    } else {
      ownNote = { tone: "success", text: `Assigned unit: ${ownUnit.plate_number}` };
    }
  }
  const toneClass = {
    muted: "text-fg-subtle",
    danger: "bg-danger/10 text-danger rounded-lg px-3 py-2",
    warning: "text-warning",
    success: "text-success",
  };

  return (
    <div className="space-y-2">
      <SearchSelect
        value={selected}
        options={units}
        onChange={(unit) => onChange(unit?.id || "")}
        placeholder="Select vehicle unit"
        getOptionLabel={unitOptionLabel}
        getOptionValue={(unit) => unit?.id}
      />
      {ownNote && <p className={`text-xs ${toneClass[ownNote.tone]}`}>{ownNote.text}</p>}
      {selected?.in_repair && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger">
          {selected.plate_number} can&apos;t be dispatched. {selected.in_repair.text}
        </p>
      )}

      {needsReason && !selected?.in_repair && (
        <div className="space-y-2 rounded-xl border border-warning/40 bg-warning/5 p-3">
          <p className="text-xs font-semibold text-fg">
            Reason for using {selected?.plate_number}
            {selected?.assigned_driver_name ? ` (${selected.assigned_driver_name}'s unit)` : ""}{" "}
            <span className="text-danger">*</span>
          </p>
          <select
            value={reasonType}
            onChange={(e) => onReasonType(e.target.value)}
            className={inputClassName}
          >
            <option value="">Pick a reason...</option>
            {UNIT_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={reasonNote}
            onChange={(e) => onReasonNote(e.target.value)}
            placeholder={reasonType === "OTHER" ? "Describe the reason (required)" : "Note (optional), e.g. which load"}
            className={inputClassName}
          />
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-fg">
        <input type="checkbox" checked={isUrgent} onChange={(e) => onUrgent(e.target.checked)} />
        Urgent trip <span className="text-xs text-fg-subtle">(label for reports)</span>
      </label>
    </div>
  );
}
