import { attendanceRecord } from "../attendance/index";
import { getEmployeeList } from "../employees/index";

export const getPayrollData = async () => {
  const employees = await getEmployeeList();
  const attendance = await attendanceRecord();

  return {
    employees,
    attendance,
  };
};
