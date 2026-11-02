// Vierte Station: Externe KI (Strategy Pattern & Adapter Pattern)
/**
 * @file externalAi.ts
 * Verwaltet den Status und die Audit-Daten der vierten Pipeline-Station (Externe KI).
 * Zeichnet auf, welche Strategie gewählt wurde, welche Anbieter gerankt wurden,
 * welche Freigabe erteilt wurde und welche Adapter-Payload generiert wurde.
 */

import { ModelProvider } from "./config";
import { TaskType, ProviderScoreDetails, StrategyType, globalStrategyManager } from "./strategy";
import { getAdapterDescription } from "./adapter";

export interface ExternalAiLastQueryLog {
  taskType: TaskType;
  strategyType: StrategyType;
  rankedProviders: ProviderScoreDetails[];
  selectedProvider: ModelProvider | null;
  isFallback: boolean;
  reason: string;
  permissionNote: string;
  adapterName: string;
  adapterDescription: string;
  previewJson: string;
  tokens: {
    prompt: number;
    completion: number;
    cached: number;
    total: number;
  };
  durationMs: number;
  traceId: string;
  timestamp: string;
}

export interface ExternalAiMetrics {
  totalCalls: number;
  totalTokensConsumed: number;
  greenSharePercent: number;
  fallbackCount: number;
}

export class ExternalAiStore {
  private lastQueryLog: ExternalAiLastQueryLog | null = null;
  private metrics: ExternalAiMetrics = {
    totalCalls: 12,
    totalTokensConsumed: 8450,
    greenSharePercent: 88,
    fallbackCount: 1,
  };

  constructor() {
    this.seedDefaultLog();
  }

  private seedDefaultLog() {
    const ranking = globalStrategyManager.rank("daily");
    const chosen = ranking.selected || globalStrategyManager.getProviders()[0];
    const adapterName = chosen.adapterName;

    const preview = {
      model: chosen.name.includes("Kolibri") ? "kolibri-3.5b-instruct" : "model-v1",
      parameters: {
        temperature: 0.2,
        maxOutputTokens: 1000,
      },
      caching: {
        strategy: chosen.cachingType,
      },
      promptPreview: "Wie schreibe ich einen PHPUnit-Test für PHP 8.4?…",
      _note: "Gekürzt – vollständige Prompts werden nicht angezeigt.",
    };

    this.lastQueryLog = {
      taskType: "daily",
      strategyType: "green",
      rankedProviders: ranking.allRanked,
      selectedProvider: chosen,
      isFallback: ranking.isFallback,
      reason: ranking.reason,
      permissionNote: "Automatisch (Rückfrage ausgeschaltet)",
      adapterName,
      adapterDescription: getAdapterDescription(adapterName),
      previewJson: JSON.stringify(preview, null, 2),
      tokens: {
        prompt: 140,
        completion: 310,
        cached: 0,
        total: 450,
      },
      durationMs: 380,
      traceId: "#init-ai",
      timestamp: "heute 10:42",
    };
  }

  public getLastQueryLog(): ExternalAiLastQueryLog | null {
    return this.lastQueryLog;
  }

  public getMetrics(): ExternalAiMetrics {
    return { ...this.metrics };
  }

  public recordExecution(data: {
    taskType: TaskType;
    strategyType: StrategyType;
    rankedProviders: ProviderScoreDetails[];
    selectedProvider: ModelProvider;
    isFallback: boolean;
    reason: string;
    permissionNote: string;
    adapterName: string;
    previewJson: string;
    tokens: {
      prompt: number;
      completion: number;
      cached?: number;
      total: number;
    };
    durationMs: number;
    traceId: string;
  }) {
    this.metrics.totalCalls++;
    this.metrics.totalTokensConsumed += data.tokens.total;
    if (data.isFallback || !data.selectedProvider.isGreen) {
      this.metrics.fallbackCount++;
    }

    // Anteil grüner Anbieter
    const totalGreen = this.metrics.totalCalls - this.metrics.fallbackCount;
    this.metrics.greenSharePercent = Math.max(0, Math.round((totalGreen / this.metrics.totalCalls) * 100));

    const now = new Date();
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const timeStr = `heute ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    this.lastQueryLog = {
      taskType: data.taskType,
      strategyType: data.strategyType,
      rankedProviders: data.rankedProviders,
      selectedProvider: data.selectedProvider,
      isFallback: data.isFallback,
      reason: data.reason,
      permissionNote: data.permissionNote,
      adapterName: data.adapterName,
      adapterDescription: getAdapterDescription(data.adapterName),
      previewJson: data.previewJson,
      tokens: {
        prompt: data.tokens.prompt,
        completion: data.tokens.completion,
        cached: data.tokens.cached || 0,
        total: data.tokens.total,
      },
      durationMs: data.durationMs,
      traceId: data.traceId,
      timestamp: timeStr,
    };
  }

  public reset() {
    this.metrics = {
      totalCalls: 12,
      totalTokensConsumed: 8450,
      greenSharePercent: 88,
      fallbackCount: 1,
    };
    globalStrategyManager.reset();
    this.seedDefaultLog();
  }
}

export const globalExternalAiStore = new ExternalAiStore();
