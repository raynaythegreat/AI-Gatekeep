// Note: SDKs assumed installed; add to package.json if needed

export interface TestResult {
  status: 'success' | 'error' | 'not_configured';
  message: string;
  latency?: number;
}

export class ApiTester {
  static async testAnthropic(apiKey: string): Promise<TestResult> {
    if (!apiKey) return { status: 'not_configured', message: 'API key not configured' };
    // Mock test - in real implementation, use Anthropic SDK
    return { status: 'error', message: 'Anthropic SDK not available - add @anthropic-ai/sdk to package.json' };
  }

  static async testOpenAI(apiKey: string): Promise<TestResult> {
    if (!apiKey) return { status: 'not_configured', message: 'API key not configured' };
    // Mock test - in real implementation, use OpenAI SDK
    return { status: 'error', message: 'OpenAI SDK not available - add openai to package.json' };
  }

  static async testGroq(apiKey: string): Promise<TestResult> {
    if (!apiKey) return { status: 'not_configured', message: 'API key not configured' };
    // Mock test - in real implementation, use Groq SDK
    return { status: 'error', message: 'Groq SDK not available - add groq-sdk to package.json' };
  }

  static async testOllama(baseUrl?: string): Promise<TestResult> {
    try {
      const start = Date.now();
      const response = await fetch(`${baseUrl || 'http://localhost:11434'}/api/tags`);
      if (!response.ok) throw new Error('Ollama not running');
      await response.json();
      const latency = Date.now() - start;
      return { status: 'success', message: 'Connected successfully', latency };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Add tests for other providers as needed (Fireworks, OpenRouter, etc.)
}