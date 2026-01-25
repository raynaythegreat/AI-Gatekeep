'use client';

import React, { useState, useEffect } from 'react';

interface NgrokStatus {
  installed: boolean;
  running: boolean;
  tunnelUrl?: string;
  port?: number;
  canAutostart: boolean;
  platform: string;
}

const NgrokQuickStatus: React.FC = () => {
  const [status, setStatus] = useState<NgrokStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ngrok/status?port=3456');
      if (!response.ok) {
        throw new Error('Failed to check ngrok status');
      }
      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch ngrok status:', err);
      setError(err instanceof Error ? err.message : 'Failed to check ngrok status');
    } finally {
      setLoading(false);
    }
  };

  const startNgrok = async () => {
    try {
      setStarting(true);
      setError(null);
      const response = await fetch('/api/ngrok/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', port: 3456 }),
      });

      if (!response.ok) {
        throw new Error('Failed to start ngrok');
      }

      const data = await response.json();

      if (data.success && data.tunnelUrl) {
        setStatus({
          installed: true,
          running: true,
          tunnelUrl: data.tunnelUrl,
          port: 3456,
          canAutostart: true,
          platform: status?.platform || 'linux',
        });
      } else {
        throw new Error(data.error || 'Failed to start ngrok');
      }
    } catch (err) {
      console.error('Failed to start ngrok:', err);
      setError(err instanceof Error ? err.message : 'Failed to start ngrok');
    } finally {
      setStarting(false);
    }
  };

  const installNgrok = async () => {
    try {
      setInstalling(true);
      setInstallProgress('Starting installation...');
      setError(null);

      const response = await fetch('/api/ngrok/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: false }),
      });

      if (!response.ok) {
        throw new Error('Installation request failed');
      }

      const data = await response.json();

      if (data.success) {
        setInstallProgress('Installation complete! Starting ngrok...');
        // Refresh status
        setTimeout(() => {
          fetchStatus();
          setInstalling(false);
          setInstallProgress(null);
        }, 1000);
      } else {
        throw new Error(data.error || 'Installation failed');
      }
    } catch (err) {
      console.error('Failed to install ngrok:', err);
      setError(err instanceof Error ? err.message : 'Failed to install ngrok');
      setInstalling(false);
      setInstallProgress(null);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll every 5 seconds when not running to check if ngrok was started externally
    const interval = setInterval(() => {
      if (!status?.running) {
        fetchStatus();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [status?.running]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center animate-pulse">
            <span className="text-blue-600 dark:text-blue-400 text-xl">🚇</span>
          </div>
          <div className="flex-1">
            <div className="text-sm text-surface-600 dark:text-surface-400">
              Checking ngrok status...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
            status?.running
              ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500/50'
              : status?.installed
              ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500/50'
              : 'bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-500/50'
          }`}>
            {status?.running ? (
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <span className="text-blue-600 dark:text-blue-400">🚇</span>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-surface-900 dark:text-white">
              Ngrok Tunnel
            </h3>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              {status?.running ? 'Connected' : status?.installed ? 'Not running' : 'Not installed'}
            </p>
          </div>
        </div>
        <button
          onClick={fetchStatus}
          className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          title="Refresh status"
        >
          <svg className="w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
          </div>
        </div>
      )}

      {status?.running && status.tunnelUrl && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-semibold text-green-700 dark:text-green-300">Tunnel Active</span>
            </div>
            <a
              href={status.tunnelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-green-600 dark:text-green-400 hover:underline"
            >
              {status.tunnelUrl} →
            </a>
          </div>
        </div>
      )}

      {!status?.installed && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-700 dark:text-amber-300 mb-2">
            {installing ? installProgress : 'ngrok is required for mobile access.'}
          </p>
          {!installing && (
            <details className="text-xs">
              <summary className="cursor-pointer text-amber-600 dark:text-amber-400 hover:underline mb-2">
                View manual installation instructions
              </summary>
              <code className="block p-2 mt-2 rounded bg-amber-950/30 text-amber-300 text-xs overflow-x-auto">
                {status?.platform === 'darwin' && 'brew install ngrok'}
                {status?.platform === 'linux' && 'curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list && sudo apt update && sudo apt install ngrok'}
                {status?.platform === 'win32' && 'winget install ngrok.ngrok'}
              </code>
            </details>
          )}
        </div>
      )}

      <div className="flex gap-2">
        {!status?.installed && !installing && (
          <button
            onClick={installNgrok}
            className="flex-1 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Install & Start Ngrok
          </button>
        )}

        {installing && (
          <button
            disabled
            className="flex-1 px-4 py-2 rounded-lg bg-primary/50 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Installing...
          </button>
        )}

        {status?.installed && !status?.running && (
          <button
            onClick={startNgrok}
            disabled={starting}
            className="flex-1 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-black font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {starting ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Starting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start Ngrok
              </>
            )}
          </button>
        )}

        <a
          href="/settings"
          className="px-4 py-2 rounded-lg border border-surface-300 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 text-sm font-medium transition-colors"
        >
          {status?.installed ? 'Settings' : 'Setup Guide'}
        </a>
      </div>
    </div>
  );
};

export default NgrokQuickStatus;
