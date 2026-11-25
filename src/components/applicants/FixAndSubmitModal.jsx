import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import SearchSelect from "../SearchSelect";
import {
  getApplicantFormProblems,
  submitFormForApplicant,
} from "../../api/adminApplicants";
import { schoolYearOptions } from "../../utils/onboarding/constants";

// HR submits the onboarding form for the applicant. Only the answers that
// would block it (missing required ones, or values the employee record
// can't hold) are editable. Everything else stays as the applicant entered
// it -- View Form shows the full answers.
export default function FixAndSubmitModal({
  isOpen,
  applicant,
  onClose,
  onSubmitted,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !applicant) return undefined;
    let cancelled = false;
    setLoading(true);
    setErrors({});
    setData(null);
    getApplicantFormProblems(applicant.id)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        const start = {};
        (res.problems || []).forEach((p) => {
          start[p.key] = p.suggested || "";
        });
        setValues(start);
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load the form.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, applicant]);

  if (!isOpen || !applicant) return null;

  const problems = data?.problems || [];
  const sections = [...new Set(problems.map((p) => p.section))];
  const nothingToDo = Boolean(data?.is_submitted) && problems.length === 0;

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setErrors({});
      await submitFormForApplicant(applicant.id, values);
      toast.success("Form submitted for the applicant.");
      onSubmitted?.();
      onClose();
    } catch (error) {
      const detail = error?.response?.data?.detail;
      if (detail?.errors) {
        setErrors(detail.errors);
        toast.error(detail.message || "Fix the highlighted answers.");
      } else {
        toast.error(
          typeof detail === "string" ? detail : "Couldn't submit the form.",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (key) =>
    `w-full rounded-xl border px-3 py-2 text-sm outline-none ${
      errors[key]
        ? "border-red-500 bg-red-50 text-red-900"
        : "border-border bg-surface text-fg focus:border-primary"
    }`;

  // Year to can't be before the (new or saved) Year from.
  const yearOptionsFor = (problem) => {
    if (!problem.key.endsWith(":year_to")) return schoolYearOptions;
    const from = values[problem.key.replace(":year_to", ":year_from")];
    return /^\d{4}$/.test(from || "")
      ? schoolYearOptions.filter((y) => Number(y) >= Number(from))
      : schoolYearOptions;
  };

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-3xl bg-surface shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border p-6">
          <div>
            <h3 className="text-xl font-bold text-fg">Fix &amp; Submit</h3>
            <p className="mt-1 text-sm text-fg-subtle">
              Submit {applicant.first_name} {applicant.last_name}&apos;s
              onboarding form for them. Only the answers below can be changed.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg px-3 py-1 text-fg-muted hover:bg-surface-hover disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {loading && <p className="text-sm text-fg-muted">Loading…</p>}

          {!loading && data && problems.length === 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              {data.is_submitted
                ? "Nothing to fix. The form is submitted and ready to convert."
                : "All required answers are filled. Submit the form for the applicant?"}
            </div>
          )}

          {!loading &&
            sections.map((section) => (
              <div key={section} className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                  {section}
                </p>
                {problems
                  .filter((p) => p.section === section)
                  .map((p) => (
                    <div key={p.key} className="space-y-1.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <label className="text-sm font-medium text-fg">
                          {p.label}
                        </label>
                        <span className="text-xs text-amber-600">
                          {p.message}
                        </span>
                      </div>
                      {p.current && (
                        <p className="text-xs text-fg-muted">
                          Applicant entered:{" "}
                          <span className="line-through">{p.current}</span>
                        </p>
                      )}
                      {p.kind === "year" ? (
                        <SearchSelect
                          value={
                            values[p.key]
                              ? { value: values[p.key], label: values[p.key] }
                              : null
                          }
                          options={yearOptionsFor(p).map((y) => ({
                            value: y,
                            label: y,
                          }))}
                          onChange={(o) =>
                            setValues((v) => ({ ...v, [p.key]: o?.value || "" }))
                          }
                          placeholder="Select year"
                        />
                      ) : (
                        <input
                          type={
                            p.kind === "date"
                              ? "date"
                              : p.kind === "email"
                                ? "email"
                                : "text"
                          }
                          value={values[p.key] || ""}
                          max={
                            p.kind === "date"
                              ? new Date().toISOString().slice(0, 10)
                              : undefined
                          }
                          onChange={(e) =>
                            setValues((v) => ({ ...v, [p.key]: e.target.value }))
                          }
                          className={inputClass(p.key)}
                        />
                      )}
                      {errors[p.key] && (
                        <p className="text-xs text-red-600">{errors[p.key]}</p>
                      )}
                    </div>
                  ))}
              </div>
            ))}

          {!loading && data && (
            <p className="text-xs text-fg-muted">
              Everything else stays as the applicant entered it. Your changes
              are saved as a remark on this applicant.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-border p-6">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-2xl border border-border px-5 py-3 text-sm font-medium text-fg-muted hover:bg-surface-hover disabled:opacity-50"
          >
            {nothingToDo ? "Close" : "Cancel"}
          </button>
          {!nothingToDo && (
            <button
              onClick={handleSubmit}
              disabled={saving || loading || !data}
              className="rounded-2xl bg-purple-600 px-5 py-3 text-sm font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Submitting…" : "Submit for Applicant"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
