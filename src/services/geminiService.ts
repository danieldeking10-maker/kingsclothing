export async function generateProductTags(name: string, category: string, description: string): Promise<string[]> {
  try {
    const response = await fetch('/api/gemini/generate-tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, category, description }),
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const data = await response.json();
    return data.tags || ["Premium", "Modern", "Urban"];
  } catch (error) {
    console.error("Gemini Proxy Error:", error);
    return ["Classic", "High-End", "Exclusive"]; // Fallback
  }
}
