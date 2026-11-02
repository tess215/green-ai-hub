/**
 * Entscheidungsschicht, Teil 2: Welcher Anbieter antwortet?
 * Design Pattern: Strategy Pattern
 * Selects AI providers based on sustainability metrics (Green Score, Carbon Intensity, PUE).
 * Supports strict green routing and fallback policies.
 */

import { ProviderConfig, INITIAL_PROVIDERS } from './config';

export interface StrategySelectionResult {
  selected: ProviderConfig | null;
  candidatesRanked: {
    provider: ProviderConfig;
    score: number;
    eligible: boolean;
    disqualificationReason?: string;
  }[];
  usedFallback: boolean;
  explanation: string;
}

export interface ProviderSelectionStrategy {
  selectProvider(
    providers: ProviderConfig[],
    requirements: {
      onlyGreen: boolean;
      allowFallback: boolean;
      forceOwnServerOnly?: boolean;
    }
  ): StrategySelectionResult;
}

export class GreenStrategy implements ProviderSelectionStrategy {
  selectProvider(
    providers: ProviderConfig[] = INITIAL_PROVIDERS,
    requirements: {
      onlyGreen: boolean;
      allowFallback: boolean;
      forceOwnServerOnly?: boolean;
    }
  ): StrategySelectionResult {
    const candidatesRanked = providers.map(p => {
      let eligible = true;
      let reason: string | undefined = undefined;

      if (requirements.forceOwnServerOnly && !p.id.includes('kolibri')) {
        eligible = false;
        reason = 'Datenschutz-Regel: Nur eigener Kolibri-Server erlaubt';
      } else if (requirements.onlyGreen && !p.isGreen) {
        eligible = false;
        reason = 'Nicht-grüner Strommix (Ausgeschlossen durch Nachhaltigkeitsrichtlinie)';
      }

      return {
        provider: p,
        score: p.score,
        eligible,
        disqualificationReason: reason,
      };
    });

    // Sort by green score descending
    candidatesRanked.sort((a, b) => b.score - a.score);

    const bestEligible = candidatesRanked.find(c => c.eligible);
    if (bestEligible) {
      return {
        selected: bestEligible.provider,
        candidatesRanked,
        usedFallback: bestEligible.provider.isFallback,
        explanation: `Ausgewählt nach Green-Score: ${bestEligible.provider.name} (Score ${bestEligible.score}/100, ${bestEligible.provider.renewableShare}% erneuerbare Energie).`,
      };
    }

    // No green provider eligible: check if fallback allowed
    if (requirements.allowFallback && !requirements.forceOwnServerOnly) {
      const fallback = candidatesRanked.find(c => c.provider.isFallback);
      if (fallback) {
        return {
          selected: fallback.provider,
          candidatesRanked,
          usedFallback: true,
          explanation: `Achtung Fallback aktiv: Kein grüner Cluster verfügbar. Ausgewichen auf ${fallback.provider.name}.`,
        };
      }
    }

    return {
      selected: null,
      candidatesRanked,
      usedFallback: false,
      explanation: 'Kein Anbieter erfüllt die strengen Kriterien der Richtlinie (nur 100% Ökostrom ohne Fallback). Anfrage wurde gestoppt.',
    };
  }
}
