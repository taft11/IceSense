const PHONE_NUMBER_PATTERN = /^09\d{9}$/;

export const sanitizePhoneNumberInput = (value = '') => {
  const digits = String(value).replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  const trimmedDigits = digits.replace(/^0+/, '');
  const normalized = trimmedDigits.startsWith('9') ? `0${trimmedDigits}` : `09${trimmedDigits}`;
  return normalized.slice(0, 11);
};

export const normalizePhoneNumber = (value = '') => {
  const sanitized = sanitizePhoneNumberInput(value);
  if (!sanitized) {
    return '';
  }

  if (sanitized.length < 2) {
    return '09';
  }

  return sanitized.startsWith('09') ? sanitized : `09${sanitized.replace(/^0+/, '').slice(0, 9)}`;
};

export const getMissingProfileFields = (accountInfo = {}) => {
  const missing = [];
  const invalid = [];
  const normalizedPhone = normalizePhoneNumber(accountInfo.contactNumber);

  if (!String(accountInfo.firstName || '').trim()) {
    missing.push('First name');
  }

  if (!String(accountInfo.lastName || '').trim()) {
    missing.push('Last name');
  }

  if (!String(accountInfo.contactNumber || '').trim()) {
    missing.push('Phone number');
  } else if (!PHONE_NUMBER_PATTERN.test(normalizedPhone)) {
    invalid.push('Phone number must start with 09 and contain exactly 11 digits');
  }

  return { missing, invalid, normalizedPhone };
};
