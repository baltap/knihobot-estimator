/**
 * Validates a string to ensure it is a valid ISBN-13 / EAN-13 barcode.
 * Specifically checks for:
 * - Proper EAN-13 length (13 numeric digits) after stripping formatting characters
 * - Valid book prefixes (978 or 979)
 * - Standard EAN-13 modulo 10 checksum verification
 */
export function isValidIsbn13(rawIsbn: string): boolean {
  // Strip spaces, dashes, etc.
  const clean = rawIsbn.replace(/[\s-]/g, "");

  // Must be exactly 13 digits
  if (!/^\d{13}$/.test(clean)) {
    return false;
  }

  // Must start with standard book prefixes 978 or 979
  const prefix = clean.substring(0, 3);
  if (prefix !== "978" && prefix !== "979") {
    return false;
  }

  // Calculate EAN-13 checksum
  // Sum = sum(d_i * weight_i) for i = 1 to 13
  // weight is 1 for odd positions (1-indexed), 3 for even positions
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    const digit = parseInt(clean[i], 10);
    const weight = i % 2 === 0 ? 1 : 3; // 0-indexed: index 0 (1st pos) is odd -> weight 1, index 1 (2nd pos) is even -> weight 3
    sum += digit * weight;
  }

  return sum % 10 === 0;
}
