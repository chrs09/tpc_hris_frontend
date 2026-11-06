import { useEffect, useState } from "react";
import { getTimeCorrectionEligibility } from "../../api/attendance/requests";

// Whether to show Time Correction for the logged-in person (the server
// decides: anyone who times in / out, not drivers / helpers).
export default function useCanFileCorrection() {
  const [canFile, setCanFile] = useState(false);
  useEffect(() => {
    getTimeCorrectionEligibility()
      .then((data) => setCanFile(Boolean(data?.can_file)))
      .catch(() => setCanFile(false));
  }, []);
  return canFile;
}
