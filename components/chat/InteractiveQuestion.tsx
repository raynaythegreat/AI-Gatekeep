"use client";

import React, { useState } from "react";
import { CheckCircle2, Circle, Square } from "lucide-react";

interface ChoiceOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

interface InteractiveQuestionProps {
  question: string;
  choices: ChoiceOption[];
  onChoiceSelect: (selectedChoices: string[]) => void;
  allowMultiple?: boolean;
  selectedChoices?: string[];
}

export default function InteractiveQuestion({
  question,
  choices,
  onChoiceSelect,
  allowMultiple = false,
  selectedChoices = []
}: InteractiveQuestionProps) {
  const [currentSelection, setCurrentSelection] = useState<string[]>(selectedChoices || []);

  const handleChoiceClick = (choiceId: string) => {
    let newSelection: string[];
    
    if (allowMultiple) {
      // Multiple choice: toggle selection
      if (currentSelection.includes(choiceId)) {
        newSelection = currentSelection.filter(id => id !== choiceId);
      } else {
        newSelection = [...currentSelection, choiceId];
      }
    } else {
      // Single choice: replace selection
      newSelection = [choiceId];
    }
    
    setCurrentSelection(newSelection);
    onChoiceSelect(newSelection);
  };

  const handleSubmit = () => {
    if (currentSelection.length > 0) {
      onChoiceSelect(currentSelection);
    }
  };

  return (
    <div className="my-4 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-surface-800 dark:to-surface-900 border border-blue-200 dark:border-blue-800 shadow-lg">
      {/* Question Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">
          ?
        </div>
        <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
          Multiple Choice Question
        </h3>
      </div>

      {/* Question Text */}
      <div className="mb-6">
        <p className="text-surface-700 dark:text-surface-300 leading-relaxed">
          {question}
        </p>
      </div>

      {/* Choice Options */}
      <div className="space-y-3 mb-6">
        {choices.map((choice, index) => {
          const isSelected = currentSelection.includes(choice.id);
          const Icon = isSelected ? CheckCircle2 : allowMultiple ? Square : Circle;
          
          return (
            <button
              key={choice.id}
              onClick={() => handleChoiceClick(choice.id)}
              className={`w-full p-4 rounded-lg border-2 text-left transition-all duration-200 flex items-start gap-3 ${
                isSelected
                  ? "border-blue-500 bg-blue-500 text-white shadow-md"
                  : "border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-surface-800"
              }`}
            >
              <div className={`flex-shrink-0 transition-all duration-200 ${
                isSelected ? "scale-110" : "scale-100 hover:scale-105"
              }`}>
                <Icon 
                  className={`w-5 h-5 ${
                    isSelected ? "text-white" : "text-blue-500 dark:text-blue-400"
                  }`} 
                  strokeWidth={2}
                  fill={isSelected ? "currentColor" : "none"}
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className={`font-medium ${
                  isSelected 
                    ? "text-white" 
                    : "text-surface-900 dark:text-surface-100"
                }`}>
                  {choice.text}
                </div>
                
                {choice.isCorrect && (
                  <div className={`text-xs mt-1 ${
                    isSelected 
                      ? "text-blue-100" 
                      : "text-green-600 dark:text-green-400"
                  }`}>
                    ✓ Correct answer
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Submit Button */}
      <div className="flex justify-center gap-3">
        {allowMultiple && currentSelection.length > 0 && (
          <button
            onClick={handleSubmit}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            Submit Selection{currentSelection.length > 1 ? ` (${currentSelection.length})` : ""}
          </button>
        )}
        
        {!allowMultiple && (
          <button
            onClick={() => setCurrentSelection([])}
            className="px-4 py-2.5 text-surface-600 dark:text-surface-400 font-medium rounded-lg border border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200"
          >
            Clear Selection
          </button>
        )}
      </div>
    </div>
  );
}