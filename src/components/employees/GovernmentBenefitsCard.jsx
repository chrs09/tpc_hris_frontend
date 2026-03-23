import { maskNumber } from "../../utils/maskNumber";

export default function GovernmentBenefitsCard({ employee }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">
        Government Benefits
      </h3>

      <p>
        <span className="font-medium">SSS:</span>{" "}
        {maskNumber(employee.sss_number)}
      </p>

      <p>
        <span className="font-medium">PhilHealth:</span>{" "}
        {maskNumber(employee.philhealth_number)}
      </p>

      <p>
        <span className="font-medium">Pag-IBIG:</span>{" "}
        {maskNumber(employee.pagibig_number)}
      </p>
    </div>
  );
}