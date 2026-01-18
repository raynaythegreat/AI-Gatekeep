"use client";

import React, { useEffect, useMemo, useState } from "react";

type ApiOk<T> = { ok: true; data: T };
type ApiFail = { ok: false; error: { code: string; message: string } };
type ApiResponse<T> = ApiOk<T> | ApiFail;

type DiagnosticsSummary = {
  runtime: {
    nodeEnv: string;
    platformHint: "web" | "desktop";
  };
  providers: {
    anthropic: { configured: boolean; source: "env" | "local" | "none" };
    openai: { configured: boolean; source: "env" | "local" | "none" };
    groq: { configured: boolean; source: "env" | "local" | "none" };
    openrouter: { configured: boolean; source: "env" | "local" | "none" };
    fireworks: { configured: boolean; source: "env" | "local" | "none" };
    ollama: { baseUrl: string | null; reachable: boolean | null };
  };
  meta: {
    refreshedAt: number;
  };
};

function StatusPill({ ok, label }: { ok: boolean | null; label: string }) {
  const cls = useMemo(() => {
    if (ok === null) return "bg-gray-500/20 text-gray-200 border-gray-500/30";
    if (ok) return "bg-emerald-500/20 text-emerald-200 border-emerald-500/30";
    return "bg-rose-500/20 text-rose-200 border-rose-500/30";
  }, [ok]);

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${cls}`}>
      {label}
    </span>
  );
}

export default function DiagnosticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DiagnosticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/status/diagnostics", { cache: "no-store" });
      const json = (await res.json()) as ApiResponse<DiagnosticsSummary>;
      if (!json.ok) {
        setError(json.error.message || "Failed to load diagnostics");
        setData(null);
        return;
      }
      setData(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load diagnostics");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Diagnostics</h2>
          <p className="text-sm text-white/70">
            This page shows redacted configuration status only. Never paste API keys into GitHub issues.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-md bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/30"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-white/70">Loading…</div>
      ) : error ? (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
          {error}
        </div>
      ) : data ? (
        <div className="space-y-4">
          <section className="rounded-lg border border-white/10 bg-black/20 p-4">
            <h3 className="text-sm font-semibold text-white">Runtime</h3>
            <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-white/80 sm:grid-cols-2">
              <div className="rounded-md bg-white/5 p-3">
                <div className="text-xs text-white/60">Platform</div>
                <div className="mt-1 flex items-center gap-2">
                  <StatusPill ok={true} label={data.runtime.platformHint} />
                </div>
              </div>
              <div className="rounded-md bg-white/5 p-3">
                <div className="text-xs text-white/60">NODE_ENV</div>
                <div className="mt-1">{data.runtime.nodeEnv}</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-white/50">
              Refreshed: {new Date(data.meta.refreshedAt).toLocaleString()}
            </div>
          </section>

          <section className="rounded-lg border border-white/10 bg-black/20 p-4">
            <h3 className="text-sm font-semibold text-white">Providers (redacted)</h3>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(
                [
                  ["Anthropic", data.providers.anthropic.configured, data.providers.anthropic.source],
                  ["OpenAI", data.providers.openai.configured, data.providers.openai.source],
                  ["Groq", data.providers.groq.configured, data.providers.groq.source],
                  ["OpenRouter", data.providers.openrouter.configured, data.providers.openrouter.source],
                  ["Fireworks", data.providers.fireworks.configured, data.providers.fireworks.source]
                ] as const
              ).map(([name, configured, source]) => (
                <div key={name} className="rounded-md bg-white/5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm text-white">{name}</div>
                    <StatusPill ok={configured} label={configured ? `Configured (${source})` : "Not configured"} />
                  </div>
                </div>
              ))}

              <div className="rounded-md bg-white/5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm text-white">Ollama (local)</div>
                  <StatusPill
                    ok={data.providers.ollama.reachable}
                    label={
                      data.providers.ollama.reachable === null
                        ? "Unknown"
                        : data.providers.ollama.reachable
                          ? "Reachable"
                          : "Not reachable"
                    }
                  />
                </div>
                <div className="mt-2 text-xs text-white/60">Base URL</div>
                <div className="mt-1 break-all text-sm text-white/80">{data.providers.ollama.baseUrl ?? "—"}</div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}