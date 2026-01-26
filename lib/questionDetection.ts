export interface ParsedQuestion {
  type: 'single' | 'multiple';
  question: string;
  choices: Array<{
    id: string;
    text: string;
  }>;
}

/**
 * Detects if a message contains a multiple-choice question
 * and parses out the options
 */
export function detectMultipleChoiceQuestion(text: string): ParsedQuestion | null {
  // Simple pattern for lettered choices: A) B) C) D)
  const letteredPattern = /([A-Ea-e])\s*\)?\s*([^\n]+?)(?:\s*([A-Ea-e])\s*\)?\s*([^\n]+?))?(?:\s*([A-Ea-e])\s*\)?\s*([^\n]+?))?(?:\s*([A-Ea-e])\s*\)?\s*([^\n]+?))?/;
  
  // Pattern for numbered choices: 1. 2. 3. 4.
  const numberedPattern = /(?:\d+\.\s*([^\n]+))(?:\s*\n\s*\d+\.\s*([^\n]+))?(?:\s*\n\s*\d+\.\s*([^\n]+))?(?:\s*\n\s*\d+\.\s*([^\n]+))?/;
  
  // Pattern for "Choose from: A, B, C"
  const choosePattern = /(?:choose|pick|select)\s+(?:from|one|between)?\s*[:]\s*([A-E][^,\n]*(?:\s*,\s*[A-E][^,\n]*)*)/i;
  
  // Pattern for "Options: A, B, C"
  const optionsPattern = /(?:option|choice|answers?)\s*[:]\s*([A-E][^,\n]*(?:\s*,\s*[A-E][^,\n]*)*)/i;
  
  const patterns = [letteredPattern, numberedPattern, choosePattern, optionsPattern];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Extract the question part (everything before the choices)
      let question = text.substring(0, match.index).trim();
      
      // Extract choices
      let choices: string[] = [];
      let isMultiple = false;
      
      if (pattern === letteredPattern) {
        // Lettered pattern
        for (let i = 1; i < match.length; i += 2) {
          if (match[i]) {
            const choiceText = match[i].trim();
            if (choiceText) {
              choices.push(choiceText);
            }
          }
        }
        isMultiple = choices.length > 1;
      } else if (pattern === numberedPattern) {
        // Numbered pattern
        for (let i = 1; i < match.length; i++) {
          if (match[i]) {
            const choiceText = match[i].trim();
            if (choiceText) {
              choices.push(choiceText);
            }
          }
        }
        isMultiple = choices.length > 1;
      } else {
        // Simple choices list
        const choiceText = match[1];
        choices = choiceText.split(',').map(c => c.trim()).filter(c => c.length > 0);
        isMultiple = choices.length > 1;
      }
      
      // Clean up the question
      question = question.replace(/Choose\s+(?:from|one|between)?\s*[:]\s*$/i, '').trim();
      question = question.replace(/Options?\s*[:]\s*$/i, '').trim();
      
      // Map to choice objects
      const choiceObjects = choices.map((choice, index) => ({
        id: String.fromCharCode(65 + index), // A, B, C, D, E
        text: choice
      }));

      if (choiceObjects.length > 0) {
        return {
          type: isMultiple ? 'multiple' : 'single',
          question,
          choices: choiceObjects
        };
      }
    }
  }

  return null;
}

/**
 * Extracts questions from AI response and formats them for interactive display
 */
export function extractInteractiveQuestions(text: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  
  // Split text by potential question boundaries
  const sentences = text.split(/[.!?]+\s*/);
  
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.length > 10) { // Only check substantial sentences
      const question = detectMultipleChoiceQuestion(trimmed);
      if (question) {
        questions.push(question);
      }
    }
  }
  
  return questions;
}