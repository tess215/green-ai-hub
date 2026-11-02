// Drittes Glied der Chain: grüne Websuche, Filter über Green Web Foundation
/**
 * @file websearch.ts
 * Implementiert die grüne Websuche als drittes Glied der Chain of Responsibility.
 * Durchsucht den Index nach passenden Schlagworten und filtert nicht-grüne Hosts aus.
 * Bietet Live-Prüfung von Domains über die offizielle Green Web Foundation API (greencheck v3)
 * mit sicherem Fallback auf Testdaten im Offline- oder Demomodus.
 */

import { WEB_SEARCH_INDEX, INITIAL_KNOWN_HOSTS, WebSearchIndexItem, KnownWebHost } from "./config";
import { normalizeForSimilarity } from "./similarity";

export type { KnownWebHost, WebSearchIndexItem };

export interface WebSearchResultItem {
  id: string;
  title: string;
  domain: string;
  isGreen: boolean;
  hostedBy: string;
  snippet: string;
  isFilteredOut: boolean;
  isUsed?: boolean;
  isTestData?: boolean;
}

export interface WebSearchLastQueryLog {
  query: string;
  keywords: string[];
  totalFound: number;
  filteredOutCount: number;
  results: WebSearchResultItem[];
  usedResult: WebSearchResultItem | null;
  savedToEcoCache: boolean;
}

export interface WebSearchMetrics {
  totalSearches: number;
  totalHits: number;
  checkedHostsCount: number;
  greenHostsCount: number;
}

export interface WebSearchSettings {
  strictGreenOnly: boolean; // Standard: true (nur verifiziert grüne Hosts)
  maxResults: 3 | 5 | 10;   // Standard: 5
}

export class WebSearchEngine {
  private knownHosts: KnownWebHost[] = [];
  private searchIndex: WebSearchIndexItem[] = [];
  private lastQueryLog: WebSearchLastQueryLog | null = null;
  private settings: WebSearchSettings = {
    strictGreenOnly: true,
    maxResults: 5,
  };
  private metrics: WebSearchMetrics = {
    totalSearches: 4,
    totalHits: 3,
    checkedHostsCount: 11,
    greenHostsCount: 7,
  };

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.knownHosts = INITIAL_KNOWN_HOSTS.map((h) => ({ ...h }));
    this.searchIndex = WEB_SEARCH_INDEX.map((i) => ({ ...i }));
    this.settings = {
      strictGreenOnly: true,
      maxResults: 5,
    };
    this.metrics = {
      totalSearches: 4,
      totalHits: 3,
      checkedHostsCount: this.knownHosts.length,
      greenHostsCount: this.knownHosts.filter((h) => h.isGreen).length,
    };
    this.lastQueryLog = null;
  }

  public getSettings(): WebSearchSettings {
    return { ...this.settings };
  }

  public setSettings(settings: Partial<WebSearchSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  public getMetrics(): WebSearchMetrics {
    const greenHostsCount = this.knownHosts.filter((h) => h.isGreen).length;
    return {
      ...this.metrics,
      checkedHostsCount: this.knownHosts.length,
      greenHostsCount,
    };
  }

  public getKnownHosts(): KnownWebHost[] {
    return this.knownHosts;
  }

  public getLastQueryLog(): WebSearchLastQueryLog | null {
    return this.lastQueryLog;
  }

  /**
   * Prüft eine Domain über die offizielle Green Web Foundation API (v3 greencheck)
   * Fällt transparent auf Testdaten zurück, falls Netzwerk/CORS blockiert oder Server offline.
   */
  public async checkHostDomain(inputDomain: string): Promise<KnownWebHost> {
    const cleanDomain = inputDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    const now = new Date();
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const timeStr = `heute ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    // Prüfe zuerst, ob wir die Domain bereits kennen
    const existing = this.knownHosts.find((h) => h.domain.toLowerCase() === cleanDomain);

    try {
      // Echter API-Aufruf an thegreenwebfoundation.org
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2800);

      const res = await fetch(`https://api.thegreenwebfoundation.org/api/v3/greencheck/${encodeURIComponent(cleanDomain)}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const isGreen = !!data.green;
        const hostedBy = data.hosted_by || (isGreen ? "Zertifizierter Grünstrom-Hoster" : "Konventionelles Rechenzentrum");

        const newEntry: KnownWebHost = {
          domain: cleanDomain,
          isGreen,
          hostedBy,
          lastChecked: timeStr,
          isTestData: false,
        };

        if (existing) {
          Object.assign(existing, newEntry);
        } else {
          this.knownHosts.unshift(newEntry);
        }
        return newEntry;
      }
    } catch {
      // Graceful fallback: Testdaten
    }

    // Fallback auf Testdaten
    const isGreenFallback = cleanDomain.includes("php.net") ||
      cleanDomain.includes("stitcher.io") ||
      cleanDomain.includes("laravel.com") ||
      cleanDomain.includes("laracasts.com") ||
      cleanDomain.includes("phpunit.de") ||
      cleanDomain.includes("thegreenwebfoundation") ||
      cleanDomain.includes("green");

    const fallbackEntry: KnownWebHost = {
      domain: cleanDomain,
      isGreen: existing ? existing.isGreen : isGreenFallback,
      hostedBy: existing?.hostedBy || (isGreenFallback ? "Ökostrom-Hoster (Testdaten)" : "Nicht verifiziert (Testdaten)"),
      lastChecked: timeStr,
      isTestData: true,
    };

    if (existing) {
      Object.assign(existing, fallbackEntry);
    } else {
      this.knownHosts.unshift(fallbackEntry);
    }

    return fallbackEntry;
  }

  /**
   * Führt die grüne Websuche aus:
   * Extrahiert Suchbegriffe, filtert den Index und wendet den strengen Modus an.
   */
  public search(prompt: string): {
    matchedResults: WebSearchResultItem[];
    usedResult: WebSearchResultItem | null;
    log: WebSearchLastQueryLog;
  } {
    this.metrics.totalSearches++;
    const normalized = normalizeForSimilarity(prompt);
    const words = normalized.split(/\s+/).filter((w) => w.length >= 3);
    const lower = prompt.toLowerCase();

    // Relevante Suchbegriffe identifizieren
    const candidateKeywords = ["php 8.4", "laravel", "phpunit", "php", "testing", "mock"];
    const matchedKws = candidateKeywords.filter((kw) => lower.includes(kw) || words.includes(kw));
    const searchTerms = matchedKws.length > 0 ? matchedKws : words.slice(0, 3);

    // Alle Kandidaten im Index finden
    const rawMatches: WebSearchIndexItem[] = [];
    for (const item of this.searchIndex) {
      const matchKey = item.keyword.toLowerCase();
      if (lower.includes(matchKey) || searchTerms.some((t) => matchKey.includes(t) || item.title.toLowerCase().includes(t) || item.snippet.toLowerCase().includes(t))) {
        rawMatches.push(item);
      }
    }

    // Wenn keine spezifischen Keywords gefunden wurden, nimm die ersten 3 Einträge für Demo-Zwecke
    const pool = rawMatches.length > 0 ? rawMatches : this.searchIndex.slice(0, 4);

    // Ergebnisse filtern je nach Einstellung (Strenger Modus)
    const processed: WebSearchResultItem[] = pool.map((item) => {
      const isFilteredOut = this.settings.strictGreenOnly && !item.isGreen;
      return {
        id: item.id,
        title: item.title,
        domain: item.domain,
        isGreen: item.isGreen,
        hostedBy: item.hostedBy,
        snippet: item.snippet,
        isFilteredOut,
        isTestData: item.isTestData,
      };
    });

    const filteredOutCount = processed.filter((p) => p.isFilteredOut).length;
    // Zulässige Treffer begrenzen auf maxResults
    const eligible = processed.filter((p) => !p.isFilteredOut).slice(0, this.settings.maxResults);
    const usedResult = eligible.length > 0 ? eligible[0] : null;

    if (usedResult) {
      usedResult.isUsed = true;
      this.metrics.totalHits++;
    }

    const log: WebSearchLastQueryLog = {
      query: prompt,
      keywords: searchTerms,
      totalFound: processed.length,
      filteredOutCount,
      results: processed.slice(0, this.settings.maxResults + filteredOutCount),
      usedResult,
      savedToEcoCache: !!usedResult,
    };

    this.lastQueryLog = log;

    return {
      matchedResults: eligible,
      usedResult,
      log,
    };
  }
}

export const globalWebSearchEngine = new WebSearchEngine();
