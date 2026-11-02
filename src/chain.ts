/**
 * Design Pattern: Chain of Responsibility
 * Pipeline execution chain:
 * 1. Eco-Cache (Proxy) -> 2. Teamwissen (Library) -> 3. Grüne Websuche -> 4. Externe KI (Strategy + Adapter)
 * Records comprehensive audit log ("Wo Kolibri gesucht hat" / "Kassenbon Protokoll").
 */

import { globalEcoCache, CacheEntry } from './cache';
import { INITIAL_LIBRARY_ITEMS, INITIAL_WEB_SEARCH_ITEMS, INITIAL_PROVIDERS, LibraryItem, WebSearchResult } from './config';
import { findBestMatch, normalizeText } from './similarity';
import { AgentPolicy, evaluateRestrictions } from './policies';
import { GreenStrategy } from './strategy';
import { GeminiAdapter, MockAdapter, ProviderResponse } from './adapter';

export type TaskType = 'quick' | 'daily' | 'complex';

export interface PipelineContextConfig {
  enableCache: boolean;
  enableLibrary: boolean;
  enableHistory: boolean;
  enableGreenWeb: boolean;
  enableExternalAI: boolean;
  localOnly: boolean;
  askBeforeExternal: boolean;
}

export const DEFAULT_PIPELINE_CONTEXT_CONFIG: PipelineContextConfig = {
  enableCache: true,
  enableLibrary: true,
  enableHistory: true,
  enableGreenWeb: true,
  enableExternalAI: true,
  localOnly: false,
  askBeforeExternal: true,
};

export interface StationAudit {
  stationId: 'router' | 'cache' | 'library' | 'web' | 'provider';
  name: string;
  checked: boolean;
  status: 'hit' | 'miss' | 'blocked' | 'skipped';
  summary: string;
  durationMs: number;
  tokensCharged: number;
  tokensSaved: number;
  details?: Record<string, any>;
}

export interface PipelineExecutionResult {
  query: string;
  resolvedStation: 'router' | 'cache' | 'library' | 'web' | 'provider' | 'none';
  answer: string;
  stationAudits: StationAudit[];
  totalTokensUsed: number;
  totalTokensSaved: number;
  co2SavedGrams: number;
  costSavedCents: number;
  durationMs: number;
  isMock: boolean;
  providerDetails?: ProviderResponse;
  policyNotices: string[];
  activeAgent?: AgentPolicy;
}

export class PipelineChain {
  private geminiAdapter = new GeminiAdapter();
  private mockAdapter = new MockAdapter();
  private greenStrategy = new GreenStrategy();

  async processQuery(
    query: string,
    policy: AgentPolicy,
    options: {
      useMockOnly?: boolean;
      currentUsedBudget?: number;
      libraryItems?: LibraryItem[];
      webItems?: WebSearchResult[];
      contextConfig?: PipelineContextConfig;
      taskType?: TaskType;
      skipLocalAudits?: StationAudit[];
      routerAudit?: StationAudit;
    } = {}
  ): Promise<PipelineExecutionResult> {
    const startTime = performance.now();
    const audits: StationAudit[] = [];
    if (options.routerAudit) {
      audits.push(options.routerAudit);
    }
    if (options.skipLocalAudits) {
      audits.push(...options.skipLocalAudits);
    }
    const libraryItems = options.libraryItems || INITIAL_LIBRARY_ITEMS;
    const webItems = options.webItems || INITIAL_WEB_SEARCH_ITEMS;
    const contextConfig = options.contextConfig || DEFAULT_PIPELINE_CONTEXT_CONFIG;
    const taskType = options.taskType || 'daily';

    // Check personal data keywords in prompt
    const hasPersonalData = /iban|gehalt|kunde|patient|bewerbung|passwort|krankmeldung|telefonnummer/i.test(query);
    const evaluation = evaluateRestrictions(policy, options.currentUsedBudget || 0, hasPersonalData);

    if (!options.skipLocalAudits) {
      // -------------------------------------------------------------
      // STATION 1: ECO-CACHE
      // -------------------------------------------------------------
      const cacheStart = performance.now();
      const cacheAllowed = evaluation.restrictedSources.cache && contextConfig.enableCache;
      if (!cacheAllowed) {
        audits.push({
          stationId: 'cache',
          name: 'Eco-Cache',
          checked: false,
          status: 'blocked',
          summary: !contextConfig.enableCache ? 'Im Kontext-Panel deaktiviert' : 'In Richtlinie deaktiviert',
          durationMs: 0,
          tokensCharged: 0,
          tokensSaved: 0,
        });
      } else {
        const cacheCheck = globalEcoCache.checkCache(query, 0.75);
        const cacheDuration = Math.round(performance.now() - cacheStart);

        if (cacheCheck.hit && cacheCheck.entry) {
          audits.push({
            stationId: 'cache',
            name: 'Eco-Cache',
            checked: true,
            status: 'hit',
            summary: `Treffer (${cacheCheck.matchType}, ${Math.round((cacheCheck.similarity || 1) * 100)}% Ähnlichkeit) · 0 externe Tokens`,
            durationMs: cacheDuration,
            tokensCharged: 0,
            tokensSaved: cacheCheck.entry.tokensSaved,
            details: {
              fingerprint: cacheCheck.fingerprint,
              normalized: cacheCheck.normalized,
              entry: cacheCheck.entry,
            },
          });

          const totalDuration = Math.round(performance.now() - startTime);
          return {
            query,
            resolvedStation: 'cache',
            answer: cacheCheck.entry.answer,
            stationAudits: audits,
            totalTokensUsed: 0,
            totalTokensSaved: cacheCheck.entry.tokensSaved,
            co2SavedGrams: Number(((cacheCheck.entry.tokensSaved * 0.00045)).toFixed(2)),
            costSavedCents: Number(((cacheCheck.entry.tokensSaved * 0.0002)).toFixed(2)),
            durationMs: totalDuration,
            isMock: false,
            policyNotices: evaluation.notices,
            activeAgent: policy,
          };
        } else {
          audits.push({
            stationId: 'cache',
            name: 'Eco-Cache',
            checked: true,
            status: 'miss',
            summary: cacheCheck.closestNonMatch
              ? `Kein Treffer (Ähnlichster Eintrag: "${cacheCheck.closestNonMatch.query.slice(0, 30)}..." bei ${Math.round(cacheCheck.closestNonMatch.similarity * 100)}%)`
              : 'Kein Treffer in gespeicherten Antworten',
            durationMs: cacheDuration,
            tokensCharged: 0,
            tokensSaved: 0,
            details: {
              fingerprint: cacheCheck.fingerprint,
              normalized: cacheCheck.normalized,
              closest: cacheCheck.closestNonMatch,
            },
          });
        }
      }
    }

    // -------------------------------------------------------------
    // STATION 2: TEAMWISSEN / LIBRARY
    // -------------------------------------------------------------
    const libStart = performance.now();
    const libAllowed = evaluation.restrictedSources.teamwissen && contextConfig.enableLibrary;
    if (!libAllowed) {
      audits.push({
        stationId: 'library',
        name: 'Teamwissen & Library',
        checked: false,
        status: 'blocked',
        summary: !contextConfig.enableLibrary ? 'Im Kontext-Panel deaktiviert' : 'In Richtlinie deaktiviert',
        durationMs: 0,
        tokensCharged: 0,
        tokensSaved: 0,
      });
    } else {
      const libMatch = findBestMatch<LibraryItem>(
        query,
        libraryItems,
        item => [item.title, ...item.queries, ...item.tags],
        0.65
      );
      const libDuration = Math.round(performance.now() - libStart);

      if (libMatch) {
        audits.push({
          stationId: 'library',
          name: 'Teamwissen & Library',
          checked: true,
          status: 'hit',
          summary: `Treffer in "${libMatch.item.title}" (${libMatch.percentage}% Match)`,
          durationMs: libDuration,
          tokensCharged: 0,
          tokensSaved: libMatch.item.tokens + 110,
          details: {
            item: libMatch.item,
            percentage: libMatch.percentage,
          },
        });

        // Store into Eco-Cache for instant next hit
        globalEcoCache.store(query, libMatch.item.content, libMatch.item.tokens + 110);

        const totalDuration = Math.round(performance.now() - startTime);
        return {
          query,
          resolvedStation: 'library',
          answer: libMatch.item.content,
          stationAudits: audits,
          totalTokensUsed: 0,
          totalTokensSaved: libMatch.item.tokens + 110,
          co2SavedGrams: Number((((libMatch.item.tokens + 110) * 0.00045)).toFixed(2)),
          costSavedCents: Number((((libMatch.item.tokens + 110) * 0.0002)).toFixed(2)),
          durationMs: totalDuration,
          isMock: false,
          policyNotices: evaluation.notices,
          activeAgent: policy,
        };
      } else {
        audits.push({
          stationId: 'library',
          name: 'Teamwissen & Library',
          checked: true,
          status: 'miss',
          summary: `${libraryItems.length} Teamwissen-Artikel durchsucht · Kein passendes Dokument gefunden`,
          durationMs: libDuration,
          tokensCharged: 0,
          tokensSaved: 0,
        });
      }
    }

    // -------------------------------------------------------------
    // STATION 3: GRÜNE WEBSUCHE
    // -------------------------------------------------------------
    const webStart = performance.now();
    const webAllowed = evaluation.restrictedSources.websuche && contextConfig.enableGreenWeb && !contextConfig.localOnly;
    if (!webAllowed) {
      audits.push({
        stationId: 'web',
        name: 'Grüne Websuche',
        checked: false,
        status: 'blocked',
        summary: contextConfig.localOnly
          ? 'Deaktiviert (Nur lokal aktiv)'
          : !contextConfig.enableGreenWeb
          ? 'Im Kontext-Panel deaktiviert'
          : evaluation.forceLocalOnly
          ? 'Gesperrt durch Datenschutzregel (nur lokal)'
          : 'In Richtlinie deaktiviert',
        durationMs: 0,
        tokensCharged: 0,
        tokensSaved: 0,
      });
    } else {
      // Search only in verified green web pages
      const normWords = normalizeText(query).split(' ').filter(w => w.length > 2);
      const matchedGreen = webItems.filter(item => {
        if (!item.isGreen) return false;
        const text = `${item.title} ${item.queryKeywords.join(' ')} ${item.snippet}`.toLowerCase();
        return normWords.some(w => text.includes(w));
      });

      const filteredNonGreenCount = webItems.filter(item => {
        if (item.isGreen) return false;
        const text = `${item.title} ${item.queryKeywords.join(' ')} ${item.snippet}`.toLowerCase();
        return normWords.some(w => text.includes(w));
      }).length;

      const webDuration = Math.round(performance.now() - webStart);

      if (matchedGreen.length > 0) {
        const topResult = matchedGreen[0];
        const answer = `[Grüne Websuche via ${topResult.domain}]: ${topResult.fullText}`;

        audits.push({
          stationId: 'web',
          name: 'Grüne Websuche',
          checked: true,
          status: 'hit',
          summary: `Treffer auf ${topResult.domain} (Ökostrom zertifiziert) · ${filteredNonGreenCount} ungrüne Ergebnisse ausgefiltert`,
          durationMs: webDuration,
          tokensCharged: 0,
          tokensSaved: 160,
          details: {
            topResult,
            allGreenMatches: matchedGreen,
            filteredNonGreenCount,
          },
        });

        // Cache web result
        globalEcoCache.store(query, answer, 160);

        const totalDuration = Math.round(performance.now() - startTime);
        return {
          query,
          resolvedStation: 'web',
          answer,
          stationAudits: audits,
          totalTokensUsed: 0,
          totalTokensSaved: 160,
          co2SavedGrams: 0.08,
          costSavedCents: 0.04,
          durationMs: totalDuration,
          isMock: false,
          policyNotices: evaluation.notices,
          activeAgent: policy,
        };
      } else {
        audits.push({
          stationId: 'web',
          name: 'Grüne Websuche',
          checked: true,
          status: 'miss',
          summary: filteredNonGreenCount > 0
            ? `${filteredNonGreenCount} ungrüne Treffer verworfen · Keine passenden Seiten auf grünen Ökostrom-Hosts`
            : 'Keine passenden grünen Webquellen gefunden',
          durationMs: webDuration,
          tokensCharged: 0,
          tokensSaved: 0,
        });
      }
    }

    // -------------------------------------------------------------
    // STATION 4: EXTERNE KI (Strategy + Adapter)
    // -------------------------------------------------------------
    const providerStart = performance.now();
    const providerAllowed = evaluation.restrictedSources.externe_ki && contextConfig.enableExternalAI && !contextConfig.localOnly;
    if (!providerAllowed) {
      audits.push({
        stationId: 'provider',
        name: 'Externe KI & Green-Routing',
        checked: false,
        status: 'blocked',
        summary: contextConfig.localOnly
          ? 'Deaktiviert (Nur lokal aktiv)'
          : !contextConfig.enableExternalAI
          ? 'Im Kontext-Panel deaktiviert'
          : evaluation.budgetExceeded
          ? 'Tagesbudget aufgebraucht'
          : evaluation.forceLocalOnly
          ? 'Gesperrt durch Datenschutzrichtlinie'
          : 'In Richtlinie deaktiviert',
        durationMs: 0,
        tokensCharged: 0,
        tokensSaved: 0,
      });

      const totalDuration = Math.round(performance.now() - startTime);
      return {
        query,
        resolvedStation: 'none',
        answer: 'Die Anfrage konnte nicht beantwortet werden, da die externe KI durch die Richtlinien des Agenten oder im Kontext-Panel gesperrt ist (z.B. Nur lokal aktiv oder Budgetlimit) und keine lokalen Quellen passten.',
        stationAudits: audits,
        totalTokensUsed: 0,
        totalTokensSaved: 0,
        co2SavedGrams: 0,
        costSavedCents: 0,
        durationMs: totalDuration,
        isMock: false,
        policyNotices: evaluation.notices,
        activeAgent: policy,
      };
    }

    // Strategy Selection
    const strategyResult = this.greenStrategy.selectProvider(INITIAL_PROVIDERS, {
      onlyGreen: policy.anbieter.nur_gruen,
      allowFallback: policy.anbieter.fallback_erlaubt,
      forceOwnServerOnly: evaluation.forceOwnServerOnly,
    });

    if (!strategyResult.selected) {
      audits.push({
        stationId: 'provider',
        name: 'Externe KI & Green-Routing',
        checked: true,
        status: 'blocked',
        summary: strategyResult.explanation,
        durationMs: Math.round(performance.now() - providerStart),
        tokensCharged: 0,
        tokensSaved: 0,
        details: { strategyResult },
      });

      const totalDuration = Math.round(performance.now() - startTime);
      return {
        query,
        resolvedStation: 'none',
        answer: `Anfrage gestoppt: ${strategyResult.explanation}`,
        stationAudits: audits,
        totalTokensUsed: 0,
        totalTokensSaved: 0,
        co2SavedGrams: 0,
        costSavedCents: 0,
        durationMs: totalDuration,
        isMock: false,
        policyNotices: [...evaluation.notices, strategyResult.explanation],
        activeAgent: policy,
      };
    }

    // Adapter Execution with taskType context
    const selectedProvider = strategyResult.selected;
    const adapter = options.useMockOnly ? this.mockAdapter : this.geminiAdapter;

    let adjustedQuery = query;
    if (taskType === 'complex') {
      adjustedQuery = `[Große Aufgabe mit Vorab-Plan]\nBitte erstelle zuerst einen kurzen 3-Schritte-Plan und danach die detaillierte Ausführung für:\n${query}`;
    } else if (taskType === 'quick') {
      adjustedQuery = `[Schnelle Antwort]\nBitte antworte besonders prägnant und direkt in 1-2 Sätzen auf:\n${query}`;
    }

    const prepared = adapter.prepareRequest(adjustedQuery, selectedProvider, {
      systemInstruction: policy.anweisung,
    });
    const providerResp = await adapter.sendRequest(prepared, selectedProvider);
    const providerDuration = Math.round(performance.now() - providerStart);

    audits.push({
      stationId: 'provider',
      name: 'Externe KI & Green-Routing',
      checked: true,
      status: 'hit',
      summary: `Inferenz über ${selectedProvider.name} (Green-Score ${selectedProvider.score}/100, ${selectedProvider.renewableShare}% Erneuerbare)`,
      durationMs: providerDuration,
      tokensCharged: providerResp.tokensUsed,
      tokensSaved: 0,
      details: {
        provider: selectedProvider,
        response: providerResp,
        strategyResult,
      },
    });

    // Save to Eco-Cache
    globalEcoCache.store(query, providerResp.answer, providerResp.tokensUsed);

    const totalDuration = Math.round(performance.now() - startTime);
    return {
      query,
      resolvedStation: 'provider',
      answer: providerResp.answer,
      stationAudits: audits,
      totalTokensUsed: providerResp.tokensUsed,
      totalTokensSaved: 0,
      co2SavedGrams: 0,
      costSavedCents: 0,
      durationMs: totalDuration,
      isMock: providerResp.isMock,
      providerDetails: providerResp,
      policyNotices: evaluation.notices,
      activeAgent: policy,
    };
  }

  // Pre-check for local stations to trigger approval card if needed
  async checkBeforeExternal(
    query: string,
    policy: AgentPolicy,
    options: {
      useMockOnly?: boolean;
      currentUsedBudget?: number;
      libraryItems?: LibraryItem[];
      webItems?: WebSearchResult[];
      contextConfig?: PipelineContextConfig;
      taskType?: TaskType;
    } = {}
  ): Promise<{
    hasLocalHit: boolean;
    localResult?: PipelineExecutionResult;
    auditsSoFar: StationAudit[];
    candidateProvider?: ProviderConfig | null;
    estimatedTokens?: number;
    requiresApproval: boolean;
  }> {
    const contextConfig = options.contextConfig || DEFAULT_PIPELINE_CONTEXT_CONFIG;
    const libraryItems = options.libraryItems || INITIAL_LIBRARY_ITEMS;
    const webItems = options.webItems || INITIAL_WEB_SEARCH_ITEMS;
    const audits: StationAudit[] = [];

    const hasPersonalData = /iban|gehalt|kunde|patient|bewerbung|passwort|krankmeldung|telefonnummer/i.test(query);
    const evaluation = evaluateRestrictions(policy, options.currentUsedBudget || 0, hasPersonalData);

    // 1. Eco-Cache
    const cacheAllowed = evaluation.restrictedSources.cache && contextConfig.enableCache;
    if (!cacheAllowed) {
      audits.push({
        stationId: 'cache',
        name: 'Eco-Cache',
        checked: false,
        status: 'blocked',
        summary: !contextConfig.enableCache ? 'Im Kontext-Panel deaktiviert' : 'In Richtlinie deaktiviert',
        durationMs: 0,
        tokensCharged: 0,
        tokensSaved: 0,
      });
    } else {
      const cacheCheck = globalEcoCache.checkCache(query, 0.75);
      if (cacheCheck.hit && cacheCheck.entry) {
        audits.push({
          stationId: 'cache',
          name: 'Eco-Cache',
          checked: true,
          status: 'hit',
          summary: `Treffer (${cacheCheck.matchType}, ${Math.round((cacheCheck.similarity || 1) * 100)}% Ähnlichkeit) · 0 externe Tokens`,
          durationMs: 12,
          tokensCharged: 0,
          tokensSaved: cacheCheck.entry.tokensSaved,
          details: { fingerprint: cacheCheck.fingerprint, normalized: cacheCheck.normalized, entry: cacheCheck.entry },
        });

        return {
          hasLocalHit: true,
          localResult: {
            query,
            resolvedStation: 'cache',
            answer: cacheCheck.entry.answer,
            stationAudits: audits,
            totalTokensUsed: 0,
            totalTokensSaved: cacheCheck.entry.tokensSaved,
            co2SavedGrams: Number(((cacheCheck.entry.tokensSaved * 0.00045)).toFixed(2)),
            costSavedCents: Number(((cacheCheck.entry.tokensSaved * 0.0002)).toFixed(2)),
            durationMs: 12,
            isMock: false,
            policyNotices: evaluation.notices,
          },
          auditsSoFar: audits,
          requiresApproval: false,
        };
      } else {
        audits.push({
          stationId: 'cache',
          name: 'Eco-Cache',
          checked: true,
          status: 'miss',
          summary: cacheCheck.closestNonMatch
            ? `Kein Treffer (Ähnlichster Eintrag: "${cacheCheck.closestNonMatch.query.slice(0, 30)}..." bei ${Math.round(cacheCheck.closestNonMatch.similarity * 100)}%)`
            : 'Kein Treffer in gespeicherten Antworten',
          durationMs: 15,
          tokensCharged: 0,
          tokensSaved: 0,
        });
      }
    }

    // 2. Teamwissen
    const libAllowed = evaluation.restrictedSources.teamwissen && contextConfig.enableLibrary;
    if (!libAllowed) {
      audits.push({
        stationId: 'library',
        name: 'Teamwissen & Library',
        checked: false,
        status: 'blocked',
        summary: !contextConfig.enableLibrary ? 'Im Kontext-Panel deaktiviert' : 'In Richtlinie deaktiviert',
        durationMs: 0,
        tokensCharged: 0,
        tokensSaved: 0,
      });
    } else {
      const libMatch = findBestMatch<LibraryItem>(query, libraryItems, item => [item.title, ...item.queries, ...item.tags], 0.65);
      if (libMatch) {
        audits.push({
          stationId: 'library',
          name: 'Teamwissen & Library',
          checked: true,
          status: 'hit',
          summary: `Treffer in "${libMatch.item.title}" (${libMatch.percentage}% Match)`,
          durationMs: 25,
          tokensCharged: 0,
          tokensSaved: libMatch.item.tokens + 110,
          details: { item: libMatch.item, percentage: libMatch.percentage },
        });

        globalEcoCache.store(query, libMatch.item.content, libMatch.item.tokens + 110);
        return {
          hasLocalHit: true,
          localResult: {
            query,
            resolvedStation: 'library',
            answer: libMatch.item.content,
            stationAudits: audits,
            totalTokensUsed: 0,
            totalTokensSaved: libMatch.item.tokens + 110,
            co2SavedGrams: Number((((libMatch.item.tokens + 110) * 0.00045)).toFixed(2)),
            costSavedCents: Number((((libMatch.item.tokens + 110) * 0.0002)).toFixed(2)),
            durationMs: 25,
            isMock: false,
            policyNotices: evaluation.notices,
          },
          auditsSoFar: audits,
          requiresApproval: false,
        };
      } else {
        audits.push({
          stationId: 'library',
          name: 'Teamwissen & Library',
          checked: true,
          status: 'miss',
          summary: `${libraryItems.length} Teamwissen-Artikel durchsucht · Kein Treffer`,
          durationMs: 20,
          tokensCharged: 0,
          tokensSaved: 0,
        });
      }
    }

    // 3. Grüne Websuche
    const webAllowed = evaluation.restrictedSources.websuche && contextConfig.enableGreenWeb && !contextConfig.localOnly;
    if (!webAllowed) {
      audits.push({
        stationId: 'web',
        name: 'Grüne Websuche',
        checked: false,
        status: 'blocked',
        summary: contextConfig.localOnly
          ? 'Deaktiviert (Nur lokal aktiv)'
          : !contextConfig.enableGreenWeb
          ? 'Im Kontext-Panel deaktiviert'
          : evaluation.forceLocalOnly
          ? 'Gesperrt durch Datenschutzregel (nur lokal)'
          : 'In Richtlinie deaktiviert',
        durationMs: 0,
        tokensCharged: 0,
        tokensSaved: 0,
      });
    } else {
      const normWords = normalizeText(query).split(' ').filter(w => w.length > 2);
      const matchedGreen = webItems.filter(item => {
        if (!item.isGreen) return false;
        const text = `${item.title} ${item.queryKeywords.join(' ')} ${item.snippet}`.toLowerCase();
        return normWords.some(w => text.includes(w));
      });

      if (matchedGreen.length > 0) {
        const topResult = matchedGreen[0];
        const answer = `[Grüne Websuche via ${topResult.domain}]: ${topResult.fullText}`;
        audits.push({
          stationId: 'web',
          name: 'Grüne Websuche',
          checked: true,
          status: 'hit',
          summary: `Treffer auf ${topResult.domain} (Ökostrom zertifiziert)`,
          durationMs: 40,
          tokensCharged: 0,
          tokensSaved: 160,
          details: { topResult },
        });

        globalEcoCache.store(query, answer, 160);
        return {
          hasLocalHit: true,
          localResult: {
            query,
            resolvedStation: 'web',
            answer,
            stationAudits: audits,
            totalTokensUsed: 0,
            totalTokensSaved: 160,
            co2SavedGrams: 0.08,
            costSavedCents: 0.04,
            durationMs: 40,
            isMock: false,
            policyNotices: evaluation.notices,
          },
          auditsSoFar: audits,
          requiresApproval: false,
        };
      } else {
        audits.push({
          stationId: 'web',
          name: 'Grüne Websuche',
          checked: true,
          status: 'miss',
          summary: 'Keine passenden Seiten auf grünen Ökostrom-Hosts gefunden',
          durationMs: 35,
          tokensCharged: 0,
          tokensSaved: 0,
        });
      }
    }

    // Check if external provider is candidate
    const providerAllowed = evaluation.restrictedSources.externe_ki && contextConfig.enableExternalAI && !contextConfig.localOnly;
    if (!providerAllowed) {
      return {
        hasLocalHit: false,
        auditsSoFar: audits,
        candidateProvider: null,
        requiresApproval: false,
      };
    }

    const strategyResult = this.greenStrategy.selectProvider(INITIAL_PROVIDERS, {
      onlyGreen: policy.anbieter.nur_gruen,
      allowFallback: policy.anbieter.fallback_erlaubt,
      forceOwnServerOnly: evaluation.forceOwnServerOnly,
    });

    const candidate = strategyResult.selected;
    const estimatedTokens = Math.ceil(query.length / 4) + 120;
    const requiresApproval = contextConfig.askBeforeExternal && candidate !== null;

    return {
      hasLocalHit: false,
      auditsSoFar: audits,
      candidateProvider: candidate,
      estimatedTokens,
      requiresApproval,
    };
  }
}

export const globalPipelineChain = new PipelineChain();
