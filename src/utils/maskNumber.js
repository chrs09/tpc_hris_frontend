export const maskNumber = (value) => {
  if (!value) return "";
  return value.replace(/.(?=.{4})/g, "*");
};