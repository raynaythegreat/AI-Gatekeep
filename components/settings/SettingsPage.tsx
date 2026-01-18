"use client";

import React, { useMemo, useState } from "react";
import DiagnosticsPage from "./DiagnosticsPage";
import { DocsLinks, EnvVarNames } from "@/lib/config/schema";

/**
 * This Settings page currently focuses on open-source sustainability:
 * - Clear BYOK instructions
 * - Safe guidance for hosted vs local usage
 * - A Diagnostics view (redacted)
 *
 * Desktop secure local key storage will be implemented in the next step (Tauri/Electron bridge).
 */
export default function SettingsPage() {
  const [tab, setTab] = useState<"keys" | "diagnostics">("keys");

  const providers = useMemo(
    () => [
      {
        name: "OpenAI",
        env: EnvVarNames.openai,
        link: DocsLinks.openai,
        notes: "Used for OpenAI chat models. Store in hosting environment variables (Vercel or Render) or .env.local for hosted deployments."
      },
      {
        name: "Anthropic (Claude)",
        env: EnvVarNames.anthropic,
        link: DocsLinks.anthropic,
        notes: "Used for Claude models. For hosted deployments, set the env var; for desktop, we will store locally (coming next)."
      },
      {
        name: "Groq",
        env: EnvVarNames.groq,
        link: DocsLinks.groq,
        notes: "Optional high-speed inference provider. You bring your own key."
      },
      {
        name: "OpenRouter",
        env: EnvVarNames.openrouter,
        link: DocsLinks.openrouter,
        notes: "Aggregator provider. You bring your own key."
      },
      {
        name: "Fireworks",
        env: EnvVarNames.fireworks,
        link: DocsLinks.fireworks,
        notes: "Optional provider for chat/images depending on configuration."
      }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-white">Settings</h1>
        <p className="mt-1 text-sm text-white/70">
          GateKeep is designed to be open source and <span className="font-medium text-white">bring-your-own-keys</span>.
          You are responsible for obtaining your own API keys. Keys should never be posted in public repos or GitHub issues.
        </p>
      </div>

      <div className="rounded-lg border border-white/10 bg-black/20 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTab("keys")}
            className={`rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 ${
              tab === "keys" ? "bg-white/15 text-white" : "bg-white/5 text-white/80 hover:bg-white/10"
            }`}
          >
            API Keys & Providers
          </button>
          <button
            type="button"
            onClick={() => setTab("diagnostics")}
            className={`rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 ${
              tab === "diagnostics" ? "bg-white/15 text-white" : "bg-white/5 text-white/80 hover:bg-white/10"
            }`}
          >
            Diagnostics
          </button>
        </div>
      </div>

      {tab === "diagnostics" ? (
        <DiagnosticsPage />
      ) : (
        <div className="space-y-4">
          <section className="rounded-lg border border-white/10 bg-black/20 p-4">
            <h2 className="text-lg font-semibold text-white">Bring your own keys (BYOK)</h2>
            <div className="mt-2 space-y-2 text-sm text-white/70">
              <p>
                For hosted deployments, store secrets in <span className="text-white">your hosting environment variables (Vercel or Render) or .env.local</span>.
              </p>
              <p>
                For the upcoming desktop app, keys will be stored locally (best-effort in your OS keychain). This prevents your keys from being committed to GitHub.
              </p>
              <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-amber-100">
                Security tip: Never paste API keys into GitHub issues, screenshots, or chat transcripts. If a key is exposed, revoke it immediately in the provider dashboard.
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-white/10 bg-black/20 p-4">
            <h2 className="text-lg font-semibold text-white">Provider setup</h2>
            <p className="mt-1 text-sm text-white/70">
              Each provider requires its own key. GateKeep will only show configuration status, never the key value.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {providers.map((p) => (
                <div key={p.env} className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white">{p.name}</div>
                      <div className="mt-1 text-xs text-white/60">Env var: {p.env}</div>
                    </div>
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/30"
                    >
                      Get key
                    </a>
                  </div>
                  <p className="mt-3 text-sm text-white/70">{p.notes}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-white/10 bg-black/20 p-4">
            <h2 className="text-lg font-semibold text-white">Local Ollama</h2>
            <div className="mt-2 space-y-2 text-sm text-white/70">
              <p>
                Ollama lets you run models locally. Before configuring it here, ensure you have Ollama downloaded and installed.
              </p>
              <p>
                Download:{" "}
                <a
                  href={DocsLinks.ollama}
                  target="_blank"
                  rel="noreferrer"
                  className="text-white underline decoration-white/40 underline-offset-2 hover:decoration-white"
                >
                  https://ollama.com/download
                </a>
              </p>
              <p>
                Default base URL is <span className="text-white">http://127.0.0.1:11434</span>. In the next step we’ll add an automated “Connect” button that verifies Ollama is running and saves the URL locally.
              </p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}