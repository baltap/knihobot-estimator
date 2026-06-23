import "server-only";
import { GoogleGenAI } from "@google/genai";

export interface ExtractedBook {
  title: string;
  author: string;
}

// Timeout helper (Promise-based)
function timeoutPromise<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} request timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/**
 * Extracts book titles and authors from a base64-encoded photo of book spines.
 * Performs a real API request if GEMINI_API_KEY is configured, otherwise
 * runs in mock demo mode returning realistic Czech titles from the snapshot.
 */
export async function extractBookTitlesFromSpine(
  base64Data: string,
  mimeType: string
): Promise<ExtractedBook[]> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim().length === 0) {
    console.warn(
      "[Spine AI] GEMINI_API_KEY not found in environment variables. Running in Mock Demo mode."
    );
    // Simulate 2.5-second processing latency
    await new Promise((resolve) => setTimeout(resolve, 2500));
    
    // Return 3 popular books directly from the snapshot database
    return [
      { title: "15 roků lásky", author: "Patrik Hartl" },
      { title: "Gump. Pes, který naučil lidi žít", author: "Filip Rožek" },
      { title: "Dívka ve vlaku", author: "Paula Hawkins" },
    ];
  }

  // Initialize unified Google GenAI client
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Analyze this photo of a stack or shelf of book spines.
    Extract the main title and author of each book whose spine is readable.
    Try your absolute best to locate both the title and the author for each book to enable successful catalog lookup.
    If the author name is not visible, use your general knowledge to infer the author of the title, or return an empty string if unknown.
    Return the response as a JSON array of objects, conforming strictly to the requested schema.
  `;

  // 25-second timeout guard to prevent indefinite hangs
  const apiCall = ai.models.generateContent({
    model: "gemini-3-flash-preview", // latest balanced multimodal model
    contents: [
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            author: { type: "STRING" },
          },
          required: ["title", "author"],
        },
      },
    },
  });

  const result = await timeoutPromise(apiCall, 25000, "Gemini API");
  const textResponse = result.text;

  if (!textResponse || textResponse.trim().length === 0) {
    throw new Error("Empty response received from Gemini API");
  }

  // Defensive JSON parsing and validation
  const parsed = JSON.parse(textResponse);
  if (!Array.isArray(parsed)) {
    throw new Error("Gemini API did not return a JSON array");
  }

  // Ensure items have title and author strings
  const validatedBooks: ExtractedBook[] = [];
  for (const item of parsed) {
    if (item && typeof item === "object" && typeof item.title === "string") {
      validatedBooks.push({
        title: item.title.trim(),
        author: typeof item.author === "string" ? item.author.trim() : "",
      });
    }
  }

  return validatedBooks;
}
