// Utility for input masking (simple, no dependencies)
export function maskCnic(value) {
  // Only allow digits, insert dashes at 5 and 13
  const digits = value.replace(/\D/g, '').slice(0, 13);
  let masked = '';
  if (digits.length > 0) masked += digits.slice(0, 5);
  if (digits.length > 5) masked += '-' + digits.slice(5, 12);
  if (digits.length > 12) masked += '-' + digits.slice(12, 13);
  return masked;
}

export function maskMobile(value) {
  // Only allow digits, format as 0323 9942919
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (!digits.startsWith('03')) return '03';
  let masked = '';
  if (digits.length > 0) masked += digits.slice(0, 4);
  if (digits.length > 4) masked += ' ' + digits.slice(4, 11);
  return masked;
}
