// Context settings for AI models - similar to Ollama's context feature

export interface ContextSettings {
  // Global context setting for all models
  globalContextLength?: number;
  
  // Per-model context settings
  perModelContext?: Record<string, number>;
  
  // Whether to truncate messages to fit context
  enableTruncation?: boolean;
  
  // Whether to show context usage in UI
  showContextUsage?: boolean;
  
  // Truncation strategy
  truncationStrategy?: 'oldest' | 'middle' | 'newest';
}

// Default context lengths by model family (these are typical values, adjust as needed)
export const DEFAULT_CONTEXT_LENGTHS: Record<string, number> = {
  // Claude models
  'claude': 200000, // Claude has very large context windows
  'claude-3': 200000,
  'claude-sonnet': 200000,
  
  // OpenAI models
  'gpt-4o': 128000,
  'gpt-4': 8192,
  'gpt-4-turbo': 1024,
  'gpt-3.5-turbo': 4096,
  
  // Ollama models (can be configured)
  'ollama': 2048, // Ollama default is typically 2048
  'llama3': 2048,
  'llama2': 2048,
  'codellama': 2048,
  'mistral': 2048,
  'mixtral': 2048,
  
  // OpenRouter models (depend on underlying model)
  'openrouter': 8192,
  
  // Gemini models
  'gemini': 30720,
  'gemini-1.5': 1000000, // Gemini 1.5 has huge context
  
  // Groq models (usually 8192)
  'groq': 8192,
  'llama-3': 8192,
  
  // Defaults for safety
  'default': 4096,
};

// Minimum context lengths for different providers
export const MIN_CONTEXT_LENGTHS: Record<string, number> = {
  'claude': 1000,
  'openai': 1,
  'ollama': 1,
  'openrouter': 1,
  'gemini': 1,
  'groq': 1,
  'default': 1,
};

// Maximum context lengths for different providers
export const MAX_CONTEXT_LENGTHS: Record<string, number> = {
  'claude': 200000,
  'openai': 128000,
  'ollama': 32768, // Can be configured higher in some models
  'openrouter': 128000, // Depends on model
  'gemini': 1000000,
  'groq': 8192,
  'default': 32768,
};

// Context settings storage key
export const CONTEXT_SETTINGS_KEY = 'athena-context-settings';

/**
 * Get effective context length for a model
 */
export function getContextLengthForModel(
  modelName: string,
  provider: string,
  settings?: ContextSettings
): number {
  // Check for per-model override first
  if (settings?.perModelContext && settings.perModelContext[`${provider}/${modelName}`]) {
    return settings.perModelContext[`${provider}/${modelName}`];
  }
  
  // Check provider-specific override
  if (settings?.perModelContext && settings.perModelContext[provider]) {
    return settings.perModelContext[provider];
  }
  
  // Check global setting
  if (settings?.globalContextLength) {
    return settings.globalContextLength;
  }
  
  // Fall back to defaults based on model name
  for (const [modelPrefix, length] of Object.entries(DEFAULT_CONTEXT_LENGTHS)) {
    if (modelName.toLowerCase().includes(modelPrefix) || provider.toLowerCase().includes(modelPrefix)) {
      return length;
    }
  }
  
  // Absolute fallback
  return DEFAULT_CONTEXT_LENGTHS.default;
}

/**
 * Load context settings from storage
 */
export async function loadContextSettings(): Promise<ContextSettings | null> {
  try {
    // Try electron secure storage first
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const settings = await (window as any).electronAPI.storeGet(CONTEXT_SETTINGS_KEY);
      if (settings) {
        return JSON.parse(settings);
      }
    }
    
    // Fall back to localStorage for web
    const settings = localStorage.getItem(CONTEXT_SETTINGS_KEY);
    return settings ? JSON.parse(settings) : null;
  } catch (error) {
    console.error('Failed to load context settings:', error);
    return null;
  }
}

/**
 * Save context settings to storage
 */
export async function saveContextSettings(settings: ContextSettings): Promise<void> {
  try {
    // Try electron secure storage first
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      await (window as any).electronAPI.storeSet(CONTEXT_SETTINGS_KEY, JSON.stringify(settings));
      return;
    }
    
    // Fall back to localStorage for web
    localStorage.setItem(CONTEXT_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save context settings:', error);
  }
}

/**
 * Clear context settings
 */
export async function clearContextSettings(): Promise<void> {
  try {
    // Try electron secure storage first
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      await (window as any).electronAPI.storeDelete(CONTEXT_SETTINGS_KEY);
      return;
    }
    
    // Fall back to localStorage for web
    localStorage.removeItem(CONTEXT_SETTINGS_KEY);
  } catch (error) {
    console.error('Failed to clear context settings:', error);
  }
}