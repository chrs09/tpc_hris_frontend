import api from "../services/api";

export const approveOT = async (payload) => {
  const res = await api.post(
    "/overtime-approval/approve",
    payload,
  );

  return res.data;
};

export const reverseOT = async (payload) => {
  const res = await api.post(
    "/overtime-approval/reverse",
    payload,
  );

  return res.data;
};

export const getOTApprovals = async () => {
  const res = await api.get(
    "/overtime-approval/list",
  );

  return res.data;
};

export const getEmployeeOTHistory =
  async (employeeId) => {
    const res = await api.get(
      `/overtime-approval/employee/${employeeId}`,
    );

    return res.data;
  };