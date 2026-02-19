export function calculateAgeFromDob(dobInput: string | Date) {
  const dob = dobInput instanceof Date ? dobInput : new Date(dobInput);
  if (Number.isNaN(dob.getTime())) return NaN;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  const dayDiff = today.getDate() - dob.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1;
  return age;
}

export function isAdultDob(dobInput: string | Date, minAge = 18) {
  const age = calculateAgeFromDob(dobInput);
  return Number.isFinite(age) && age >= minAge;
}

export function toDateOnlyString(value?: Date | null) {
  if (!value) return "";
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
