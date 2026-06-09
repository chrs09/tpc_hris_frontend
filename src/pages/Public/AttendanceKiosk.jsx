import { useState } from "react";

import { getKioskStatus, kioskSelfieAttendance } from "../../api/attendance";

import { Card, CardContent } from "../../components/ui/card/Card";
import { Button } from "../../components/ui/button/Button";
import { Input } from "../../components/ui/input/Input";

import TytanLogo from "../../assets/logo/tytan-logo.jpg";

export default function AttendanceKiosk() {
  const [employeeId, setEmployeeId] = useState("");
  const [employee, setEmployee] = useState(null);

  const [photoFile, setPhotoFile] = useState(null);

  const [photoPreview, setPhotoPreview] = useState(null);

  const [locationInfo, setLocationInfo] = useState(null);

  const [loading, setLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");

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

      setSubmitting(true);

      const formData = new FormData();

      formData.append("employee_id", employee.employee_id);

      formData.append("action", employee.next_action);

      formData.append("latitude", locationInfo.latitude);

      formData.append("longitude", locationInfo.longitude);

      formData.append("address", locationInfo.address);

      formData.append("photo", photoFile);

      const result = await kioskSelfieAttendance(formData);

      alert(result.message);

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

    setError("");
  };

  return (
    <div className="min-h-screen bg-[#2b2b2b] flex justify-center items-center p-4">
      <Card className="w-full max-w-lg shadow-xl rounded-2xl">
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
                        <div className="bg-gray-100 rounded-lg p-4 text-sm space-y-1">
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
        <div className="bg-red-100 p-2 text-xs">
          Secure Context: {String(window.isSecureContext)}
        </div>
      </Card>
    </div>
  );
}
