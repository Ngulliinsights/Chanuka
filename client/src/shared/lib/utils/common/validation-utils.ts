/**
 * Common validation utilities
 */

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidKenyaPhoneNumber = (phone: string): boolean => {
  // Kenya phone number formats: +254XXXXXXXXX, 254XXXXXXXXX, 07XXXXXXXX, 01XXXXXXXX
  const kenyaPhoneRegex = /^(\+254|254|0)[17]\d{8}$/;
  return kenyaPhoneRegex.test(phone.replace(/\s+/g, ''));
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const isValidPostalCode = (code: string): boolean => {
  // Kenya postal codes are typically 5 digits
  const postalCodeRegex = /^\d{5}$/;
  return postalCodeRegex.test(code);
};
