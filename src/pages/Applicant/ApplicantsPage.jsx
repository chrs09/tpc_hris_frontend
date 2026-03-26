import { useEffect, useMemo, useState } from "react";
import {
  addApplicantRemark,
  convertApplicantToEmployee,
  getApplicantDetail,
  getApplicants,
  updateApplicantStatus,
} from "../../api/adminApplicants";
import { employeeRoleConvert } from "../../constants/employeeRole";

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

const columnStyles = {
  pending: "border-yellow-200 bg-yellow-50/70",
  reviewed: "border-blue-200 bg-blue-50/70",
  interview: "border-purple-200 bg-purple-50/70",
  for_pooling: "border-orange-200 bg-orange-50/70",
  hired: "border-green-200 bg-green-50/70",
  rejected: "border-red-200 bg-red-50/70",
  withdrawn: "border-gray-300 bg-gray-100/80",
  no_show: "border-pink-200 bg-pink-50/70",
};

const badgeStyles = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  reviewed: "bg-blue-100 text-blue-800 border-blue-200",
  interview: "bg-purple-100 text-purple-800 border-purple-200",
  for_pooling: "bg-orange-100 text-orange-800 border-orange-200",
  hired: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  withdrawn: "bg-gray-200 text-gray-700 border-gray-300",
  no_show: "bg-pink-100 text-pink-800 border-pink-200",
};

function formatDate(date) {
  if (!date) return "-";

  return new Date(date).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
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

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
        badgeStyles[status] || "bg-gray-100 text-gray-700 border-gray-200"
      }`}
    >
      {prettifyStatus(status)}
    </span>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function CVPreviewModal({ isOpen, fileUrl, onClose }) {
  if (!isOpen || !fileUrl) return null;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 p-4">
      <div className="relative h-[90vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900">CV Preview</h2>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-gray-700 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div className="h-[calc(90vh-60px)] bg-gray-50">
          <iframe src={fileUrl} title="CV Preview" className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-2 wrap-break-word text-sm text-gray-900">{value || "-"}</p>
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
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              Convert to Employee
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              This will create a new employee record from the hired applicant.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={converting}
            className="rounded-lg px-3 py-1 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Applicant:</span>{" "}
              {applicant.first_name} {applicant.last_name}
            </p>
            <p className="mt-1 text-sm text-gray-700">
              <span className="font-semibold">Applied Position:</span>{" "}
              {applicant.position_applied || "-"}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Department
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-black focus:ring-2 focus:ring-black/10"
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
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Position Override <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Leave blank to use applied position"
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-black focus:ring-2 focus:ring-black/10"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={converting}
            className="rounded-2xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
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
  savingRemark,
  changingStatus,
  selectedStatus,
  setSelectedStatus,
  onSaveRemark,
  onSaveStatus,
  onClose,
  onPreviewCV,
  onOpenConvert,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative ml-auto h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Applicant Details
            </h2>
            <p className="text-sm text-gray-500">
              Review applicant information, remarks, and status
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-gray-700 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center text-gray-500">
              Loading applicant details...
            </div>
          ) : !applicant ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-600">
              Failed to load applicant details.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-3xl border border-gray-200 bg-linear-to-br from-white to-gray-50 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {applicant.first_name} {applicant.last_name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Applied for{" "}
                      <span className="font-medium text-gray-800">
                        {applicant.position_applied || "-"}
                      </span>
                    </p>
                  </div>

                  <StatusBadge status={applicant.status} />
                </div>
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

              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Actions
                </h4>

                <div className="flex flex-wrap gap-3">
                  {applicant.cv_url ? (
                    <button
                      onClick={() => onPreviewCV(applicant.cv_url)}
                      className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                    >
                      Preview CV
                    </button>
                  ) : (
                    <span className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-400">
                      No CV Available
                    </span>
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

              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Update Status
                </h4>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-black focus:ring-2 focus:ring-black/10 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    disabled={applicant.is_converted_to_employee}
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
                      changingStatus || selectedStatus === applicant.status
                    }
                    className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {changingStatus ? "Updating..." : "Update Status"}
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  HR Remarks
                </h4>

                <textarea
                  value={remarkText}
                  onChange={(e) => setRemarkText(e.target.value)}
                  placeholder="Write HR remarks here..."
                  className="min-h-30 w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                />

                <div className="mt-3 flex justify-end">
                  <button
                    onClick={onSaveRemark}
                    disabled={savingRemark || !remarkText.trim()}
                    className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingRemark ? "Saving..." : "Save Remark"}
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Remark History
                </h4>

                {applicant.remarks && applicant.remarks.length > 0 ? (
                  <div className="space-y-3">
                    {applicant.remarks.map((remark) => (
                      <div
                        key={remark.id}
                        className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {remark.status
                              ? prettifyStatus(remark.status)
                              : "Remark"}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDate(remark.created_at)}
                          </span>
                        </div>

                        <p className="text-sm text-gray-700">{remark.remark}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
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
  draggingDisabled,
}) {
  return (
    <div
      draggable={!draggingDisabled}
      onDragStart={() => onDragStart(applicant)}
      className="cursor-grab rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-tight text-gray-900">
            {applicant.first_name} {applicant.last_name}
          </h3>
          <p className="mt-1 truncate text-xs text-gray-500">
            {applicant.email}
          </p>
        </div>

        <StatusBadge status={applicant.status} />
      </div>

      <div className="mt-4 space-y-2 text-sm text-gray-700">
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
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onView(applicant.id)}
          className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          View
        </button>

        {applicant.cv_url ? (
          <button
            onClick={() => onPreviewCV(applicant.cv_url)}
            className="flex-1 rounded-xl bg-black px-3 py-2 text-center text-sm font-medium text-white transition hover:bg-gray-800"
          >
            CV
          </button>
        ) : (
          <span className="flex-1 rounded-xl bg-gray-100 px-3 py-2 text-center text-sm font-medium text-gray-400">
            No CV
          </span>
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
  draggingDisabled,
}) {
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
      } ${activeDropColumn === columnKey ? "ring-2 ring-black/20" : ""}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">
            {applicants.length} applicant(s)
          </p>
        </div>
      </div>

      <div className="min-h-55 space-y-3">
        {applicants.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white/70 p-5 text-center text-sm text-gray-500">
            Drop applicant here
          </div>
        ) : (
          applicants.map((applicant) => (
            <ApplicantCard
              key={applicant.id}
              applicant={applicant}
              onPreviewCV={onPreviewCV}
              onDragStart={onDragStart}
              onView={onView}
              draggingDisabled={draggingDisabled}
            />
          ))
        )}
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

  useEffect(() => {
    loadApplicants();
  }, []);

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
        (a) => a.status === column.key
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

  const handlePreviewCV = (cvUrl) => {
    if (!cvUrl) return;
    setPreviewFile(getFileUrl(cvUrl));
    setPreviewOpen(true);
  };

  const closePreviewModal = () => {
    setPreviewOpen(false);
    setPreviewFile(null);
  };

  const handleDragStart = (applicant) => {
    if (updatingStatus) return;
    setDraggedApplicant(applicant);
  };

  const refreshSelectedApplicant = async (applicantId) => {
    const data = await getApplicantDetail(applicantId);
    setSelectedApplicant(data);
    setSelectedStatus(data.status);
  };

  const handleDropApplicant = async (targetStatus) => {
    if (!draggedApplicant || updatingStatus) return;

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
      alert(
        error?.response?.data?.detail
          ? JSON.stringify(error.response.data.detail)
          : "Failed to update status."
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
    if (!selectedApplicant || !remarkText.trim() || savingRemark) return;

    try {
      setSavingRemark(true);

      await addApplicantRemark(selectedApplicant.id, {
        remark: remarkText.trim(),
        status: selectedApplicant.status,
      });

      setRemarkText("");
      await refreshSelectedApplicant(selectedApplicant.id);
    } catch (error) {
      console.error("Failed to save remark:", error);
      alert(
        error?.response?.data?.detail
          ? JSON.stringify(error.response.data.detail)
          : "Failed to save remark."
      );
    } finally {
      setSavingRemark(false);
    }
  };

  const handleSaveStatusFromDrawer = async () => {
    if (!selectedApplicant || changingStatus) return;
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
      alert(
        error?.response?.data?.detail
          ? JSON.stringify(error.response.data.detail)
          : "Failed to update status."
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
    if (!selectedApplicant || !convertDepartment.trim() || convertingApplicant) {
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
      alert("Applicant converted to employee successfully.");
    } catch (error) {
      console.error("Failed to convert applicant:", error);
      alert(
        error?.response?.data?.detail
          ? JSON.stringify(error.response.data.detail)
          : "Failed to convert applicant."
      );
    } finally {
      setConvertingApplicant(false);
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedApplicant(null);
    setRemarkText("");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-425 space-y-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Applicant Board
              </h1>
              <p className="mt-1 text-gray-500">
                Manage and track applicants through the hiring pipeline.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                placeholder="Search by name, email, position, contact..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10 sm:w-96"
              />

              <button
                onClick={loadApplicants}
                className="rounded-2xl bg-black px-5 py-3 font-medium text-white transition hover:bg-gray-800"
              >
                Refresh
              </button>
            </div>
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
          <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center text-gray-500 shadow-sm">
            Loading applicants...
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">
                  Active Pipeline
                </h2>
                <p className="text-sm text-gray-500">
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
                    draggingDisabled={updatingStatus}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Outcomes</h2>
                <p className="text-sm text-gray-500">
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
                    draggingDisabled={updatingStatus}
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
        onClose={closePreviewModal}
      />

      <ApplicantDrawer
        isOpen={drawerOpen}
        applicant={selectedApplicant}
        loading={drawerLoading}
        remarkText={remarkText}
        setRemarkText={setRemarkText}
        savingRemark={savingRemark}
        changingStatus={changingStatus}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        onSaveRemark={handleSaveRemark}
        onSaveStatus={handleSaveStatusFromDrawer}
        onClose={closeDrawer}
        onPreviewCV={handlePreviewCV}
        onOpenConvert={handleOpenConvert}
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
    </div>
  );
}