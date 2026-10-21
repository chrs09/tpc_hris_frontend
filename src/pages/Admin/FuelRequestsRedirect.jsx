import { Navigate, useSearchParams } from "react-router-dom";

// Old Fleet Management -> Fuel Requests link: the page now lives in
// Approvals -> Fuel Request.
export default function FuelRequestsRedirect() {
  const [searchParams] = useSearchParams();
  const view = searchParams.get("view");
  return (
    <Navigate
      to={`/dashboard/approvals?tab=fuel_request${view ? `&view=${view}` : ""}`}
      replace
    />
  );
}
