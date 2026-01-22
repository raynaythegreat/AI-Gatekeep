"use client";

import React, { useState, useEffect } from 'react';
import { ApiTester, TestResult } from '@/services/apiTester';

interface ApiKeys {
  anthropic: string;
  openai: string;
  groq: string;
  ollamaBaseUrl: string;
  // Add others as needed
}

const SettingsPage: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    anthropic: '',
    openai: '',
    groq: '',
    ollamaBaseUrl: 'http://localhost:11434',
  });
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [testing, setTesting] = useState<string | null>(null);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('api-keys');
    if (saved) {
      setApiKeys(JSON.parse(saved));
    }
  }, []);

  // Auto-save
  useEffect(() => {
    localStorage.setItem('api-keys', JSON.stringify(apiKeys));
  }, [apiKeys]);

  const updateKey = (provider: keyof ApiKeys, value: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: value }));
  };

  const runTest = async (provider: string) => {
    setTesting(provider);
    let result: TestResult;
    switch (provider) {
      case 'anthropic':
        result = await ApiTester.testAnthropic(apiKeys.anthropic);
        break;
      case 'openai':
        result = await ApiTester.testOpenAI(apiKeys.openai);
        break;
      case 'groq':
        result = await ApiTester.testGroq(apiKeys.groq);
        break;
      case 'ollama':
        result = await ApiTester.testOllama(apiKeys.ollamaBaseUrl);
        break;
      default:
        result = { status: 'error', message: 'Test not implemented' };
    }
    setTestResults(prev => ({ ...prev, [provider]: result }));
    setTesting(null);
  };

  const runAllTests = async () => {
    setTesting('all');
    const providers = ['anthropic', 'openai', 'groq', 'ollama'];
    const results: Record<string, TestResult> = {};
    for (const provider of providers) {
      await runTest(provider);
    }
    setTesting(null);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400">Configure your API keys and preferences</p>
      </div>

      {/* API Keys Section */}
      <div className="cyber-panel rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">API Keys</h2>
        <div className="space-y-4">
          {[
            { key: 'anthropic', label: 'Anthropic API Key', placeholder: 'sk-ant-...' },
            { key: 'openai', label: 'OpenAI API Key', placeholder: 'sk-...' },
            { key: 'groq', label: 'Groq API Key', placeholder: 'gsk_...' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-orange-100 mb-2">{label}</label>
              <input
                type="password"
                value={apiKeys[key as keyof ApiKeys]}
                onChange={(e) => updateKey(key as keyof ApiKeys, e.target.value)}
                placeholder={placeholder}
                className="w-full px-4 py-3 rounded-xl border border-orange-300/30 bg-black/40 text-orange-50 placeholder-orange-200/50 focus:outline-none focus:ring-2 focus:ring-orange-300/40 focus:border-orange-300"
              />
              <button
                onClick={() => runTest(key)}
                disabled={testing === key || testing === 'all'}
                className="mt-2 px-4 py-2 gradient-primary text-black rounded-lg disabled:opacity-50"
              >
                {testing === key ? 'Testing...' : 'Test Connection'}
              </button>
              {testResults[key] && (
                <p className={`mt-1 text-sm ${testResults[key].status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  {testResults[key].message}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Ollama Section */}
      <div className="cyber-panel rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Local Ollama</h2>
        <div>
          <label className="block text-sm font-medium text-orange-100 mb-2">Base URL</label>
          <input
            type="text"
            value={apiKeys.ollamaBaseUrl}
            onChange={(e) => updateKey('ollamaBaseUrl', e.target.value)}
            placeholder="http://localhost:11434"
            className="w-full px-4 py-3 rounded-xl border border-orange-300/30 bg-black/40 text-orange-50 placeholder-orange-200/50 focus:outline-none focus:ring-2 focus:ring-orange-300/40 focus:border-orange-300"
          />
          <button
            onClick={() => runTest('ollama')}
            disabled={testing === 'ollama' || testing === 'all'}
            className="mt-2 px-4 py-2 gradient-primary text-black rounded-lg disabled:opacity-50"
          >
            {testing === 'ollama' ? 'Testing...' : 'Test Connection'}
          </button>
          {testResults.ollama && (
            <p className={`mt-1 text-sm ${testResults.ollama.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {testResults.ollama.message}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={runAllTests}
          disabled={testing === 'all'}
          className="px-6 py-3 gradient-primary text-black rounded-lg disabled:opacity-50"
        >
          {testing === 'all' ? 'Testing All...' : 'Test All Connections'}
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;