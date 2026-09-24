import { useEffect, useState } from "react";
import { getMobileAppVersion } from "../../api/mobileAppVersion";

// Public, unauthenticated page -- the link a coordinator/superadmin
// sends directly to a driver's phone. Always reflects whatever is
// currently published as the Android "latest version" in Admin ->
// Settings (GET /mobile-app-version/android, already public since the
// mobile app itself calls it before login -- see
// tytan_mobile/src/hooks/useAppVersionCheck.ts). No separate storage
// or "share link" step needed on the admin side; this page and the
// in-app update prompt always point at the same published build.
export default function AppDownload() {
  const [version, setVersion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getMobileAppVersion("android")
      .then((data) => setVersion(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="text-center">
          <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            TYTAN PORTAL
          </span>
          <h1 className="mt-4 text-2xl font-bold text-fg">
            Get the Driver App
          </h1>
          <p className="mt-2 text-sm text-fg-subtle">
            Download and install the Android app directly on your phone.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-surface p-6">
          {loading ? (
            <p className="text-center text-sm text-fg-subtle">Loading...</p>
          ) : error || !version ? (
            <p className="text-center text-sm text-fg-subtle">
              No app version has been published yet. Please check back
              later or contact your coordinator.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-fg-subtle">
                    Latest Version
                  </p>
                  <p className="text-xl font-bold text-fg">
                    v{version.latest_version}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
                  Android
                </span>
              </div>

              {version.release_notes && (
                <div className="mt-4 rounded-xl bg-background p-4">
                  <p className="text-xs font-semibold text-fg-subtle">
                    What's new
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-fg">
                    {version.release_notes}
                  </p>
                </div>
              )}

              <a
                href={version.apk_url}
                className="mt-6 block w-full rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-fg hover:opacity-90"
              >
                Download APK
              </a>

              <p className="mt-3 text-center text-xs text-fg-subtle">
                Updated{" "}
                {version.updated_at
                  ? new Date(version.updated_at).toLocaleDateString()
                  : "recently"}
              </p>
            </>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-sm font-semibold text-fg">
            How to install
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-fg-muted">
            <li>
              Tap <span className="font-semibold text-fg">Download APK</span>{" "}
              above using your phone's browser.
            </li>
            <li>
              Open the downloaded file. If prompted, allow your browser to
              install apps from this source (Android will ask once).
            </li>
            <li>Tap Install, then open the app and log in.</li>
          </ol>
        </div>

        <p className="mt-6 text-center text-xs text-fg-subtle">
          This app is distributed directly, not through Google Play. Only
          install it if this link was sent to you by Tytan Prime
          Corporation.
        </p>
      </div>
    </div>
  );
}
