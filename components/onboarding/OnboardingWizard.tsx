"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface OnboardingWizardProps {
  onComplete: () => void;
}

interface ProviderConfig {
  key: string;
  label: string;
  placeholder: string;
  icon: string;
  description?: string;
  docsUrl?: string;
  freeTier?: boolean;
}

const aiProviders: ProviderConfig[] = [
  { key: 'openrouter', label: 'OpenRouter', placeholder: 'sk-or-v1-...', icon: '🌐', description: 'Access 100+ free AI models', docsUrl: 'https://openrouter.ai/keys', freeTier: true },
  { key: 'fireworks', label: 'Fireworks AI', placeholder: 'fw_...', icon: '🎆', description: 'Fast & free LLM inference', docsUrl: 'https://fireworks.ai/api-keys', freeTier: true },
  { key: 'groq', label: 'Groq', placeholder: 'gsk_...', icon: '⚡', description: 'Ultra-fast free inference', docsUrl: 'https://console.groq.com/keys', freeTier: true },
  { key: 'gemini', label: 'Google Gemini', placeholder: 'AIza...', icon: '💎', description: 'Free Gemini Pro model', docsUrl: 'https://aistudio.google.com/app/apikey', freeTier: true },
];

type Step = 'welcome' | 'provider' | 'apikey' | 'test' | 'complete';

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [selectedProvider, setSelectedProvider] = useState<ProviderConfig | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [testError, setTestError] = useState('');

  const steps: Step[] = ['welcome', 'provider', 'apikey', 'test', 'complete'];
  const currentStepIndex = steps.indexOf(currentStep);

  const handleProviderSelect = (provider: ProviderConfig) => {
    setSelectedProvider(provider);
    setCurrentStep('apikey');
  };

  const handleApiKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || !selectedProvider) return;

    setIsTesting(true);
    setTestError('');

    try {
      // Test the API key
      const response = await fetch('/api/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider.key,
          apiKey,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Save the API key using SecureStorage
        const { SecureStorage } = await import('@/lib/secureStorage');
        await SecureStorage.saveKeys({ [selectedProvider.key]: apiKey });

        setTestSuccess(true);
        setTimeout(() => {
          setCurrentStep('complete');
        }, 1000);
      } else {
        setTestError(data.error || 'Failed to validate API key');
      }
    } catch (error) {
      setTestError(error instanceof Error ? error.message : 'Failed to validate API key');
    } finally {
      setIsTesting(false);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('onboarding-completed', 'true');
    // Set theme to light after onboarding completion
    localStorage.setItem('theme', 'light');
    onComplete();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return <WelcomeStep onNext={() => setCurrentStep('provider')} />;
      case 'provider':
        return (
          <ProviderStep
            providers={aiProviders}
            onSelect={handleProviderSelect}
            onBack={() => setCurrentStep('welcome')}
          />
        );
      case 'apikey':
        return selectedProvider ? (
          <ApiKeyStep
            provider={selectedProvider}
            apiKey={apiKey}
            onChange={setApiKey}
            onSubmit={handleApiKeySubmit}
            isTesting={isTesting}
            testError={testError}
            onBack={() => setCurrentStep('provider')}
          />
        ) : null;
      case 'test':
        return <TestStep />;
      case 'complete':
        return <CompleteStep onComplete={handleComplete} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-surface border border-blue-500/20 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Progress Indicator */}
        <div className="bg-surface/50 border-b border-blue-500/20 px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-blue-500 font-medium">
              Step {currentStepIndex + 1} of {steps.length}
            </span>
            <button
              onClick={() => {
                localStorage.setItem('onboarding-completed', 'true');
                // Set theme to light after skipping onboarding
                localStorage.setItem('theme', 'light');
                onComplete();
              }}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
            >
              Skip for now
            </button>
          </div>
          <div className="flex gap-2">
            {steps.map((step, index) => (
              <div
                key={step}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  index <= currentStepIndex ? 'bg-blue-500' : 'bg-blue-500/20'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="p-6"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

// Welcome Step
const WelcomeStep: React.FC<{ onNext: () => void }> = ({ onNext }) => (
  <div className="space-y-6">
    <div className="text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
        className="text-6xl mb-4"
      >
        🚀
      </motion.div>
      <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to OS Athena</h1>
      <p className="text-foreground/70">
        Your AI-powered web development command center
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <FeatureCard icon="🤖" title="AI Development" description="Plan and build with state-of-the-art AI" />
      <FeatureCard icon="🐙" title="GitHub Integration" description="Manage repos, files, and commits from chat" />
      <FeatureCard icon="🚀" title="One-Click Deploy" description="Deploy to Vercel or Render instantly" />
    </div>

    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
      <p className="text-sm text-blue-500 mb-2">
        <span className="font-medium">✨ Free AI Models Available</span> — Get started with free tiers from top providers
      </p>
      <p className="text-xs text-foreground/60">
        Plus, deployment platforms (Vercel, Render) offer generous free tiers for hosting your projects.
      </p>
    </div>

    <button
      onClick={onNext}
      className="w-full bg-blue-500 hover:bg-blue-600 text-foreground font-medium py-3 rounded-lg transition-colors"
    >
      Get Started →
    </button>
  </div>
);

// Provider Step
const ProviderStep: React.FC<{
  providers: ProviderConfig[];
  onSelect: (provider: ProviderConfig) => void;
  onBack: () => void;
}> = ({ providers, onSelect, onBack }) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-2">Choose Your AI Provider</h2>
      <p className="text-foreground/70 text-sm mb-3">
        All providers below offer free tiers to get started. You can add more providers in Settings later.
      </p>
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          <span className="font-medium">💡 Tip:</span> These providers offer free API keys so you can try OS Athena without spending money. After setup, you can add more providers like Claude or GPT-4 in Settings.
        </p>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-3">
      {providers.map((provider) => (
        <motion.button
          key={provider.key}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect(provider)}
          className="bg-surface/50 hover:bg-surface border border-blue-500/20 hover:border-blue-500/40 rounded-lg p-4 text-left transition-all group"
        >
          <div className="flex items-start gap-4">
            <div className="text-3xl">{provider.icon}</div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-foreground">{provider.label}</h3>
                <div className="flex items-center gap-2">
                  {provider.freeTier && (
                    <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      Free Tier
                    </span>
                  )}
                  <span className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </div>
              </div>
              <p className="text-sm text-foreground/60">{provider.description}</p>
            </div>
          </div>
        </motion.button>
      ))}
    </div>

    <button
      onClick={onBack}
      className="w-full border border-blue-500/20 hover:bg-blue-500/5 text-foreground/70 py-3 rounded-lg transition-colors"
    >
      ← Back
    </button>
  </div>
);

// API Key Step
const ApiKeyStep: React.FC<{
  provider: ProviderConfig;
  apiKey: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isTesting: boolean;
  testError: string;
  onBack: () => void;
}> = ({ provider, apiKey, onChange, onSubmit, isTesting, testError, onBack }) => (
  <form onSubmit={onSubmit} className="space-y-6">
    <div>
      <div className="flex items-center gap-3 mb-2">
        <div className="text-3xl">{provider.icon}</div>
        <h2 className="text-2xl font-bold text-foreground">Add {provider.label} API Key</h2>
      </div>
      <p className="text-foreground/70 text-sm">
        Enter your API key below. We&apos;ll validate it before proceeding.
      </p>
    </div>

    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground/80">
        API Key
      </label>
      <input
        type="password"
        value={apiKey}
        onChange={(e) => onChange(e.target.value)}
        placeholder={provider.placeholder}
        className="w-full bg-surface/50 border border-blue-500/20 rounded-lg px-4 py-3 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-blue-500/50"
        autoFocus
      />
      {testError && (
        <p className="text-sm text-red-500">{testError}</p>
      )}
    </div>

    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
      <p className="text-sm text-foreground/80 mb-2">
        <span className="font-medium">Don&apos;t have an API key?</span>
      </p>
      <a
        href={provider.docsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-500 hover:text-blue-400 inline-flex items-center gap-1"
      >
        Get API Key from {provider.label} →
      </a>
    </div>

    <div className="flex gap-3">
      <button
        type="button"
        onClick={onBack}
        className="flex-1 border border-blue-500/20 hover:bg-blue-500/5 text-foreground/70 py-3 rounded-lg transition-colors"
      >
        ← Back
      </button>
      <button
        type="submit"
        disabled={!apiKey.trim() || isTesting}
        className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 disabled:cursor-not-allowed text-foreground font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {isTesting ? (
          <>
            <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
            Testing...
          </>
        ) : (
          'Continue →'
        )}
      </button>
    </div>
  </form>
);

// Test Step
const TestStep: React.FC = () => (
  <div className="text-center space-y-4 py-8">
    <div className="w-16 h-16 mx-auto border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    <p className="text-foreground/70">Testing your API key...</p>
  </div>
);

// Complete Step
const CompleteStep: React.FC<{ onComplete: () => void }> = ({ onComplete }) => (
  <div className="space-y-6 text-center">
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 0.2, type: 'spring' }}
      className="text-6xl"
    >
      🎉
    </motion.div>

    <div>
      <h2 className="text-2xl font-bold text-foreground mb-2">You&apos;re All Set!</h2>
      <p className="text-foreground/70">
        OS Athena is ready to help you build amazing things.
      </p>
    </div>

    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 space-y-2 text-left">
      <p className="text-sm text-foreground/80">✓ API key saved securely</p>
      <p className="text-sm text-foreground/80">✓ Connection verified</p>
      <p className="text-sm text-foreground/80">✓ Ready to start building</p>
    </div>

    <button
      onClick={onComplete}
      className="w-full bg-blue-500 hover:bg-blue-600 text-foreground font-medium py-3 rounded-lg transition-colors"
    >
      Start Using OS Athena →
    </button>
  </div>
);

// Feature Card Component
const FeatureCard: React.FC<{ icon: string; title: string; description: string }> = ({
  icon,
  title,
  description,
}) => (
  <div className="bg-surface/50 border border-blue-500/20 rounded-lg p-4">
    <div className="text-3xl mb-2">{icon}</div>
    <h3 className="font-semibold text-foreground mb-1">{title}</h3>
    <p className="text-sm text-foreground/60">{description}</p>
  </div>
);

export default OnboardingWizard;
