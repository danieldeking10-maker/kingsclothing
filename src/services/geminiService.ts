import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateProductTags(name: string, category: string, description: string): Promise<string[]> {
  try {
    const prompt = `Generate exactly 3 short, premium fashion tags for a product.
    Name: "${name}"
    Category: "${category}"
    Description: "${description}"

    Each tag should be 1-2 words maximum. Focus on style, vibe, or material.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["tags"],
          properties: {
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    const data = JSON.parse(response.text || '{}');
    return data.tags || ["Premium", "Modern", "Urban"];
  } catch (error) {
    console.error("Gemini Error:", error);
    return ["Classic", "High-End", "Exclusive"]; // Fallback
  }
}
