// Teamwissen / Library Store: Interne Guidelines, Dokumente und gelernte Skills
/**
 * @file library.ts
 * Verwaltet das gepflegte Wissen des Teams (Dokumente & Skills).
 * Bietet fehlertolerante Suche über Keywords und Trigram-Ähnlichkeit (Schwelle: 60%),
 * Abschnitterkennung anhand von '## Überschrift' und Nachverfolgung der letzten Abfrage.
 */

import { INITIAL_LIBRARY, LibraryEntry, LibrarySection } from "./config";
import { calculateTrigramSimilarity, normalizeForSimilarity } from "./similarity";

export interface LibraryMatchResult {
  entry: LibraryEntry;
  section: LibrarySection;
  similarityPercent: number;
  matchReason: "keyword" | "similarity";
}

export interface LibraryLastQueryLog {
  query: string;
  queriedKeywords: string[];
  totalSearched: number;
  isHit: boolean;
  foundTitle?: string;
  foundSection?: string;
  similarityPercent?: number;
  excerpt?: string;
  bestMiss?: {
    title: string;
    similarityPercent: number;
  };
}

export interface LibraryMetrics {
  totalDocs: number;
  totalSkills: number;
  weeklyUsage: number;
}

export class LibraryStore {
  private entries: LibraryEntry[] = [];
  private lastQueryLog: LibraryLastQueryLog | null = null;

  constructor() {
    this.reset();
  }

  public reset(): void {
    // Deep clone to avoid mutating initial data
    this.entries = INITIAL_LIBRARY.map((e) => ({
      ...e,
      keywords: [...e.keywords],
      sections: e.sections.map((s) => ({ ...s })),
    }));
    this.lastQueryLog = null;
  }

  public getAll(): LibraryEntry[] {
    return this.entries;
  }

  public getLastQueryLog(): LibraryLastQueryLog | null {
    return this.lastQueryLog;
  }

  public getMetrics(): LibraryMetrics {
    const totalDocs = this.entries.filter((e) => e.type === "document").length;
    const totalSkills = this.entries.filter((e) => e.type === "skill").length;
    const weeklyUsage = this.entries.reduce((acc, curr) => acc + curr.usageCount, 0);

    return {
      totalDocs,
      totalSkills,
      weeklyUsage,
    };
  }

  /**
   * Zerlegt mehrzeiligen Text anhand von '## Überschrift' in Abschnitte
   */
  public parseSectionsFromRaw(rawContent: string, defaultTitle: string): LibrarySection[] {
    const lines = rawContent.split("\n");
    const sections: LibrarySection[] = [];
    let currentHeading = "Abschnitt 1: Übersicht";
    let currentBody: string[] = [];

    for (const line of lines) {
      if (line.trim().startsWith("## ")) {
        if (currentBody.length > 0) {
          sections.push({
            heading: currentHeading,
            content: currentBody.join("\n").trim(),
            usageCount: 1,
          });
          currentBody = [];
        }
        currentHeading = line.trim().replace(/^##\s*/, "");
      } else {
        currentBody.push(line);
      }
    }

    if (currentBody.length > 0) {
      sections.push({
        heading: currentHeading,
        content: currentBody.join("\n").trim(),
        usageCount: 1,
      });
    }

    if (sections.length === 0) {
      sections.push({
        heading: `Abschnitt 1: ${defaultTitle}`,
        content: rawContent.trim(),
        usageCount: 1,
      });
    }

    return sections;
  }

  /**
   * Durchsucht das Teamwissen:
   * 1. Keywords vergleichen
   * 2. Ähnlichkeit mit Abschnittsüberschriften & Text via Trigram (Schwelle: 60%)
   */
  public search(prompt: string): LibraryMatchResult | null {
    const lowerPrompt = prompt.toLowerCase();
    const normalizedPrompt = normalizeForSimilarity(prompt);
    const words = normalizedPrompt.split(/\s+/).filter((w) => w.length >= 3);
    const queriedKeywords = words.slice(0, 6);

    let bestEntry: LibraryEntry | null = null;
    let bestSection: LibrarySection | null = null;
    let highestSim = 0;
    let matchType: "keyword" | "similarity" = "similarity";

    // 1. Suche über Keywords
    for (const entry of this.entries) {
      const kwMatch = entry.keywords.some((kw) => {
        const kwLower = kw.toLowerCase();
        return lowerPrompt.includes(kwLower) || words.includes(kwLower);
      });

      if (kwMatch) {
        // Finde den passendsten Abschnitt
        let section = entry.sections[0];
        let sectionSim = 0;
        for (const s of entry.sections) {
          const sim = calculateTrigramSimilarity(prompt, `${s.heading} ${s.content}`);
          if (sim > sectionSim) {
            sectionSim = sim;
            section = s;
          }
        }

        const score = Math.max(78, sectionSim);
        if (score > highestSim) {
          highestSim = score;
          bestEntry = entry;
          bestSection = section;
          matchType = "keyword";
        }
      }
    }

    // 2. Ähnlichkeitsvergleich mit Abschnitten aller Einträge (Schwelle >= 60%)
    if (!bestEntry) {
      for (const entry of this.entries) {
        for (const sec of entry.sections) {
          const simHead = calculateTrigramSimilarity(prompt, sec.heading);
          const simContent = calculateTrigramSimilarity(prompt, sec.content.slice(0, 200));
          const combinedSim = Math.max(simHead, simContent);

          if (combinedSim > highestSim) {
            highestSim = combinedSim;
            if (combinedSim >= 60) {
              bestEntry = entry;
              bestSection = sec;
              matchType = "similarity";
            }
          }
        }
      }
    }

    // Protokollierung für "Letzte Anfrage"
    if (bestEntry && bestSection && highestSim >= 60) {
      bestEntry.usageCount++;
      bestEntry.lastUsed = "heute";
      bestSection.usageCount++;

      this.lastQueryLog = {
        query: prompt,
        queriedKeywords,
        totalSearched: this.entries.length,
        isHit: true,
        foundTitle: bestEntry.title,
        foundSection: bestSection.heading,
        similarityPercent: highestSim,
        excerpt: bestSection.content.slice(0, 260) + (bestSection.content.length > 260 ? " …" : ""),
      };

      return {
        entry: bestEntry,
        section: bestSection,
        similarityPercent: highestSim,
        matchReason: matchType,
      };
    }

    // Miss protokollieren
    this.lastQueryLog = {
      query: prompt,
      queriedKeywords,
      totalSearched: this.entries.length,
      isHit: false,
      bestMiss: {
        title: this.entries[0]?.title || "team-guidelines.md",
        similarityPercent: highestSim > 0 ? highestSim : 38,
      },
    };

    return null;
  }

  public addEntry(data: {
    title: string;
    type: "document" | "skill";
    keywords: string[];
    rawContent: string;
    source?: string;
  }): LibraryEntry {
    const sections = this.parseSectionsFromRaw(data.rawContent, data.title);
    const summary =
      sections[0]?.content.slice(0, 160) + (sections[0]?.content.length > 160 ? "…" : "") ||
      "Im Teamwissen hinterlegter Eintrag.";

    const newEntry: LibraryEntry = {
      id: `lib-${Date.now()}`,
      title: data.title.trim(),
      type: data.type,
      keywords: data.keywords.map((k) => k.trim()).filter(Boolean),
      summary,
      sections,
      rawContent: data.rawContent,
      source: data.source || "manuell angelegt",
      usageCount: 0,
      lastUsed: "heute",
      tokensEstimate: Math.max(250, data.rawContent.length / 3),
    };

    this.entries.unshift(newEntry);
    return newEntry;
  }

  public updateEntry(
    id: string,
    updates: {
      title?: string;
      type?: "document" | "skill";
      keywords?: string[];
      rawContent?: string;
    }
  ): boolean {
    const entry = this.entries.find((e) => e.id === id);
    if (!entry) return false;

    if (updates.title) entry.title = updates.title.trim();
    if (updates.type) entry.type = updates.type;
    if (updates.keywords) entry.keywords = updates.keywords.map((k) => k.trim()).filter(Boolean);
    if (updates.rawContent) {
      entry.rawContent = updates.rawContent;
      entry.sections = this.parseSectionsFromRaw(updates.rawContent, entry.title);
      entry.summary = entry.sections[0]?.content.slice(0, 160) || entry.summary;
    }

    return true;
  }

  public deleteEntry(id: string): boolean {
    const initialLen = this.entries.length;
    this.entries = this.entries.filter((e) => e.id !== id);
    return this.entries.length < initialLen;
  }
}

export const globalLibraryStore = new LibraryStore();
