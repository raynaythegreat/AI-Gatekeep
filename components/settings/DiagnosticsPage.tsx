"use client";

import React, { useState, useEffect } from "react";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCcw, 
  ShieldCheck, 
  Server, 
  Globe, 
  Cpu 
} from "lucide-react";

interface HealthStatus {
  status: "healthy" | "unhealthy" | "offline" | "not_configured";
  latency?: number;
  code?: number;
  error?: string;
}

interface HealthData {
  timestamp: number;
  checks: Record<string, HealthStatus>;
}

export const DiagnosticsPage: React.FC = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      console.error("Diagnostics failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const StatusIcon = ({ status }: { status: HealthStatus["status"] }) => {
    switch (status) {
      case "healthy": return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case "unhealthy": return <XCircle className="w-5 h-5 text-red-500" />;
      case "not_configured": return <ShieldCheck className="w-5 h-5 text-gray-400" />;
      default: return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">System Diagnostics</h1>
          <p className="text-gray-400">Verify connectivity and configuration status</p>
        </div>
        <button
          onClick={runDiagnostics}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 gradient-primary text-black rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Run Check
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {health && Object.entries(health.checks).map(([key, data]) => (
          <div key={key} className="p-4 bg-black/60 border border-orange-300/20 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-black/40 rounded-lg">
                {key === 'ollama' ? <Cpu className="w-5 h-5 text-orange-200" /> :
                 key === 'github' ? <Globe className="w-5 h-5 text-orange-200" /> :
                 <Server className="w-5 h-5 text-orange-200" />}
              </div>
              <div>
                <p className="font-medium text-white capitalize">{key}</p>
                <p className="text-xs text-gray-500">
                  {data.status === 'healthy' ? `Latency: ${data.latency}ms` : 
                   data.status === 'not_configured' ? 'Not Configured' : 
                   data.error || `Error ${data.code}`}
                </p>
              </div>
            </div>
            <StatusIcon status={data.status} />
          </div>
        ))}
      </div>

      <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0" />
          <p className="text-sm text-orange-300">
            <strong>Note:</strong> Diagnostics check connectivity to provider APIs using your configured keys. If a service shows &quot;Offline&quot;, please check your local network or the provider&apos;s official status page.
          </p>
        </div>
      </div>
    </div>
  );
};