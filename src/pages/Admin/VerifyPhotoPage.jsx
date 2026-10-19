import { useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle2, MapPin, ShieldAlert, Upload } from "lucide-react";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import { verifyPhotoFile, verifyPhotoRef } from "../../api/photoVerify";

// Administrator -> Verify Photo: is a photo an original one taken through
// the system? Every stamped photo has a Ref code (on the photo, and faintly
// across all of it) and its exact file is recorded. Upload the image to
// check it's unchanged, or type the Ref code to see the real photo.

const pin = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

function Result({ result }) {
  if (!result) return null;
  if (!result.match) {
    return (
      <div className="flex gap-3 rounded-2xl border border-danger/40 bg-danger/10 p-4">
        <ShieldAlert className="shrink-0 text-danger" size={22} />
        <div>
          <p className="font-semibold text-danger">Not an original system photo</p>
          <p className="mt-1 text-sm text-fg-muted">{result.message}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-success/40 bg-success/10 p-4">
      <div className="flex gap-3">
        <CheckCircle2 className="shrink-0 text-success" size={22} />
        <div className="min-w-0 space-y-1 text-sm">
          <p className="font-semibold text-success">{result.message || "Photo found"}</p>
          <p className="text-fg">
            <span className="text-fg-subtle">Ref:</span> <span className="font-mono font-semibold">{result.ref}</span>
          </p>
          <p className="text-fg">
            <span className="text-fg-subtle">Taken:</span> {result.captured_at}
          </p>
          {result.latitude != null && (
            <p className="text-fg">
              <span className="text-fg-subtle">GPS:</span>{" "}
              <a
                href={pin(result.latitude, result.longitude)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <MapPin size={13} />
                {Number(result.latitude).toFixed(6)}, {Number(result.longitude).toFixed(6)}
              </a>
            </p>
          )}
          {result.label && (
            <p className="text-fg">
              <span className="text-fg-subtle">Location check:</span> {result.label}
            </p>
          )}
        </div>
      </div>
      {result.file_url && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-fg-subtle">
            The original photo on file -- compare it with the one you were given:
          </p>
          <a href={result.file_url} target="_blank" rel="noreferrer">
            <img
              src={result.file_url}
              alt={`Original photo ${result.ref}`}
              className="max-h-[420px] rounded-xl border border-border object-contain"
            />
          </a>
        </div>
      )}
    </div>
  );
}

export default function VerifyPhotoPage() {
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [fileName, setFileName] = useState("");

  const checkFile = async (file) => {
    if (!file) return;
    setFileName(file.name);
    try {
      setBusy(true);
      setResult(await verifyPhotoFile(file));
    } catch (error) {
      toast.error(error.response?.data?.detail || "Couldn't check the photo.");
    } finally {
      setBusy(false);
    }
  };

  const checkRef = async (e) => {
    e.preventDefault();
    if (!ref.trim()) return;
    try {
      setBusy(true);
      setResult(await verifyPhotoRef(ref.trim()));
    } catch (error) {
      setResult({
        match: false,
        message: error.response?.data?.detail || "No photo has that reference code.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionTabs group="Administrator" />
      <div>
        <h1 className="text-xl font-semibold text-fg">Verify Photo</h1>
        <p className="mt-1 max-w-2xl text-sm text-fg-subtle">
          Check that a photo is an original taken through Tytan Prime. Every photo carries a Ref
          code (in its corner and faintly across the whole picture). A cropped, edited or
          screenshotted copy won&apos;t match -- use its Ref code to see the real one.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label
          htmlFor="verify-photo-file"
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-surface p-6 text-center hover:bg-surface-hover"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            checkFile(e.dataTransfer.files?.[0]);
          }}
        >
          <Upload className="text-primary" size={26} />
          <span className="font-semibold text-fg">Upload the photo</span>
          <span className="text-xs text-fg-subtle">
            {fileName || "Drop it here or click to choose. Checks the exact file is unchanged."}
          </span>
          <input
            id="verify-photo-file"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => checkFile(e.target.files?.[0])}
          />
        </label>

        <form onSubmit={checkRef} className="flex flex-col justify-center gap-3 rounded-2xl border border-border bg-surface p-6">
          <label htmlFor="verify-photo-ref" className="font-semibold text-fg">
            Or type the Ref code
          </label>
          <input
            id="verify-photo-ref"
            value={ref}
            onChange={(e) => setRef(e.target.value.toUpperCase())}
            placeholder="TP-7F3K-92QD"
            className="h-11 rounded-lg border border-border bg-background px-3 font-mono text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="submit"
            disabled={busy || !ref.trim()}
            className="h-10 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            Look up
          </button>
        </form>
      </div>

      {busy ? <p className="text-sm text-fg-subtle">Checking...</p> : <Result result={result} />}
    </div>
  );
}
