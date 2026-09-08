import { useEffect, useState } from "react";

// Matches Tailwind's `lg` breakpoint so components can switch between a
// narrow mobile-card layout and a wider desktop grid at the same point
// the rest of the app treats as "desktop/laptop".
const DEFAULT_BREAKPOINT = 1024;

export default function useIsDesktop(breakpoint = DEFAULT_BREAKPOINT) {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= breakpoint,
  );

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${breakpoint}px)`);
    const handleChange = (event) => setIsDesktop(event.matches);

    setIsDesktop(mql.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, [breakpoint]);

  return isDesktop;
}
