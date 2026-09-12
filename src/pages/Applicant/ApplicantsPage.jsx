import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  addApplicantRemark,
  convertApplicantToEmployee,
  generateEmploymentForm,
  getApplicantDetail,
  getApplicantOnboarding,
  getApplicants,
  updateApplicantStatus,
} from "../../api/adminApplicants";
import { employeeRoleConvert } from "../../constants/employeeRole";
import DefaultThumbnail from "../../assets/logo/default/default-profile.jpg";
import { alertDialog } from "../../components/ui/dialog/dialogService";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";

const COLUMNS = [
  { key: "pending", label: "Pending" },
  { key: "reviewed", label: "Reviewed" },
  { key: "interview", label: "Interview" },
  { key: "for_pooling", label: "For Pooling" },
  { key: "hired", label: "Hired" },
  { key: "rejected", label: "Rejected" },
  { key: "withdrawn", label: "Withdrawn" },
  { key: "no_show", label: "No Show" },
];

const PIPELINE_COLUMNS = [
  { key: "pending", label: "Pending" },
  { key: "reviewed", label: "Reviewed" },
  { key: "interview", label: "Interview" },
  { key: "for_pooling", label: "For Pooling" },
];

const OUTCOME_COLUMNS = [
  { key: "hired", label: "Hired" },
  { key: "rejected", label: "Rejected" },
  { key: "withdrawn", label: "Withdrawn" },
  { key: "no_show", label: "No Show" },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "reviewed", label: "Reviewed" },
  { value: "interview", label: "Interview" },
  { value: "for_pooling", label: "For Pooling" },
  { value: "hired", label: "Hired" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "no_show", label: "No Show" },
];

const COLUMN_INITIAL_LIMIT = 8;

const columnStyles = {
  pending: "border-yellow-200 bg-yellow-50/70",
  reviewed: "border-blue-200 bg-blue-50/70",
  interview: "border-purple-200 bg-purple-50/70",
  for_pooling: "border-orange-200 bg-orange-50/70",
  hired: "border-green-200 bg-green-50/70",
  rejected: "border-red-200 bg-red-50/70",
  withdrawn: "border-border bg-surface-active/80",
  no_show: "border-pink-200 bg-pink-50/70",
};

const badgeStyles = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  reviewed: "bg-blue-100 text-blue-800 border-blue-200",
  interview: "bg-purple-100 text-purple-800 border-purple-200",
  for_pooling: "bg-orange-100 text-orange-800 border-orange-200",
  hired: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  withdrawn: "bg-surface-active text-fg-muted border-border",
  no_show: "bg-pink-100 text-pink-800 border-pink-200",
};

function formatDate(date) {
  if (!date) return "-";

  return new Date(date).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getFileUrl(filePath) {
  if (!filePath) return "";
  return filePath.startsWith("http")
    ? filePath
    : `${import.meta.env.VITE_API_URL}/${filePath}`;
}

function prettifyStatus(status) {
  return status?.replaceAll("_", " ") || "-";
}

function prettifyFormStatus(status) {
  const map = {
    not_generated: "Not generated",
    generated: "Generated",
    in_progress: "In progress",
    submitted: "Submitted",
  };
  return map[status] || "Not generated";
}

function getApplicantFormStatus(applicant) {
  if (applicant?.onboarding_is_submitted === true) return "submitted";
  if (applicant?.onboarding_link_sent_at) return "generated";
  if (applicant?.onboarding_token) return "generated";
  return "not_generated";
}

function isApplicantLocked(applicant) {
  if (!applicant) return false;

  return (
    applicant.status === "rejected" ||
    (applicant.status === "hired" && applicant.is_converted_to_employee)
  );
}

function FormStatusBadge({ applicant }) {
  const status = getApplicantFormStatus(applicant);

  const styles = {
    not_generated: "bg-surface-active text-fg-muted border-border",
    generated: "bg-indigo-100 text-indigo-700 border-indigo-200",
    in_progress: "bg-amber-100 text-amber-700 border-amber-200",
    submitted: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold ${
        styles[status]
      }`}
    >
      {prettifyFormStatus(status)}
    </span>
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
        badgeStyles[status] || "bg-surface-active text-fg-muted border-border"
      }`}
    >
      {prettifyStatus(status)}
    </span>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
      <p className="text-sm font-medium text-fg-subtle">{label}</p>
      <p className="mt-2 text-3xl font-bold text-fg">{value}</p>
    </div>
  );
}

function CVPreviewModal({ isOpen, fileUrl, zoom, setZoom, onClose }) {
  if (!isOpen || !fileUrl) return null;

  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileUrl);

  const zoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const zoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.25));
  const resetZoom = () => setZoom(1);

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 p-4">
      <div className="relative h-[90vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold text-fg">CV Preview</h2>

          <div className="flex items-center gap-2">
            {isImage && (
              <>
                <button
                  onClick={zoomOut}
                  className="rounded-lg border border-border px-3 py-1 text-sm hover:bg-surface-hover"
                >
                  -
                </button>

                <span className="w-16 text-center text-sm font-medium text-fg-muted">
                  {Math.round(zoom * 100)}%
                </span>

                <button
                  onClick={zoomIn}
                  className="rounded-lg border border-border px-3 py-1 text-sm hover:bg-surface-hover"
                >
                  +
                </button>

                <button
                  onClick={resetZoom}
                  className="rounded-lg border border-border px-3 py-1 text-sm hover:bg-surface-hover"
                >
                  Reset
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="rounded-lg px-3 py-1 text-fg-muted hover:bg-surface-hover"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="h-[calc(90vh-60px)] overflow-auto bg-surface-hover">
          {isImage ? (
            <div className="flex min-h-full justify-center p-6">
              <img
                src={fileUrl}
                alt="CV Preview"
                style={{
                  width: `${zoom * 100}%`,
                  maxWidth: "none",
                }}
                className="h-auto rounded-xl object-contain transition-all"
              />
            </div>
          ) : (
            <iframe
              src={fileUrl}
              title="CV Preview"
              className="h-full w-full"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
        {label}
      </p>
      <p className="mt-2 wrap-break-word text-sm text-fg capitalize">
        {value || "-"}
      </p>
    </div>
  );
}

function GenerateEmploymentFormModal({
  isOpen,
  applicant,
  generating,
  generatedLink,
  emailSent,
  onClose,
  onGenerate,
  onCopy,
}) {
  if (!isOpen || !applicant) return null;

  const formStatus = getApplicantFormStatus(applicant);
  const isSubmitted = applicant?.onboarding_is_submitted === true;

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-3xl bg-surface p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-fg">
              Employment Form Access
            </h3>
            <p className="mt-1 text-sm text-fg-subtle">
              Generate a secure form link for the applicant to fill up the
              employment details.
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={generating}
            className="rounded-lg px-3 py-1 text-fg-muted hover:bg-surface-hover disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-border bg-surface-hover p-4">
            <p className="text-sm text-fg-muted">
              <span className="font-semibold">Applicant:</span>{" "}
              {applicant.first_name} {applicant.last_name}
            </p>
            <p className="mt-1 text-sm text-fg-muted">
              <span className="font-semibold">Status:</span>{" "}
              {prettifyStatus(applicant.status)}
            </p>
            <p className="mt-1 text-sm text-fg-muted">
              <span className="font-semibold">Form Status:</span>{" "}
              {prettifyFormStatus(formStatus)}
            </p>
          </div>

          {isSubmitted && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              This applicant already submitted the onboarding form. You can
              still generate a new link if they need to complete or correct
              any missing fields.
            </div>
          )}

          <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50 p-4">
            <p className="text-sm font-medium text-indigo-900">
              What this will do
            </p>
            <ul className="mt-2 space-y-1 text-sm text-indigo-800">
              <li>• Generate a secure applicant form link</li>
              <li>• Applicant will fill the employment-style form</li>
              <li>• HR can later convert the applicant once hired</li>
            </ul>
          </div>

          {generatedLink && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-fg-muted">
                Generated Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedLink}
                  className="w-full rounded-2xl border border-border bg-surface-hover px-4 py-3 text-sm text-fg outline-none"
                />
                <button
                  onClick={onCopy}
                  className="shrink-0 rounded-2xl border border-border px-4 py-3 text-sm font-medium text-fg-muted hover:bg-surface-hover"
                >
                  Copy
                </button>
              </div>

              {/* email_sent tells HR whether the backend actually emailed
                  this link to the applicant, so they know whether they
                  still need to share it manually (e.g. SMTP not
                  configured yet, or applicant has no email on file). */}
              {emailSent === true && (
                <p className="mt-2 text-sm text-emerald-700">
                  ✓ Emailed to {applicant.email || "the applicant"}.
                </p>
              )}
              {emailSent === false && (
                <p className="mt-2 text-sm text-amber-700">
                  ⚠ Could not email this link automatically — please share
                  it with the applicant manually.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={generating}
            className="rounded-2xl border border-border px-5 py-3 text-sm font-medium text-fg-muted hover:bg-surface-hover disabled:opacity-50"
          >
            Close
          </button>

          <button
            onClick={onGenerate}
            disabled={generating}
            className="rounded-2xl bg-purple-600 px-5 py-3 text-sm font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating
              ? "Generating..."
              : generatedLink
                ? "Regenerate Link"
                : isSubmitted
                  ? "Get New Link"
                  : "Generate Form Link"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConvertApplicantModal({
  isOpen,
  applicant,
  department,
  setDepartment,
  position,
  setPosition,
  converting,
  onClose,
  onConfirm,
}) {
  if (!isOpen || !applicant) return null;

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-surface p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-fg">
              Convert to Employee
            </h3>
            <p className="mt-1 text-sm text-fg-subtle">
              This will create a new employee record from the hired applicant.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={converting}
            className="rounded-lg px-3 py-1 text-fg-muted hover:bg-surface-hover disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-border bg-surface-hover p-4">
            <p className="text-sm text-fg-muted">
              <span className="font-semibold">Applicant:</span>{" "}
              {applicant.first_name} {applicant.last_name}
            </p>
            <p className="mt-1 text-sm text-fg-muted">
              <span className="font-semibold">Applied Position:</span>{" "}
              {applicant.position_applied || "-"}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-fg-muted">
              Department
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full rounded-2xl border border-border bg-surface text-fg px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select department</option>
              {Object.entries(employeeRoleConvert).map(([key, label]) => (
                <option key={key} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-fg-muted">
              Position Override{" "}
              <span className="text-fg-subtle">(optional)</span>
            </label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Leave blank to use applied position"
              className="w-full rounded-2xl border border-border bg-surface text-fg px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={converting}
            className="rounded-2xl border border-border px-5 py-3 text-sm font-medium text-fg-muted hover:bg-surface-hover disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={converting || !department.trim()}
            className="rounded-2xl bg-green-600 px-5 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {converting ? "Converting..." : "Convert"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ApplicantDrawer({
  isOpen,
  applicant,
  loading,
  remarkText,
  setRemarkText,
  remarkImage,
  setRemarkImage,
  remarkImagePreview,
  setRemarkImagePreview,
  remarkError,
  setRemarkError,
  savingRemark,
  changingStatus,
  selectedStatus,
  setSelectedStatus,
  onSaveRemark,
  onSaveStatus,
  onClose,
  onPreviewCV,
  onOpenConvert,
  onOpenGenerateForm,
  onViewSubmittedForm,
  onOpenRemarkPreview,
}) {
  if (!isOpen) return null;

  const isLocked = isApplicantLocked(applicant);

  return (
    <div className="fixed inset-0 z-60 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative ml-auto h-full w-full max-w-2xl overflow-y-auto bg-surface shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-fg">
              Applicant Details
            </h2>
            <p className="text-sm text-fg-subtle">
              Review applicant information, remarks, and status
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-fg-muted hover:bg-surface-hover"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="rounded-2xl border border-border bg-surface-hover p-6 text-center text-fg-subtle">
              Loading applicant details...
            </div>
          ) : !applicant ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-600">
              Failed to load applicant details.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-3xl border border-border bg-linear-to-br from-surface to-surface-hover p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-bold text-fg capitalize">
                      {applicant.first_name} {applicant.middle_name}{" "}
                      {applicant.last_name} {applicant.suffix || ""}
                    </h3>
                    <p className="mt-1 text-sm text-fg-subtle">
                      Applied for{" "}
                      <span className="font-medium text-fg">
                        {applicant.position_applied || "-"}
                      </span>
                    </p>
                  </div>

                  <StatusBadge status={applicant.status} />
                </div>

                {applicant.status === "reviewed" && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <FormStatusBadge applicant={applicant} />
                  </div>
                )}

                {isLocked && (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    This applicant is locked and can no longer be moved to other
                    statuses.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoCard label="Email" value={applicant.email} />
                <InfoCard
                  label="Contact Number"
                  value={applicant.contact_number}
                />
                <InfoCard
                  label="Status"
                  value={prettifyStatus(applicant.status)}
                />
                <InfoCard
                  label="Submitted"
                  value={formatDate(applicant.created_at)}
                />
                <InfoCard
                  label="Hired At"
                  value={formatDate(applicant.hired_at)}
                />
                <InfoCard
                  label="Converted At"
                  value={formatDate(applicant.converted_at)}
                />
              </div>

              <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
                <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-fg-subtle">
                  Actions
                </h4>

                <div className="flex flex-wrap gap-3">
                  {applicant.cv_url ? (
                    <button
                      onClick={() => onPreviewCV(applicant.cv_url)}
                      className="rounded-xl bg-fg px-4 py-2 text-sm font-medium text-background hover:opacity-90"
                    >
                      Preview CV
                    </button>
                  ) : (
                    <span className="rounded-xl bg-surface-active px-4 py-2 text-sm font-medium text-fg-subtle">
                      No CV Available
                    </span>
                  )}

                  {applicant.status === "reviewed" && (
                    <>
                      {applicant?.onboarding_is_submitted === true && (
                        <button
                          onClick={() => onViewSubmittedForm(applicant)}
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                        >
                          View Form
                        </button>
                      )}

                      <button
                        onClick={() => onOpenGenerateForm(applicant)}
                        className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                      >
                        {applicant?.onboarding_is_submitted === true
                          ? "Get Form Link"
                          : "Generate Employment Form"}
                      </button>
                    </>
                  )}

                  {applicant.status === "hired" &&
                    !applicant.is_converted_to_employee && (
                      <button
                        onClick={() => onOpenConvert(applicant)}
                        className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                      >
                        Convert to Employee
                      </button>
                    )}

                  {applicant.is_converted_to_employee && (
                    <span className="rounded-xl bg-green-100 px-4 py-2 text-sm font-medium text-green-700">
                      Converted to Employee #{applicant.employee_id}
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
                <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-fg-subtle">
                  Update Status
                </h4>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full rounded-2xl border border-border bg-surface text-fg px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-active"
                    disabled={isLocked}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={onSaveStatus}
                    disabled={
                      changingStatus ||
                      selectedStatus === applicant.status ||
                      isLocked
                    }
                    className="rounded-2xl bg-fg px-5 py-3 text-sm font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {changingStatus ? "Updating..." : "Update Status"}
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
                <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-fg-subtle">
                  HR Remarks
                </h4>

                <div className="space-y-4">
                  <textarea
                    value={remarkText}
                    onChange={(e) => {
                      setRemarkText(e.target.value);
                      if (remarkError) setRemarkError("");
                    }}
                    placeholder="Write HR remarks here..."
                    className={`min-h-30 w-full rounded-2xl border bg-surface px-4 py-3 text-fg outline-none focus:ring-2 ${
                      remarkError
                        ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                        : "border-border focus:border-primary focus:ring-primary/20"
                    }`}
                  />
                  {remarkError && (
                    <p className="text-sm text-red-600">{remarkError}</p>
                  )}

                  <div className="rounded-2xl border border-dashed border-border bg-surface-hover p-4">
                    <label className="mb-2 block text-sm font-medium text-fg-muted">
                      Upload Image{" "}
                      <span className="text-fg-subtle">(optional)</span>
                    </label>

                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setRemarkImage(file);

                        if (file) {
                          setRemarkImagePreview(URL.createObjectURL(file));
                          if (remarkError) setRemarkError("");
                        } else {
                          setRemarkImagePreview("");
                        }
                      }}
                      className="block w-full rounded-2xl border border-border bg-surface text-fg px-4 py-3 text-sm outline-none"
                    />

                    <p className="mt-2 text-xs text-fg-subtle">
                      You can save a text remark, an image, or both.
                    </p>

                    {remarkImage && (
                      <div className="mt-4 rounded-2xl border border-border bg-surface p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-fg">
                              {remarkImage.name}
                            </p>
                            <p className="text-xs text-fg-subtle">
                              {(remarkImage.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setRemarkImage(null);
                              setRemarkImagePreview("");
                            }}
                            className="rounded-lg px-3 py-1 text-sm text-fg-muted hover:bg-surface-hover"
                          >
                            Remove
                          </button>
                        </div>

                        {remarkImagePreview && (
                          <div className="mt-3">
                            <img
                              src={remarkImagePreview}
                              alt="Selected remark upload"
                              className="max-h-60 rounded-2xl border border-border object-contain"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={onSaveRemark}
                      disabled={savingRemark}
                      className="rounded-xl bg-fg px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingRemark ? "Saving..." : "Save Remark"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
                <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-fg-subtle">
                  Remark History
                </h4>

                {applicant.remarks && applicant.remarks.length > 0 ? (
                  <div className="space-y-3">
                    {applicant.remarks.map((remark) => (
                      <div
                        key={remark.id}
                        className="rounded-2xl border border-border bg-surface-hover p-4"
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-md font-extrabold underline uppercase tracking-wide text-fg">
                            {remark.status
                              ? prettifyStatus(remark.status)
                              : "Remark"}
                          </span>
                          <span className="text-xs text-fg-subtle">
                            {formatDate(remark.created_at)}
                          </span>
                        </div>

                        {remark.remark && (
                          <p className="text-sm text-fg-muted">
                            {remark.remark}
                          </p>
                        )}

                        {remark.image_url && (
                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={() =>
                                onOpenRemarkPreview(remark.image_url)
                              }
                              className="block"
                            >
                              <img
                                src={getFileUrl(remark.image_url)}
                                alt="Remark attachment"
                                className="max-h-72 rounded-2xl border border-border object-contain transition hover:opacity-90"
                              />
                            </button>
                            <p className="mt-2 text-xs text-fg-subtle">
                              Click image to preview
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-surface-hover p-4 text-sm text-fg-subtle">
                    No remarks yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ApplicantCard({
  applicant,
  onPreviewCV,
  onDragStart,
  onView,
  onOpenGenerateForm,
  onViewSubmittedForm,
  draggingDisabled,
}) {
  const isSubmitted = applicant?.onboarding_is_submitted === true;
  const selfieUrl = getFileUrl(applicant.selfie_photo_url);
  const isLocked = isApplicantLocked(applicant);
  const canDrag = !draggingDisabled && !isLocked;

  return (
    <div
      draggable={canDrag}
      onDragStart={() => {
        if (!canDrag) return;
        onDragStart(applicant);
      }}
      className={`rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:shadow-md ${
        canDrag
          ? "cursor-grab active:cursor-grabbing"
          : "cursor-not-allowed opacity-90"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <img
            src={selfieUrl || DefaultThumbnail}
            alt={`${applicant.first_name} ${applicant.middle_name} ${applicant.last_name} ${applicant.suffix || ""}`}
            className="h-14 w-14 shrink-0 rounded-xl border border-border object-cover bg-surface-hover"
            onError={(e) => {
              e.currentTarget.src = DefaultThumbnail;
            }}
          />

          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-tight text-fg capitalize">
              {applicant.first_name} {applicant.middle_name}{" "}
              {applicant.last_name} {applicant.suffix || ""}
            </h3>
            <p className="mt-1 truncate text-xs text-fg-subtle">
              {applicant.email}
            </p>
          </div>
        </div>

        <StatusBadge status={applicant.status} />
      </div>

      {applicant.status === "reviewed" && (
        <div className="mt-3">
          <FormStatusBadge applicant={applicant} />
        </div>
      )}

      <div className="mt-4 space-y-2 text-sm text-fg-muted">
        <p>
          <span className="font-medium">Position:</span>{" "}
          {applicant.position_applied || "-"}
        </p>
        <p>
          <span className="font-medium">Contact:</span>{" "}
          {applicant.contact_number || "-"}
        </p>
        <p>
          <span className="font-medium">Submitted:</span>{" "}
          {formatDate(applicant.created_at)}
        </p>

        {isLocked && (
          <p className="text-xs font-medium text-red-600">
            This applicant can no longer be moved.
          </p>
        )}
      </div>

      <div
        className={`mt-4 grid gap-2 ${
          applicant.status === "reviewed" ? "grid-cols-3" : "grid-cols-2"
        }`}
      >
        <button
          onClick={() => onView(applicant.id)}
          className="rounded-xl border border-border px-3 py-2 text-sm font-medium text-fg-muted transition hover:bg-surface-hover"
        >
          View
        </button>

        {applicant.cv_url ? (
          <button
            onClick={() => onPreviewCV(applicant.cv_url)}
            className="rounded-xl bg-fg px-3 py-2 text-center text-sm font-medium text-background transition hover:opacity-90"
          >
            CV
          </button>
        ) : (
          <span className="rounded-xl bg-surface-active px-3 py-2 text-center text-sm font-medium text-fg-subtle">
            No CV
          </span>
        )}

        {applicant.status === "reviewed" && (
          <button
            onClick={() => {
              if (isSubmitted) {
                onViewSubmittedForm(applicant);
              } else {
                onOpenGenerateForm(applicant);
              }
            }}
            className={`rounded-xl px-3 py-2 text-center text-sm font-medium transition ${
              isSubmitted
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-purple-600 text-white hover:bg-purple-700"
            }`}
          >
            {isSubmitted ? "View Form" : "Generate Form"}
          </button>
        )}
      </div>
    </div>
  );
}

function ApplicantColumn({
  title,
  applicants,
  columnKey,
  onPreviewCV,
  onDragStart,
  onDropApplicant,
  activeDropColumn,
  setActiveDropColumn,
  onView,
  onOpenGenerateForm,
  onViewSubmittedForm,
  draggingDisabled,
  visibleCount,
  onShowMore,
  onShowLess,
}) {
  const visibleApplicants = applicants.slice(0, visibleCount);
  const hasMore = applicants.length > visibleCount;
  const canShowLess =
    applicants.length > COLUMN_INITIAL_LIMIT &&
    visibleCount > COLUMN_INITIAL_LIMIT;

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={() => setActiveDropColumn(columnKey)}
      onDragLeave={() =>
        setActiveDropColumn((prev) => (prev === columnKey ? null : prev))
      }
      onDrop={() => onDropApplicant(columnKey)}
      className={`w-full rounded-3xl border p-4 transition ${
        columnStyles[columnKey]
      } ${activeDropColumn === columnKey ? "ring-2 ring-primary/20" : ""}`}
    >
      <div className="sticky top-0 z-10 mb-4 rounded-2xl bg-surface/80 px-1 py-1 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-fg">{title}</h2>
            <p className="text-sm text-fg-subtle">
              {applicants.length} applicant(s)
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-55 max-h-160 space-y-3 overflow-y-auto pr-1">
        {applicants.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface/70 p-5 text-center text-sm text-fg-subtle">
            No applicants here yet
          </div>
        ) : (
          visibleApplicants.map((applicant) => (
            <ApplicantCard
              key={applicant.id}
              applicant={applicant}
              onPreviewCV={onPreviewCV}
              onDragStart={onDragStart}
              onView={onView}
              onOpenGenerateForm={onOpenGenerateForm}
              onViewSubmittedForm={onViewSubmittedForm}
              draggingDisabled={draggingDisabled}
            />
          ))
        )}
      </div>

      {applicants.length > COLUMN_INITIAL_LIMIT && (
        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="text-xs text-fg-subtle">
            Showing {Math.min(visibleCount, applicants.length)} of{" "}
            {applicants.length}
          </p>

          <div className="flex gap-2">
            {canShowLess && (
              <button
                onClick={onShowLess}
                className="rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-fg-muted hover:bg-surface-hover"
              >
                Show Less
              </button>
            )}

            {hasMore && (
              <button
                onClick={onShowMore}
                className="rounded-xl bg-surface px-3 py-2 text-sm font-medium text-fg shadow-sm ring-1 ring-border hover:bg-surface-hover"
              >
                Show More
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function OnboardingReviewModal({ isOpen, loading, data, onClose }) {
  if (!isOpen) return null;

  const applicant = data?.applicant;
  const onboarding = data?.onboarding;
  const education = data?.education_records || [];
  const employment = data?.employment_history || [];
  const references = data?.references || [];
  const questionResponses = data?.question_responses || [];
  const questions = data?.questions || [];

  const responseMap = Object.fromEntries(
    questionResponses.map((item) => [item.question_key, item.answer_text]),
  );

  // Plain text/number display -- deliberately does NOT auto-format
  // numeric-looking strings with commas. Fields like contact number,
  // SSS/TIN/Pag-IBIG, and emergency contact number are digit strings,
  // not quantities, so comma-grouping them (e.g. "9276646453" ->
  // "9,276,646,453") is wrong and misleading. Only genuine currency
  // fields should be comma-formatted -- use renderCurrency for those.
  const renderValue = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    return String(value);
  };

  // For actual money amounts only (expected/current salary, salary
  // history) -- comma-grouping is correct and expected here.
  const renderCurrency = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    if (isNaN(value)) return String(value);
    return Number(value).toLocaleString("en-US");
  };

  return (
    <div className="fixed inset-0 z-90 flex items-center justify-center bg-black/50 p-4">
      <div className="h-[92vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-surface p-6 shadow-2xl">
        <div className="sticky top-0 z-10 mb-6 flex items-center justify-between border-b border-border bg-surface pb-4">
          <div>
            <h2 className="text-2xl font-bold text-fg">
              Onboarding Form Review
            </h2>
            <p className="text-sm text-fg-subtle">
              {applicant?.first_name} {applicant?.last_name} •{" "}
              {applicant?.position_applied || "-"}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-fg-muted hover:bg-surface-hover"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-border bg-surface-hover p-6 text-center text-fg-subtle">
            Loading onboarding form...
          </div>
        ) : !data || !onboarding ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-600">
            No onboarding form found.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-fg">
                Applicant Summary
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <InfoCard
                  label="Applicant ID"
                  value={renderValue(applicant?.id)}
                />
                <InfoCard
                  label="First Name"
                  value={renderValue(applicant?.first_name)}
                />
                <InfoCard
                  label="Last Name"
                  value={renderValue(applicant?.last_name)}
                />
                <InfoCard label="Email" value={renderValue(applicant?.email)} />
                <InfoCard
                  label="Contact Number"
                  value={renderValue(applicant?.contact_number)}
                />
                <InfoCard
                  label="Position Applied"
                  value={renderValue(applicant?.position_applied)}
                />
                <InfoCard
                  label="Status"
                  value={renderValue(applicant?.status)}
                />
                <InfoCard
                  label="Submitted At"
                  value={formatDate(applicant?.onboarding_submitted_at)}
                />
                <InfoCard
                  label="Form Submitted"
                  value={applicant?.onboarding_is_submitted ? "Yes" : "No"}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-fg">
                Basic / Personal Information
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <InfoCard
                  label="Onboarding ID"
                  value={renderValue(onboarding.id)}
                />
                <InfoCard
                  label="First Name"
                  value={renderValue(onboarding.first_name)}
                />
                <InfoCard
                  label="Last Name"
                  value={renderValue(onboarding.last_name)}
                />
                <InfoCard label="Email" value={renderValue(onboarding.email)} />
                <InfoCard
                  label="Department"
                  value={renderValue(onboarding.department)}
                />
                <InfoCard
                  label="Position"
                  value={renderValue(onboarding.position)}
                />
                <InfoCard
                  label="Birthday"
                  value={formatDate(onboarding.birthday)}
                />
                <InfoCard
                  label="Birthplace"
                  value={renderValue(onboarding.birthplace)}
                />
                <InfoCard
                  label="Gender"
                  value={renderValue(onboarding.gender)}
                />
                <InfoCard
                  label="Civil Status"
                  value={renderValue(onboarding.civil_status)}
                />
                <InfoCard
                  label="Religion"
                  value={renderValue(onboarding.religion)}
                />
                <InfoCard
                  label="Citizenship"
                  value={renderValue(onboarding.citizenship)}
                />
                <InfoCard
                  label="Height"
                  value={renderValue(onboarding.height)}
                />
                <InfoCard
                  label="Weight"
                  value={renderValue(onboarding.weight)}
                />
                <InfoCard
                  label="Language"
                  value={renderValue(onboarding.language)}
                />
                <InfoCard
                  label="Contact Number"
                  value={renderValue(onboarding.contact_number)}
                />
                <InfoCard
                  label="Current Address"
                  value={renderValue(onboarding.current_address)}
                />
                <InfoCard
                  label="Provincial Address"
                  value={renderValue(onboarding.provincial_address)}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-fg">
                Family Information
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <InfoCard
                  label="Spouse Name"
                  value={renderValue(onboarding.spouse_name)}
                />
                <InfoCard
                  label="Father Name"
                  value={renderValue(onboarding.father_name)}
                />
                <InfoCard
                  label="Mother Name"
                  value={renderValue(onboarding.mother_name)}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-fg">
                Emergency Contact
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <InfoCard
                  label="Emergency Contact Name"
                  value={renderValue(onboarding.emergency_contact_name)}
                />
                <InfoCard
                  label="Emergency Contact Number"
                  value={renderValue(onboarding.emergency_contact_number)}
                />
                <InfoCard
                  label="Relationship"
                  value={renderValue(onboarding.emergency_relationship)}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-fg">
                Education
              </h3>

              <div className="space-y-3">
                {education.length > 0 ? (
                  education.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="rounded-2xl border border-border bg-surface-hover p-4"
                    >
                      <div className="mb-3 text-sm font-semibold text-fg">
                        Record #{index + 1}
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <InfoCard
                          label="Level"
                          value={renderValue(item.level)}
                        />
                        <InfoCard
                          label="Institution"
                          value={renderValue(item.institution)}
                        />
                        <InfoCard
                          label="Degree"
                          value={renderValue(item.degree)}
                        />
                        <InfoCard
                          label="Year From"
                          value={renderValue(item.year_from)}
                        />
                        <InfoCard
                          label="Year To"
                          value={renderValue(item.year_to)}
                        />
                        <InfoCard
                          label="Skills"
                          value={renderValue(item.skills)}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-surface-hover p-4 text-sm text-fg-subtle">
                    No education records.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-fg">
                Employment History
              </h3>

              <div className="space-y-3">
                {employment.length > 0 ? (
                  employment.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="rounded-2xl border border-border bg-surface-hover p-4"
                    >
                      <div className="mb-3 text-sm font-semibold text-fg">
                        Record #{index + 1}
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <InfoCard
                          label="Company Name"
                          value={renderValue(item.company_name)}
                        />
                        <InfoCard
                          label="Position"
                          value={renderValue(item.position)}
                        />
                        <InfoCard
                          label="Date From"
                          value={formatDate(item.date_from)}
                        />
                        <InfoCard
                          label="Date To"
                          value={formatDate(item.date_to)}
                        />
                        <InfoCard
                          label="Reason for Leaving"
                          value={renderValue(item.reason_for_leaving)}
                        />
                        <InfoCard
                          label="Salary History"
                          value={renderCurrency(item.salary_history)}
                        />
                        <InfoCard
                          label="Salary Type"
                          value={renderValue(item.salary_type)}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-surface-hover p-4 text-sm text-fg-subtle">
                    No employment history.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-fg">
                Government Information
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <InfoCard label="SSS" value={renderValue(onboarding.sss)} />
                <InfoCard
                  label="PhilHealth"
                  value={renderValue(onboarding.philhealth)}
                />
                <InfoCard
                  label="Pag-IBIG"
                  value={renderValue(onboarding.pagibig)}
                />
                <InfoCard label="TIN" value={renderValue(onboarding.tin)} />
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-fg">
                References
              </h3>

              <div className="space-y-3">
                {references.length > 0 ? (
                  references.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="rounded-2xl border border-border bg-surface-hover p-4"
                    >
                      <div className="mb-3 text-sm font-semibold text-fg">
                        Record #{index + 1}
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <InfoCard label="Name" value={renderValue(item.name)} />
                        <InfoCard
                          label="position"
                          value={renderValue(item.position)}
                        />
                        <InfoCard
                          label="Contact"
                          value={renderValue(item.contact)}
                        />
                        <InfoCard
                          label="Address"
                          value={renderValue(item.address)}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-surface-hover p-4 text-sm text-fg-subtle">
                    No references.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-fg">
                Salary Information
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <InfoCard
                  label="Expected Salary"
                  value={renderCurrency(onboarding.expected_salary)}
                />
                <InfoCard
                  label="Current Salary"
                  value={renderCurrency(onboarding.current_salary)}
                />
                <InfoCard
                  label="Salary Type "
                  value={renderValue(onboarding.salary_type)}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-fg">
                Additional Questions
              </h3>

              <div className="space-y-3">
                {questions.length > 0 ? (
                  questions.map((q, index) => (
                    <div
                      key={q.id || index}
                      className="rounded-2xl border border-border bg-surface-hover p-4"
                    >
                      <p className="text-sm font-semibold text-fg">
                        {q.question_text}
                      </p>
                      <p className="mt-2 text-sm text-fg-muted">
                        <span className="font-medium">Answer:</span>{" "}
                        {renderValue(responseMap[q.question_key])}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-surface-hover p-4 text-sm text-fg-subtle">
                    No additional questions.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ImagePreviewModal({ isOpen, imageUrl, onClose }) {
  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 p-4">
      <div className="relative w-full max-w-5xl rounded-3xl bg-surface p-4 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-fg">Image Preview</h2>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-fg-muted hover:bg-surface-hover"
          >
            ✕
          </button>
        </div>

        <div className="flex max-h-[80vh] items-center justify-center overflow-auto rounded-2xl bg-surface-hover p-4">
          <img
            src={imageUrl}
            alt="Preview"
            className="max-h-[72vh] w-auto rounded-2xl object-contain"
          />
        </div>
      </div>
    </div>
  );
}

export default function ApplicantsPage() {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [previewFile, setPreviewFile] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [cvZoom, setCvZoom] = useState(1);

  const [draggedApplicant, setDraggedApplicant] = useState(null);
  const [activeDropColumn, setActiveDropColumn] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const [remarkText, setRemarkText] = useState("");
  const [savingRemark, setSavingRemark] = useState(false);

  const [selectedStatus, setSelectedStatus] = useState("pending");
  const [changingStatus, setChangingStatus] = useState(false);

  const [convertOpen, setConvertOpen] = useState(false);
  const [convertDepartment, setConvertDepartment] = useState("");
  const [convertPosition, setConvertPosition] = useState("");
  const [convertingApplicant, setConvertingApplicant] = useState(false);

  const [generateFormOpen, setGenerateFormOpen] = useState(false);
  const [generateFormApplicant, setGenerateFormApplicant] = useState(null);
  const [generatingFormLink, setGeneratingFormLink] = useState(false);
  const [generatedFormLink, setGeneratedFormLink] = useState("");
  // Whether the backend actually emailed the link to the applicant (it's
  // best-effort -- null before a link has been generated, then true/false
  // once we know; see generate_employment_form in app/api/admin/applicants.py).
  const [generatedFormEmailSent, setGeneratedFormEmailSent] = useState(null);

  const [onboardingViewOpen, setOnboardingViewOpen] = useState(false);
  const [onboardingViewLoading, setOnboardingViewLoading] = useState(false);
  const [onboardingViewData, setOnboardingViewData] = useState(null);

  const [remarkImage, setRemarkImage] = useState(null);
  const [remarkImagePreview, setRemarkImagePreview] = useState("");
  const [remarkError, setRemarkError] = useState("");

  const [remarkPreviewOpen, setRemarkPreviewOpen] = useState(false);
  const [remarkPreviewImage, setRemarkPreviewImage] = useState("");

  const [visibleCounts, setVisibleCounts] = useState(
    COLUMNS.reduce((acc, column) => {
      acc[column.key] = COLUMN_INITIAL_LIMIT;
      return acc;
    }, {}),
  );

  const loadApplicants = async () => {
    try {
      setLoading(true);
      const data = await getApplicants();
      setApplicants(data || []);
    } catch (err) {
      console.error("Failed to load applicants:", err);
      setApplicants([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRemarkPreview = (imageUrl) => {
    if (!imageUrl) return;
    setRemarkPreviewImage(getFileUrl(imageUrl));
    setRemarkPreviewOpen(true);
  };

  const handleCloseRemarkPreview = () => {
    setRemarkPreviewOpen(false);
    setRemarkPreviewImage("");
  };

  useEffect(() => {
    loadApplicants();
  }, []);

  useEffect(() => {
    setVisibleCounts(
      COLUMNS.reduce((acc, column) => {
        acc[column.key] = COLUMN_INITIAL_LIMIT;
        return acc;
      }, {}),
    );
  }, [search]);

  const filteredApplicants = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    if (!keyword) return applicants;

    return applicants.filter((app) => {
      const fullName =
        `${app.first_name || ""} ${app.last_name || ""}`.toLowerCase();

      return (
        fullName.includes(keyword) ||
        (app.email || "").toLowerCase().includes(keyword) ||
        (app.position_applied || "").toLowerCase().includes(keyword) ||
        (app.contact_number || "").toLowerCase().includes(keyword)
      );
    });
  }, [applicants, search]);

  const applicantsByStatus = useMemo(() => {
    const grouped = {};
    COLUMNS.forEach((column) => {
      grouped[column.key] = filteredApplicants.filter(
        (a) => a.status === column.key,
      );
    });
    return grouped;
  }, [filteredApplicants]);

  const stats = useMemo(() => {
    return {
      total: applicants.length,
      pending: applicants.filter((a) => a.status === "pending").length,
      reviewed: applicants.filter((a) => a.status === "reviewed").length,
      interview: applicants.filter((a) => a.status === "interview").length,
      for_pooling: applicants.filter((a) => a.status === "for_pooling").length,
      hired: applicants.filter((a) => a.status === "hired").length,
      rejected: applicants.filter((a) => a.status === "rejected").length,
      withdrawn: applicants.filter((a) => a.status === "withdrawn").length,
      no_show: applicants.filter((a) => a.status === "no_show").length,
    };
  }, [applicants]);

  const filteredTotal = filteredApplicants.length;

  const handlePreviewCV = (cvUrl) => {
    if (!cvUrl) return;
    setCvZoom(1);
    setPreviewFile(getFileUrl(cvUrl));
    setPreviewOpen(true);
  };

  const closePreviewModal = () => {
    setPreviewOpen(false);
    setPreviewFile(null);
  };

  const handleDragStart = (applicant) => {
    if (updatingStatus || isApplicantLocked(applicant)) return;
    setDraggedApplicant(applicant);
  };

  const refreshSelectedApplicant = async (applicantId) => {
    const data = await getApplicantDetail(applicantId);
    setSelectedApplicant(data);
    setSelectedStatus(data.status);
  };

  const handleDropApplicant = async (targetStatus) => {
    if (!draggedApplicant || updatingStatus) return;

    if (isApplicantLocked(draggedApplicant)) {
      toast.error("This applicant can no longer be moved.");
      setDraggedApplicant(null);
      setActiveDropColumn(null);
      return;
    }

    if (draggedApplicant.status === targetStatus) {
      setDraggedApplicant(null);
      setActiveDropColumn(null);
      return;
    }

    try {
      setUpdatingStatus(true);
      await updateApplicantStatus(draggedApplicant.id, {
        status: targetStatus,
      });
      await loadApplicants();

      if (selectedApplicant?.id === draggedApplicant.id) {
        await refreshSelectedApplicant(draggedApplicant.id);
      }
    } catch (error) {
      console.error("Failed to update applicant status:", error);
      alertDialog(
        error?.response?.data?.detail
          ? JSON.stringify(error.response.data.detail)
          : "Failed to update status.",
      );
    } finally {
      setDraggedApplicant(null);
      setActiveDropColumn(null);
      setUpdatingStatus(false);
    }
  };

  const handleViewApplicant = async (applicantId) => {
    try {
      setDrawerOpen(true);
      setDrawerLoading(true);
      setSelectedApplicant(null);
      setRemarkText("");
      setRemarkImage(null);
      setRemarkImagePreview("");
      setRemarkError("");

      const data = await getApplicantDetail(applicantId);
      setSelectedApplicant(data);
      setSelectedStatus(data.status);
    } catch (error) {
      console.error("Failed to load applicant detail:", error);
      setSelectedApplicant(null);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleSaveRemark = async () => {
    if (!selectedApplicant || savingRemark) return;

    if (!remarkText.trim() && !remarkImage) {
      setRemarkError("Please enter a remark or upload an image");
      return;
    }

    try {
      setSavingRemark(true);
      setRemarkError("");

      const formData = new FormData();
      formData.append("remark", remarkText.trim());
      formData.append("status", selectedApplicant.status);

      if (remarkImage) {
        formData.append("image", remarkImage);
      }

      await addApplicantRemark(selectedApplicant.id, formData);

      setRemarkText("");
      setRemarkImage(null);
      setRemarkImagePreview("");
      setRemarkError("");

      await refreshSelectedApplicant(selectedApplicant.id);
      toast.success("Remark saved successfully");
    } catch (error) {
      console.error("Failed to save remark:", error);
      toast.error("Failed to save remark");
    } finally {
      setSavingRemark(false);
    }
  };

  const handleSaveStatusFromDrawer = async () => {
    if (!selectedApplicant || changingStatus) return;

    if (isApplicantLocked(selectedApplicant)) {
      toast.error("This applicant can no longer be moved.");
      return;
    }

    if (selectedStatus === selectedApplicant.status) return;

    try {
      setChangingStatus(true);
      await updateApplicantStatus(selectedApplicant.id, {
        status: selectedStatus,
      });
      await loadApplicants();
      await refreshSelectedApplicant(selectedApplicant.id);
    } catch (error) {
      console.error("Failed to update applicant status:", error);
      alertDialog(
        error?.response?.data?.detail
          ? JSON.stringify(error.response.data.detail)
          : "Failed to update status.",
      );
    } finally {
      setChangingStatus(false);
    }
  };

  const handleOpenConvert = (applicant) => {
    setConvertDepartment("");
    setConvertPosition(applicant?.position_applied || "");
    setConvertOpen(true);
  };

  const handleCloseConvert = () => {
    if (convertingApplicant) return;
    setConvertOpen(false);
    setConvertDepartment("");
    setConvertPosition("");
  };

  const handleConfirmConvert = async () => {
    if (
      !selectedApplicant ||
      !convertDepartment.trim() ||
      convertingApplicant
    ) {
      return;
    }

    try {
      setConvertingApplicant(true);

      await convertApplicantToEmployee(selectedApplicant.id, {
        department: convertDepartment.trim(),
        position:
          convertPosition.trim() === selectedApplicant.position_applied
            ? ""
            : convertPosition.trim(),
      });

      await loadApplicants();
      await refreshSelectedApplicant(selectedApplicant.id);
      setConvertOpen(false);
      alertDialog("Applicant converted to employee successfully.");
    } catch (error) {
      console.error("Failed to convert applicant:", error);
      const message =
        error?.response?.data?.detail || "Failed to convert applicant.";

      toast.error(message, {
        duration: 5000,
      });
    } finally {
      setConvertingApplicant(false);
    }
  };

  const handleOpenGenerateForm = (applicant) => {
    setGenerateFormApplicant(applicant);
    setGeneratedFormLink("");
    setGeneratedFormEmailSent(null);
    setGenerateFormOpen(true);
  };

  const handleCloseGenerateForm = () => {
    if (generatingFormLink) return;
    setGenerateFormOpen(false);
    setGenerateFormApplicant(null);
    setGeneratedFormLink("");
    setGeneratedFormEmailSent(null);
  };

  const handleGenerateFormLink = async () => {
    if (!generateFormApplicant) return;

    try {
      setGeneratingFormLink(true);

      const data = await generateEmploymentForm(generateFormApplicant.id);
      setGeneratedFormLink(data.form_url);
      // email_sent is best-effort on the backend (e.g. false if SMTP
      // isn't configured yet, or the applicant has no email on file) --
      // surface it so HR knows whether they still need to share the link
      // manually.
      setGeneratedFormEmailSent(Boolean(data.email_sent));

      await loadApplicants();

      if (selectedApplicant?.id === generateFormApplicant.id) {
        await refreshSelectedApplicant(generateFormApplicant.id);
      }
    } catch (error) {
      console.error("Failed to generate employment form link:", error);
      alertDialog(
        error?.response?.data?.detail
          ? JSON.stringify(error.response.data.detail)
          : "Failed to generate employment form link.",
      );
    } finally {
      setGeneratingFormLink(false);
    }
  };

  const handleCopyGeneratedLink = async () => {
    if (!generatedFormLink) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(generatedFormLink);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = generatedFormLink;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const copied = document.execCommand("copy");
        document.body.removeChild(textArea);

        if (!copied) {
          throw new Error("Fallback copy failed");
        }
      }

      toast.success("Link copied to clipboard");
    } catch (error) {
      console.error("Failed to copy link:", error);
      toast.error("Failed to copy link");
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedApplicant(null);
    setRemarkText("");
    setRemarkImage(null);
    setRemarkImagePreview("");
    setRemarkError("");
  };

  const handleShowMore = (columnKey) => {
    setVisibleCounts((prev) => ({
      ...prev,
      [columnKey]: prev[columnKey] + COLUMN_INITIAL_LIMIT,
    }));
  };

  const handleShowLess = (columnKey) => {
    setVisibleCounts((prev) => ({
      ...prev,
      [columnKey]: COLUMN_INITIAL_LIMIT,
    }));
  };

  const handleViewSubmittedForm = async (applicant) => {
    if (!applicant?.id) return;

    try {
      setOnboardingViewLoading(true);
      setOnboardingViewData(null);
      setOnboardingViewOpen(true);

      const data = await getApplicantOnboarding(applicant.id);
      setOnboardingViewData(data);
    } catch (error) {
      console.error("Failed to load applicant onboarding:", error);
      toast.error("Failed to load onboarding form");
      setOnboardingViewOpen(false);
    } finally {
      setOnboardingViewLoading(false);
    }
  };

  const handleCloseOnboardingView = () => {
    setOnboardingViewOpen(false);
    setOnboardingViewData(null);
  };

  return (
    <div className="space-y-5">
      <SectionTabs group="HRIS" />

      <div className="mx-auto max-w-450 space-y-6">
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-fg">
                Applicant Board
              </h1>
              <p className="mt-1 text-fg-subtle">
                Manage and track applicants through the hiring pipeline.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                placeholder="Search by name, email, position, contact..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-border bg-surface text-fg px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-96"
              />

              <button
                onClick={loadApplicants}
                className="rounded-2xl bg-fg px-5 py-3 font-medium text-background transition hover:opacity-90"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-fg-subtle">
            <span>
              Total records:{" "}
              <span className="font-semibold text-fg">{stats.total}</span>
            </span>

            {search.trim() && (
              <>
                <span>•</span>
                <span>
                  Search results:{" "}
                  <span className="font-semibold text-fg">
                    {filteredTotal}
                  </span>
                </span>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-9">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Pending" value={stats.pending} />
          <StatCard label="Reviewed" value={stats.reviewed} />
          <StatCard label="Interview" value={stats.interview} />
          <StatCard label="Pooling" value={stats.for_pooling} />
          <StatCard label="Hired" value={stats.hired} />
          <StatCard label="Rejected" value={stats.rejected} />
          <StatCard label="Withdrawn" value={stats.withdrawn} />
          <StatCard label="No Show" value={stats.no_show} />
        </div>

        {loading ? (
          <div className="rounded-3xl border border-border bg-surface p-10 text-center text-fg-subtle shadow-sm">
            Loading applicants...
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold text-fg">
                  Active Pipeline
                </h2>
                <p className="text-sm text-fg-subtle">
                  New applicants and candidates in process
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-4">
                {PIPELINE_COLUMNS.map((column) => (
                  <ApplicantColumn
                    key={column.key}
                    title={column.label}
                    columnKey={column.key}
                    applicants={applicantsByStatus[column.key] || []}
                    onPreviewCV={handlePreviewCV}
                    onDragStart={handleDragStart}
                    onDropApplicant={handleDropApplicant}
                    activeDropColumn={activeDropColumn}
                    setActiveDropColumn={setActiveDropColumn}
                    onView={handleViewApplicant}
                    onOpenGenerateForm={handleOpenGenerateForm}
                    onViewSubmittedForm={handleViewSubmittedForm}
                    draggingDisabled={updatingStatus}
                    visibleCount={visibleCounts[column.key]}
                    onShowMore={() => handleShowMore(column.key)}
                    onShowLess={() => handleShowLess(column.key)}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold text-fg">Outcomes</h2>
                <p className="text-sm text-fg-subtle">
                  Final or inactive candidate states
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-4">
                {OUTCOME_COLUMNS.map((column) => (
                  <ApplicantColumn
                    key={column.key}
                    title={column.label}
                    columnKey={column.key}
                    applicants={applicantsByStatus[column.key] || []}
                    onPreviewCV={handlePreviewCV}
                    onDragStart={handleDragStart}
                    onDropApplicant={handleDropApplicant}
                    activeDropColumn={activeDropColumn}
                    setActiveDropColumn={setActiveDropColumn}
                    onView={handleViewApplicant}
                    onOpenGenerateForm={handleOpenGenerateForm}
                    onViewSubmittedForm={handleViewSubmittedForm}
                    draggingDisabled={updatingStatus}
                    visibleCount={visibleCounts[column.key]}
                    onShowMore={() => handleShowMore(column.key)}
                    onShowLess={() => handleShowLess(column.key)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <CVPreviewModal
        isOpen={previewOpen}
        fileUrl={previewFile}
        zoom={cvZoom}
        setZoom={setCvZoom}
        onClose={closePreviewModal}
      />

      <ApplicantDrawer
        isOpen={drawerOpen}
        applicant={selectedApplicant}
        loading={drawerLoading}
        remarkText={remarkText}
        setRemarkText={setRemarkText}
        remarkImage={remarkImage}
        setRemarkImage={setRemarkImage}
        remarkImagePreview={remarkImagePreview}
        setRemarkImagePreview={setRemarkImagePreview}
        remarkError={remarkError}
        setRemarkError={setRemarkError}
        savingRemark={savingRemark}
        changingStatus={changingStatus}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        onSaveRemark={handleSaveRemark}
        onSaveStatus={handleSaveStatusFromDrawer}
        onClose={closeDrawer}
        onPreviewCV={handlePreviewCV}
        onOpenConvert={handleOpenConvert}
        onOpenGenerateForm={handleOpenGenerateForm}
        onViewSubmittedForm={handleViewSubmittedForm}
        onOpenRemarkPreview={handleOpenRemarkPreview}
      />

      <ConvertApplicantModal
        isOpen={convertOpen}
        applicant={selectedApplicant}
        department={convertDepartment}
        setDepartment={setConvertDepartment}
        position={convertPosition}
        setPosition={setConvertPosition}
        converting={convertingApplicant}
        onClose={handleCloseConvert}
        onConfirm={handleConfirmConvert}
      />

      <GenerateEmploymentFormModal
        isOpen={generateFormOpen}
        applicant={generateFormApplicant}
        generating={generatingFormLink}
        generatedLink={generatedFormLink}
        emailSent={generatedFormEmailSent}
        onClose={handleCloseGenerateForm}
        onGenerate={handleGenerateFormLink}
        onCopy={handleCopyGeneratedLink}
      />

      <OnboardingReviewModal
        isOpen={onboardingViewOpen}
        loading={onboardingViewLoading}
        data={onboardingViewData}
        onClose={handleCloseOnboardingView}
      />

      <ImagePreviewModal
        isOpen={remarkPreviewOpen}
        imageUrl={remarkPreviewImage}
        onClose={handleCloseRemarkPreview}
      />
    </div>
  );
}
