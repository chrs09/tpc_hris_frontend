import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import SearchSelect from "../../components/SearchSelect";
import useModuleAccess from "../../hooks/useModuleAccess";
import { confirmDialog, promptDialog } from "../../components/ui/dialog/dialogService";
import {
  createOrgUnit,
  deleteOrgUnit,
  getOrgChart,
  updateOrgUnit,
} from "../../api/orgHierarchy";
import { getAssignableUsers } from "../../api/users";
import {
  resetEmployeeModuleAccess,
  setEmployeeModuleAccess,
} from "../../api/employeeModuleAccess";
import { MODULE_GROUPS, moduleKey } from "../../constants/modules";
import { getNavGroups } from "../../constants/navGroups";

const getErrorMessage = (error) =>
  error.response?.data?.detail || error.message || "Something went wrong.";

const ROLE_LABELS = {
  superadmin: "Superadmin",
  admin: "Admin",
  coordinator_admin: "Coordinator Admin",
  coordinator: "Coordinator",
  payroll_admin: "Payroll Admin",
  office_admin: "Office Admin",
  employee: "Employee",
  driver: "Driver",
  helper: "Helper",
};

const inputStyles =
  "w-full rounded-xl border border-border bg-background p-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30";

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

// Module keys a role gets by default (no custom Module Assignment saved)
// -- read from the same nav config the Sidebar uses.
const roleDefaultKeys = (role) => {
  const keys = new Set();
  if (!role) return keys;
  getNavGroups(role).forEach((group) =>
    (group.children || []).forEach((item) => {
      if (item.moduleKey && item.roles?.includes(role)) keys.add(item.moduleKey);
    }),
  );
  return keys;
};

const groupKeys = (group) =>
  group.submodules.flatMap((sub) => [
    moduleKey(group.key, sub.key),
    ...(sub.children || []).map((child) => moduleKey(group.key, child.key)),
  ]);

// Administrator -> Org Chart: a tree of units (Owner -> Admins -> HR / IT
// / Trip Management -> Coordinator -> Drivers ...). Members are matched
// live by each unit's rules, so the chart stays current. Superadmin can
// reshape the tree (Edit), and click anyone to set what they can access.
export default function OrgChart() {
  const { isSuperAdmin } = useModuleAccess();
  const [chart, setChart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [editingUnitId, setEditingUnitId] = useState(null);
  const [accessPerson, setAccessPerson] = useState(null);

  const load = useCallback(async () => {
    try {
      setChart(await getOrgChart());
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const childrenOf = useMemo(() => {
    const map = {};
    (chart?.units || []).forEach((u) => {
      const key = u.parent_id ?? "root";
      (map[key] = map[key] || []).push(u);
    });
    return map;
  }, [chart]);

  const query = search.trim().toLowerCase();
  const matchesQuery = useCallback(
    (unit) =>
      !!query &&
      (unit.name.toLowerCase().includes(query) ||
        unit.head?.name?.toLowerCase().includes(query) ||
        unit.members.some((m) => m.name.toLowerCase().includes(query))),
    [query],
  );

  const addUnit = async (parentId) => {
    const name = await promptDialog(
      parentId ? "Name of the new unit under this one:" : "Name of the new top-level unit:",
    );
    if (name === null) return;
    if (!name.trim()) {
      toast.error("Enter a name.");
      return;
    }
    try {
      const res = await createOrgUnit(name.trim(), parentId);
      toast.success("Unit added. Set who belongs to it.");
      await load();
      setEditingUnitId(res.id);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const removeUnit = async (unit) => {
    if (
      !(await confirmDialog(
        `Remove "${unit.name}" from the chart? Its sub-units move up one level. No employee records are changed.`,
      ))
    ) {
      return;
    }
    try {
      await deleteOrgUnit(unit.id);
      toast.success("Unit removed.");
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const roots = childrenOf.root || [];

  const unitsById = useMemo(
    () => Object.fromEntries((chart?.units || []).map((u) => [u.id, u])),
    [chart],
  );
  // Units that also report to a given unit (drawn elsewhere, linked here).
  const alsoLeads = useMemo(() => {
    const map = {};
    (chart?.units || []).forEach((u) =>
      (u.also_reports_to || []).forEach((pid) => {
        (map[pid] = map[pid] || []).push(u);
      }),
    );
    return map;
  }, [chart]);

  const [flashId, setFlashId] = useState(null);
  const jumpTo = (unitId) => {
    document
      .getElementById(`org-unit-${unitId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    setFlashId(unitId);
    setTimeout(() => setFlashId(null), 1600);
  };

  return (
    <div className="space-y-5">
      <SectionTabs group="Administrator" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-fg sm:text-xl">
            Organizational Chart
          </h1>
          <p className="mt-1 text-sm text-fg-subtle">
            Who belongs where is matched live from each unit&apos;s rules
            (position, role, department or specific people).
            {isSuperAdmin &&
              " Click anyone to set what they can access; use Edit Chart to change the structure."}
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search person or unit"
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setEditMode((v) => !v)}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
                editMode
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-fg hover:bg-surface-hover"
              }`}
            >
              {editMode ? "Done Editing" : "Edit Chart"}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-fg-subtle">Loading...</p>
      ) : !chart ? null : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface/50 p-6">
          <div className="mx-auto flex w-max min-w-full flex-col items-center">
            {/* Company */}
            <div className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 px-6 py-4 shadow-sm">
              <Building2 className="text-primary" size={26} />
              <div>
                <p className="text-base font-bold text-fg">{chart.company}</p>
                <p className="text-xs text-fg-muted">
                  {chart.employee_count} active employees
                </p>
              </div>
            </div>

            {(roots.length > 0 || editMode) && <div className="h-6 w-px bg-border" />}

            <Children
              units={roots}
              childrenOf={childrenOf}
              render={(unit) => (
                <UnitCard
                  unit={unit}
                  unitsById={unitsById}
                  alsoLeads={alsoLeads[unit.id] || []}
                  onJump={jumpTo}
                  flashing={flashId === unit.id}
                  highlighted={matchesQuery(unit)}
                  query={query}
                  expanded={Boolean(expanded[unit.id]) || matchesQuery(unit)}
                  onToggle={() =>
                    setExpanded((prev) => ({ ...prev, [unit.id]: !prev[unit.id] }))
                  }
                  editMode={editMode}
                  onEdit={() => setEditingUnitId(unit.id)}
                  onAdd={() => addUnit(unit.id)}
                  onDelete={() => removeUnit(unit)}
                  onPerson={isSuperAdmin ? setAccessPerson : null}
                />
              )}
            />

            {editMode && (
              <button
                type="button"
                onClick={() => addUnit(null)}
                className="mt-6 flex items-center gap-1 rounded-xl border border-dashed border-border px-4 py-2 text-xs font-medium text-fg-muted hover:border-primary hover:text-primary"
              >
                <Plus size={14} /> Add top-level unit
              </button>
            )}
          </div>
        </div>
      )}

      {editingUnitId && chart && (
        <UnitEditor
          unit={chart.units.find((u) => u.id === editingUnitId)}
          chart={chart}
          onClose={() => setEditingUnitId(null)}
          onSaved={load}
        />
      )}

      {accessPerson && (
        <AccessPanel
          person={accessPerson}
          onClose={() => setAccessPerson(null)}
          onSaved={async () => {
            const fresh = await getOrgChart();
            setChart(fresh);
            const again = fresh.units
              .flatMap((u) => [u.head, ...u.members])
              .find((p) => p && p.employee_id === accessPerson.employee_id);
            if (again) setAccessPerson(again);
          }}
        />
      )}
    </div>
  );
}

// One level of the tree: each unit with a vertical line up to a shared
// horizontal line, then its own sub-units below it.
function Children({ units, childrenOf, render }) {
  if (!units.length) return null;
  return (
    <div className="flex items-start">
      {units.map((unit, index) => {
        const kids = childrenOf[unit.id] || [];
        return (
          <div key={unit.id} className="relative flex flex-col items-center px-3">
            {units.length > 1 && (
              <div
                className={`absolute top-0 h-px bg-border ${
                  index === 0
                    ? "left-1/2 right-0"
                    : index === units.length - 1
                      ? "left-0 right-1/2"
                      : "left-0 right-0"
                }`}
              />
            )}
            <div className="h-6 w-px bg-border" />
            {render(unit)}
            {kids.length > 0 && (
              <>
                <div className="h-6 w-px bg-border" />
                <Children units={kids} childrenOf={childrenOf} render={render} />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function UnitCard({
  unit,
  unitsById,
  alsoLeads,
  onJump,
  flashing,
  highlighted,
  query,
  expanded,
  onToggle,
  editMode,
  onEdit,
  onAdd,
  onDelete,
  onPerson,
}) {
  const members = unit.members.filter(
    (m) => !unit.head || m.employee_id !== unit.head.employee_id || !m.employee_id,
  );

  return (
    <div
      id={`org-unit-${unit.id}`}
      className={`w-60 rounded-2xl border bg-surface shadow-sm transition ${
        flashing
          ? "border-primary ring-4 ring-primary/40"
          : highlighted
            ? "border-warning ring-2 ring-warning/30"
            : "border-border"
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <p className="truncate text-sm font-bold text-fg">{unit.name}</p>
        {editMode ? (
          <div className="flex shrink-0 gap-1">
            <IconBtn label="Edit unit" onClick={onEdit}>
              <Pencil size={13} />
            </IconBtn>
            <IconBtn label="Add unit below" onClick={onAdd}>
              <Plus size={13} />
            </IconBtn>
            <IconBtn label="Remove unit" onClick={onDelete} danger>
              <Trash2 size={13} />
            </IconBtn>
          </div>
        ) : (
          <span className="flex shrink-0 items-center gap-1 text-xs text-fg-subtle">
            <Users size={12} /> {unit.members.length}
          </span>
        )}
      </div>

      {(unit.also_reports_to || []).length > 0 && (
        <p className="border-b border-border px-3 py-1.5 text-[11px] text-fg-subtle">
          Also reports to:{" "}
          {unit.also_reports_to.map((pid, i) => (
            <React.Fragment key={pid}>
              {i > 0 && ", "}
              <button
                type="button"
                onClick={() => onJump(pid)}
                className="font-medium text-primary hover:underline"
              >
                {unitsById[pid]?.name || "?"}
              </button>
            </React.Fragment>
          ))}
        </p>
      )}

      {unit.head ? (
        <PersonRow person={unit.head} label="Head" onClick={onPerson} strong />
      ) : (
        <p className="px-3 py-2 text-xs text-fg-subtle">No head assigned</p>
      )}

      {unit.head && unit.approves?.length > 0 && (
        <p className="px-3 pb-2 text-[11px] text-fg-subtle">
          Approves:{" "}
          {APPROVAL_TYPES.filter((t) => unit.approves.includes(t.key))
            .map((t) => t.label)
            .join(", ")}
        </p>
      )}

      {alsoLeads.length > 0 && (
        <div className="flex flex-wrap gap-1 border-t border-border px-3 py-2">
          {alsoLeads.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => onJump(u.id)}
              title={`${u.name} also reports here -- click to go to it`}
              className="rounded-full border border-dashed border-primary/50 px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/10"
            >
              ↘ {u.name}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-center gap-1 border-t border-border py-1.5 text-xs font-medium text-fg-muted hover:bg-surface-hover"
      >
        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {members.length} member{members.length === 1 ? "" : "s"}
      </button>

      {expanded && (
        <div className="max-h-64 overflow-y-auto border-t border-border py-1">
          {members.length === 0 ? (
            <p className="px-3 py-2 text-center text-xs text-fg-subtle">
              {editMode
                ? "No one matches yet -- edit the unit to set who belongs."
                : "No members."}
            </p>
          ) : (
            members.map((m) => (
              <PersonRow
                key={`${m.employee_id}-${m.user_id}`}
                person={m}
                onClick={onPerson}
                highlight={query && m.name.toLowerCase().includes(query)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function PersonRow({ person, label, onClick, strong = false, highlight = false }) {
  const clickable = Boolean(onClick);
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={clickable ? () => onClick(person) : undefined}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left ${
        highlight ? "bg-warning/15" : ""
      } ${clickable ? "hover:bg-surface-hover" : "cursor-default"}`}
      title={clickable ? "Set what this person can access" : undefined}
    >
      <Avatar person={person} size={strong ? "md" : "sm"} strong={strong} />
      <span className="min-w-0">
        {label && (
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">
            {label}
          </span>
        )}
        <span className={`block truncate ${strong ? "text-sm font-semibold" : "text-xs"} text-fg`}>
          {person.name}
        </span>
        {(person.position || person.role) && (
          <span className="block truncate text-[10px] text-fg-subtle">
            {person.position || ROLE_LABELS[person.role] || person.role}
          </span>
        )}
      </span>
    </button>
  );
}

// Employee profile picture (same one the Employees page shows), or
// initials when there's none or it fails to load.
const resolvePhotoUrl = (url) =>
  !url ? null : url.startsWith("http") ? url : `${import.meta.env.VITE_API_URL}/${url}`;

const AVATAR_SIZES = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-12 w-12 text-sm",
};

function Avatar({ person, size = "sm", strong = false }) {
  const [failed, setFailed] = useState(false);
  const src = resolvePhotoUrl(person.photo_url);
  const box = `flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold ${AVATAR_SIZES[size]}`;

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={person.name}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`${box} object-cover ${strong ? "ring-2 ring-primary" : ""}`}
      />
    );
  }
  return (
    <span
      className={`${box} ${
        strong ? "bg-primary text-primary-foreground" : "bg-surface-active text-fg-muted"
      }`}
    >
      {initials(person.name)}
    </span>
  );
}

const IconBtn = ({ label, onClick, danger = false, children }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onClick={onClick}
    className={`flex h-6 w-6 items-center justify-center rounded-md border border-border text-fg-muted ${
      danger ? "hover:border-danger hover:text-danger" : "hover:border-primary hover:text-primary"
    }`}
  >
    {children}
  </button>
);

// ---------------------------------------------------------------- editor
function UnitEditor({ unit, chart, onClose, onSaved }) {
  const [name, setName] = useState(unit?.name || "");
  const [parentId, setParentId] = useState(unit?.parent_id ?? -1);
  const [headId, setHeadId] = useState(unit?.head?.user_id || 0);
  const [positions, setPositions] = useState(unit?.rules.positions || []);
  const [roles, setRoles] = useState(unit?.rules.roles || []);
  const [departments, setDepartments] = useState(unit?.rules.departments || []);
  const [employeeIds, setEmployeeIds] = useState(unit?.rules.employee_ids || []);
  const [alsoIds, setAlsoIds] = useState(unit?.also_reports_to || []);
  const [approves, setApproves] = useState(unit?.approves || []);
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAssignableUsers()
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  // A unit can't sit under itself or its own sub-units.
  const blocked = useMemo(() => {
    const set = new Set([unit?.id]);
    let grew = true;
    while (grew) {
      grew = false;
      chart.units.forEach((u) => {
        if (u.parent_id && set.has(u.parent_id) && !set.has(u.id)) {
          set.add(u.id);
          grew = true;
        }
      });
    }
    return set;
  }, [chart, unit]);

  if (!unit) return null;

  const parentOptions = [
    { id: -1, name: "(Top level)" },
    ...chart.units.filter((u) => !blocked.has(u.id)),
  ];

  const toggleIn = (list, setList, value) =>
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const save = async () => {
    if (!name.trim()) {
      toast.error("Enter a name.");
      return;
    }
    try {
      setSaving(true);
      await updateOrgUnit(unit.id, {
        name: name.trim(),
        parent_id: parentId,
        head_user_id: headId || 0,
        positions,
        roles,
        departments,
        employee_ids: employeeIds,
        also_reports_to: alsoIds.filter((id) => id !== parentId),
        approves,
      });
      toast.success("Unit saved.");
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col rounded-t-2xl border border-border bg-surface text-fg sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-bold">Edit Unit</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-hover hover:text-fg"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputStyles}
                maxLength={100}
              />
            </Field>
            <Field label="Reports to">
              <SearchSelect
                value={parentOptions.find((u) => u.id === parentId)}
                options={parentOptions}
                onChange={(u) => setParentId(u ? u.id : -1)}
                getOptionLabel={(u) => u?.name || ""}
                getOptionValue={(u) => u?.id}
              />
            </Field>
          </div>

          <Field label="Also reports to (optional)">
            <p className="mb-1.5 text-[11px] text-fg-subtle">
              Shown once under &quot;Reports to&quot;, and linked from these
              units -- no duplicate boxes.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {chart.units
                .filter((u) => !blocked.has(u.id) && u.id !== parentId)
                .map((u) => {
                  const on = alsoIds.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() =>
                        setAlsoIds(
                          on ? alsoIds.filter((x) => x !== u.id) : [...alsoIds, u.id],
                        )
                      }
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                        on
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border text-fg-muted hover:border-primary/50"
                      }`}
                    >
                      {u.name}
                    </button>
                  );
                })}
            </div>
          </Field>

          <Field label="Head (optional)">
            <SearchSelect
              value={users.find((u) => u.id === headId) || null}
              options={[{ id: 0, employee_name: "(No head)" }, ...users]}
              onChange={(u) => setHeadId(u?.id || 0)}
              placeholder="No head"
              getOptionLabel={(u) => u?.employee_name || u?.username || ""}
              getOptionValue={(u) => u?.id}
            />
          </Field>

          <div className="space-y-4 rounded-xl border border-border p-4">
            <div>
              <p className="text-sm font-semibold">Who belongs here</p>
              <p className="text-xs text-fg-subtle">
                Anyone matching any of these is shown in this unit,
                automatically including new hires.
              </p>
            </div>
            <ChipPicker
              label="Positions"
              options={chart.options.positions}
              selected={positions}
              onToggle={(v) => toggleIn(positions, setPositions, v)}
            />
            <ChipPicker
              label="Account roles"
              options={chart.options.roles}
              selected={roles}
              onToggle={(v) => toggleIn(roles, setRoles, v)}
              format={(r) => ROLE_LABELS[r] || r}
            />
            <ChipPicker
              label="Departments"
              options={chart.options.departments}
              selected={departments}
              onToggle={(v) => toggleIn(departments, setDepartments, v)}
            />
            <Field label="Specific people">
              <SearchSelect
                value={null}
                options={chart.options.employees.filter(
                  (e) => !employeeIds.includes(e.id),
                )}
                onChange={(e) => e && setEmployeeIds([...employeeIds, e.id])}
                placeholder="Add a person"
                getOptionLabel={(e) => e?.label || ""}
                getOptionValue={(e) => e?.id}
              />
              {employeeIds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {employeeIds.map((id) => (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 rounded-full bg-surface-active px-2.5 py-1 text-xs"
                    >
                      {chart.options.employees.find((e) => e.id === id)?.label ||
                        `#${id}`}
                      <button
                        type="button"
                        onClick={() =>
                          setEmployeeIds(employeeIds.filter((x) => x !== id))
                        }
                        className="text-fg-subtle hover:text-danger"
                        aria-label="Remove"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </Field>
          </div>

          <div className="space-y-3 rounded-xl border border-border p-4">
            <div>
              <p className="text-sm font-semibold">Immediate head approves</p>
              <p className="text-xs text-fg-subtle">
                What this unit&apos;s head approves for everyone under them.
                Requests go up layer by layer and stop at every head with the
                type ticked -- the last one finishes it. The head&apos;s own
                requests go to the unit above.
              </p>
            </div>
            {!headId && (
              <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
                Pick a head above first -- with no head, this unit is skipped.
              </p>
            )}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {APPROVAL_TYPES.map((type) => {
                const on = approves.includes(type.key);
                return (
                  <label
                    key={type.key}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                      on
                        ? "border-primary bg-primary/10 text-fg"
                        : "border-border text-fg-muted hover:border-primary/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleIn(approves, setApproves, type.key)}
                      className="h-4 w-4 accent-primary"
                    />
                    {type.label}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-fg-muted hover:bg-surface-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Unit"}
          </button>
        </div>
      </div>
    </div>
  );
}

// What an org unit's head can approve (app/services/approval_chain.py).
const APPROVAL_TYPES = [
  { key: "cash_advance", label: "Cash Advance" },
  { key: "attendance", label: "Attendance" },
  { key: "overtime", label: "Overtime" },
];

const Field = ({ label, children }) => (
  <div>
    <label className="mb-1 block text-xs font-medium text-fg-subtle">{label}</label>
    {children}
  </div>
);

const ChipPicker = ({ label, options, selected, onToggle, format = (v) => v }) => (
  <div>
    <p className="mb-1.5 text-xs font-medium text-fg-subtle">{label}</p>
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const on = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
              on
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-fg-muted hover:border-primary/50"
            }`}
          >
            {format(option)}
          </button>
        );
      })}
    </div>
  </div>
);

// ---------------------------------------------------------------- access
// Superadmin: what one person can access, saved through Module
// Assignment. Starts from their current access (custom grants, or their
// role's defaults) so saving never silently removes pages they had.
function AccessPanel({ person, onClose, onSaved }) {
  const defaults = useMemo(() => roleDefaultKeys(person.role), [person.role]);
  const initialKeys = useMemo(
    () =>
      person.has_custom_access ? new Set(person.module_keys) : new Set(defaults),
    [person, defaults],
  );
  const [keys, setKeys] = useState(initialKeys);
  // Granted modules that are view-only ("Can edit: No").
  const initialReadOnly = useMemo(
    () => new Set(person.has_custom_access ? person.read_only_keys || [] : []),
    [person],
  );
  const [readOnly, setReadOnly] = useState(initialReadOnly);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setKeys(new Set(initialKeys));
  }, [initialKeys]);

  useEffect(() => {
    setReadOnly(new Set(initialReadOnly));
  }, [initialReadOnly]);

  const sameSet = (a, b) => a.size === b.size && [...a].every((k) => b.has(k));
  const canEdit = person.employee_id && person.role !== "superadmin";
  const effectiveReadOnly = new Set([...readOnly].filter((k) => keys.has(k)));
  const changed =
    !sameSet(keys, initialKeys) || !sameSet(effectiveReadOnly, initialReadOnly);

  const setCanEdit = (key, value) =>
    setReadOnly((prev) => {
      const next = new Set(prev);
      if (value) next.delete(key);
      else next.add(key);
      return next;
    });

  const toggle = (key) =>
    setKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const toggleGroup = (group, on) =>
    setKeys((prev) => {
      const next = new Set(prev);
      groupKeys(group).forEach((k) => (on ? next.add(k) : next.delete(k)));
      return next;
    });

  const save = async () => {
    try {
      setSaving(true);
      await setEmployeeModuleAccess(
        person.employee_id,
        [...keys],
        [...effectiveReadOnly],
      );
      toast.success(`Access saved for ${person.name}.`);
      await onSaved();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (
      !(await confirmDialog(
        `Reset ${person.name}'s access to the ${
          ROLE_LABELS[person.role] || person.role || "role"
        } defaults?`,
      ))
    ) {
      return;
    }
    try {
      setSaving(true);
      await resetEmployeeModuleAccess(person.employee_id);
      toast.success("Access reset to role defaults.");
      await onSaved();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex h-full w-full max-w-md flex-col border-l border-border bg-surface text-fg shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <Avatar person={person} size="lg" strong />
            <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
              What they can access
            </p>
            <h2 className="text-lg font-bold">{person.name}</h2>
            <p className="text-xs text-fg-muted">
              {[person.position, ROLE_LABELS[person.role] || person.role]
                .filter(Boolean)
                .join(" · ")}
            </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-hover hover:text-fg"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <p className="text-xs text-fg-subtle">
            {person.role === "superadmin"
              ? "Superadmins always have full access."
              : !person.employee_id
                ? "This account isn't linked to an employee, so its access can't be customized."
                : !person.user_id
                  ? "This employee has no login account yet -- create one in Users first."
                  : person.has_custom_access
                    ? "Custom access (same as Module Assignment)."
                    : `Using the ${
                        ROLE_LABELS[person.role] || person.role
                      } role's defaults. Changing anything saves custom access.`}
          </p>

          {canEdit &&
            person.user_id &&
            MODULE_GROUPS.map((group) => {
              const all = groupKeys(group);
              const onCount = all.filter((k) => keys.has(k)).length;
              return (
                <div key={group.key} className="rounded-xl border border-border p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{group.label}</p>
                    <button
                      type="button"
                      onClick={() => toggleGroup(group, onCount < all.length)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {onCount < all.length ? "All" : "None"}
                    </button>
                  </div>
                  {group.submodules.map((sub) => (
                    <div key={sub.key}>
                      <ToggleRow
                        label={sub.label}
                        checked={keys.has(moduleKey(group.key, sub.key))}
                        isDefault={defaults.has(moduleKey(group.key, sub.key))}
                        onChange={() => toggle(moduleKey(group.key, sub.key))}
                        canEdit={!readOnly.has(moduleKey(group.key, sub.key))}
                        onCanEdit={(v) => setCanEdit(moduleKey(group.key, sub.key), v)}
                      />
                      {(sub.children || []).map((child) => (
                        <div key={child.key} className="pl-5">
                          <ToggleRow
                            label={child.label}
                            checked={keys.has(moduleKey(group.key, child.key))}
                            isDefault={defaults.has(moduleKey(group.key, child.key))}
                            onChange={() => toggle(moduleKey(group.key, child.key))}
                            canEdit={!readOnly.has(moduleKey(group.key, child.key))}
                            onCanEdit={(v) =>
                              setCanEdit(moduleKey(group.key, child.key), v)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              );
            })}
        </div>

        {canEdit && person.user_id && (
          <div className="flex gap-2 border-t border-border px-5 py-3">
            <button
              type="button"
              onClick={reset}
              disabled={saving || !person.has_custom_access}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-fg-muted hover:bg-surface-hover disabled:opacity-50"
            >
              Reset to role defaults
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || !changed}
              className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Access"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// One module: access on/off, and -- when on -- "Can edit" Yes/No.
// No = view-only: it opens, but saving/changing anything is refused.
const ToggleRow = ({ label, checked, isDefault, onChange, canEdit, onCanEdit }) => (
  <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-hover">
    <label className="flex flex-1 cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-border accent-primary"
      />
      <span>
        {label}
        {isDefault && (
          <span className="ml-1 text-[10px] text-fg-subtle">(role default)</span>
        )}
      </span>
    </label>
    {checked && onCanEdit && (
      <span className="flex shrink-0 items-center gap-1 text-[11px] text-fg-subtle">
        Can edit
        <span className="flex overflow-hidden rounded-md border border-border">
          <button
            type="button"
            onClick={() => onCanEdit(true)}
            className={`px-2 py-0.5 font-semibold ${
              canEdit ? "bg-success/20 text-success" : "text-fg-muted"
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => onCanEdit(false)}
            className={`px-2 py-0.5 font-semibold ${
              !canEdit ? "bg-warning/20 text-warning" : "text-fg-muted"
            }`}
          >
            No
          </button>
        </span>
      </span>
    )}
  </div>
);
