import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getMissingProfileFields,
  sanitizePhoneNumberInput,
  normalizePhoneNumber,
} from './profileValidation.js';

test('reports missing personal details required for checkout', () => {
  const result = getMissingProfileFields({ firstName: '', lastName: '', contactNumber: '' });

  assert.deepEqual(result.missing, ['First name', 'Last name', 'Phone number']);
  assert.deepEqual(result.invalid, []);
});

test('returns no issues when the required profile details are present and valid', () => {
  const result = getMissingProfileFields({ firstName: 'Ada', lastName: 'Lovelace', contactNumber: '09171234567' });

  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.invalid, []);
});

test('flags phone numbers that do not follow the required format', () => {
  const result = getMissingProfileFields({ firstName: 'Ada', lastName: 'Lovelace', contactNumber: '12345' });

  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.invalid, ['Phone number must start with 09 and contain exactly 11 digits']);
});

test('forces phone numbers to start with 09 during sanitization', () => {
  assert.equal(sanitizePhoneNumberInput('91234567890'), '09123456789');
  assert.equal(sanitizePhoneNumberInput('09123456789'), '09123456789');
  assert.equal(sanitizePhoneNumberInput('0917-123-4567'), '09171234567');
});

test('normalizes dirty input into the system phone format without breaking required validation', () => {
  assert.equal(normalizePhoneNumber('9171234567'), '09171234567');
  assert.equal(normalizePhoneNumber('0009171234567'), '09171234567');

  const result = getMissingProfileFields({
    firstName: 'Grace',
    lastName: 'Hopper',
    contactNumber: '0009171234567',
  });

  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.invalid, []);
  assert.equal(result.normalizedPhone, '09171234567');
});
