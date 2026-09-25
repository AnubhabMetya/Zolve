// Mask sensitive identifiers — never expose raw values in UI
export const maskAadhaar = (val) => {
  if (!val) return 'XXXX XXXX XXXX';
  const digits = String(val).replace(/\D/g, '');
  if (digits.length < 4) return 'XXXX XXXX XXXX';
  const last4 = digits.slice(-4);
  return `XXXX XXXX ${last4}`;
};

export const maskPan = (val) => {
  if (!val) return 'XXXXX1234X';
  const s = String(val).toUpperCase().trim();
  if (s.length < 4) return 'XXXXX1234X';
  // keep last 4 visible e.g. XXXXX1234X
  return `XXXXX${s.slice(-5)}`;
};

export const maskBank = (val) => {
  if (!val) return 'XXXXXX1234';
  const digits = String(val).replace(/\D/g, '');
  if (digits.length < 4) return 'XXXXXX1234';
  return `XXXXXX${digits.slice(-4)}`;
};

export const maskGeneric = (val, visible = 4) => {
  if (!val) return '••••';
  const s = String(val);
  if (s.length <= visible) return '•'.repeat(s.length);
  return '•'.repeat(s.length - visible) + s.slice(-visible);
};
