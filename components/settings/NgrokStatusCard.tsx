'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface NgrokStatus {
  installed: boolean;
  running: boolean;
  tunnelUrl?: string;
  port?: number;
  canAutostart: boolean;
  platform: string;
  installInstructions?: {
    command: string;
    description: string;
  };
}

const NgrokStatusCard: React.FC = () => {
  const [status, setStatus] = useState<NgrokStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ngrok/status?port=3456');
      if (!response.ok) {
        throw new Error('Failed to get ngrok status');
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
  }, []);

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

  const copyInstallCommand = () => {
    if (status?.installInstructions?.command) {
      navigator.clipboard.writeText(status.installInstructions.command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyTunnelUrl = () => {
    if (status?.tunnelUrl) {
      navigator.clipboard.writeText(status.tunnelUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll every 5 seconds when ngrok is running to keep status fresh
    const interval = setInterval(() => {
      if (status?.running) {
        fetchStatus();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [status?.running, fetchStatus]);

  if (loading) {
    return (
      <div className="p-6 rounded-lg bg-card border-2 border-border shadow-flat">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-xl border-2 border-primary/30 animate-pulse">
            🚇
          </div>
          <div className="flex-1">
            <h3 className="font-black text-foreground text-sm">Ngrok Tunnel</h3>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
              Checking status...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-lg bg-card border-2 border-border hover:border-primary transition-all shadow-flat card-flat-hover">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl border-2 ${
            status?.running
              ? 'bg-emerald-500 text-white border-emerald-600'
              : status?.installed
              ? 'bg-primary/20 text-primary border-primary/30'
              : 'bg-red-500/10 text-red-500 border-red-500/20'
          }`}>
            {status?.running ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <span>🚇</span>
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-black text-foreground text-sm">Ngrok Tunnel</h3>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
              {status?.running ? 'Connected' : status?.installed ? 'Ready to start' : 'Not installed'}
            </p>
          </div>
        </div>
        <button
          onClick={fetchStatus}
          className="p-1.5 rounded-lg bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh status"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
          </div>
        </div>
      )}

      {status?.running && status.tunnelUrl && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Tunnel Active</span>
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Port 3456</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 px-2 py-1 rounded bg-emerald-950/30 text-emerald-400 text-xs font-mono truncate">
              {status.tunnelUrl}
            </code>
            <button
              onClick={copyTunnelUrl}
              className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <a
            href={status.tunnelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block text-center text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Open tunnel in new tab →
          </a>
        </div>
      )}

      {/* Installation Instructions */}
      {!status?.installed && status?.installInstructions && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 2.502-3.71V7.291c0-2.042-1.962-3.71-3.502-3.71H5.291c-1.54 0-2.502 1.667-2.502 3.71V14.5c0 2.042 1.962 3.71 3.502 3.71h6.938c1.54 0 2.502-1.667 2.502-3.71v-4.25" />
            </svg>
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Ngrok Required</span>
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
            {installing ? installProgress : status.installInstructions.description}
          </p>
          {!installing && (
            <details className="text-xs">
              <summary className="cursor-pointer text-amber-600 dark:text-amber-400 hover:underline mb-2">
                View manual installation instructions
              </summary>
              <div className="relative mt-2">
                <pre className="p-2 rounded bg-amber-950/30 text-amber-300 text-xs font-mono overflow-x-auto">
                  {status.installInstructions.command}
                </pre>
                <button
                  onClick={copyInstallCommand}
                  className="absolute top-1 right-1 p-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-600 dark:text-amber-400 transition-colors"
                  title="Copy command"
                >
                  {copied ? (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
            </details>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        {!status?.installed && !installing && (
          <button
            onClick={installNgrok}
            className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-primary/80 text-white font-semibold text-sm hover:from-primary/90 hover:to-primary/70 transition-all flex items-center justify-center gap-2"
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
            className="w-full px-4 py-2 rounded-lg bg-primary/50 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Installing ngrok...
          </button>
        )}

        {status?.installed && !status?.running && (
          <button
            onClick={startNgrok}
            disabled={starting}
            className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-500 text-black font-semibold text-sm hover:from-blue-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {starting ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Starting ngrok...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start Ngrok Tunnel
              </>
            )}
          </button>
        )}

        {status?.running && (
          <div className="text-center text-xs text-muted-foreground">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Ready for mobile deployment!</span>
            <br />
            <span className="text-[10px]">Go to Mobile tab to deploy your app</span>
          </div>
        )}

        <a
          href="https://dashboard.ngrok.com/get-started/your-authtoken"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-xs text-primary hover:underline"
        >
          Configure ngrok authtoken →
        </a>
      </div>
    </div>
  );
};

export default NgrokStatusCard;
