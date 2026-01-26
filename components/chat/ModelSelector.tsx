"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useDropdownPosition } from "./useDropdownPosition";
import { ModelManager, EnhancedModel } from "@/lib/model-manager";

export type ModelProvider =
  | "claude"
  | "openai"
  | "groq"
  | "openrouter"
  | "ollama"
  | "gemini"
  | "opencodezen"
  | "fireworks"
  | "mistral"
  | "zai";

export interface ModelOption {
  id: string;
  name: string;
  provider: ModelProvider;
  description: string;
  recommendedForCode?: boolean;
}

interface ProviderModelsStatus {
  available: boolean;
  loading: boolean;
  error: string | null;
  models: EnhancedModel[];
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY = "athena-models-cache";

interface CachedModels {
  timestamp: number;
  models: Partial<Record<ModelProvider, ModelOption[]>>;
}

interface ModelSelectorProps {
  selectedModel: string;
  selectedProvider: ModelProvider;
  onModelChange: (model: string, provider: ModelProvider) => void;
}

const MODEL_ICONS: Record<ModelProvider, string> = {
  claude: "🤖",
  openai: "🔮",
  groq: "⚡",
  openrouter: "🔗",
  ollama: "🦙",
  gemini: "💎",
  opencodezen: "⚡",
  fireworks: "🎆",
  mistral: "🌊",
  zai: "🧠",
};

const PROVIDER_COLORS: Record<ModelProvider, string> = {
  claude: "text-purple-600 dark:text-purple-400",
  openai: "text-green-600 dark:text-green-400",
  groq: "text-blue-600 dark:text-blue-400",
  openrouter: "text-indigo-600 dark:text-indigo-400",
  ollama: "text-orange-600 dark:text-orange-400",
  gemini: "text-cyan-600 dark:text-cyan-400",
  opencodezen: "text-yellow-600 dark:text-yellow-400",
  fireworks: "text-pink-600 dark:text-pink-400",
  mistral: "text-emerald-600 dark:text-emerald-400",
  zai: "text-rose-600 dark:text-rose-400",
};

export default function ModelSelector({
  selectedModel,
  selectedProvider,
  onModelChange,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [availableProviders, setAvailableProviders] = useState<Set<ModelProvider>>(new Set());
  const [providerModels, setProviderModels] = useState<
    Partial<Record<ModelProvider, ProviderModelsStatus>>
  >({});
  const [refreshing, setRefreshing] = useState<Set<ModelProvider>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const dropdownPosition = useDropdownPosition(triggerButtonRef, isOpen);

  const getCachedModels = useCallback((): CachedModels | null => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      const parsed = JSON.parse(cached) as CachedModels;
      if (Date.now() - parsed.timestamp > CACHE_TTL) {
        sessionStorage.removeItem(CACHE_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }, []);

  const setCachedModels = useCallback(
    (models: Partial<Record<ModelProvider, ModelOption[]>>) => {
      try {
        const cached: CachedModels = {
          timestamp: Date.now(),
          models,
        };
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(cached));
      } catch (error) {
        console.error("Failed to cache models:", error);
      }
    },
    [],
  );

  const fetchProviderModels = useCallback(
    async (provider: ModelProvider): Promise<void> => {
      setProviderModels((prev) => ({
        ...prev,
        [provider]: { ...prev[provider], loading: true, error: null },
      }));

      try {
        const response = await fetch(`/api/${provider}/models`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || `Failed to fetch ${provider} models`);
        }

        const models = data.models || [];
        const formattedModels = models.map((model: any) => ({
          id: model.id,
          name: model.name || model.id,
          description: model.description || provider,
          provider,
          recommendedForCode: model.recommendedForCode || false,
        }));

        // Filter and enhance models using ModelManager
        const enhancedModels: EnhancedModel[] = ModelManager.filterAndEnhanceModels(formattedModels);

        setProviderModels((prev) => ({
          ...prev,
          [provider]: {
            available: true,
            loading: false,
            error: null,
            models: enhancedModels,
          },
        }));

        const existingCache = getCachedModels();
        const newCache = {
          ...(existingCache?.models || {}),
          [provider]: enhancedModels,
        };
        setCachedModels(newCache);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to fetch models";
        console.error(`Failed to fetch ${provider} models:`, error);
        setProviderModels((prev) => ({
          ...prev,
          [provider]: {
            available: true,
            loading: false,
            error: errorMessage,
            models: prev[provider]?.models || [],
          },
        }));
      }
    },
    [getCachedModels, setCachedModels],
  );

  const checkAvailableProviders = useCallback(async () => {
    try {
      const { SecureStorage } = await import("@/lib/secureStorage");
      const keys = await SecureStorage.loadKeys();
      console.log("Checking available API keys:", Object.keys(keys));

      const providers: ModelProvider[] = [];
      if (keys.anthropic && keys.anthropic.trim())
        providers.push("claude" as ModelProvider);
      if (keys.openai && keys.openai.trim())
        providers.push("openai" as ModelProvider);
      if (keys.groq && keys.groq.trim())
        providers.push("groq" as ModelProvider);
      if (keys.openrouter && keys.openrouter.trim())
        providers.push("openrouter" as ModelProvider);
      if (keys.opencodezen && keys.opencodezen.trim())
        providers.push("opencodezen" as ModelProvider);
      if (keys.fireworks && keys.fireworks.trim())
        providers.push("fireworks" as ModelProvider);
      if (keys.gemini && keys.gemini.trim())
        providers.push("gemini" as ModelProvider);
      if (keys.mistral && keys.mistral.trim())
        providers.push("mistral" as ModelProvider);
      // Z.ai always available (has fallback models)
      providers.push("zai" as ModelProvider);
      providers.push("ollama" as ModelProvider);

      setAvailableProviders(new Set<ModelProvider>(providers));

      const cachedModels = getCachedModels();
      const status: Partial<Record<ModelProvider, ProviderModelsStatus>> = {};

      for (const provider of providers) {
        if (cachedModels?.models[provider]) {
          const enhancedFromCache = ModelManager.filterAndEnhanceModels(cachedModels.models[provider]);
          status[provider] = {
            available: true,
            loading: false,
            error: null,
            models: enhancedFromCache,
          };
        } else {
          status[provider] = {
            available: false,
            loading: false,
            error: null,
            models: [],
          };
          void fetchProviderModels(provider);
        }
      }

      setProviderModels(status);
    } catch (error) {
      console.error("Failed to check available providers:", error);
      setAvailableProviders(new Set<ModelProvider>(["ollama"]));
      void fetchProviderModels("ollama");
    }
  }, [fetchProviderModels, getCachedModels]);

  const refreshProviderModels = useCallback(
    async (provider: ModelProvider) => {
      setRefreshing((prev) => {
        const newSet = new Set(prev);
        newSet.add(provider);
        return newSet;
      });
      try {
        await fetchProviderModels(provider);
      } finally {
        setRefreshing((prev) => {
          const newSet = new Set(prev);
          newSet.delete(provider);
          return newSet;
        });
      }
    },
    [fetchProviderModels],
  );

  useEffect(() => {
    checkAvailableProviders();
  }, [checkAvailableProviders]);

  useEffect(() => {
    const handleApiKeysUpdated = () => {
      console.log("API keys updated, refreshing models...");
      void checkAvailableProviders();
    };

    window.addEventListener("api-keys-updated", handleApiKeysUpdated);
    return () => {
      window.removeEventListener("api-keys-updated", handleApiKeysUpdated);
    };
  }, [checkAvailableProviders]);

  useEffect(() => {
    if (isOpen) {
      void checkAvailableProviders();
    }
  }, [isOpen, checkAvailableProviders]);

  const allModels = Object.values(providerModels).flatMap(
    (status) => status.models || [],
  );

  const availableModels = allModels.filter((model) =>
    availableProviders.has(model.provider),
  );

  const filteredModels = availableModels.filter(
    (model) =>
      model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.provider.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const groupedModels = filteredModels.reduce(
    (acc, model) => {
      if (!acc[model.provider]) acc[model.provider] = [];
      acc[model.provider].push(model);
      return acc;
    },
    {} as Record<string, (ModelOption | EnhancedModel)[]>,
  );

  const selectedOption =
    availableModels.find((m) => m.id === selectedModel) || availableModels[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={triggerButtonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 hover:bg-white dark:hover:bg-surface-800 hover:border-blue-500/50 transition-all shadow-sm group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-lg group-hover:scale-110 transition-transform">
            {selectedOption ? MODEL_ICONS[selectedOption.provider] : "🤖"}
          </span>
           <div className="flex flex-col min-w-0">
             <span className="hidden sm:inline text-sm font-medium text-surface-900 dark:text-surface-100 truncate">
               {(selectedOption as any)?.displayName || selectedOption?.name || "Select Model"}
             </span>
             {selectedOption && (
               <span className={`text-xs font-bold ${PROVIDER_COLORS[selectedOption.provider]}`}>
                 {selectedOption.provider}
                 {(selectedOption as any)?.quality && ` • ${(selectedOption as any).quality} quality`}
               </span>
             )}
           </div>
        </div>
        <svg
          className={`w-4 h-4 text-surface-400 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute left-0 w-80 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200"
          style={{
            top: dropdownPosition.top,
            bottom: dropdownPosition.bottom,
          }}
        >
          <div className="p-3 border-b border-surface-200 dark:border-surface-700">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search models..."
              className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-foreground border border-surface-200 dark:border-surface-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors"
              autoFocus
            />
          </div>

          <div style={{ maxHeight: dropdownPosition.maxHeight, overflowY: 'auto' }} className="p-2">
            {Object.entries(groupedModels).map(([provider, models]) => {
              const isSelectedProvider = selectedOption?.provider === provider;
              return (
              <div key={provider} className="mb-3">
                <div className={`px-3 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center justify-between ${PROVIDER_COLORS[provider as ModelProvider] || "text-surface-600 dark:text-foreground/60"} ${isSelectedProvider ? 'bg-blue-100/60 dark:bg-blue-900/20 border-blue-500/50' : 'bg-surface-100/50 dark:bg-surface-800/50'} rounded-lg border border-surface-200/50 dark:border-surface-700/50 mb-1`}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">{MODEL_ICONS[provider as ModelProvider]}</span>
                    <span>{provider}</span>
                    {isSelectedProvider && <span className="ml-2 px-2 py-0.5 bg-blue-500 text-white text-[9px] rounded-md font-semibold">ACTIVE</span>}
                  </div>
                  {providerModels[provider as ModelProvider]?.error && (
                    <button
                      onClick={() => void refreshProviderModels(provider as ModelProvider)}
                      className="text-[10px] text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                    >
                      {refreshing.has(provider as ModelProvider) ? (
                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <>
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-4H6a2 2 0 00-2 2v-6h12a2 2 0 002 2 12 0 00-16 0 0 008 0zm0 8a8 8 0 0118 0 8 0 0118 0z" />
                          </svg>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {providerModels[provider as ModelProvider]?.error ? (
                    <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-200 text-xs">
                      Models unavailable - {providerModels[provider as ModelProvider]?.error}
                    </div>
                   ) : (
                     models.map((model) => (
                       <button
                         key={`${model.provider}-${model.id}`}
                         onClick={() => {
                           onModelChange(model.id, model.provider);
                           setIsOpen(false);
                           setSearchQuery("");
                         }}
                         className={`w-full px-3 py-2 rounded-lg text-left transition-all ${
                           model.id === selectedModel && model.provider === selectedProvider
                             ? "bg-blue-500/10 dark:bg-accent border-2 border-blue-500 shadow-md"
                             : "hover:bg-surface-100 dark:hover:bg-accent border-2 border-transparent"
                         }`}
                       >
                         <div className="flex items-center gap-2">
                           <span className="text-xl">{MODEL_ICONS[model.provider]}</span>
                           <div className="flex-1 min-w-0">
                             <div
                               className={`font-bold text-sm truncate text-surface-900 dark:text-foreground flex items-center gap-2`}
                             >
                               {(model as any).displayName || model.name}
                               {(model as any).quality && (
                                 <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                                   {(model as any).quality === 'premium' ? 'Premium' : 
                                    (model as any).quality === 'high' ? 'High' : 
                                    (model as any).quality === 'medium' ? 'Med' : 'Low'}
                                 </span>
                               )}
                               {(model as any).category === 'free' && (
                                 <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                                   FREE
                                 </span>
                               )}
                             </div>
                             <div
                               className={`text-[10px] truncate ${
                                 model.id === selectedModel && model.provider === selectedProvider
                                   ? "text-surface-700 dark:text-foreground/80"
                                   : "text-surface-500 dark:text-surface-400"
                               }`}
                             >
                               {(model as any).estimatedCost && (
                                 <span className="inline-flex items-center mr-2">
                                   <span className={`font-medium ${(model as any).estimatedCost === 'Free' ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                     {(model as any).estimatedCost}
                                   </span>
                                   {(model as any).speed && (
                                     <span className="ml-1 text-xs text-gray-500">
                                       • {(model as any).speed}
                                     </span>
                                   )}
                                 </span>
                               )} {model.description}
                               {model.recommendedForCode && (
                                 <span className="ml-2 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-[9px] font-medium">
                                   Code
                                 </span>
                               )}
                             </div>
                           </div>
                         </div>
                         {model.id === selectedModel && model.provider === selectedProvider && (
                           <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                         )}
                       </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}

            {filteredModels.length === 0 && (
              <div className="text-center py-8 px-4">
                <div className="text-surface-600 dark:text-foreground/60 text-sm mb-2">
                  No models available
                </div>
                <div className="text-surface-500 dark:text-foreground/50 text-xs">
                  Configure API keys in Settings to access AI models
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
