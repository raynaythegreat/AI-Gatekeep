import { SecureStorage } from './secureStorage';

// Helper function to build headers with API keys for chat API
export async function buildChatApiHeaders(baseHeaders: Record<string, string> = {}): Promise<Record<string, string>> {
  const headers = { ...baseHeaders };
  
  try {
    const keyNames: (keyof import('./secureStorage').ApiKeys)[] = ['anthropic', 'openai', 'gemini', 'groq', 'openrouter', 'fireworks', 'mistral', 'perplexity', 'zai', 'nanobanana', 'ideogram', 'github', 'vercel', 'render', 'ngrok', 'ollamaBaseUrl', 'opencodezen', 'mobilePassword'];
    const headerMap: Record<(keyof import('./secureStorage').ApiKeys), string> = {
      anthropic: 'X-API-Key-Anthropic',
      openai: 'X-API-Key-Openai',
      gemini: 'X-API-Key-Gemini',
      groq: 'X-API-Key-Groq',
      openrouter: 'X-API-Key-Openrouter',
      fireworks: 'X-API-Key-Fireworks',
      mistral: 'X-API-Key-Mistral',
      perplexity: 'X-API-Key-Perplexity',
      zai: 'X-API-Key-Zai',
      nanobanana: 'X-API-Key-Nanobanana',
      ideogram: 'X-API-Key-Ideogram',
      github: 'X-API-Key-GitHub',
      vercel: 'X-API-Key-Vercel',
      render: 'X-API-Key-Render',
      ngrok: 'X-API-Key-Ngrok',
      ollamaBaseUrl: '', // Ollama uses URL, not a token
      opencodezen: 'X-API-Key-Opencodezen',
      mobilePassword: '' // Mobile password is not sent as API header
    };
    
    for (const keyName of keyNames) {
      if (keyName === 'ollamaBaseUrl' || keyName === 'mobilePassword') continue;
      const key = await SecureStorage.getKey(keyName);
      if (key) {
        headers[headerMap[keyName]] = key;
      }
    }
  } catch (error) {
    console.error('Failed to load API keys:', error);
  }
  
  return headers;
}