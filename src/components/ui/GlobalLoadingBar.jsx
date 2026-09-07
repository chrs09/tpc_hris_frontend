import { useEffect, useState } from "react";

/*
 * Slim top-of-page progress bar shown whenever any request made through
 * the shared axios instance (src/api/services/api.js) is in flight.
 *
 * Mounted once in App.jsx so every page gets it automatically - no need
 * for each page to wire up its own "is this request pending" indicator
 * for the general case of "don't leave the user staring at a blank
 * screen wondering if anything is happening".
 */
export default function GlobalLoadingBar() {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const handleLoadingChange = (event) => {
      setIsActive((event.detail?.count || 0) > 0);
    };

    window.addEventListener("api-loading-change", handleLoadingChange);

    return () => {
      window.removeEventListener("api-loading-change", handleLoadingChange);
    };
  }, []);

  return (
    <div
      aria-hidden={!isActive}
      className={`fixed left-0 top-0 z-[9999] h-1 w-full overflow-hidden bg-transparent transition-opacity duration-200 ${
        isActive ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="h-full w-1/3 animate-[global-loading-bar_1.1s_ease-in-out_infinite] bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500" />

      <style>{`
        @keyframes global-loading-bar {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(150%);
          }
          100% {
            transform: translateX(150%);
          }
        }
      `}</style>
    </div>
  );
}
