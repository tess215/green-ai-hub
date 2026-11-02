/**
 * Design Pattern: Proxy Pattern
 * The Eco-Cache acts as a proxy before external or heavy operations.
 * It normalizes the query, computes a deterministic fingerprint,
 * checks for exact or fuzzy matches (>= 75%), and keeps hit statistics.
 */

import { computeFingerprint, normalizeText, findBestMatch, computeCombinedSimilarity } from './similarity';

export interface CacheEntry {
  id: string;
  originalQuery: string;
  normalizedQuery: string;
  fingerprint: string;
  answer: string;
  tokensSaved: number;
  hitCount: number;
  createdAt: string;
  lastHitAt?: string;
  matchType?: 'exakt' | 'aehnlich';
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalTokensSaved: number;
  hitRatio: number; // 0 to 1
}

export class EcoCacheProxy {
  private entries: Map<string, CacheEntry> = new Map();
  private totalQueriesHandled = 0;
  private totalHitsRecorded = 0;

  constructor() {
    this.seedInitialEntries();
  }

  private seedInitialEntries() {
    const seeds = [
      {
        q: 'Darf ich für die 4-stündige Dienstreise nach Hamburg das Flugzeug nehmen oder muss ich Bahn fahren?',
        a: 'Gemäß Reiserichtlinie ist für Strecken unter 5 Stunden zwingend die Bahn 2. Klasse zu nutzen. Inlandsflüge werden nicht erstattet.',
        tokens: 65,
      },
      {
        q: 'Wie lauten unsere Git Branching Regeln und welche Anforderungen gibt es für Pull Requests?',
        a: 'Trunk-Based Development mit Branches `feature/JIRA-123-beschreibung`. Jeder PR benötigt mindestens 1 Senior Review und grüne CI/CD-Tests.',
        tokens: 72,
      },
      {
        q: 'Ab welchem Rechnungsbetrag benötigt eine Eingangsrechnung eine Zweitzeichnung durch die Bereichsleitung?',
        a: 'Rechnungen ab 1.000 € bis 10.000 € erfordern die Zweitzeichnung der Bereichsleitung (unter 1.000 € genügt Teamlead).',
        tokens: 60,
      },
      {
        q: 'Welche Zuschüsse gibt es für Homeoffice Hardware und Monitore?',
        a: 'Einmalig 600 € brutto über das interne IT-Bestellportal für ergonomische Ausstattung (Monitor, Tastatur, Maus, Stuhl).',
        tokens: 58,
      },
      {
        q: 'Was sind die Prinzipien von Green Software nach der Green Software Foundation?',
        a: 'Energieeffizienz, Hardware-Nutzungsdauer, Kohlenstoffintensität der Rechenzentren und Messbarkeit des Stromverbrauchs.',
        tokens: 80,
      },
    ];

    seeds.forEach((s, idx) => {
      const norm = normalizeText(s.q);
      const fp = computeFingerprint(s.q);
      const id = `cache-seed-${idx + 1}`;
      this.entries.set(id, {
        id,
        originalQuery: s.q,
        normalizedQuery: norm,
        fingerprint: fp,
        answer: s.a,
        tokensSaved: s.tokens,
        hitCount: 3 + idx * 2,
        createdAt: 'Vor 2 Tagen',
        lastHitAt: 'Heute, 09:12 Uhr',
      });
      this.totalQueriesHandled += 5 + idx * 2;
      this.totalHitsRecorded += 3 + idx * 2;
    });
  }

  public checkCache(query: string, threshold = 0.75): {
    hit: boolean;
    entry?: CacheEntry;
    similarity?: number;
    matchType?: 'exakt' | 'aehnlich';
    normalized: string;
    fingerprint: string;
    closestNonMatch?: { query: string; similarity: number };
  } {
    this.totalQueriesHandled++;
    const norm = normalizeText(query);
    const fp = computeFingerprint(query);

    const candidates = Array.from(this.entries.values());
    const match = findBestMatch<CacheEntry>(
      query,
      candidates,
      item => [item.originalQuery, item.normalizedQuery],
      threshold
    );

    if (match) {
      this.totalHitsRecorded++;
      match.item.hitCount++;
      match.item.lastHitAt = 'Gerade eben';
      return {
        hit: true,
        entry: match.item,
        similarity: match.similarity,
        matchType: match.type === 'exakt' ? 'exakt' : 'aehnlich',
        normalized: norm,
        fingerprint: fp,
      };
    }

    // Find closest non-match for transparent debugging in UI
    let closestQuery = '';
    let closestScore = 0;
    for (const c of candidates) {
      const s = computeCombinedSimilarity(query, c.originalQuery);
      if (s > closestScore) {
        closestScore = s;
        closestQuery = c.originalQuery;
      }
    }

    return {
      hit: false,
      normalized: norm,
      fingerprint: fp,
      closestNonMatch: closestScore > 0 ? { query: closestQuery, similarity: closestScore } : undefined,
    };
  }

  public store(query: string, answer: string, tokensSaved = 75): CacheEntry {
    const norm = normalizeText(query);
    const fp = computeFingerprint(query);
    const id = `cache-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    const entry: CacheEntry = {
      id,
      originalQuery: query,
      normalizedQuery: norm,
      fingerprint: fp,
      answer,
      tokensSaved,
      hitCount: 1,
      createdAt: 'Gerade eben',
      lastHitAt: 'Gerade eben',
    };

    this.entries.set(id, entry);
    return entry;
  }

  public getAll(): CacheEntry[] {
    return Array.from(this.entries.values());
  }

  public getStats(): CacheStats {
    const totalEntries = this.entries.size;
    let tokensSaved = 0;
    this.entries.forEach(e => {
      tokensSaved += e.tokensSaved * e.hitCount;
    });

    const hitRatio = this.totalQueriesHandled > 0 ? this.totalHitsRecorded / this.totalQueriesHandled : 0.65;

    return {
      totalEntries,
      totalHits: this.totalHitsRecorded,
      totalTokensSaved: tokensSaved,
      hitRatio,
    };
  }

  public reset() {
    this.entries.clear();
    this.totalQueriesHandled = 0;
    this.totalHitsRecorded = 0;
    this.seedInitialEntries();
  }
}

export const globalEcoCache = new EcoCacheProxy();
