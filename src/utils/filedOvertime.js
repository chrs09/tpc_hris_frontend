// Overtime the employee filed (see components/overtime/FiledOvertimeBadge.jsx).

const hoursOf = (r) => Number(r.approved_hours ?? r.hours ?? 0);

export const summarizeFiledOvertime = (requests = []) => ({
  approved: requests
    .filter((r) => r.status === "approved")
    .reduce((sum, r) => sum + hoursOf(r), 0),
  pending: requests
    .filter((r) => r.status === "pending")
    .reduce((sum, r) => sum + Number(r.hours || 0), 0),
  count: requests.length,
});

export const filedOvertimeTitle = (requests = []) =>
  requests
    .map(
      (r) =>
        `${r.ot_date}  ${r.time_in || "--"}-${r.time_out || "--"}  ${hoursOf(r).toFixed(2)} h  ${r.status}${
          r.reason ? ` -- ${r.reason}` : ""
        }`,
    )
    .join("\n");
