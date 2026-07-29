import React, { useEffect, useMemo, useState } from "react";

const getPhoto = (record) => record.time_in_photo_url || null;

const getProfilePhoto = (record) => record.profile_photo_url || null;

const getName = (record) =>
  record.employee_name || `Employee #${record.employee_id}`;

const getDepartment = (record) =>
  record.employee_department || record.department || "No department";

const getTimeIn = (record) => record.check_in_time || "No time in";

const getTimeOut = (record) => record.check_out_time || "No time out";

const getLocation = (record) => record.time_in_address || "No location";

const getLat = (record) => record.time_in_latitude || null;

const getLng = (record) => record.time_in_longitude || null;

const getCoordinates = (record) => {
  if (!getLat(record) || !getLng(record)) return "No coordinates";
  return `${getLat(record)}, ${getLng(record)}`;
};

const getGoogleMapsUrl = (record) => {
  if (!getLat(record) || !getLng(record)) return null;
  return `https://maps.google.com/?q=${getLat(record)},${getLng(record)}`;
};

const getIsAbsent = (record) =>
  (record.status || "").toUpperCase() === "ABSENT";

const getReviewStatus = (record) => {
  if (record.face_review_status === "AUTO_APPROVED") return "Auto Approved";
  if (record.face_review_status === "APPROVED") return "Approved";
  if (record.face_review_status === "REJECTED") return "Rejected";
  if (record.face_review_status === "NEEDS_REVIEW") return "Needs Review";
  if (record.face_review_status === "NO_PROFILE_PHOTO")
    return "No Profile Photo";
  if (record.face_review_status === "FACE_MATCH_FAILED") return "Match Failed";
  if (!getPhoto(record)) return "No Selfie";
  return "Pending";
};

const getStatusStyle = (status) => {
  if (status === "Auto Approved" || status === "Approved") {
    return {
      badge: "bg-green-100 text-green-700",
      border: "border-green-200",
      text: "text-green-600",
    };
  }

  if (status === "Rejected" || status === "Match Failed") {
    return {
      badge: "bg-red-100 text-red-700",
      border: "border-red-200",
      text: "text-red-600",
    };
  }

  if (status === "No Selfie" || status === "No Profile Photo") {
    return {
      badge: "bg-gray-100 text-gray-700",
      border: "border-gray-200",
      text: "text-gray-600",
    };
  }

  return {
    badge: "bg-orange-100 text-orange-700",
    border: "border-orange-200",
    text: "text-orange-600",
  };
};

const AttendanceGridReview = ({
  records = [],
  onApproveAttendance,
  onRejectAttendance,
}) => {
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [modalRecordId, setModalRecordId] = useState(null);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" && window.matchMedia("(max-width: 1279px)").matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1279px)");
    const updateMobile = (event) => setIsMobile(event.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", updateMobile);
    } else {
      mediaQuery.addListener(updateMobile);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", updateMobile);
      } else {
        mediaQuery.removeListener(updateMobile);
      }
    };
  }, []);

  const stats = useMemo(() => {
    const total = records.length;

    const autoApproved = records.filter(
      (record) =>
        record.face_review_status === "AUTO_APPROVED" ||
        record.face_review_status === "APPROVED",
    ).length;

    const needsReview = records.filter(
      (record) =>
        record.face_review_status === "NEEDS_REVIEW" ||
        record.face_review_status === "NO_PROFILE_PHOTO" ||
        record.face_review_status === "FACE_MATCH_FAILED",
    ).length;

    const rejected = records.filter(
      (record) => record.face_review_status === "REJECTED",
    ).length;

    const noSelfie = records.filter((record) => !getPhoto(record)).length;

    const absent = records.filter((record) => getIsAbsent(record)).length;

    return {
      total,
      autoApproved,
      needsReview,
      rejected,
      noSelfie,
      absent,
    };
  }, [records]);

  const presentRecords = useMemo(
    () => records.filter((record) => !getIsAbsent(record)),
    [records],
  );

  const activeRecord = useMemo(() => {
    if (!presentRecords.length) {
      return null;
    }

    if (!selectedRecordId) {
      return presentRecords[0];
    }

    return (
      presentRecords.find((record) => record.id === selectedRecordId) ||
      presentRecords[0]
    );
  }, [presentRecords, selectedRecordId]);

  const handleApprove = (record) => {
    if (onApproveAttendance) {
      onApproveAttendance(record);
    }
  };

  const handleReject = (record) => {
    if (onRejectAttendance) {
      onRejectAttendance(record);
    }
  };

  const openRecordModal = (record) => {
    setSelectedRecordId(record.id);
    if (isMobile) {
      setModalRecordId(record.id);
    }
  };

  const closeRecordModal = () => setModalRecordId(null);

  const modalRecord = isMobile
    ? presentRecords.find((record) => record.id === modalRecordId) || null
    : null;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Attendance Review</h2>
        <p className="text-sm text-gray-500">
          Review attendance selfies, profile photo comparison, and location
          details.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard label="Total Attendance" value={stats.total} />
        <StatCard label="Approved" value={stats.autoApproved} color="green" />
        <StatCard
          label="Needs Review"
          value={stats.needsReview}
          color="orange"
        />
        <StatCard label="Rejected" value={stats.rejected} color="red" />
        <StatCard label="No Selfie" value={stats.noSelfie} color="gray" />
        <StatCard label="Absent" value={stats.absent} color="red" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-5">
        <div>
          {!presentRecords.length ? (
            <div className="bg-white border rounded-xl p-10 text-center text-gray-500">
              No attendance records found.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {presentRecords.map((record) => {
                const photo = getPhoto(record);
                const status = getReviewStatus(record);
                const style = getStatusStyle(status);
                const isSelected = selectedRecordId === record.id;

                return (
                  <div
                    key={record.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedRecordId(record.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        setSelectedRecordId(record.id);
                      }
                    }}
                    className={`flex h-full flex-col overflow-hidden rounded-xl border bg-white text-left transition hover:shadow-md ${
                      style.border
                    } ${isSelected ? "ring-2 ring-blue-500" : ""}`}
                  >
                    <div className="relative h-32 sm:h-36 bg-gray-100">
                      {photo ? (
                        <img
                          src={photo}
                          alt={getName(record)}
                          className="w-full h-full object-cover cursor-pointer"
                          loading="lazy"
                          onClick={(event) => {
                            event.stopPropagation();
                            openRecordModal(record);
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
                          No Selfie
                        </div>
                      )}

                      <span
                        className={`absolute top-3 left-3 text-xs font-semibold rounded-full px-3 py-1 ${style.badge}`}
                      >
                        {status}
                      </span>

                      {record.face_match_score !== null &&
                        record.face_match_score !== undefined && (
                          <span className="absolute top-3 right-3 text-xs font-semibold rounded-full px-3 py-1 bg-white/90 text-blue-700">
                            {record.face_match_score}%
                          </span>
                        )}
                    </div>

                    <div className="flex flex-1 flex-col p-3 space-y-2 text-sm">
                      <div>
                        <h3 className="font-bold text-gray-900 line-clamp-1">
                          {getName(record)}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {getDepartment(record)}
                        </p>
                      </div>

                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          <span className="font-medium">Time In:</span>{" "}
                          {getTimeIn(record)}
                        </p>

                        <p className="line-clamp-1">
                          <span className="font-medium">Location:</span>{" "}
                          {getLocation(record)}
                        </p>

                        <p className="line-clamp-1">
                          <span className="font-medium">Lat / Long:</span>{" "}
                          {getCoordinates(record)}
                        </p>
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openRecordModal(record);
                          }}
                          className="block w-full text-center rounded-lg bg-gray-900 text-white text-sm py-2"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <aside className="hidden xl:block bg-white border rounded-xl h-fit overflow-hidden xl:sticky xl:top-5">
          <div className="h-14 px-5 border-b flex items-center justify-between">
            <h3 className="font-bold text-lg">Attendance Detail</h3>

            <button
              type="button"
              onClick={() => setSelectedRecordId(null)}
              className="text-gray-400 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {!activeRecord ? (
            <div className="p-6 text-sm text-gray-500">
              Select an attendance record.
            </div>
          ) : (
            <AttendanceDetail
              record={activeRecord}
              onApproveAttendance={handleApprove}
              onRejectAttendance={handleReject}
            />
          )}
        </aside>
      </div>

      {modalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Attendance Detail</h3>
              <button
                type="button"
                onClick={closeRecordModal}
                className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Close
              </button>
            </div>
            <div className="max-h-[80vh] overflow-auto p-5">
              <AttendanceDetail
                record={modalRecord}
                onApproveAttendance={handleApprove}
                onRejectAttendance={handleReject}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AttendanceDetail = ({
  record,
  onApproveAttendance,
  onRejectAttendance,
}) => {
  const photo = getPhoto(record);
  const profilePhoto = getProfilePhoto(record);
  const status = getReviewStatus(record);
  const style = getStatusStyle(status);
  const mapsUrl = getGoogleMapsUrl(record);

  const canReview =
    record.face_review_status !== "AUTO_APPROVED" &&
    record.face_review_status !== "APPROVED" &&
    record.face_review_status !== "REJECTED";

  return (
    <div className="p-5 space-y-5">
      <div className="flex gap-4 items-center">
        <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100">
          {profilePhoto || photo ? (
            <img
              src={profilePhoto || photo}
              alt={getName(record)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
              No Photo
            </div>
          )}
        </div>

        <div>
          <h4 className="font-bold text-gray-900">{getName(record)}</h4>
          <p className="text-sm text-gray-500">{getDepartment(record)}</p>
          <p className="text-sm text-gray-500">
            Employee ID: {record.employee_id}
          </p>
        </div>
      </div>

      <div className="border-t border-b py-3 flex items-center justify-between">
        <span className={`text-sm font-semibold ${style.text}`}>{status}</span>

        <span className="text-sm text-gray-500">
          {record.attendance_method || "N/A"}
        </span>
      </div>

      <div>
        <h4 className="font-bold mb-3">Photo Comparison</h4>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <PhotoBox label="Profile Photo" photo={profilePhoto} />

          <span className="font-bold text-gray-900 text-lg">VS</span>

          <PhotoBox label="Attendance Selfie" photo={photo} />
        </div>
      </div>

      <MatchScoreCard record={record} />

      <FaceReviewMessage record={record} />

      <div>
        <h4 className="font-bold mb-3">Attendance Details</h4>

        <DetailRow label="Date" value={record.attendance_date} />
        <DetailRow label="Time In" value={getTimeIn(record)} />
        <DetailRow label="Time Out" value={getTimeOut(record)} />
        <DetailRow label="Location" value={getLocation(record)} />
        <DetailRow label="Latitude" value={getLat(record) || "N/A"} />
        <DetailRow label="Longitude" value={getLng(record) || "N/A"} />
      </div>

      {canReview && (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onApproveAttendance(record)}
            className="rounded-lg bg-green-600 text-white py-3 text-sm font-semibold hover:bg-green-700"
          >
            Approve
          </button>

          <button
            type="button"
            onClick={() => onRejectAttendance(record)}
            className="rounded-lg bg-red-600 text-white py-3 text-sm font-semibold hover:bg-red-700"
          >
            Reject
          </button>
        </div>
      )}

      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="block text-center rounded-lg bg-blue-600 text-white text-sm py-2"
        >
          Open in Google Maps
        </a>
      )}
    </div>
  );
};

const MatchScoreCard = ({ record }) => {
  const hasScore =
    record.face_match_score !== null && record.face_match_score !== undefined;

  return (
    <div className="rounded-lg border bg-blue-50 border-blue-200 p-4">
      <p className="text-sm text-blue-600">Face Match Score</p>

      <p className="text-3xl font-bold text-blue-700">
        {hasScore ? `${record.face_match_score}%` : "--"}
      </p>
    </div>
  );
};

const FaceReviewMessage = ({ record }) => {
  if (record.face_review_status === "AUTO_APPROVED") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-3">
        <p className="font-semibold text-green-700">✓ Auto Approved</p>
        <p className="text-xs text-green-500 mt-1">
          Face matched successfully and attendance was verified.
        </p>
      </div>
    );
  }

  if (record.face_review_status === "APPROVED") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-3">
        <p className="font-semibold text-green-700">✓ Manually Approved</p>
        <p className="text-xs text-green-500 mt-1">
          This attendance was approved by an admin.
        </p>
      </div>
    );
  }

  if (record.face_review_status === "REJECTED") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3">
        <p className="font-semibold text-red-700">Rejected</p>
        <p className="text-xs text-red-500 mt-1">
          This attendance was rejected by an admin.
        </p>
      </div>
    );
  }

  if (record.face_review_status === "NEEDS_REVIEW") {
    return (
      <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
        <p className="font-semibold text-orange-700">⚠ Needs Admin Review</p>

        {record.face_review_reason && (
          <p className="text-xs text-orange-500 mt-1">
            {record.face_review_reason}
          </p>
        )}
      </div>
    );
  }

  if (record.face_review_status === "NO_PROFILE_PHOTO") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3">
        <p className="font-semibold text-red-700">No Profile Photo Found</p>
        <p className="text-xs text-red-500 mt-1">
          Upload a profile photo for this employee to enable face matching.
        </p>
      </div>
    );
  }

  if (record.face_review_status === "FACE_MATCH_FAILED") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3">
        <p className="font-semibold text-red-700">Face Match Failed</p>
        <p className="text-xs text-red-500 mt-1">
          {record.face_review_reason || "Face verification failed."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="font-semibold text-gray-700">Verification Pending</p>
      <p className="text-xs text-gray-500 mt-1">
        Attendance record has not been processed yet.
      </p>
    </div>
  );
};

const StatCard = ({ label, value, color }) => {
  const colorClass =
    color === "green"
      ? "text-green-600"
      : color === "orange"
        ? "text-orange-500"
        : color === "red"
          ? "text-red-600"
          : color === "gray"
            ? "text-gray-600"
            : "text-gray-900";

  return (
    <div className="bg-white border rounded-xl p-3 sm:p-4">
      <p className="text-xs sm:text-sm text-gray-500">{label}</p>
      <h3 className={`mt-2 text-2xl sm:text-3xl font-bold ${colorClass}`}>{value}</h3>
    </div>
  );
};

const DetailRow = ({ label, value }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-3 py-2 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 wrap-break-word">{value || "--"}</span>
    </div>
  );
};

const PhotoBox = ({ label, photo }) => {
  return (
    <div className="text-center">
      <div className="h-32 rounded-xl bg-gray-100 overflow-hidden border">
        {photo ? (
          <img src={photo} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
            No Photo
          </div>
        )}
      </div>

      <p className="mt-2 text-xs text-gray-500">{label}</p>
    </div>
  );
};

export default AttendanceGridReview;