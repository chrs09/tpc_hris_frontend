/*
 * SSS contribution table — Employee (EE) share lookup.
 *
 * Source: Range of Compensation -> Employee Total (Regular SS + MPF),
 * as shown in the official SSS contribution schedule.
 *
 * Usage: pass gross pay for the cutoff directly into
 * getSSSEmployeeDeduction(grossPay). It finds the bracket the amount
 * falls into and returns the boxed "Employee Total" deduction for that
 * bracket, as-is (no monthly/semi-monthly conversion).
 */

export const SSS_CONTRIBUTION_TABLE = [
  { min: 0, max: 5249.99, employeeDeduction: 250.0 },
  { min: 5250, max: 5749.99, employeeDeduction: 275.0 },
  { min: 5750, max: 6249.99, employeeDeduction: 300.0 },
  { min: 6250, max: 6749.99, employeeDeduction: 325.0 },
  { min: 6750, max: 7249.99, employeeDeduction: 350.0 },
  { min: 7250, max: 7749.99, employeeDeduction: 375.0 },
  { min: 7750, max: 8249.99, employeeDeduction: 400.0 },
  { min: 8250, max: 8749.99, employeeDeduction: 425.0 },
  { min: 8750, max: 9249.99, employeeDeduction: 450.0 },
  { min: 9250, max: 9749.99, employeeDeduction: 475.0 },
  { min: 9750, max: 10249.99, employeeDeduction: 500.0 },
  { min: 10250, max: 10749.99, employeeDeduction: 525.0 },
  { min: 10750, max: 11249.99, employeeDeduction: 550.0 },
  { min: 11250, max: 11749.99, employeeDeduction: 575.0 },
  { min: 11750, max: 12249.99, employeeDeduction: 600.0 },
  { min: 12250, max: 12749.99, employeeDeduction: 625.0 },
  { min: 12750, max: 13249.99, employeeDeduction: 650.0 },
  { min: 13250, max: 13749.99, employeeDeduction: 675.0 },
  { min: 13750, max: 14249.99, employeeDeduction: 700.0 },
  { min: 14250, max: 14749.99, employeeDeduction: 725.0 },
  { min: 14750, max: 15249.99, employeeDeduction: 750.0 },
  { min: 15250, max: 15749.99, employeeDeduction: 775.0 },
  { min: 15750, max: 16249.99, employeeDeduction: 800.0 },
  { min: 16250, max: 16749.99, employeeDeduction: 825.0 },
  { min: 16750, max: 17249.99, employeeDeduction: 850.0 },
  { min: 17250, max: 17749.99, employeeDeduction: 875.0 },
  { min: 17750, max: 18249.99, employeeDeduction: 900.0 },
  { min: 18250, max: 18749.99, employeeDeduction: 925.0 },
  { min: 18750, max: 19249.99, employeeDeduction: 950.0 },
  { min: 19250, max: 19749.99, employeeDeduction: 975.0 },
  { min: 19750, max: 20249.99, employeeDeduction: 1000.0 },
  { min: 20250, max: 20749.99, employeeDeduction: 1025.0 },
  { min: 20750, max: 21249.99, employeeDeduction: 1050.0 },
  { min: 21250, max: 21749.99, employeeDeduction: 1075.0 },
  { min: 21750, max: 22249.99, employeeDeduction: 1100.0 },
  { min: 22250, max: 22749.99, employeeDeduction: 1125.0 },
  { min: 22750, max: 23249.99, employeeDeduction: 1150.0 },
  { min: 23250, max: 23749.99, employeeDeduction: 1175.0 },
  { min: 23750, max: 24249.99, employeeDeduction: 1200.0 },
  { min: 24250, max: 24749.99, employeeDeduction: 1225.0 },
  { min: 24750, max: 25249.99, employeeDeduction: 1250.0 },
  { min: 25250, max: 25749.99, employeeDeduction: 1275.0 },
  { min: 25750, max: 26249.99, employeeDeduction: 1300.0 },
  { min: 26250, max: 26749.99, employeeDeduction: 1325.0 },
  { min: 26750, max: 27249.99, employeeDeduction: 1350.0 },
  { min: 27250, max: 27749.99, employeeDeduction: 1375.0 },
  { min: 27750, max: 28249.99, employeeDeduction: 1400.0 },
  { min: 28250, max: 28749.99, employeeDeduction: 1425.0 },
  { min: 28750, max: 29249.99, employeeDeduction: 1450.0 },
  { min: 29250, max: 29749.99, employeeDeduction: 1475.0 },
  { min: 29750, max: 30249.99, employeeDeduction: 1500.0 },
  { min: 30250, max: 30749.99, employeeDeduction: 1525.0 },
  { min: 30750, max: 31249.99, employeeDeduction: 1550.0 },
  { min: 31250, max: 31749.99, employeeDeduction: 1575.0 },
  { min: 31750, max: 32249.99, employeeDeduction: 1600.0 },
  { min: 32250, max: 32749.99, employeeDeduction: 1625.0 },
  { min: 32750, max: 33249.99, employeeDeduction: 1650.0 },
  { min: 33250, max: 33749.99, employeeDeduction: 1675.0 },
  { min: 33750, max: 34249.99, employeeDeduction: 1700.0 },
  { min: 34250, max: 34749.99, employeeDeduction: 1725.0 },
  { min: 34750, max: Infinity, employeeDeduction: 1750.0 },
];

/**
 * Look up the SSS employee (EE) deduction for a given gross pay amount.
 * The amount is matched directly against the bracket ranges — no
 * monthly/semi-monthly conversion is applied.
 *
 * @param {number} grossPay
 * @returns {number} employee SSS deduction for that bracket
 */
export const getSSSEmployeeDeduction = (grossPay) => {
  const amount = Number(grossPay || 0);

  if (amount <= 0) return 0;

  const bracket = SSS_CONTRIBUTION_TABLE.find(
    (row) => amount >= row.min && amount <= row.max,
  );

  return bracket ? bracket.employeeDeduction : 0;
};
