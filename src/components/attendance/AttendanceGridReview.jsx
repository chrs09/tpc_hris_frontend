import React, { useEffect, useMemo, useState } from "react";

const getPhoto = (record) => record.time_in_photo_url || null;

const getProfilePhoto = (record) => record.profile_photo_url || null;

const getName = (record) =>
  record.employee_name || `Employee #${record.employee_id}`;

const getDepartment = (record) =>
  record.employee_department || record.department || "No department";

const getTimeIn = (record) => record.check_in_time || "No time in";

const getTimeOut = (record) => record.check_out_time || "No time out";

const toTimeInputValue = (time) => {
  if (!time) return "";

  // Already in HH:mm format
  if (/^\d{2}:\d{2}$/.test(time)) {
    return time;
  }

  // Handle HH:mm:ss
  if (/^\d{2}:\d{2}:\d{2}/.test(time)) {
    return time.substring(0, 5);
  }

  // Handle 12-hour format such as "08:05 AM"
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const period = match[3].toUpperCase();

    if (period === "AM") {
      if (hours === 12) {
        hours = 0;
      }
    } else {
      if (hours !== 12) {
        hours += 12;
      }
    }

    return `${String(hours).padStart(2, "0")}:${minutes}`;
  }

  // Handle ISO/datetime values
  if (time.includes("T")) {
    const date = new Date(time);

    if (!Number.isNaN(date.getTime())) {
      return `${String(date.getHours()).padStart(2, "0")}:${String(
        date.getMinutes(),
      ).padStart(2, "0")}`;
    }
  }

  return "";
};

const getLocation = (record) => record.time_in_address || "No location";

const getLat = (record) => record.time_in_latitude || null;

const getLng = (record) => record.time_in_longitude || null;

const getCoordinates = (record) => {
  if (!getLat(record) || !getLng(record)) {
    return "No coordinates";
  }

  return `${getLat(record)}, ${getLng(record)}`;
};

const getGoogleMapsUrl = (record) => {
  if (!getLat(record) || !getLng(record)) {
    return null;
  }

  return `https://maps.google.com/?q=${getLat(record)},${getLng(record)}`;
};

const getIsAbsent = (record) =>
  (record.status || "").toUpperCase() === "ABSENT";

const getIsLeave = (record) => {
  const status = (record.status || "").toUpperCase();

  return status === "LEAVE" || status === "ON LEAVE";
};

const getReviewStatus = (record) => {
  if (record.is_missing_attendance) {
    return "No Attendance";
  }

  if (getIsAbsent(record)) {
    return "Absent";
  }

  if (getIsLeave(record)) {
    return "Leave";
  }

  if (record.face_review_status === "AUTO_APPROVED") {
    return "Auto Approved";
  }

  if (record.face_review_status === "APPROVED") {
    return "Approved";
  }

  if (record.face_review_status === "REJECTED") {
    return "Rejected";
  }

  if (record.face_review_status === "NEEDS_REVIEW") {
    return "Needs Review";
  }

  if (record.face_review_status === "NO_PROFILE_PHOTO") {
    return "No Profile Photo";
  }

  if (record.face_review_status === "FACE_MATCH_FAILED") {
    return "Match Failed";
  }

  if (!getPhoto(record)) {
    return "No Selfie";
  }

  return "Pending";
};

const getStatusStyle = (status) => {
  if (status === "Auto Approved" || status === "Approved") {
    return {
      badge: "bg-emerald-600 text-white",
      border: "border-emerald-300",
      text: "text-emerald-700",
      card: "bg-emerald-100",
    };
  }

  if (
    status === "Rejected" ||
    status === "Match Failed" ||
    status === "Absent"
  ) {
    return {
      badge: "bg-rose-600 text-white",
      border: "border-rose-300",
      text: "text-rose-700",
      card: "bg-rose-100",
    };
  }

  if (status === "Leave") {
    return {
      badge: "bg-purple-600 text-white",
      border: "border-purple-300",
      text: "text-purple-700",
      card: "bg-purple-100",
    };
  }

  if (status === "No Selfie" || status === "No Profile Photo") {
    return {
      badge: "bg-slate-600 text-white",
      border: "border-slate-300",
      text: "text-slate-700",
      card: "bg-slate-100",
    };
  }

  if (status === "No Attendance") {
    return {
      badge: "bg-gray-500 text-white",
      border: "border-gray-300",
      text: "text-gray-700",
      card: "bg-gray-100",
    };
  }

  return {
    badge: "bg-amber-600 text-white",
    border: "border-amber-300",
    text: "text-amber-700",
    card: "bg-amber-100",
  };
};

const AttendanceGridReview = ({
  records = [],
  activeEmployeeCount = 0,
  onApproveAttendance,
  onRejectAttendance,
  onUpdateAttendance,
  onAttendanceUpdated,
}) => {
  const [selectedRecordId, setSelectedRecordId] = useState(null);

  const [modalRecordId, setModalRecordId] = useState(null);

  const [selectedStat, setSelectedStat] = useState(null);

  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1279px)").matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1279px)");

    const updateMobile = (event) => {
      setIsMobile(event.matches);
    };

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
    /*
     * IMPORTANT:
     * Missing-attendance placeholder records should
     * NOT count as actual attendance.
     */
    const attendanceRecords = records.filter(
      (record) => !record.is_missing_attendance,
    );

    const total = attendanceRecords.length;

    const autoApproved = attendanceRecords.filter(
      (record) =>
        record.face_review_status === "AUTO_APPROVED" ||
        record.face_review_status === "APPROVED",
    ).length;

    const needsReview = attendanceRecords.filter(
      (record) =>
        record.face_review_status === "NEEDS_REVIEW" ||
        record.face_review_status === "NO_PROFILE_PHOTO" ||
        record.face_review_status === "FACE_MATCH_FAILED",
    ).length;

    const rejected = attendanceRecords.filter(
      (record) => record.face_review_status === "REJECTED",
    ).length;

    const noSelfie = attendanceRecords.filter(
      (record) => !getPhoto(record),
    ).length;

    const absent = attendanceRecords.filter((record) =>
      getIsAbsent(record),
    ).length;

    return {
      total,
      autoApproved,
      needsReview,
      rejected,
      noSelfie,
      absent,
    };
  }, [records]);

  const visibleRecords = useMemo(() => {
    if (!selectedStat || selectedStat === "total") {
      return records;
    }

    if (selectedStat === "approved") {
      return records.filter(
        (record) =>
          !record.is_missing_attendance &&
          (record.face_review_status === "AUTO_APPROVED" ||
            record.face_review_status === "APPROVED"),
      );
    }

    if (selectedStat === "needsReview") {
      return records.filter(
        (record) =>
          !record.is_missing_attendance &&
          (record.face_review_status === "NEEDS_REVIEW" ||
            record.face_review_status === "NO_PROFILE_PHOTO" ||
            record.face_review_status === "FACE_MATCH_FAILED"),
      );
    }

    if (selectedStat === "rejected") {
      return records.filter(
        (record) =>
          !record.is_missing_attendance &&
          record.face_review_status === "REJECTED",
      );
    }

    if (selectedStat === "noSelfie") {
      return records.filter(
        (record) => !record.is_missing_attendance && !getPhoto(record),
      );
    }

    if (selectedStat === "absent") {
      return records.filter((record) => getIsAbsent(record));
    }

    return records;
  }, [records, selectedStat]);

  const activeRecord = useMemo(() => {
    if (!visibleRecords.length) {
      return null;
    }

    if (!selectedRecordId) {
      return visibleRecords[0];
    }

    return (
      visibleRecords.find((record) => record.id === selectedRecordId) ||
      visibleRecords[0]
    );
  }, [visibleRecords, selectedRecordId]);

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

  const handleUpdateAttendance = async (record, changes) => {
    if (!onUpdateAttendance) {
      console.warn("onUpdateAttendance was not provided.");

      return;
    }

    await onUpdateAttendance(record, changes);

    if (onAttendanceUpdated) {
      await onAttendanceUpdated();
    }
  };

  const openRecordModal = (record) => {
    setSelectedRecordId(record.id);

    if (isMobile) {
      setModalRecordId(record.id);
    }
  };

  const closeRecordModal = () => {
    setModalRecordId(null);
  };

  const handleStatSelect = (statKey) => {
    setSelectedStat((current) => (current === statKey ? null : statKey));

    setSelectedRecordId(null);
    setModalRecordId(null);
  };

  const modalRecord = isMobile
    ? visibleRecords.find((record) => record.id === modalRecordId) || null
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
        <StatCard
          label="Total Attendance"
          value={`${stats.total}/${activeEmployeeCount}`}
          onClick={() => handleStatSelect("total")}
          isActive={selectedStat === "total"}
        />

        <StatCard
          label="Approved"
          value={stats.autoApproved}
          color="green"
          onClick={() => handleStatSelect("approved")}
          isActive={selectedStat === "approved"}
        />

        <StatCard
          label="Needs Review"
          value={stats.needsReview}
          color="orange"
          onClick={() => handleStatSelect("needsReview")}
          isActive={selectedStat === "needsReview"}
        />

        <StatCard
          label="Rejected"
          value={stats.rejected}
          color="red"
          onClick={() => handleStatSelect("rejected")}
          isActive={selectedStat === "rejected"}
        />

        <StatCard
          label="No Selfie"
          value={stats.noSelfie}
          color="gray"
          onClick={() => handleStatSelect("noSelfie")}
          isActive={selectedStat === "noSelfie"}
        />

        <StatCard
          label="Absent"
          value={stats.absent}
          color="red"
          onClick={() => handleStatSelect("absent")}
          isActive={selectedStat === "absent"}
        />
      </div>

      {selectedStat && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Showing{" "}
          {selectedStat === "absent"
            ? "absent employees"
            : `${selectedStat
                .replace(/([A-Z])/g, " $1")
                .toLowerCase()} records`}
          .
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-5">
        <div>
          {!visibleRecords.length ? (
            <div className="bg-white border rounded-xl p-10 text-center text-gray-500">
              No attendance records found.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {visibleRecords.map((record) => {
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
                    className={`flex h-full flex-col overflow-hidden rounded-xl border text-left transition hover:shadow-md ${style.border} ${
                      isSelected ? "ring-2 ring-blue-500" : ""
                    } ${style.card}`}
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
                          {record.is_missing_attendance
                            ? "No Attendance"
                            : "No Selfie"}
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

                        <p>
                          <span className="font-medium">Time Out:</span>{" "}
                          {getTimeOut(record)}
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
              onUpdateAttendance={handleUpdateAttendance}
            />
          )}
        </aside>
      </div>

      {modalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Attendance Detail
              </h3>

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
                onUpdateAttendance={handleUpdateAttendance}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AttendancePhotoBox = ({ label, photo, onClick }) => {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b bg-gray-50">
        <h5 className="font-semibold text-gray-800">{label}</h5>
      </div>

      <button
        type="button"
        onClick={onClick}
        disabled={!photo}
        className={`w-full aspect-video bg-gray-100 flex items-center justify-center ${
          photo
            ? "cursor-pointer hover:bg-gray-200 transition"
            : "cursor-default"
        }`}
      >
        {photo ? (
          <img src={photo} alt={label} className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm text-gray-400">No photo available</span>
        )}
      </button>
    </div>
  );
};

const AttendanceDetail = ({
  record,
  onApproveAttendance,
  onRejectAttendance,
  onUpdateAttendance,
}) => {
  const [selectedAttendancePhoto, setSelectedAttendancePhoto] = useState(null);

  const photo = getPhoto(record);
  const profilePhoto = getProfilePhoto(record);
  const status = getReviewStatus(record);
  const style = getStatusStyle(status);
  const mapsUrl = getGoogleMapsUrl(record);

  /*
   * Editable attendance values
   */
  const [editTimeIn, setEditTimeIn] = useState(
    toTimeInputValue(record.check_in_time),
  );

  const [editTimeOut, setEditTimeOut] = useState(
    toTimeInputValue(record.check_out_time),
  );

  const [editReason, setEditReason] = useState(record.remarks || "");

  const [savingAttendance, setSavingAttendance] = useState(false);

  /*
   * Keep local fields synchronized when
   * the selected employee changes.
   */
  useEffect(() => {
    setEditTimeIn(toTimeInputValue(record.check_in_time));

    setEditTimeOut(toTimeInputValue(record.check_out_time));

    setEditReason(record.remarks || "");

    setSelectedAttendancePhoto(null);
  }, [record.id, record.check_in_time, record.check_out_time, record.remarks]);

  const canReview =
    !record.is_missing_attendance &&
    record.face_review_status !== "AUTO_APPROVED" &&
    record.face_review_status !== "APPROVED" &&
    record.face_review_status !== "REJECTED";

  const isReasonEditable = getIsAbsent(record) || getIsLeave(record);

  const hasTimeChanges =
    editTimeIn !== toTimeInputValue(record.check_in_time) ||
    editTimeOut !== toTimeInputValue(record.check_out_time);

  const hasReasonChanges = editReason !== (record.remarks || "");

  const hasChanges = hasTimeChanges || (isReasonEditable && hasReasonChanges);

  const handleSaveAttendanceDetails = async () => {
    if (record.is_missing_attendance || !onUpdateAttendance) {
      return;
    }

    if (!hasChanges) {
      return;
    }

    try {
      setSavingAttendance(true);

      await onUpdateAttendance(record, {
        check_in_time: editTimeIn || null,

        check_out_time: editTimeOut || null,

        remarks: isReasonEditable ? editReason : record.remarks || "",
      });
    } catch (error) {
      console.error("Failed to update attendance details:", error);
    } finally {
      setSavingAttendance(false);
    }
  };

  return (
    <div
      className={`p-5 space-y-5 rounded-xl border-2 ${style.border} ${style.card}`}
    >
      {/* Employee Header */}
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

      {/* Status */}
      <div
        className={`border-t border-b py-3 px-3 rounded-lg flex items-center justify-between ${style.card}`}
      >
        <span className={`text-sm font-semibold ${style.text}`}>{status}</span>

        <span className="text-sm text-gray-500">
          {record.attendance_method || "N/A"}
        </span>
      </div>

      {/* Photo Comparison */}
      <div>
        <h4 className="font-bold mb-3">Photo Comparison</h4>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <PhotoBox label="Profile Photo" photo={profilePhoto} />

          <span className="font-bold text-gray-900 text-lg">VS</span>

          <PhotoBox label="Attendance Selfie" photo={photo} />
        </div>
      </div>

      {/* Attendance Photos */}
      <div className="border-t border-b py-4">
        <div>
          <h4 className="font-bold text-gray-900">Attendance Photos</h4>

          <p className="text-xs text-gray-500 mt-1">
            Click a photo to view it in full size.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <AttendancePhotoBox
            label="Time In Photo"
            photo={record.time_in_photo_url}
            onClick={() =>
              record.time_in_photo_url &&
              setSelectedAttendancePhoto({
                title: "Time In Photo",
                url: record.time_in_photo_url,
              })
            }
          />

          <AttendancePhotoBox
            label="Time Out Photo"
            photo={record.time_out_photo_url}
            onClick={() =>
              record.time_out_photo_url &&
              setSelectedAttendancePhoto({
                title: "Time Out Photo",
                url: record.time_out_photo_url,
              })
            }
          />
        </div>
      </div>

      {/* Face Match Score */}
      <MatchScoreCard record={record} />

      {/* Face Review Message */}
      <FaceReviewMessage record={record} />

      {/* Attendance Details */}
      <div>
        <h4 className="font-bold mb-3">Attendance Details</h4>

        <DetailRow label="Date" value={record.attendance_date} />

        {/* Editable Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Time In
            </label>

            <input
              type="time"
              value={editTimeIn}
              onChange={(event) => setEditTimeIn(event.target.value)}
              disabled={record.is_missing_attendance}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white disabled:bg-gray-100 disabled:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Time Out
            </label>

            <input
              type="time"
              value={editTimeOut}
              onChange={(event) => setEditTimeOut(event.target.value)}
              disabled={record.is_missing_attendance}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white disabled:bg-gray-100 disabled:text-gray-400"
            />
          </div>
        </div>

        <DetailRow label="Location" value={getLocation(record)} />

        <DetailRow label="Latitude" value={getLat(record) || "N/A"} />

        <DetailRow label="Longitude" value={getLng(record) || "N/A"} />

        {/* Absent / Leave Reason */}
        {isReasonEditable && (
          <div className="mt-3">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Reason
            </label>

            <textarea
              value={editReason}
              onChange={(event) => setEditReason(event.target.value)}
              rows={3}
              placeholder={`Enter reason for ${
                getIsAbsent(record) ? "absence" : "leave"
              }...`}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white resize-none"
            />
          </div>
        )}

        {/* Save Changes */}
        {!record.is_missing_attendance && hasChanges && (
          <div className="flex justify-end mt-4">
            <button
              type="button"
              onClick={handleSaveAttendanceDetails}
              disabled={savingAttendance || !onUpdateAttendance}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingAttendance ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>

      {/* Approve / Reject */}
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

      {/* Google Maps */}
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

      {/* Attendance Photo Modal */}
      {selectedAttendancePhoto && (
        <div
          className="fixed inset-0 z-100 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setSelectedAttendancePhoto(null)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h3 className="font-bold text-lg">
                  {selectedAttendancePhoto.title}
                </h3>

                <p className="text-sm text-gray-500">{getName(record)}</p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAttendancePhoto(null)}
                className="w-10 h-10 rounded-full hover:bg-gray-100 text-xl"
                aria-label="Close photo"
              >
                ×
              </button>
            </div>

            {/* Large Image */}
            <div className="p-4 bg-gray-100 flex items-center justify-center">
              <img
                src={selectedAttendancePhoto.url}
                alt={selectedAttendancePhoto.title}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
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

  if (record.is_missing_attendance) {
    return (
      <div className="rounded-lg border border-gray-300 bg-gray-50 p-3">
        <p className="font-semibold text-gray-700">No Attendance</p>

        <p className="text-xs text-gray-500 mt-1">
          This employee has not taken attendance for this date.
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

const StatCard = ({ label, value, color, onClick, isActive }) => {
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
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border bg-white p-3 text-left transition sm:p-4 ${
        isActive
          ? "border-blue-500 ring-2 ring-blue-200"
          : "border-gray-200 hover:border-blue-300"
      }`}
    >
      <p className="text-xs sm:text-sm text-gray-500">{label}</p>

      <h3 className={`mt-2 text-2xl sm:text-3xl font-bold ${colorClass}`}>
        {value}
      </h3>
    </button>
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
