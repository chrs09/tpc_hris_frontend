import { useState } from "react";

import {
  fileKioskMissedTimeOut,
  getKioskStatus,
  kioskSelfieAttendance,
} from "../../api/attendance";

import { Card, CardContent } from "../../components/ui/card/Card";
import { Button } from "../../components/ui/button/Button";
import { Input } from "../../components/ui/input/Input";

import TytanLogo from "../../assets/logo/tytan-logo.jpg";
import { alertDialog, confirmDialog } from "../../components/ui/dialog/dialogService";

// Work proof size limit (same as the backend).
const WORK_PROOF_MAX_MB = 50;

export default function AttendanceKiosk() {
  const [employeeId, setEmployeeId] = useState("");
  const [employee, setEmployee] = useState(null);

  const [photoFile, setPhotoFile] = useState(null);

  const [photoPreview, setPhotoPreview] = useState(null);

  const [locationInfo, setLocationInfo] = useState(null);

  const [loading, setLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");

  // Work accomplished at time out -- asked when this person's head ticks
  // "Work accomplished" on the Org Chart (employee.work_report_required).
  const [workText, setWorkText] = useState("");
  const [workProof, setWorkProof] = useState(null);
  const [workProofPreview, setWorkProofPreview] = useState(null);

  // Forgot to time out on an earlier day (employee.missed_time_out): the
  // time they left + why, filed before this time in.
  const [missedTime, setMissedTime] = useState("");
  const [missedReason, setMissedReason] = useState("");

  const loadEmployeeStatus = async () => {
    if (!employeeId.trim()) {
      setError("Please enter Employee ID");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const result = await getKioskStatus(employeeId.trim());

      // Temporary debugging
      // alert(
      // JSON.stringify(
      //     result,
      //     null,
      //     2,
      // ),
      // );

      setEmployee(result);

      setPhotoFile(null);
      setPhotoPreview(null);
      setLocationInfo(null);
    } catch (err) {
      console.error("Employee Lookup Error:", err);

      setEmployee(null);

      setError(err?.response?.data?.detail || "Employee not found");
    } finally {
      setLoading(false);
    }
  };

  const getAddressFromCoordinates = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
      );

      const data = await response.json();

      return data.display_name || "Unknown location";
    } catch {
      return "Unable to fetch address";
    }
  };

  const getCurrentLocation = async () => {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0,
      });
    });

    const latitude = position.coords.latitude;

    const longitude = position.coords.longitude;

    const accuracy = position.coords.accuracy;

    const address = await getAddressFromCoordinates(latitude, longitude);

    return {
      latitude,
      longitude,
      accuracy,
      address,
    };
  };

  const handlePhotoChange = async (e) => {
    try {
      const file = e.target.files?.[0];

      if (!file) return;

      setError("");

      setPhotoFile(file);

      const preview = URL.createObjectURL(file);

      setPhotoPreview(preview);

      const location = await getCurrentLocation();

      setLocationInfo(location);
    } catch (err) {
      console.error(err);

      setError("Unable to get current location.");
    }
  };

  const handleSubmit = async () => {
    try {
      if (!employee) return;

      if (!photoFile) {
        setError("Please capture a selfie first.");
        return;
      }

      if (!locationInfo) {
        setError("Unable to determine location.");
        return;
      }

      const missed = employee.next_action === "time_in" ? employee.missed_time_out : null;
      if (missed && (!missedTime || !missedReason.trim())) {
        setError(`Enter the time you left on ${missed.date_label} and why you didn't time out.`);
        return;
      }

      const asksWork =
        employee.next_action === "time_out" && employee.work_report_required;
      if (asksWork && !workText.trim()) {
        setError("Please write what you worked on today.");
        return;
      }
      if (
        asksWork &&
        !workProof &&
        !(await confirmDialog(
          `No photo or video of the work was added, so this time out will be sent to ${
            employee.work_report_head || "your head"
          } for approval. Continue?`,
        ))
      ) {
        return;
      }

      setSubmitting(true);

      if (missed) {
        const filed = await fileKioskMissedTimeOut(
          employee.employee_id,
          missed.attendance_id,
          missedTime,
          missedReason.trim(),
        );
        setMissedTime("");
        setMissedReason("");
        if (filed.missed_time_out) {
          // Another earlier day is open too -- ask for that one next.
          setEmployee({ ...employee, missed_time_out: filed.missed_time_out });
          setError("");
          await alertDialog(
            `Sent for approval. You also didn't time out on ${filed.missed_time_out.date_label} -- enter that one too.`,
          );
          return;
        }
      }

      const formData = new FormData();

      formData.append("employee_id", employee.employee_id);

      formData.append("action", employee.next_action);

      formData.append("latitude", locationInfo.latitude);

      formData.append("longitude", locationInfo.longitude);

      formData.append("address", locationInfo.address);

      formData.append("photo", photoFile);

      if (asksWork) {
        formData.append("work_accomplished", workText.trim());
        if (workProof) formData.append("proof", workProof);
      }

      const result = await kioskSelfieAttendance(formData);

      alertDialog(result.message);

      resetKiosk();
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to submit attendance.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetKiosk = () => {
    setEmployee(null);
    setEmployeeId("");

    setPhotoFile(null);
    setPhotoPreview(null);

    setLocationInfo(null);

    setWorkText("");
    setWorkProof(null);
    setWorkProofPreview(null);

    setMissedTime("");
    setMissedReason("");

    setError("");
  };

  const handleWorkProofChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^(image|video)\//.test(file.type)) {
      setError("Work proof must be a photo or a video.");
      return;
    }
    if (file.size > WORK_PROOF_MAX_MB * 1024 * 1024) {
      setError(`The video is too large (${WORK_PROOF_MAX_MB} MB max). Record a shorter one.`);
      return;
    }
    setError("");
    setWorkProof(file);
    setWorkProofPreview({ url: URL.createObjectURL(file), isVideo: file.type.startsWith("video/") });
  };

  return (
    <div
      className="min-h-screen bg-[#2b2b2b] flex justify-center items-center p-4"
      style={{ colorScheme: "light" }}
    >
      <Card className="w-full max-w-lg shadow-xl rounded-2xl bg-white text-slate-900">
        <div className="flex justify-center items-center gap-4 mt-6">
          <img
            src={TytanLogo}
            alt="Logo"
            className="w-16 h-16 object-contain"
          />

          <div>
            <h1 className="font-bold text-xl">Tytan Prime Corporation</h1>

            <p className="text-sm text-gray-500">Attendance Kiosk</p>
          </div>
        </div>

        <CardContent className="space-y-6 mt-4">
          {!employee ? (
            <>
              <Input
                type="number"
                placeholder="Enter Employee ID"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              />

              <Button
                className="w-full"
                onClick={loadEmployeeStatus}
                disabled={loading || !employeeId}
              >
                {loading ? "Checking..." : "Check Attendance"}
              </Button>
            </>
          ) : (
            <>
              <div className="bg-slate-50 rounded-xl p-4 border">
                <div className="text-center mb-4">
                  <h2 className="text-2xl font-bold text-slate-900">
                    {employee.employee_name ||
                      employee.name ||
                      employee.full_name ||
                      "Employee"}
                  </h2>

                  <p className="text-sm text-slate-600 mt-1">
                    {employee.message}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-3 border">
                    <div className="text-xs text-slate-500">Time In</div>

                    <div className="font-semibold text-green-600">
                      {employee.time_in ? employee.time_in : "Not Yet"}
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-3 border">
                    <div className="text-xs text-slate-500">Time Out</div>

                    <div className="font-semibold text-blue-600">
                      {employee.time_out ? employee.time_out : "Not Yet"}
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-center">
                  <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700">
                    Next Action:{" "}
                    {employee.next_action === "time_in"
                      ? "TIME IN"
                      : employee.next_action === "time_out"
                        ? "TIME OUT"
                        : "COMPLETED"}
                  </span>
                </div>
              </div>

              {employee.next_action === "completed" ? (
                <Button className="w-full" onClick={resetKiosk}>
                  New Employee
                </Button>
              ) : (
                <>
                  {employee.next_action === "time_in" && employee.missed_time_out && (
                    <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
                      <div>
                        <p className="text-sm font-semibold text-amber-900">
                          You didn&apos;t time out on {employee.missed_time_out.date_label}
                        </p>
                        <p className="text-xs text-amber-800">
                          You timed in at {employee.missed_time_out.time_in}. Enter the time you
                          left and why -- your head approves it. Then your time in today goes
                          through.
                        </p>
                      </div>
                      <div>
                        <label htmlFor="kiosk-missed-time" className="block text-xs font-medium text-slate-700">
                          Time you left
                        </label>
                        <input
                          id="kiosk-missed-time"
                          type="time"
                          value={missedTime}
                          onChange={(e) => setMissedTime(e.target.value)}
                          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="kiosk-missed-reason" className="block text-xs font-medium text-slate-700">
                          Why didn&apos;t you time out?
                        </label>
                        <textarea
                          id="kiosk-missed-reason"
                          rows={2}
                          maxLength={1000}
                          value={missedReason}
                          onChange={(e) => setMissedReason(e.target.value)}
                          placeholder="e.g. Phone battery died, forgot"
                          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {employee.next_action === "time_out" &&
                    employee.work_report_required && (
                      <div className="space-y-3 rounded-xl border p-4">
                        <div>
                          <label
                            htmlFor="kiosk-work-text"
                            className="block text-sm font-semibold text-slate-900"
                          >
                            Work accomplished
                          </label>
                          <p className="text-xs text-slate-500">
                            What did you work on today?
                            {employee.work_report_head
                              ? ` ${employee.work_report_head} checks this.`
                              : ""}
                          </p>
                        </div>
                        <textarea
                          id="kiosk-work-text"
                          rows={3}
                          maxLength={2000}
                          value={workText}
                          onChange={(e) => setWorkText(e.target.value)}
                          placeholder="e.g. Changed oil on CAU 7766, checked brakes on CAU 7772"
                          className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900"
                        />
                        <div>
                          <p className="mb-1 text-sm font-semibold text-slate-900">
                            Photo or video of the work
                          </p>
                          {workProofPreview ? (
                            <div className="space-y-2">
                              {workProofPreview.isVideo ? (
                                <video
                                  src={workProofPreview.url}
                                  controls
                                  className="max-h-56 w-full rounded-lg bg-black"
                                />
                              ) : (
                                <img
                                  src={workProofPreview.url}
                                  alt="Work proof"
                                  className="max-h-56 w-full rounded-lg object-cover"
                                />
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setWorkProof(null);
                                  setWorkProofPreview(null);
                                }}
                                className="text-sm font-semibold text-red-600"
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <>
                              <input
                                id="kiosk-work-proof"
                                type="file"
                                accept="image/*,video/*"
                                onChange={handleWorkProofChange}
                                className="hidden"
                              />
                              <label
                                htmlFor="kiosk-work-proof"
                                className="block w-full cursor-pointer rounded-lg border border-dashed border-slate-400 py-3 text-center text-sm font-semibold text-slate-700"
                              >
                                Upload photo or video (up to 1 minute)
                              </label>
                              <p className="mt-1 text-xs text-amber-700">
                                Optional. Without it, your time out goes to your head for approval.
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                  {!photoFile ? (
                    <>
                      <input
                        id="attendance-selfie"
                        type="file"
                        accept="image/*"
                        capture="user"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />

                      <label
                        htmlFor="attendance-selfie"
                        className="w-full bg-black text-white rounded-lg py-3 text-center cursor-pointer block"
                      >
                        Capture Selfie
                      </label>
                    </>
                  ) : (
                    <>
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="rounded-xl w-full"
                      />

                      {locationInfo && (
                        <div className="bg-gray-100 text-slate-800 rounded-lg p-4 text-sm space-y-1">
                          <div>
                            <strong>Latitude:</strong> {locationInfo.latitude}
                          </div>

                          <div>
                            <strong>Longitude:</strong> {locationInfo.longitude}
                          </div>

                          <div>
                            <strong>Accuracy:</strong>{" "}
                            {Math.round(locationInfo.accuracy)} meters
                          </div>

                          <div>
                            <strong>Address:</strong> {locationInfo.address}
                          </div>
                        </div>
                      )}

                      <Button
                        className="w-full"
                        onClick={() => {
                          setPhotoFile(null);

                          setPhotoPreview(null);

                          setLocationInfo(null);
                        }}
                      >
                        Retake Selfie
                      </Button>

                      <Button
                        className="w-full"
                        onClick={handleSubmit}
                        disabled={submitting}
                      >
                        {submitting
                          ? "Submitting..."
                          : `Submit ${
                              employee.next_action === "time_in"
                                ? "Time In"
                                : "Time Out"
                            }`}
                      </Button>
                    </>
                  )}

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={resetKiosk}
                  >
                    Cancel
                  </Button>
                </>
              )}

              {error && (
                <div className="text-center text-red-500 text-sm">{error}</div>
              )}
            </>
          )}
        </CardContent>
        <div className="bg-red-100 text-red-900 p-2 text-xs">
          Secure Context: {String(window.isSecureContext)}
        </div>
      </Card>
    </div>
  );
}
