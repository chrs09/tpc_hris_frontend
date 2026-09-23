import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  getMobileAppVersion,
  setMobileAppVersion,
  syncMobileAppVersionFromEas,
  getMobileAppVersionEasHistory,
} from "../../api/mobileAppVersion";
import { Button } from "../../components/ui/button/Button";

// The mobile app is currently distributed as a directly-sideloaded APK
// (not through Google Play), which has no store-driven update
// mechanism of its own -- the app checks these values on launch and
// prompts testers to update when they're running an outdated build.
// See tytan_mobile/src/hooks/useAppVersionCheck.ts.
const SettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [exists, setExists] = useState(false);

  const [latestVersion, setLatestVersion] = useState("");
  const [minSupportedVersion, setMinSupportedVersion] = useState("");
  const [apkUrl, setApkUrl] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(false);

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      setHistoryError(false);
      const data = await getMobileAppVersionEasHistory("android", "preview");
      setHistory(data);
    } catch {
      setHistoryError(true);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await getMobileAppVersion("android");
        setExists(true);
        setLatestVersion(data.latest_version);
        setMinSupportedVersion(data.min_supported_version);
        setApkUrl(data.apk_url);
        setReleaseNotes(data.release_notes || "");
        setUpdatedAt(data.updated_at);
      } catch (error) {
        if (error.response?.status !== 404) {
          toast.error("Failed to load mobile app version info.");
        }
      } finally {
        setLoading(false);
      }
    };

    load();
    loadHistory();
  }, []);

  const handleSave = async (event) => {
    event.preventDefault();

    if (!latestVersion.trim() || !minSupportedVersion.trim() || !apkUrl.trim()) {
      toast.error("Latest version, minimum supported version, and APK URL are required.");
      return;
    }

    try {
      setSaving(true);
      const data = await setMobileAppVersion("android", {
        latest_version: latestVersion.trim(),
        min_supported_version: minSupportedVersion.trim(),
        apk_url: apkUrl.trim(),
        release_notes: releaseNotes.trim() || null,
      });
      setExists(true);
      setUpdatedAt(data.updated_at);
      toast.success("Mobile app version updated.");
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Failed to update mobile app version.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-fg">Settings</h1>
      </div>

      <div className="max-w-xl rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-fg">
              Mobile App Version (Android)
            </h2>
            <p className="mt-1 text-sm text-fg-subtle">
              Testers install the app directly from an APK build, not
              Google Play, so it has no automatic update mechanism -- the
              app checks these values on launch and prompts them to
              update.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            disabled={syncing}
            onClick={async () => {
              try {
                setSyncing(true);
                const data = await syncMobileAppVersionFromEas(
                  "android",
                  "preview",
                );
                setExists(true);
                setLatestVersion(data.latest_version);
                setApkUrl(data.apk_url);
                setUpdatedAt(data.updated_at);
                if (!minSupportedVersion) {
                  setMinSupportedVersion(data.min_supported_version);
                }
                toast.success(
                  `Synced latest EAS build (${data.latest_version}).`,
                );
                loadHistory();
              } catch (error) {
                toast.error(
                  error.response?.data?.detail ||
                    "Failed to sync from EAS.",
                );
              } finally {
                setSyncing(false);
              }
            }}
          >
            {syncing ? "Syncing..." : "Sync from EAS"}
          </Button>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-fg-subtle">Loading...</p>
        ) : (
          <form onSubmit={handleSave} className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-fg">
                Latest Version
              </label>
              <input
                type="text"
                value={latestVersion}
                onChange={(e) => setLatestVersion(e.target.value)}
                placeholder="e.g. 1.0.2"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-fg">
                Minimum Supported Version
              </label>
              <p className="mb-1 text-xs text-fg-subtle">
                Below this, the update prompt is non-dismissible.
              </p>
              <input
                type="text"
                value={minSupportedVersion}
                onChange={(e) => setMinSupportedVersion(e.target.value)}
                placeholder="e.g. 1.0.0"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-fg">
                APK Download URL
              </label>
              <input
                type="text"
                value={apkUrl}
                onChange={(e) => setApkUrl(e.target.value)}
                placeholder="https://expo.dev/accounts/.../builds/..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-fg">
                Release Notes (optional)
              </label>
              <textarea
                value={releaseNotes}
                onChange={(e) => setReleaseNotes(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {exists && updatedAt && (
              <p className="text-xs text-fg-subtle">
                Last updated {new Date(updatedAt).toLocaleString()}
              </p>
            )}

            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </form>
        )}
      </div>

      <div className="max-w-xl rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold text-fg">Version History</h2>
        <p className="mt-1 text-sm text-fg-subtle">
          Recent Android "preview" builds pulled from EAS, newest first.
        </p>

        {historyLoading ? (
          <p className="mt-4 text-sm text-fg-subtle">Loading...</p>
        ) : historyError ? (
          <p className="mt-4 text-sm text-fg-subtle">
            Couldn't load build history from EAS.
          </p>
        ) : history.length === 0 ? (
          <p className="mt-4 text-sm text-fg-subtle">No builds found yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {history.map((build) => {
              const isCurrent = build.app_version === latestVersion;
              return (
                <li
                  key={build.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-fg">
                        {build.app_version || "Unknown version"}
                      </span>
                      {isCurrent && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                          Current
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          build.status === "FINISHED"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : build.status === "ERRORED" ||
                                build.status === "CANCELED"
                              ? "bg-red-500/10 text-red-600"
                              : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        {build.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-fg-subtle">
                      {build.completed_at || build.created_at
                        ? new Date(
                            build.completed_at || build.created_at,
                          ).toLocaleString()
                        : "—"}
                    </p>
                  </div>

                  {build.apk_url && (
                    <a
                      href={build.apk_url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 text-sm font-semibold text-primary hover:underline"
                    >
                      Download
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
