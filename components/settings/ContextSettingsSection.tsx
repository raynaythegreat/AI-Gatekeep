'use client';

import { useState, useEffect } from 'react';
import {
  ContextSettings,
  loadContextSettings,
  saveContextSettings,
  DEFAULT_CONTEXT_LENGTHS,
  getContextLengthForModel,
} from '@/lib/context-settings';

export function ContextSettingsSection() {
  const [settings, setSettings] = useState<ContextSettings>({
    globalContextLength: 4096,
    enableTruncation: true,
    showContextUsage: true,
    truncationStrategy: 'oldest',
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadContextSettings().then((loadedSettings) => {
      if (loadedSettings) {
        setSettings(loadedSettings);
      }
      setIsLoading(false);
    });
  }, []);

  const saveSettings = async (newSettings: ContextSettings) => {
    setSettings(newSettings);
    await saveContextSettings(newSettings);
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading context settings...</div>;
  }

  return (
    <div className="p-6 rounded-lg bg-card border-2 border-border hover:border-primary transition-all shadow-flat card-flat-hover">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500 text-white flex items-center justify-center text-xl border-2 border-purple-600 shadow-flat-purple">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2H9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6" />
            </svg>
          </div>
          <div>
            <h3 className="font-black text-foreground text-lg">Context Settings</h3>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
              Control AI context window size
            </p>
          </div>
        </div>
        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
          Auto-saved
        </span>
      </div>

      <div className="space-y-6">
        {/* Global Context Length */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
            Global Context Length (tokens)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1000}
              max={100000}
              step={1000}
              value={settings.globalContextLength || 4096}
              onChange={(e) => saveSettings({ ...settings, globalContextLength: parseInt(e.target.value) })}
              className="flex-1"
            />
            <span className="text-sm font-mono bg-surface-100 dark:bg-surface-800 px-2 py-1 rounded">
              {settings.globalContextLength?.toLocaleString() || '4096'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Sets the maximum context window for all AI models. Higher values allow longer conversations but use more tokens.
          </p>
        </div>

        {/* Enable Truncation */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
            Context Management
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => saveSettings({ ...settings, enableTruncation: !settings.enableTruncation })}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.enableTruncation
                  ? 'bg-blue-500'
                  : 'bg-surface-300 dark:bg-surface-700'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  settings.enableTruncation ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
            <span className="text-sm font-medium">Enable context truncation</span>
          </div>
          <p className="text-xs text-muted-foreground">
            When enabled, older messages are automatically removed to fit within the context limit.
          </p>
        </div>

        {/* Truncation Strategy */}
        {settings.enableTruncation && (
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
              Truncation Strategy
            </label>
            <select
              value={settings.truncationStrategy || 'oldest'}
              onChange={(e) => saveSettings({ ...settings, truncationStrategy: e.target.value as any })}
              className="w-full px-3 py-2 rounded-lg border-2 border-blue-500/20 bg-background text-foreground focus:border-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
            >
              <option value="oldest">Remove oldest messages first</option>
              <option value="middle">Remove middle messages</option>
              <option value="newest">Remove newest messages first</option>
            </select>
          </div>
        )}

        {/* Show Context Usage */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => saveSettings({ ...settings, showContextUsage: !settings.showContextUsage })}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.showContextUsage
                  ? 'bg-blue-500'
                  : 'bg-surface-300 dark:bg-surface-700'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  settings.showContextUsage ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
            <span className="text-sm font-medium">Show context usage in chat</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Display current context usage in the chat interface to track token consumption.
          </p>
        </div>

        {/* Context Length Presets */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
            Quick Presets
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => saveSettings({ ...settings, globalContextLength: 2048 })}
              className="px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-blue-500/10 transition-colors text-sm font-medium"
            >
              2K (Fast)
            </button>
            <button
              onClick={() => saveSettings({ ...settings, globalContextLength: 4096 })}
              className="px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-blue-500/10 transition-colors text-sm font-medium"
            >
              4K (Balanced)
            </button>
            <button
              onClick={() => saveSettings({ ...settings, globalContextLength: 8192 })}
              className="px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-blue-500/10 transition-colors text-sm font-medium"
            >
              8K (Large)
            </button>
            <button
              onClick={() => saveSettings({ ...settings, globalContextLength: 16384 })}
              className="px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-blue-500/10 transition-colors text-sm font-medium"
            >
              16K (XL)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
