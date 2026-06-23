import { describe, expect, it } from "vitest";
import { isValidIsbn13 } from "./isbn-validator";

describe("isValidIsbn13", () => {
  it("should validate correct ISBN-13 strings", () => {
    expect(isValidIsbn13("9788024910086")).toBe(true);
    expect(isValidIsbn13("9788076110434")).toBe(true);
  });

  it("should ignore spaces and dashes", () => {
    expect(isValidIsbn13("978-80-249-1008-6")).toBe(true);
    expect(isValidIsbn13("978 807 611 043 4")).toBe(true);
  });

  it("should reject non-book prefixes", () => {
    // Correct checksum but prefix is 878 (not 978 or 979)
    // 8788024910086 check:
    // 8*1 + 7*3 + 8*1 + 8*3 + 0*1 + 2*3 + 4*1 + 9*3 + 1*1 + 0*3 + 0*1 + 8*3 + 6*1
    // = 8 + 21 + 8 + 24 + 0 + 6 + 4 + 27 + 1 + 0 + 0 + 24 + 6 = 129 -> 129%10 = 9 != 0.
    // Let's make a correct checksum starting with 400 (e.g. standard barcode)
    // 4002491008638:
    // 4*1 + 0*3 + 0*1 + 2*3 + 4*1 + 9*3 + 1*1 + 0*3 + 0*1 + 8*3 + 6*1 + 3*3 + 8*1
    // = 4 + 0 + 0 + 6 + 4 + 27 + 1 + 0 + 0 + 24 + 6 + 9 + 8 = 89 + 9 = 98 -> 98%10 != 0.
    // Let's verify a known non-book EAN-13: Coca-cola bottle code 5449000000996 (starts with 544)
    // 5*1 + 4*3 + 4*1 + 9*3 + 0*1 + 0*3 + 0*1 + 0*3 + 0*1 + 0*3 + 9*1 + 9*3 + 6*1
    // = 5 + 12 + 4 + 27 + 0 + 0 + 0 + 0 + 0 + 0 + 9 + 27 + 6 = 90 % 10 = 0.
    expect(isValidIsbn13("5449000000996")).toBe(false); // Valid EAN-13, but not an ISBN-13
  });

  it("should reject incorrect checksums", () => {
    expect(isValidIsbn13("9788024910085")).toBe(false); // last digit incorrect
    expect(isValidIsbn13("9788076110433")).toBe(false); // last digit incorrect
  });

  it("should reject invalid lengths or characters", () => {
    expect(isValidIsbn13("97880249100")).toBe(false); // too short
    expect(isValidIsbn13("97880249100867")).toBe(false); // too long
    expect(isValidIsbn13("978802491008a")).toBe(false); // non-numeric
    expect(isValidIsbn13("")).toBe(false); // empty
  });
});
