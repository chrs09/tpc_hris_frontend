import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { roleLabel } from "../../constants/roleAccess";
import { MODULE_GROUPS, moduleKey } from "../../constants/modules";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import SearchSelect from "../../components/SearchSelect";
import useModuleAccess from "../../hooks/useModuleAccess";
import { confirmDialog } from "../../components/ui/dialog/dialogService";
import {
  getRoleDefaults,
  resetRoleDefaults,
  setRoleDefaults,
} from "../../api/employeeModuleAccess";
import { builtInRoleKeys } from "../../utils/roleDefaults";
import RolePeopleModal from "../../components/roleAccess/RolePeopleModal";

// Administrator -> Role Access: the modules each role gets by default.
// Everyone with the role who has no custom access (Org Chart -> What they
// can access) follows these -- including people added later. A role not
// saved here keeps the built-in defaults. Backend:
// app/api/employee_module_access.py (role-defaults) and
// app/services/role_defaults.py.

const groupKeys = (group, perPerson) =>
  group.submodules
    .flatMap((sub) => [
      moduleKey(group.key, sub.key),
      ...(sub.children || []).map((child) => moduleKey(group.key, child.key)),
    ])
    .filter((k) => !perPerson.has(k));

const sameSet = (a, b) => a.size === b.size && [...a].every((k) => b.has(k));

const errorOf = (error, fallback) =>
  typeof error?.response?.data?.detail === "string" ? error.response.data.detail : fallback;

const formatSaved = (iso) =>
  iso
    ? new Date(`${iso}${iso.endsWith("Z") ? "" : "Z"}`).toLocaleString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

export default function RoleAccessPage() {
  const { isSuperAdmin } = useModuleAccess();

  const [data, setData] = useState(null); // getRoleDefaults() result
  const [loadError, setLoadError] = useState("");
  const [selectedRole, setSelectedRole] = useState("coordinator");
  const [keys, setKeys] = useState(new Set());
  const [readOnly, setReadOnly] = useState(new Set());
  const [saving, setSaving] = useState(false);
  // Counts clicked: "following" / "custom" list, or null.
  const [peopleTab, setPeopleTab] = useState(null);

  const load = async () => {
    try {
      setData(await getRoleDefaults());
      setLoadError("");
    } catch (error) {
      setLoadError(errorOf(error, "Couldn't load the role defaults."));
    }
  };

  useEffect(() => {
    if (isSuperAdmin) load();
  }, [isSuperAdmin]);

  const roles = data?.editable_roles || [];
  const perPerson = useMemo(() => new Set(data?.per_person_keys || []), [data]);
  const saved = data?.roles?.[selectedRole] || null;
  const counts = data?.counts?.[selectedRole] || { following: 0, custom: 0 };
  const builtIn = useMemo(() => builtInRoleKeys(selectedRole), [selectedRole]);

  // What the role has now: its saved defaults, else the built-in ones.
  const initialKeys = useMemo(
    () =>
      new Set(
        [...(saved ? saved.module_keys : builtIn)].filter((k) => !perPerson.has(k)),
      ),
    [saved, builtIn, perPerson],
  );
  const initialReadOnly = useMemo(() => new Set(saved?.read_only_keys || []), [saved]);

  useEffect(() => {
    setKeys(new Set(initialKeys));
    setReadOnly(new Set(initialReadOnly));
  }, [initialKeys, initialReadOnly]);

  const effectiveReadOnly = new Set([...readOnly].filter((k) => keys.has(k)));
  const changed = !sameSet(keys, initialKeys) || !sameSet(effectiveReadOnly, initialReadOnly);

  const toggle = (key, parentKey) =>
    setKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else {
        next.add(key);
        if (parentKey && !perPerson.has(parentKey)) next.add(parentKey);
      }
      return next;
    });

  const toggleGroup = (group, on) =>
    setKeys((prev) => {
      const next = new Set(prev);
      groupKeys(group, perPerson).forEach((k) => (on ? next.add(k) : next.delete(k)));
      return next;
    });

  const setCanEdit = (key, value) =>
    setReadOnly((prev) => {
      const next = new Set(prev);
      if (value) next.delete(key);
      else next.add(key);
      return next;
    });

  const save = async () => {
    const who =
      counts.following === 1 ? "1 person follows" : `${counts.following} people follow`;
    if (
      !(await confirmDialog(
        `Save the ${roleLabel(selectedRole)} defaults? ${who} them now, and anyone given this role later starts with them. People with their own access aren't changed.`,
      ))
    ) {
      return;
    }
    try {
      setSaving(true);
      await setRoleDefaults(selectedRole, [...keys], [...effectiveReadOnly]);
      toast.success(`${roleLabel(selectedRole)} defaults saved.`);
      await load();
    } catch (error) {
      toast.error(errorOf(error, "Couldn't save the defaults."));
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (
      !(await confirmDialog(
        `Put the ${roleLabel(selectedRole)} role back to the built-in defaults?`,
      ))
    ) {
      return;
    }
    try {
      setSaving(true);
      await resetRoleDefaults(selectedRole);
      toast.success(`${roleLabel(selectedRole)} is back to the built-in defaults.`);
      await load();
    } catch (error) {
      toast.error(errorOf(error, "Couldn't reset the defaults."));
    } finally {
      setSaving(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="space-y-5">
        <SectionTabs group="Administrator" />
        <div className="rounded-3xl border border-border bg-surface p-6 text-sm text-fg-muted">
          Only a superadmin can set role defaults.
        </div>
      </div>
    );
  }

  const roleOptions = roles.map((role) => ({ value: role, label: roleLabel(role) }));

  return (
    <div className="space-y-5">
      <SectionTabs group="Administrator" />

      <div className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-fg-subtle">
            Administration
          </p>
          <h2 className="mt-1 text-2xl font-bold text-fg">Role Access</h2>
          <p className="mt-2 max-w-2xl text-sm text-fg-subtle">
            Set which modules each role gets by default. Everyone with the role who
            doesn&apos;t have their own access follows these, including people added
            later. To give one person something different, use Org Chart &rarr; What
            they can access.
          </p>
        </div>
        <div className="w-full sm:w-56">
          <SearchSelect
            value={roleOptions.find((o) => o.value === selectedRole) || null}
            options={roleOptions}
            onChange={(option) => option && setSelectedRole(option.value)}
            placeholder="Select role"
          />
        </div>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          {loadError}
        </div>
      ) : !data ? (
        <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-fg-muted">
          Loading role defaults...
        </div>
      ) : (
        <>
          {/* Where this role's access comes from and who it affects */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-fg">{roleLabel(selectedRole)}</span>
              {saved ? (
                <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  Custom defaults · saved {formatSaved(saved.updated_at)}
                </span>
              ) : (
                <span className="rounded-full bg-surface-active px-2.5 py-0.5 text-xs font-semibold text-fg-muted">
                  Built-in defaults
                </span>
              )}
            </div>
            <p className="text-xs text-fg-subtle">
              <button
                type="button"
                onClick={() => setPeopleTab("following")}
                className="rounded hover:text-primary hover:underline"
                title="See who"
              >
                <span className="font-semibold text-fg">{counts.following}</span>{" "}
                {counts.following === 1 ? "person follows" : "people follow"} these
              </button>{" "}
              ·{" "}
              <button
                type="button"
                onClick={() => setPeopleTab("custom")}
                className="rounded hover:text-primary hover:underline"
                title="See who and what differs"
              >
                <span className="font-semibold text-fg">{counts.custom}</span>{" "}
                {counts.custom === 1 ? "has" : "have"} their own access
              </button>
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {MODULE_GROUPS.map((group) => {
              const all = groupKeys(group, perPerson);
              const onCount = all.filter((k) => keys.has(k)).length;
              return (
                <section
                  key={group.key}
                  className="overflow-hidden rounded-2xl border border-border bg-surface"
                >
                  <div className="flex items-center justify-between border-b border-border bg-surface-hover px-4 py-2.5">
                    <span className="text-sm font-semibold text-fg">{group.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs tabular-nums text-fg-subtle">
                        {onCount}/{all.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleGroup(group, onCount < all.length)}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        {onCount < all.length ? "All" : "None"}
                      </button>
                    </div>
                  </div>
                  <div className="p-2">
                    {group.submodules.map((sub) => {
                      const subKey = moduleKey(group.key, sub.key);
                      return (
                        <div key={sub.key}>
                          <RoleRow
                            id={`role-${subKey}`}
                            label={sub.label}
                            checked={keys.has(subKey)}
                            builtIn={builtIn.has(subKey)}
                            perPerson={perPerson.has(subKey)}
                            onChange={() => toggle(subKey)}
                            canEdit={!readOnly.has(subKey)}
                            onCanEdit={(v) => setCanEdit(subKey, v)}
                          />
                          {(sub.children || []).map((child) => {
                            const childKey = moduleKey(group.key, child.key);
                            return (
                              <div key={child.key} className="pl-6">
                                <RoleRow
                                  id={`role-${childKey}`}
                                  label={child.label}
                                  checked={keys.has(childKey)}
                                  builtIn={builtIn.has(childKey)}
                                  perPerson={perPerson.has(childKey)}
                                  onChange={() => toggle(childKey, subKey)}
                                  canEdit={!readOnly.has(childKey)}
                                  onCanEdit={(v) => setCanEdit(childKey, v)}
                                />
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          <p className="text-xs text-fg-subtle">
            Approving payroll steps and trip charges is always set per person on the Org
            Chart. Role defaults decide which pages open; actions that are otherwise
            superadmin-only (like editing attendance) still need a person&apos;s own
            access.
          </p>

          <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-border bg-surface/95 p-3 shadow-sm backdrop-blur">
            {changed && (
              <span className="mr-auto text-xs font-medium text-warning">Unsaved changes</span>
            )}
            {changed && (
              <button
                type="button"
                onClick={() => {
                  setKeys(new Set(initialKeys));
                  setReadOnly(new Set(initialReadOnly));
                }}
                disabled={saving}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-fg-muted hover:bg-surface-hover disabled:opacity-50"
              >
                Undo changes
              </button>
            )}
            <button
              type="button"
              onClick={reset}
              disabled={saving || !saved}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-fg-muted hover:bg-surface-hover disabled:opacity-50"
            >
              Reset to built-in
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || (!changed && Boolean(saved))}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save defaults"}
            </button>
          </div>
        </>
      )}
      {peopleTab && (
        <RolePeopleModal
          key={selectedRole}
          role={selectedRole}
          roleName={roleLabel(selectedRole)}
          tab={peopleTab}
          defaultKeys={initialKeys}
          perPersonKeys={perPerson}
          onClose={() => setPeopleTab(null)}
        />
      )}
    </div>
  );
}

function RoleRow({ id, label, checked, builtIn, perPerson, onChange, canEdit, onCanEdit }) {
  if (perPerson) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-fg-subtle">
        <span>{label}</span>
        <span className="shrink-0 text-[11px]">Set per person</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-hover">
      <label htmlFor={id} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="h-4 w-4 rounded border-border accent-primary"
        />
        <span className={checked ? "text-fg" : "text-fg-muted"}>
          {label}
          {builtIn && <span className="ml-1 text-[10px] text-fg-subtle">(built-in)</span>}
        </span>
      </label>
      {checked && (
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
}
