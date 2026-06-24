import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";

// Mock server-only to prevent Vitest client-import errors
vi.mock("server-only", () => ({}));

// Mock the unified GoogleGenAI SDK client
const mockGenerateContent = vi.fn();
vi.mock("@google/genai", () => {
  class MockGoogleGenAI {
    models = {
      generateContent: mockGenerateContent,
    };
  }
  return {
    GoogleGenAI: MockGoogleGenAI,
  };
});

import { extractBookTitlesFromSpine } from "./spine-analyzer";

describe("spine-analyzer", () => {
  const originalEnv = process.env;

  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("should return mock Czech snapshot books when GEMINI_API_KEY is not defined", async () => {
    // Force empty API key env context
    process.env = { ...originalEnv, GEMINI_API_KEY: "" };

    const extractionPromise = extractBookTitlesFromSpine(
      "base64dummystring",
      "image/jpeg"
    );

    // Fast-forward fake timers to resolve the simulated 2.5s delay
    vi.advanceTimersByTime(2500);

    const result = await extractionPromise;

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      title: "15 roků lásky",
      author: "Patrik Hartl",
    });
    expect(result[1]).toEqual({
      title: "Gump. Pes, který naučil lidi žít",
      author: "Filip Rožek",
    });
    expect(result[2]).toEqual({
      title: "Dívka ve vlaku",
      author: "Paula Hawkins",
    });

    // Restore environment
    process.env = originalEnv;
  });

  it("should call Gemini API and parse structured JSON response on success", async () => {
    process.env = { ...originalEnv, GEMINI_API_KEY: "valid_key" };

    const mockResponseText = JSON.stringify([
      { title: "Test Book 1", author: "Author 1" },
      { title: "Test Book 2", author: "Author 2" },
    ]);

    mockGenerateContent.mockResolvedValue({
      text: mockResponseText,
    });

    const result = await extractBookTitlesFromSpine(
      "base64dummystring",
      "image/jpeg"
    );

    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-3-flash-preview",
      })
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ title: "Test Book 1", author: "Author 1" });
    expect(result[1]).toEqual({ title: "Test Book 2", author: "Author 2" });

    process.env = originalEnv;
  });

  it("should throw an error when Gemini API returns empty content", async () => {
    process.env = { ...originalEnv, GEMINI_API_KEY: "valid_key" };

    mockGenerateContent.mockResolvedValue({
      text: "",
    });

    await expect(
      extractBookTitlesFromSpine("base64dummystring", "image/jpeg")
    ).rejects.toThrow("Empty response received from Gemini API");

    process.env = originalEnv;
  });

  it("should throw an error when Gemini API returns non-array JSON structure", async () => {
    process.env = { ...originalEnv, GEMINI_API_KEY: "valid_key" };

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ error: "some error" }),
    });

    await expect(
      extractBookTitlesFromSpine("base64dummystring", "image/jpeg")
    ).rejects.toThrow("Gemini API did not return a JSON array");

    process.env = originalEnv;
  });

  it("should throw an error when Gemini API request times out", async () => {
    process.env = { ...originalEnv, GEMINI_API_KEY: "valid_key" };

    // Promise that never resolves
    mockGenerateContent.mockReturnValue(new Promise(() => {}));

    const promise = extractBookTitlesFromSpine(
      "base64dummystring",
      "image/jpeg"
    );

    // Fast-forward fake timers by 25 seconds
    vi.advanceTimersByTime(25000);

    await expect(promise).rejects.toThrow(
      "Gemini API request timed out after 25000ms"
    );

    process.env = originalEnv;
  });
});
