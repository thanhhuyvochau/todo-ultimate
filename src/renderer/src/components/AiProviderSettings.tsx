import { useEffect, useState } from "react";
import {
  Bot,
  Check,
  Globe,
  KeyRound,
  Loader2,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import type { AiProviderId } from "@/shared/models";
import { DEFAULT_PROVIDER_PRESETS } from "@/shared/models";
import { useSettingsStore } from "../stores/settingsStore";
import { useNetworkStore } from "../stores/networkStore";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";

const PROVIDERS: AiProviderId[] = [
  "deepseek",
  "openai",
  "anthropic",
  "gemini",
  "custom",
];

export function AiProviderSettings() {
  const {
    aiSettings,
    activeProvider,
    selectedProviderTab,
    isLoading,
    isTesting,
    error,
    testResults,
    loadSettings,
    setSelectedProviderTab,
    setActiveProvider,
    updateProviderModel,
    updateProviderBaseUrl,
    saveKey,
    deleteKey,
    testConnection,
    clearError,
  } = useSettingsStore();

  const isOnline = useNetworkStore((s) => s.isOnline);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [customModelInput, setCustomModelInput] = useState("");
  const [isCustomModelMode, setIsCustomModelMode] = useState(false);
  const [baseUrlInput, setBaseUrlInput] = useState("");
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const currentTab = selectedProviderTab;
  const currentPreset = DEFAULT_PROVIDER_PRESETS[currentTab];
  const currentConfig = aiSettings?.providers[currentTab];

  const selectedModel =
    currentConfig?.selectedModel || currentPreset.defaultModel;
  const isPresetModel = currentPreset.presetModels.includes(selectedModel);

  // Sync inputs when tab changes or config loads
  useEffect(() => {
    setApiKeyInput("");
    if (currentConfig?.baseUrl !== undefined) {
      setBaseUrlInput(currentConfig.baseUrl);
    } else if (currentPreset.isCustomUrlAllowed) {
      setBaseUrlInput(currentPreset.defaultBaseUrl);
    } else {
      setBaseUrlInput("");
    }

    if (isPresetModel) {
      setIsCustomModelMode(false);
      setCustomModelInput("");
    } else {
      setIsCustomModelMode(true);
      setCustomModelInput(selectedModel);
    }
  }, [
    currentTab,
    selectedModel,
    isPresetModel,
    currentConfig?.baseUrl,
    currentPreset,
  ]);

  const handleSaveKey = async () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) return;
    const ok = await saveKey(currentTab, trimmed);
    if (ok) setApiKeyInput("");
  };

  const handleDeleteKey = async () => {
    setShowDelete(false);
    await deleteKey(currentTab);
  };

  const handleModelChange = async (value: string) => {
    if (value === "__custom__") {
      setIsCustomModelMode(true);
      return;
    }
    setIsCustomModelMode(false);
    await updateProviderModel(currentTab, value);
  };

  const handleCustomModelSave = async () => {
    const trimmed = customModelInput.trim();
    if (!trimmed) return;
    await updateProviderModel(currentTab, trimmed);
  };

  const handleBaseUrlSave = async () => {
    const trimmed = baseUrlInput.trim();
    await updateProviderBaseUrl(currentTab, trimmed);
  };

  const handleMakeActive = async () => {
    await setActiveProvider(currentTab);
  };

  const tabTestResult = testResults[currentTab] ?? "idle";
  const hasKey = currentConfig?.hasKey ?? false;
  const isActive = activeProvider === currentTab;

  const activePreset = DEFAULT_PROVIDER_PRESETS[activeProvider];
  const activeModel =
    aiSettings?.providers[activeProvider]?.selectedModel ||
    activePreset?.defaultModel ||
    "deepseek-chat";

  return (
    <div className="space-y-6">
      {/* Active Provider Pill Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-bg-surface p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/10 text-accent">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-text-primary">
                Active Provider: {activePreset?.name ?? "DeepSeek"}
              </span>
              <span className="inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                {activeModel}
              </span>
            </div>
            <p className="text-xs text-text-muted">
              Used for Daily Planning and Performance Review coaching.
            </p>
          </div>
        </div>
      </div>

      {/* Provider Selector Tabs */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-text-muted">
          Select AI Provider
        </label>
        <div className="flex flex-wrap gap-2">
          {PROVIDERS.map((pId) => {
            const preset = DEFAULT_PROVIDER_PRESETS[pId];
            const isTabActive = currentTab === pId;
            const isGloballyActive = activeProvider === pId;
            const tabHasKey = aiSettings?.providers[pId]?.hasKey ?? false;

            return (
              <button
                key={pId}
                type="button"
                onClick={() => setSelectedProviderTab(pId)}
                className={`relative flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-all ${
                  isTabActive
                    ? "border-accent bg-accent/10 text-accent shadow-sm"
                    : "border-border bg-bg-surface text-text-muted hover:border-border-focus hover:text-text-primary"
                }`}
              >
                <span>{preset.name}</span>
                {isGloballyActive && (
                  <span
                    title="Active Provider"
                    className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-white"
                  >
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                )}
                {!isGloballyActive && tabHasKey && (
                  <span
                    title="Key Configured"
                    className="h-2 w-2 rounded-full bg-success"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Provider Config Card */}
      <div className="rounded-lg border border-border bg-bg-surface p-5 space-y-5">
        {/* Card Header with Provider Name & Status */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <Bot className="h-5 w-5 text-accent" />
            <div>
              <h3 className="text-base font-semibold text-text-primary">
                {currentPreset.name} Settings
              </h3>
              <p className="text-xs text-text-muted">
                {currentPreset.isCustomUrlAllowed
                  ? "OpenAI-compatible endpoints supported."
                  : "Official API integration."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isActive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success-subtle px-3 py-1 text-xs font-semibold text-success">
                <span className="h-2 w-2 rounded-full bg-success" />
                Active Provider
              </span>
            ) : (
              <button
                type="button"
                onClick={handleMakeActive}
                disabled={isLoading}
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                Set as Active
              </button>
            )}
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="flex items-center gap-2 rounded border border-danger/20 bg-danger-subtle px-3 py-2">
            <span className="flex-1 text-sm text-danger">{error}</span>
            <button
              type="button"
              onClick={clearError}
              className="text-sm text-danger underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Model Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-primary">
            AI Model
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select
              value={isCustomModelMode ? "__custom__" : selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
              className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {currentPreset.presetModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
              <option value="__custom__">Custom Model...</option>
            </select>

            {isCustomModelMode && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customModelInput}
                  onChange={(e) => setCustomModelInput(e.target.value)}
                  placeholder="e.g. gpt-4o, llama3.2"
                  className="flex-1 rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                  type="button"
                  onClick={handleCustomModelSave}
                  disabled={isLoading || !customModelInput.trim()}
                  className="rounded-md bg-bg-tertiary px-3 py-2 text-sm font-medium text-text-primary hover:bg-border disabled:opacity-50"
                >
                  Save Model
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Custom Base URL (if allowed) */}
        {currentPreset.isCustomUrlAllowed && (
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
              <Globe className="h-4 w-4 text-text-muted" />
              API Base URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={baseUrlInput}
                onChange={(e) => setBaseUrlInput(e.target.value)}
                placeholder={currentPreset.defaultBaseUrl}
                className="flex-1 rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                type="button"
                onClick={handleBaseUrlSave}
                disabled={isLoading}
                className="rounded-md bg-bg-tertiary px-3 py-2 text-sm font-medium text-text-primary hover:bg-border disabled:opacity-50"
              >
                Save URL
              </button>
            </div>
            <p className="text-xs text-text-muted">
              For Ollama or local gateways, enter your local endpoint (e.g.{" "}
              <code>http://localhost:11434/v1</code>).
            </p>
          </div>
        )}

        {/* API Key Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
              <KeyRound className="h-4 w-4 text-text-muted" />
              API Key{" "}
              {currentPreset.requiresKey
                ? "(Required)"
                : "(Optional for local)"}
            </label>
            <span className="flex items-center gap-1.5 text-xs text-text-muted">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  hasKey ? "bg-success" : "bg-border-focus opacity-40"
                }`}
              />
              {hasKey ? "Key saved" : "No key set"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder={hasKey ? "••••••••••••••••" : "sk-..."}
              autoComplete="off"
              spellCheck={false}
              className="flex-1 rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button
              type="button"
              onClick={handleSaveKey}
              disabled={isLoading || !apiKeyInput.trim()}
              className="flex h-9 items-center gap-1.5 rounded-md bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Key
            </button>
          </div>
        </div>

        {/* Actions: Test Connection & Delete */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => testConnection(currentTab)}
            disabled={
              isTesting || (!hasKey && currentPreset.requiresKey) || !isOnline
            }
            className="flex h-9 items-center gap-1.5 rounded-md bg-bg-tertiary px-3.5 text-sm font-medium text-text-primary transition-colors hover:bg-border disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isTesting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            Test Connection
          </button>

          <button
            type="button"
            onClick={() => setShowDelete(true)}
            disabled={!hasKey}
            className="flex h-9 items-center gap-1.5 rounded-md px-3.5 text-sm font-medium text-danger transition-colors hover:bg-danger-subtle disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete Key
          </button>
        </div>

        {tabTestResult === "success" && (
          <p className="text-sm font-medium text-success">
            ✓ Connection successful for {currentPreset.name}!
          </p>
        )}
        {tabTestResult === "failed" && (
          <p className="text-sm font-medium text-danger">
            ✕ Connection failed — verify your API key, endpoint, model name, or
            network.
          </p>
        )}
      </div>

      <DeleteConfirmationDialog
        isOpen={showDelete}
        taskTitle={currentPreset.name}
        itemType="key"
        onConfirm={handleDeleteKey}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
