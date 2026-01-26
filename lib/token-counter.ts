// Simple token counting utility for context management
// Approximates token counts - good enough for most use cases

export interface TokenCount {
  totalTokens: number;
  systemPromptTokens: number;
  conversationTokens: number;
  maxTokens: number;
  percentage: number;
}

// Approximate tokens per character for different languages
const TOKENS_PER_CHAR: Record<string, number> = {
  'en': 0.25, // English ~ 4 chars per token
  'code': 0.3, // Code ~ 3-4 chars per token
  'default': 0.25,
};

/**
 * Count tokens in a string (approximation)
 * Rough estimate: 1 token ≈ 4 characters in English
 */
export function countTokens(text: string, type: 'text' | 'code' = 'text'): number {
  if (!text || text.length === 0) return 0;
  
  const charsPerToken = type === 'code' ? TOKENS_PER_CHAR.code : TOKENS_PER_CHAR.en;
  
  // Rough estimation based on character count
  const baseTokens = Math.ceil(text.length * charsPerToken);
  
  // Add overhead for message structure (role, formatting, etc.)
  const overhead = 4; // ~4 tokens per message for structure
  
  return baseTokens + overhead;
}

/**
 * Count tokens in a conversation (messages array)
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  type?: 'text' | 'code';
}

export function countConversationTokens(messages: ChatMessage[]): TokenCount {
  const systemMessages = messages.filter(m => m.role === 'system');
  const conversationMessages = messages.filter(m => m.role !== 'system');
  
  const systemPromptTokens = systemMessages.reduce((total, msg) => {
    return total + countTokens(msg.content, msg.type || 'text');
  }, 0);
  
  const conversationTokens = conversationMessages.reduce((total, msg) => {
    return total + countTokens(msg.content, msg.type || 'text');
  }, 0);
  
  const totalTokens = systemPromptTokens + conversationTokens;
  
  return {
    totalTokens,
    systemPromptTokens,
    conversationTokens,
    maxTokens: 0,
    percentage: 0,
  };
}

/**
 * Calculate token count with max context
 */
export function calculateTokenUsage(
  messages: ChatMessage[],
  maxTokens: number
): TokenCount & { overLimit: boolean } {
  const counts = countConversationTokens(messages);
  const percentage = maxTokens > 0 ? (counts.totalTokens / maxTokens) * 100 : 0;
  
  return {
    ...counts,
    maxTokens,
    percentage,
    overLimit: counts.totalTokens > maxTokens,
  };
}

/**
 * Truncate conversation to fit within token limit
 * @returns Truncated messages array and info about what was removed
 */
export interface TruncationResult {
  messages: ChatMessage[];
  totalTokens: number;
  removedMessages: number;
  removedTokens: number;
  strategy: 'oldest' | 'middle' | 'newest';
}

export function truncateConversation(
  messages: ChatMessage[],
  maxTokens: number,
  strategy: 'oldest' | 'middle' | 'newest' = 'oldest'
): TruncationResult {
  const systemMessages = messages.filter(m => m.role === 'system');
  const conversationMessages = messages.filter(m => m.role !== 'system');
  
  // System messages always stay
  const systemTokenCount = systemMessages.reduce((total, msg) => {
    return total + countTokens(msg.content, msg.type || 'text');
  }, 0);
  
  const availableTokens = maxTokens - systemTokenCount;
  
  if (availableTokens <= 0) {
    return {
      messages: systemMessages,
      totalTokens: systemTokenCount,
      removedMessages: conversationMessages.length,
      removedTokens: conversationMessages.reduce((total, msg) => {
        return total + countTokens(msg.content, msg.type || 'text');
      }, 0),
      strategy,
    };
  }
  
  // Apply truncation strategy
  let keptMessages: ChatMessage[] = [];
  let currentTokens = 0;
  
  switch (strategy) {
    case 'oldest':
      // Keep messages from the start until we hit the limit
      for (const message of conversationMessages) {
        const messageTokens = countTokens(message.content, message.type || 'text');
        if (currentTokens + messageTokens <= availableTokens) {
          keptMessages.push(message);
          currentTokens += messageTokens;
        } else {
          break;
        }
      }
      break;
      
    case 'newest':
      // Keep messages from the end going backwards
      for (let i = conversationMessages.length - 1; i >= 0; i--) {
        const message = conversationMessages[i];
        const messageTokens = countTokens(message.content, message.type || 'text');
        if (currentTokens + messageTokens <= availableTokens) {
          keptMessages.unshift(message);
          currentTokens += messageTokens;
        } else {
          break;
        }
      }
      break;
      
    case 'middle':
      // Keep first and last messages, remove middle ones first
      if (conversationMessages.length > 0) {
        keptMessages.push(conversationMessages[0]); // Always keep first message
        currentTokens += countTokens(conversationMessages[0].content, conversationMessages[0].type || 'text');
        
        // Try to add as many recent messages as possible
        const recentMessages = conversationMessages.slice(-10); // Try to keep last 10
        for (const message of recentMessages) {
          if (message === conversationMessages[0]) continue; // Skip if already added
          const messageTokens = countTokens(message.content, message.type || 'text');
          if (currentTokens + messageTokens <= availableTokens) {
            keptMessages.push(message);
            currentTokens += messageTokens;
          } else {
            break;
          }
        }
        
        // Sort back to original order
        keptMessages.sort((a, b) => {
          const aIndex = conversationMessages.indexOf(a);
          const bIndex = conversationMessages.indexOf(b);
          return aIndex - bIndex;
        });
      }
      break;
  }
  
  const originalTokens = conversationMessages.reduce((total, msg) => {
    return total + countTokens(msg.content, msg.type || 'text');
  }, 0);
  
  return {
    messages: [...systemMessages, ...keptMessages],
    totalTokens: systemTokenCount + currentTokens,
    removedMessages: conversationMessages.length - keptMessages.length,
    removedTokens: originalTokens - currentTokens,
    strategy,
  };
}

/**
 * Format token count for display
 */
export function formatTokenCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toLocaleString();
}

/**
 * Estimate available conversation turns given token limit
 */
export function estimateConversationTurns(
  avgMessageTokensUser: number,
  avgMessageTokensAssistant: number,
  maxTokens: number
): number {
  const tokensPerTurn = avgMessageTokensUser + avgMessageTokensAssistant;
  return Math.floor(maxTokens / tokensPerTurn);
}