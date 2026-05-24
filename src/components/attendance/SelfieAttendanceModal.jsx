import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../ui/button/Button";

const SelfieAttendanceModal = ({ isOpen, onClose, employees, onSubmit }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const outputCanvasRef = useRef(null);
  const streamRef = useRef(null);

  const [employeeId, setEmployeeId] = useState("");
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detectingAddress, setDetectingAddress] = useState(false);

  const formatAddress = (data) => {
    const a = data?.address || {};

    const road = a.road || a.pedestrian || a.footway || a.path || "";
    const barangay =
      a.village || a.suburb || a.neighbourhood || a.quarter || "";
    const city = a.city || a.town || a.municipality || a.county || "";
    const province = a.state || "";
    const postcode = a.postcode || "";
    const country = a.country || "";

    return [road, barangay, city, province, postcode, country]
      .filter(Boolean)
      .join(", ");
  };

  const getAddressFromCoordinates = useCallback(async (latitude, longitude) => {
    try {
      setDetectingAddress(true);

      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
      );

      const data = await res.json();
      const formatted = formatAddress(data);

      return formatted || data?.display_name || "Address not found";
    } catch {
      return "Address not found";
    } finally {
      setDetectingAddress(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        alert("Camera access denied or unavailable.");
      }
    };

    const getLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;

          setLocation({ latitude, longitude });

          const detectedAddress = await getAddressFromCoordinates(
            latitude,
            longitude,
          );

          setAddress(detectedAddress);
        },
        () => {
          alert("Location permission is required.");
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        },
      );
    };

    startCamera();
    getLocation();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, getAddressFromCoordinates]);

  if (!isOpen) return null;

  const loadImage = (src) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const getFormattedDateTime = () => {
    const now = new Date();

    return now.toLocaleString("en-PH", {
      weekday: "long",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Manila",
    });
  };

  const drawRoundedRect = (ctx, x, y, width, height, radius) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  };

  const wrapText = (ctx, text, x, y, maxWidth, lineHeight) => {
    const words = text.split(" ");
    let line = "";
    let currentY = y;

    words.forEach((word) => {
      const testLine = `${line}${word} `;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && line !== "") {
        ctx.fillText(line, x, currentY);
        line = `${word} `;
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    });

    ctx.fillText(line, x, currentY);

    return currentY + lineHeight;
  };

  const generateGpsProofImage = async () => {
    const video = videoRef.current;
    const outputCanvas = outputCanvasRef.current;

    if (!video || !outputCanvas || !location) return null;

    const width = 1280;
    const height = 960;

    outputCanvas.width = width;
    outputCanvas.height = height;

    const ctx = outputCanvas.getContext("2d");

    ctx.drawImage(video, 0, 0, width, height);

    const latitude = Number(location.latitude).toFixed(6);
    const longitude = Number(location.longitude).toFixed(6);

    const mapUrl = `${import.meta.env.VITE_API_URL}/api/map/static?lat=${location.latitude}&lng=${location.longitude}&zoom=18&width=320&height=220`;

    let mapImage = null;

    try {
      mapImage = await loadImage(mapUrl);
    } catch {
      mapImage = null;
    }

    const padding = 28;
    const mapWidth = 300;
    const mapHeight = 210;
    const overlayX = 380;
    const overlayY = height - 255;
    const overlayWidth = width - overlayX - padding;
    const overlayHeight = 215;

    if (mapImage) {
      ctx.drawImage(
        mapImage,
        padding,
        height - mapHeight - padding,
        mapWidth,
        mapHeight,
      );
    } else {
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(padding, height - mapHeight - padding, mapWidth, mapHeight);

      ctx.fillStyle = "#ffffff";
      ctx.font = "22px Arial";
      ctx.fillText("Map unavailable", padding + 55, height - 130);
    }

    ctx.fillStyle = "rgba(0,0,0,0.68)";
    drawRoundedRect(ctx, overlayX, overlayY, overlayWidth, overlayHeight, 18);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 38px Arial";
    ctx.fillText("Attendance GPS Camera", overlayX + 28, overlayY + 48);

    ctx.font = "bold 28px Arial";
    wrapText(
      ctx,
      address || "Address not found",
      overlayX + 28,
      overlayY + 88,
      overlayWidth - 55,
      32,
    );

    ctx.font = "26px Arial";
    ctx.fillText(
      `Lat ${latitude}, Long ${longitude}`,
      overlayX + 28,
      overlayY + 145,
    );

    ctx.fillText(
      `${getFormattedDateTime()} GMT+08:00`,
      overlayX + 28,
      overlayY + 180,
    );

    ctx.font = "24px Arial";
    ctx.fillText(
      "Note: Captured by HRIS Attendance",
      overlayX + 28,
      overlayY + 210,
    );

    return new Promise((resolve) => {
      outputCanvas.toBlob(
        (blob) => {
          if (!blob) return resolve(null);

          const file = new File([blob], "attendance-gps-proof.jpg", {
            type: "image/jpeg",
          });

          resolve({
            file,
            preview: URL.createObjectURL(blob),
          });
        },
        "image/jpeg",
        0.92,
      );
    });
  };

  const capturePhoto = async () => {
    if (!location) {
      alert("GPS location is still loading.");
      return;
    }

    const result = await generateGpsProofImage();

    if (!result) {
      alert("Failed to generate attendance image.");
      return;
    }

    setPhotoFile(result.file);
    setPreviewUrl(result.preview);
  };

  const retakePhoto = () => {
    setPhotoFile(null);
    setPreviewUrl(null);
  };

  const resetForm = () => {
    setEmployeeId("");
    setLocation(null);
    setAddress("");
    setPhotoFile(null);
    setPreviewUrl(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!employeeId) {
      alert("Please select employee.");
      return;
    }

    if (!photoFile) {
      alert("Please capture selfie first.");
      return;
    }

    if (!location) {
      alert("Location is required.");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("employee_id", employeeId);
      formData.append("latitude", location.latitude);
      formData.append("longitude", location.longitude);
      formData.append("address", address || "Address not found");
      formData.append("photo", photoFile);

      await onSubmit(formData);

      resetForm();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 px-3">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-5">
        <h2 className="text-lg font-bold mb-4">Selfie Attendance</h2>

        <select
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          className="w-full border rounded h-10 px-3 mb-3"
        >
          <option value="">Select Employee</option>

          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
            </option>
          ))}
        </select>

        {!previewUrl ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-80 object-cover rounded-lg border bg-black"
          />
        ) : (
          <img
            src={previewUrl}
            alt="Captured attendance proof"
            className="w-full h-80 object-cover rounded-lg border"
          />
        )}

        <canvas ref={canvasRef} className="hidden" />
        <canvas ref={outputCanvasRef} className="hidden" />

        <div className="mt-3 text-sm space-y-2">
          <p>
            <strong>Latitude:</strong> {location?.latitude || "--"}
          </p>

          <p>
            <strong>Longitude:</strong> {location?.longitude || "--"}
          </p>

          <textarea
            value={detectingAddress ? "Detecting address..." : address}
            readOnly
            placeholder="Detecting address..."
            className="w-full border rounded px-3 py-2 bg-gray-100 min-h-20 resize-none"
          />
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>

          {!previewUrl ? (
            <Button
              onClick={capturePhoto}
              disabled={!location || detectingAddress}
            >
              Capture GPS Selfie
            </Button>
          ) : (
            <Button variant="secondary" onClick={retakePhoto}>
              Retake
            </Button>
          )}

          <Button onClick={handleSubmit} disabled={loading || !previewUrl}>
            {loading ? "Saving..." : "Confirm This Employee"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SelfieAttendanceModal;
