// src/services/aiAgentService.ts
export type AIProvider = 'openai' | 'anthropic' | 'groq' | 'gemini';

export interface AIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

let aiConfig: AIConfig | null = null;

export function initAI(config: AIConfig) {
  aiConfig = config;
  console.log(`AI Agent initialized with ${config.provider}`);
}

export async function chatWithAI(
  messages: AIChatMessage[],
  systemPrompt?: string
): Promise<string> {
  if (!aiConfig) {
    throw new Error('AI Agent not initialized. Call initAI first.');
  }

  const fullMessages = systemPrompt 
    ? [{ role: 'system', content: systemPrompt }, ...messages] as AIChatMessage[]
    : messages;

  try {
    let response: Response;

    switch (aiConfig.provider) {
      case 'openai':
      case 'groq':
        response = await fetch(aiConfig.baseUrl || 'https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${aiConfig.apiKey}`,
          },
          body: JSON.stringify({
            model: aiConfig.model || (aiConfig.provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini'),
            messages: fullMessages,
            temperature: 0.7,
          }),
        });
        break;

      case 'anthropic':
        response = await fetch(aiConfig.baseUrl || 'https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': aiConfig.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: aiConfig.model || 'claude-3-5-haiku-20241022',
            messages: fullMessages.filter(m => m.role !== 'system'),
            system: fullMessages.find(m => m.role === 'system')?.content,
            max_tokens: 1024,
          }),
        });
        break;

      case 'gemini':
        const geminiUrl = aiConfig.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
        response = await fetch(`${geminiUrl}?key=${aiConfig.apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: fullMessages.map(m => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }]
            })),
          }),
        });
        break;

      default:
        throw new Error(`Unsupported AI provider: ${aiConfig.provider}`);
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    if (aiConfig.provider === 'anthropic') {
      return data.content[0].text;
    } else if (aiConfig.provider === 'gemini') {
      return data.candidates[0].content.parts[0].text;
    } else {
      return data.choices[0].message.content;
    }
  } catch (error) {
    console.error('AI Agent Error:', error);
    throw error;
  }
}

export async function generateProductDescription(
  productName: string,
  category: string,
  style: string
): Promise<string> {
  const systemPrompt = `You are an expert fashion copywriter for Kings Clothing, a premium streetwear brand based in Ghana. Write compelling product descriptions.`;
  
  return chatWithAI(
    [{ role: 'user', content: `Write a product description for a ${category} called "${productName}" with ${style} style.` }],
    systemPrompt
  );
}
