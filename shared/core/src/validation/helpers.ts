// Small helper predicates for validation schemas
export const isAgeBetween = (min: number, max: number) => (value: unknown) => {
  try {
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) return false;

    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const m = today.getMonth() - date.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
      age--;
    }
    return age >= min && age <= max;
  } catch {
    return false;
  }
};

export default {
  isAgeBetween,
};





































