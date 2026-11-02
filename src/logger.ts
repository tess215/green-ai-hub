// Audit-Trail: protokolliert jede Station der Kette, in echt ergänzt durch die agentgateway-Logs
/**
 * @file logger.ts
 * Audit-Trail und Protokoll-System für Green AI Hub.
 * Protokolliert jede Anfrage mit eindeutiger Trace-ID (#a3f9),
 * erfasst Token-Verbrauch und Ersparnisse sowie detaillierte Stations-Schritte.
 * Bietet Exportfunktionen (ZIP mit JSON, CSV und Markdown-Zusammenfassung).
 */

import JSZip from "jszip";

export type StationType = "cache" | "library" | "web" | "provider";
export type StepStatus = "hit" | "miss" | "skipped" | "disabled" | "active" | "completed";

export interface PipelineStepLog {
  id: string;
  name: string;
  station: StationType;
  status: StepStatus;
  durationMs: number;
  tokens: number;
  isEstimated: boolean;
  notes?: string;
}

export interface InspectedSearchLocation {
  station: StationType;
  stationName: string;
  targetName: string;
  targetType: "cache" | "file" | "host" | "model";
  status: "hit" | "scanned_miss" | "skipped" | "disabled" | "inferred";
  details: string;
  energyOrLocation?: string;
  relevanceScore?: string;
}

export interface AuditLogEntry {
  traceId: string;
  timestamp: string;
  dateIso: string;
  query: string;
  shortQuery: string;
  fullResponseText?: string;
  respondingStation: StationType;
  providerName?: string;
  isFallback: boolean;
  tokensConsumed: number;
  tokensSaved: number;
  isEstimatedTokens: boolean;
  durationSeconds: number;
  steps: PipelineStepLog[];
  searchLocations?: InspectedSearchLocation[];
  taskType: "quick" | "daily" | "complex";
  policyNotice?: string; // z. B. "Blockiert durch support-agent.yaml → datenschutz.personenbezogene_daten: nur_lokal"
}

export class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private listeners: Array<() => void> = [];

  constructor() {
    this.seedInitialHistory();
  }

  public subscribe(cb: () => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  /**
   * Erzeugt eine kurze Hex-Trace-ID im Format #a3f9
   */
  public generateTraceId(): string {
    const chars = "abcdef0123456789";
    let result = "#";
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Registriert einen neuen Anfrage-Durchlauf im Audit-Trail
   */
  public logEntry(entry: AuditLogEntry) {
    this.logs.unshift(entry);
    this.notify();
  }

  public getLogs(): AuditLogEntry[] {
    return [...this.logs];
  }

  public clear() {
    this.logs = [];
    this.notify();
  }

  public reset() {
    this.logs = [];
    this.seedInitialHistory();
    this.notify();
  }

  /**
   * Berechnet Kennzahlen der aktuellen Sitzung
   */
  public getStats() {
    const totalRequests = this.logs.length;
    const consumedTokens = this.logs.reduce((acc, curr) => acc + curr.tokensConsumed, 0);
    const savedTokens = this.logs.reduce((acc, curr) => acc + curr.tokensSaved, 0);
    const cacheHits = this.logs.filter((l) => l.respondingStation === "cache").length;
    const greenProviderCalls = this.logs.filter((l) => l.respondingStation === "provider" && !l.isFallback).length;
    const fallbackCalls = this.logs.filter((l) => l.isFallback).length;

    const cacheHitRate = totalRequests > 0 ? Math.round((cacheHits / totalRequests) * 100) : 0;
    const greenShare = totalRequests > 0 ? Math.round((greenProviderCalls / totalRequests) * 100) : 0;

    return {
      totalRequests,
      consumedTokens,
      savedTokens,
      cacheHits,
      cacheHitRate,
      greenShare,
      fallbackCalls,
    };
  }

  /**
   * Exportiert einen ZIP-Bericht (oder separate Downloads)
   */
  public async exportReport(includeContent: boolean): Promise<Blob> {
    const stats = this.getStats();
    const dateStr = new Date().toISOString().slice(0, 10);

    // 1. protokoll.json
    const exportData = this.logs.map((entry) => ({
      traceId: entry.traceId,
      timestamp: entry.timestamp,
      dateIso: entry.dateIso,
      query: includeContent ? entry.query : undefined,
      shortQuery: entry.shortQuery,
      respondingStation: entry.respondingStation,
      provider: entry.providerName || null,
      isFallback: entry.isFallback,
      tokensConsumed: entry.tokensConsumed,
      tokensSaved: entry.tokensSaved,
      durationSeconds: entry.durationSeconds,
      taskType: entry.taskType,
      steps: entry.steps.map((s) => ({
        step: s.name,
        station: s.station,
        status: s.status,
        tokens: s.tokens,
        durationMs: s.durationMs,
      })),
      responseText: includeContent ? entry.fullResponseText : undefined,
    }));

    const jsonContent = JSON.stringify(exportData, null, 2);

    // 2. protokoll.csv (Semikolon als Trennzeichen)
    const csvHeader = [
      "Trace-ID",
      "Uhrzeit",
      "Aufgabe",
      "Station",
      "Anbieter",
      "Fallback",
      "Tokens Verbraucht",
      "Tokens Gespart",
      "Dauer (s)",
      ...(includeContent ? ["Frage", "Antwort"] : []),
    ].join(";");

    const csvRows = this.logs.map((e) => {
      const cleanShortQuery = `"${e.shortQuery.replace(/"/g, '""')}"`;
      const cleanFullQuery = includeContent ? `"${(e.query || "").replace(/"/g, '""')}"` : "";
      const cleanResponse = includeContent ? `"${(e.fullResponseText || "").replace(/"/g, '""')}"` : "";
      return [
        e.traceId,
        e.timestamp,
        e.taskType,
        e.respondingStation,
        e.providerName || "-",
        e.isFallback ? "Ja" : "Nein",
        e.tokensConsumed,
        e.tokensSaved,
        e.durationSeconds.toFixed(1),
        ...(includeContent ? [cleanFullQuery, cleanResponse] : []),
      ].join(";");
    });

    const csvContent = "\uFEFF" + [csvHeader, ...csvRows].join("\r\n"); // UTF-8 BOM für Excel

    // 3. zusammenfassung.md
    const mdContent = `# Green AI Hub – Audit & Nachhaltigkeitsbericht
Erstellt am: ${new Date().toLocaleString("de-DE")}

## 📊 Übersicht & Kennzahlen
- **Gesamte Anfragen:** ${stats.totalRequests}
- **Cache-Trefferquote:** ${stats.cacheHitRate}% (${stats.cacheHits} von ${stats.totalRequests})
- **Verbrauchte Tokens:** ${stats.consumedTokens.toLocaleString("de-DE")}
- **Gesparte Tokens (Eco-Cache):** ${stats.savedTokens.toLocaleString("de-DE")} 🌿
- **Anteil grüner Anbieter:** ${stats.greenShare}%
- **Konventionelle Fallbacks:** ${stats.fallbackCalls}

## 🔍 Audit-Trail Details
| Trace-ID | Uhrzeit | Station | Tokens | Gespart | Dauer | Anbieter |
|----------|---------|---------|--------|---------|-------|----------|
${this.logs
  .map(
    (l) =>
      `| ${l.traceId} | ${l.timestamp} | ${l.respondingStation} | ${l.tokensConsumed} | ${l.tokensSaved} | ${l.durationSeconds}s | ${l.providerName || "-"} |`
  )
  .join("\n")}

---
*Bericht generiert von Green AI Hub (Audit-Trail ergänzt durch agentgateway).*
`;

    // Erzeuge ZIP mit JSZip
    const zip = new JSZip();
    zip.file("protokoll.json", jsonContent);
    zip.file("protokoll.csv", csvContent);
    zip.file("zusammenfassung.md", mdContent);

    return await zip.generateAsync({ type: "blob" });
  }

  private seedInitialHistory() {
    this.logs = [
      {
        traceId: "#e4b1",
        timestamp: "10:42",
        dateIso: new Date(Date.now() - 3600000).toISOString(),
        query: "Was ist das Proxy Pattern im Eco-Cache?",
        shortQuery: "Proxy Pattern im Eco-Cache",
        fullResponseText: "Das Proxy Pattern fängt Anfragen vor dem teuren LLM-Aufruf ab und spart 100% der Token.",
        respondingStation: "cache",
        isFallback: false,
        tokensConsumed: 0,
        tokensSaved: 980,
        isEstimatedTokens: false,
        durationSeconds: 0.1,
        taskType: "daily",
        steps: [
          { id: "s1", name: "Eco-Cache Prüfung", station: "cache", status: "hit", durationMs: 45, tokens: 0, isEstimated: false, notes: "Treffer: 980 Tokens gespart" },
          { id: "s2", name: "Teamwissen", station: "library", status: "skipped", durationMs: 0, tokens: 0, isEstimated: false },
          { id: "s3", name: "Grüne Websuche", station: "web", status: "skipped", durationMs: 0, tokens: 0, isEstimated: false },
          { id: "s4", name: "Externe Inferenz", station: "provider", status: "skipped", durationMs: 0, tokens: 0, isEstimated: false },
        ],
      },
      {
        traceId: "#a3f9",
        timestamp: "09:15",
        dateIso: new Date(Date.now() - 7200000).toISOString(),
        query: "Wie schreibe ich einen PHPUnit Test für PHP 8.3?",
        shortQuery: "PHPUnit Test für PHP 8.3",
        fullResponseText: "PHPUnit-Tests in PHP 8.3 werden mit typisierten Rückgabewerten und Mockery strukturiert.",
        respondingStation: "cache",
        isFallback: false,
        tokensConsumed: 0,
        tokensSaved: 1420,
        isEstimatedTokens: false,
        durationSeconds: 0.1,
        taskType: "daily",
        steps: [
          { id: "s1", name: "Eco-Cache Prüfung", station: "cache", status: "hit", durationMs: 38, tokens: 0, isEstimated: false, notes: "Treffer: 1420 Tokens gespart" },
          { id: "s2", name: "Teamwissen", station: "library", status: "skipped", durationMs: 0, tokens: 0, isEstimated: false },
          { id: "s3", name: "Grüne Websuche", station: "web", status: "skipped", durationMs: 0, tokens: 0, isEstimated: false },
          { id: "s4", name: "Externe Inferenz", station: "provider", status: "skipped", durationMs: 0, tokens: 0, isEstimated: false },
        ],
      },
      {
        traceId: "#c82a",
        timestamp: "Gestern",
        dateIso: new Date(Date.now() - 86400000).toISOString(),
        query: "Welche Richtlinien gelten für grünes Cloud-Hosting?",
        shortQuery: "Richtlinien für grünes Cloud-Hosting",
        fullResponseText: "Kleine Modelle bis 4B Parameter verbrauchen bis zu 85% weniger Wattstunden.",
        respondingStation: "provider",
        providerName: "Kolibri",
        isFallback: false,
        tokensConsumed: 540,
        tokensSaved: 0,
        isEstimatedTokens: false,
        durationSeconds: 1.8,
        taskType: "quick",
        steps: [
          { id: "s1", name: "Eco-Cache Prüfung", station: "cache", status: "miss", durationMs: 50, tokens: 0, isEstimated: false },
          { id: "s2", name: "Teamwissen prüfen", station: "library", status: "miss", durationMs: 120, tokens: 0, isEstimated: false },
          { id: "s3", name: "Grüne Websuche", station: "web", status: "miss", durationMs: 250, tokens: 0, isEstimated: false },
          { id: "s4", name: "Kolibri Inferenz", station: "provider", status: "completed", durationMs: 1380, tokens: 540, isEstimated: false, notes: "Kolibri · Ökostrom Hetzner" },
        ],
      },
    ];
  }
}

export const globalAuditLogger = new AuditLogger();
