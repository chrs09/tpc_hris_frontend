export const computePayroll = ({ employee, attendanceRecords }) => {
  const dailyRate = Number(employee.daily_rate || 0);

  const hourlyRate = dailyRate / 8;

  let totalHours = 0;
  let otHours = 0;

  attendanceRecords.forEach((record) => {
    const workedHours = Number(record.total_hours || 0);

    const regularHours = Math.min(workedHours, 8);

    const overtime = Math.max(workedHours - 8, 0);

    totalHours += regularHours;
    otHours += overtime;
  });

  const basicPay = totalHours * hourlyRate;

  const otPay = otHours * hourlyRate * 1.25;

  const grossPay = basicPay + otPay;

  return {
    hourlyRate,
    totalHours,
    otHours,
    basicPay,
    otPay,
    grossPay,
  };
};
