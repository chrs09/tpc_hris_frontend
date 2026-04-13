const digitsOnly = (value = "") => value.replace(/\D/g, "");

export const formatMoney = (value = "") => {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [whole = "", decimal = ""] = cleaned.split(".");
  const formattedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decimal ? `${formattedWhole}.${decimal.slice(0, 2)}` : formattedWhole;
};

export const unformatMoney = (value = "") => value.replace(/,/g, "");

export const formatSSS = (value = "") => {
  const digits = digitsOnly(value).slice(0, 10);
  const part1 = digits.slice(0, 2);
  const part2 = digits.slice(2, 9);
  const part3 = digits.slice(9, 10);

  let formatted = part1;
  if (part2) formatted += `-${part2}`;
  if (part3) formatted += `-${part3}`;
  return formatted;
};

export const formatPhilHealth = (value = "") => {
  const digits = digitsOnly(value).slice(0, 12);
  const part1 = digits.slice(0, 2);
  const part2 = digits.slice(2, 11);
  const part3 = digits.slice(11, 12);

  let formatted = part1;
  if (part2) formatted += `-${part2}`;
  if (part3) formatted += `-${part3}`;
  return formatted;
};

export const formatPagibig = (value = "") => {
  const digits = digitsOnly(value).slice(0, 12);
  const part1 = digits.slice(0, 4);
  const part2 = digits.slice(4, 8);
  const part3 = digits.slice(8, 12);

  let formatted = part1;
  if (part2) formatted += `-${part2}`;
  if (part3) formatted += `-${part3}`;
  return formatted;
};

export const formatTIN = (value = "") => {
  const digits = digitsOnly(value).slice(0, 12);
  const part1 = digits.slice(0, 3);
  const part2 = digits.slice(3, 6);
  const part3 = digits.slice(6, 9);
  const part4 = digits.slice(9, 12);

  let formatted = part1;
  if (part2) formatted += `-${part2}`;
  if (part3) formatted += `-${part3}`;
  if (part4) formatted += `-${part4}`;
  return formatted;
};

export const isValidSSS = (value = "") => /^\d{2}-\d{7}-\d{1}$/.test(value);
export const isValidPhilHealth = (value = "") =>
  /^\d{2}-\d{9}-\d{1}$/.test(value);
export const isValidPagibig = (value = "") => /^\d{4}-\d{4}-\d{4}$/.test(value);
export const isValidTIN = (value = "") =>
  /^\d{3}-\d{3}-\d{3}(-\d{3})?$/.test(value);
