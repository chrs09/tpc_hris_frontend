import { useState } from "react";
import toast from "react-hot-toast";
import {
  deleteApplicantOnboardingFile,
  uploadApplicantOnboardingFile,
} from "../../api/applicantOnboarding";

const getFileUrl = (filePath) => {
  if (!filePath) return "";
  return filePath.startsWith("http")
    ? filePath
    : `${import.meta.env.VITE_API_URL}/${filePath}`;
};

const isImageUrl = (url) => /\.(png|jpe?g|webp|gif|heic)$/i.test(url || "");

// Onboarding "Documents" step: the same files as Employee 201 ->
// Employment Files. All optional; each uploads right away (no Save needed).
export default function OnboardingDocuments({
  token,
  documentTypes,
  files,
  isDriver,
  onFilesChange,
}) {
  const [busyKey, setBusyKey] = useState(null);
  const [preview, setPreview] = useState(null);

  const fileFor = (key) => files.find((f) => f.document_type === key);
  const shown = documentTypes.filter((d) => !d.drivers_only || isDriver);

  const handleUpload = async (key, file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File is too large (max 10 MB).");
      return;
    }
    try {
      setBusyKey(key);
      const data = await uploadApplicantOnboardingFile(token, key, file);
      onFilesChange(data.files || []);
      toast.success("Uploaded.");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Upload failed.");
    } finally {
      setBusyKey(null);
    }
  };

  const handleRemove = async (key) => {
    try {
      setBusyKey(key);
      const data = await deleteApplicantOnboardingFile(token, key);
      onFilesChange(data.files || []);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not remove the file.");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900">Documents</h2>
      <p className="mt-1 text-sm text-gray-500">
        Optional. Upload a photo or PDF of what you have now (max 10 MB each)
        &mdash; HR can collect the rest later. Files are saved as soon as you
        upload them.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((doc) => {
          const current = fileFor(doc.key);
          const url = getFileUrl(current?.file_url);
          const busy = busyKey === doc.key;
          return (
            <div
              key={doc.key}
              className="flex flex-col items-center gap-2 rounded-2xl border border-gray-200 p-3"
            >
              <p className="min-h-[2.5rem] text-center text-xs font-medium text-gray-700">
                {doc.label}
              </p>
              <button
                type="button"
                disabled={!current}
                onClick={() => setPreview(url)}
                className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50 disabled:cursor-default"
              >
                {busy ? (
                  <span className="text-xs text-gray-400">Working...</span>
                ) : current ? (
                  isImageUrl(current.file_url) ? (
                    <img src={url} alt={doc.label} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-semibold text-red-600">PDF</span>
                  )
                ) : (
                  <span className="text-xs text-gray-400">No file</span>
                )}
              </button>
              <div className="flex gap-2">
                <label
                  className={`cursor-pointer rounded-xl bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 ${
                    busy ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  {current ? "Replace" : "Upload"}
                  <input
                    type="file"
                    hidden
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      handleUpload(doc.key, e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
                {current && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleRemove(doc.key)}
                    className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="rounded-xl bg-white p-2"
            onClick={(e) => e.stopPropagation()}
          >
            {preview.toLowerCase().endsWith(".pdf") ? (
              <iframe src={preview} title="Document" className="h-[80vh] w-[80vw]" />
            ) : (
              <img src={preview} alt="Document" className="max-h-[80vh] max-w-[90vw] rounded-lg" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
