/**
 * Design Pattern: Adapter Pattern
 * Common interface `AiProviderAdapter` with `prepareRequest()` and `sendRequest()`.
 * Implemented as `GeminiAdapter` (calls backend Gemini proxy) and `MockAdapter` (offline fallback).
 */

import { ProviderConfig } from './config';

export interface PreparedRequest {
  providerId: string;
  providerName: string;
  endpoint: string;
  headers: Record<string, string>;
  payload: {
    prompt: string;
    systemInstruction?: string;
    maxTokens: number;
    temperature: number;
  };
  carbonEstimateGrams: number;
}

export interface ProviderResponse {
  answer: string;
  tokensUsed: number;
  provider: ProviderConfig;
  carbonGrams: number;
  latencyMs: number;
  isMock: boolean;
  adapterName: string;
}

export interface AiProviderAdapter {
  prepareRequest(query: string, provider: ProviderConfig, options?: { systemInstruction?: string }): PreparedRequest;
  sendRequest(prepared: PreparedRequest, provider: ProviderConfig): Promise<ProviderResponse>;
}

export class GeminiAdapter implements AiProviderAdapter {
  prepareRequest(query: string, provider: ProviderConfig, options?: { systemInstruction?: string }): PreparedRequest {
    const estimatedTokens = Math.ceil(query.length / 4) + 120;
    // CO2 (g) = (kWh/token * carbonIntensity g/kWh)
    const carbonEstimateGrams = Number(((estimatedTokens * 0.00035 * provider.carbonIntensity) / 100).toFixed(3));

    const defaultInstruction = 'Du bist Kolibri, ein ressourcensparender KI-Assistent. Antworte präzise, faktenbasiert, freundlich und ohne überflüssige Füllwörter.';
    const systemInstruction = options?.systemInstruction
      ? `${options.systemInstruction}\n${defaultInstruction}`
      : defaultInstruction;

    return {
      providerId: provider.id,
      providerName: provider.name,
      endpoint: '/api/gemini/generate',
      headers: {
        'Content-Type': 'application/json',
      },
      payload: {
        prompt: query,
        systemInstruction,
        maxTokens: 500,
        temperature: 0.2,
      },
      carbonEstimateGrams,
    };
  }

  async sendRequest(prepared: PreparedRequest, provider: ProviderConfig): Promise<ProviderResponse> {
    const startTime = performance.now();
    try {
      const resp = await fetch(prepared.endpoint, {
        method: 'POST',
        headers: prepared.headers,
        body: JSON.stringify(prepared.payload),
      });

      if (!resp.ok) {
        throw new Error(`HTTP error ${resp.status}`);
      }

      const data = await resp.json();
      const latencyMs = Math.round(performance.now() - startTime);
      const tokensUsed = data.tokens || 140;
      const carbonGrams = Number(((tokensUsed * 0.00035 * provider.carbonIntensity) / 100).toFixed(3));

      return {
        answer: data.text,
        tokensUsed,
        provider,
        carbonGrams,
        latencyMs: Math.max(latencyMs, provider.latencyMs),
        isMock: data.source?.includes('mock') ?? false,
        adapterName: 'GeminiAdapter (Cloud REST)',
      };
    } catch {
      // Graceful fallback to mock if backend proxy fails
      const fallbackMock = new MockAdapter();
      return fallbackMock.sendRequest(prepared, provider);
    }
  }
}

export class MockAdapter implements AiProviderAdapter {
  prepareRequest(query: string, provider: ProviderConfig, options?: { systemInstruction?: string }): PreparedRequest {
    return {
      providerId: provider.id,
      providerName: provider.name,
      endpoint: 'local://mock-adapter',
      headers: {},
      payload: {
        prompt: query,
        systemInstruction: options?.systemInstruction,
        maxTokens: 300,
        temperature: 0.0,
      },
      carbonEstimateGrams: 0.008,
    };
  }

  async sendRequest(prepared: PreparedRequest, provider: ProviderConfig): Promise<ProviderResponse> {
    await new Promise(resolve => setTimeout(resolve, 350));

    const mockAnswers: Record<string, string> = {
      default: `[Kolibri Eco-Antwort via ${provider.name}]: Für deine Anfrage "${prepared.payload.prompt}" wurde die Inferenz auf einem nachweislich mit erneuerbaren Energien betriebenen Server ausgeführt. Alle Vorgaben der Nachhaltigkeitsrichtlinie wurden eingehalten.`,
    };

    const tokensUsed = Math.ceil(prepared.payload.prompt.length / 4) + 85;
    const carbonGrams = Number(((tokensUsed * 0.00035 * provider.carbonIntensity) / 100).toFixed(3));

    return {
      answer: mockAnswers.default,
      tokensUsed,
      provider,
      carbonGrams,
      latencyMs: provider.latencyMs,
      isMock: true,
      adapterName: 'MockAdapter (Offline-Sicher)',
    };
  }
}
