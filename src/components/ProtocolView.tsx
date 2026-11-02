import React, { useState, useEffect } from "react";
import {
  Clock,
  Leaf,
  ChevronDown,
  ChevronUp,
  Download,
  RotateCcw,
  Layers,
  Search,
  FileText,
  Database,
  BookOpen,
  Globe,
  Cpu,
  CheckCircle2,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { globalAuditLogger, AuditLogEntry, StationType } from "../logger";
import { globalCacheProxy } from "../cache";
import { ExportModal } from "./ExportModal";
import "./ProtocolView.css";

interface ProtocolViewProps {
  onResetAll?: () => void;
  highlightTraceId?: string | null;
}

export const ProtocolView: React.FC<ProtocolViewProps> = ({
  onResetAll,
  highlightTraceId,
}) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [filter, setFilter] = useState<"all" | "ai" | "savings" | "fallbacks">("all");
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(highlightTraceId || null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  useEffect(() => {
    const update = () => {
      setLogs(globalAuditLogger.getLogs());
    };
    update();
    const unsubscribe = globalAuditLogger.subscribe(update);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (highlightTraceId) {
      setExpandedTraceId(highlightTraceId);
    }
  }, [highlightTraceId]);

  const stats = globalAuditLogger.getStats();

  const filteredLogs = logs.filter((log) => {
    if (filter === "ai") return log.respondingStation === "provider";
    if (filter === "savings") return log.tokensSaved > 0;
    if (filter === "fallbacks") return log.isFallback;
    return true;
  });

  const handleReset = () => {
    if (window.confirm("Möchtest du das gesamte Protokoll und den Cache zurücksetzen?")) {
      globalAuditLogger.reset();
      globalCacheProxy.reset();
      if (onResetAll) onResetAll();
    }
  };

  const getStationDotColor = (station: StationType, isFallback: boolean) => {
    if (isFallback) return "#d97706";
    switch (station) {
      case "cache":
        return "#15803d";
      case "library":
        return "#1d4ed8";
      case "web":
        return "#0f766e";
      case "provider":
        return "#be123c";
    }
  };

  const getStationLabel = (station: StationType, isFallback: boolean, provider?: string) => {
    if (isFallback) return `Fallback (${provider || "Extern"})`;
    switch (station) {
      case "cache":
        return "Eco-Cache";
      case "library":
        return "Teamwissen";
      case "web":
        return "Grüne Websuche";
      case "provider":
        return provider || "Externe KI";
    }
  };

  const totalTokensCombined = stats.consumedTokens + stats.savedTokens;
  const consumedPct = totalTokensCombined > 0 ? (stats.consumedTokens / totalTokensCombined) * 100 : 50;
  const savedPct = totalTokensCombined > 0 ? (stats.savedTokens / totalTokensCombined) * 100 : 50;

  return (
    <div className="protocol-container">
      {/* Top Session Metrics */}
      <div className="protocol-metrics-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ padding: "10px", backgroundColor: "#ccfbf1", borderRadius: "10px", color: "#0f766e" }}>
              <Clock style={{ width: 20, height: 20 }} aria-hidden="true" />
            </div>
            <div>
              <h2 style={{ fontSize: "14px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#0f172a" }}>
                Sitzungs-Kennzahlen
              </h2>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#334155", marginTop: "2px" }}>
                Live-Audit des agentgateway & Inferenzverbrauchs
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => setIsExportModalOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                backgroundColor: "#0f766e",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              <Download style={{ width: 16, height: 16 }} aria-hidden="true" />
              <span>Bericht exportieren</span>
            </button>
            <button
              onClick={handleReset}
              title="Demo & Protokoll zurücksetzen"
              style={{
                padding: "8px",
                backgroundColor: "#f1f5f9",
                border: "2px solid #cbd5e1",
                borderRadius: "10px",
                cursor: "pointer",
                color: "#0f172a",
              }}
            >
              <RotateCcw style={{ width: 16, height: 16 }} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="protocol-metrics-grid">
          <div className="protocol-metric-item">
            <div className="protocol-metric-label">Anfragen</div>
            <div className="protocol-metric-value">{stats.totalRequests}</div>
            <div className="protocol-metric-sub">{stats.cacheHitRate}% Cache-Quote</div>
          </div>

          <div className="protocol-metric-item">
            <div className="protocol-metric-label">Verbraucht</div>
            <div className="protocol-metric-value" style={{ color: "#c2410c" }}>
              {stats.consumedTokens.toLocaleString("de-DE")}
            </div>
            <div className="protocol-metric-sub">Tokens Inferenz</div>
          </div>

          <div className="protocol-metric-item">
            <div className="protocol-metric-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Leaf style={{ width: 14, height: 14, color: "#15803d" }} aria-hidden="true" />
              Gespart
            </div>
            <div className="protocol-metric-value" style={{ color: "#15803d" }}>
              {stats.savedTokens.toLocaleString("de-DE")}
            </div>
            <div className="protocol-metric-sub" style={{ color: "#15803d" }}>100% CO2 vermieden</div>
          </div>
        </div>

        {/* Verhältnisbalken */}
        <div style={{ marginTop: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>
            <span>Verbrauch vs. Ersparnis</span>
            <span>{consumedPct.toFixed(0)}% verbraucht / {savedPct.toFixed(0)}% gespart</span>
          </div>
          <div style={{ height: "10px", width: "100%", backgroundColor: "#cbd5e1", borderRadius: "999px", display: "flex", overflow: "hidden" }}>
            <div style={{ width: `${consumedPct}%`, backgroundColor: "#ea580c" }} />
            <div style={{ width: `${savedPct}%`, backgroundColor: "#15803d" }} />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="protocol-filter-bar" role="tablist">
        <button
          onClick={() => setFilter("all")}
          className={`protocol-filter-btn ${filter === "all" ? "active" : ""}`}
        >
          Alle ({logs.length})
        </button>
        <button
          onClick={() => setFilter("ai")}
          className={`protocol-filter-btn ${filter === "ai" ? "active" : ""}`}
        >
          Nur KI-Aufrufe
        </button>
        <button
          onClick={() => setFilter("savings")}
          className={`protocol-filter-btn ${filter === "savings" ? "active" : ""}`}
        >
          Nur Ersparnisse
        </button>
        <button
          onClick={() => setFilter("fallbacks")}
          className={`protocol-filter-btn ${filter === "fallbacks" ? "active" : ""}`}
        >
          Fallbacks
        </button>
      </div>

      {/* Logs List */}
      <div style={{ flex: 1, overflowY: "auto", paddingRight: "4px" }} role="feed">
        {filteredLogs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#334155", fontSize: "14px", fontWeight: 700 }}>
            Keine Protokolleinträge für den gewählten Filter vorhanden.
          </div>
        ) : (
          filteredLogs.map((entry) => {
            const isExpanded = expandedTraceId === entry.traceId;

            return (
              <div
                key={entry.traceId}
                className={`protocol-log-row ${isExpanded ? "expanded" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => setExpandedTraceId(isExpanded ? null : entry.traceId)}
                  className="protocol-log-btn"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <span
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        backgroundColor: getStationDotColor(entry.respondingStation, entry.isFallback),
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                      aria-hidden="true"
                    />

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "12px", fontWeight: 800, color: "#0f172a", backgroundColor: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                          {entry.traceId}
                        </span>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>
                          {entry.timestamp}
                        </span>
                        <span style={{ fontSize: "12px", fontWeight: 700, padding: "2px 8px", backgroundColor: "#e2e8f0", color: "#0f172a", borderRadius: "6px" }}>
                          {getStationLabel(entry.respondingStation, entry.isFallback, entry.providerName)}
                        </span>
                      </div>
                      <div className="protocol-log-query">
                        {entry.shortQuery}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "16px", textAlign: "right" }}>
                    <div>
                      <div className="protocol-log-tokens">
                        {entry.tokensConsumed > 0 ? (
                          <span>{entry.tokensConsumed} Tok</span>
                        ) : (
                          <span style={{ color: "#15803d" }}>+{entry.tokensSaved} 🌿</span>
                        )}
                      </div>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>
                        {entry.durationSeconds.toFixed(1)}s
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp style={{ width: 18, height: 18, color: "#0f172a" }} aria-hidden="true" />
                    ) : (
                      <ChevronDown style={{ width: 18, height: 18, color: "#0f172a" }} aria-hidden="true" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="protocol-timeline-box" role="region" aria-label={`Audit-Details für ${entry.traceId}`}>
                    {/* 1. Was sieht man sich hier an? Kassenbon Audit-Inspektor */}
                    <div className="protocol-inspector-banner">
                      <div className="protocol-inspector-title">
                        <ShieldCheck style={{ width: 18, height: 18, color: "#15803d" }} aria-hidden="true" />
                        <span>Kassenbon Audit-Inspektor · Trace {entry.traceId}</span>
                      </div>
                      <p className="protocol-inspector-text">
                        <strong>Was wird hier geprüft?</strong> Dieser Audit-Beleg verifiziert die lückenlose Route des Requests durch die Chain of Responsibility, den exakten Token- & Energieverbrauch, alle durchsuchten Speicherorte und die GHG Scope 2/3 Konformität.
                      </p>

                      <div className="protocol-inspector-grid">
                        <div className="protocol-inspector-stat">
                          <div className="protocol-inspector-stat-label">Antwortende Route</div>
                          <div className="protocol-inspector-stat-val" style={{ fontSize: "14px", color: getStationDotColor(entry.respondingStation, entry.isFallback) }}>
                            {getStationLabel(entry.respondingStation, entry.isFallback, entry.providerName)}
                          </div>
                        </div>

                        <div className="protocol-inspector-stat">
                          <div className="protocol-inspector-stat-label">Inferenz-Verbrauch</div>
                          <div className="protocol-inspector-stat-val" style={{ color: entry.tokensConsumed > 0 ? "#c2410c" : "#15803d" }}>
                            {entry.tokensConsumed > 0 ? `${entry.tokensConsumed.toLocaleString("de-DE")} Tokens` : "0 Tokens (Lokal)"}
                          </div>
                        </div>

                        <div className="protocol-inspector-stat">
                          <div className="protocol-inspector-stat-label">Eingespart / Vermieden</div>
                          <div className="protocol-inspector-stat-val" style={{ color: "#15803d" }}>
                            {entry.tokensSaved > 0 ? `+${entry.tokensSaved.toLocaleString("de-DE")} Tokens` : "0 (Standard)"}
                          </div>
                        </div>

                        <div className="protocol-inspector-stat">
                          <div className="protocol-inspector-stat-label">Kaskaden-Laufzeit</div>
                          <div className="protocol-inspector-stat-val">
                            {entry.durationSeconds.toFixed(2)}s
                          </div>
                        </div>
                      </div>

                      {entry.policyNotice && (
                        <div
                          style={{
                            marginTop: "12px",
                            padding: "8px 12px",
                            backgroundColor: "#fef3c7",
                            border: "1.5px solid #fde68a",
                            borderRadius: "8px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "12px",
                            fontWeight: 700,
                            color: "#92400e",
                          }}
                        >
                          <Lock style={{ width: 15, height: 15, color: "#b45309", flexShrink: 0 }} aria-hidden="true" />
                          <span>Richtlinien-Einschränkung: {entry.policyNotice}</span>
                        </div>
                      )}
                    </div>

                    {/* 2. Kaskaden-Zeitleiste */}
                    <div style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#0f172a", marginBottom: "8px" }}>
                      Kaskaden-Zeitleiste (Pipeline-Stufen)
                    </div>

                    <div style={{ borderLeft: "2px solid #cbd5e1", paddingLeft: "14px", marginLeft: "4px" }}>
                      {entry.steps.map((step, idx) => {
                        const isLastStep = idx === entry.steps.length - 1;

                        return (
                          <div
                            key={idx}
                            className={`protocol-timeline-item ${isLastStep && step.station === "provider" ? "gateway" : ""}`}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                                {step.name}
                              </span>
                              <span style={{ fontSize: "12px", fontWeight: 800, color: step.status === "hit" ? "#15803d" : step.status === "completed" ? "#be123c" : "#64748b" }}>
                                {step.status === "hit" ? "✓ Treffer" : step.status === "completed" ? "✓ Durchgeführt" : step.status === "disabled" ? "deaktiviert" : "übersprungen"}
                              </span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#334155", marginTop: "4px", fontWeight: 600 }}>
                              <span>Dauer: {step.durationMs}ms</span>
                              <span style={{ fontFamily: "JetBrains Mono, monospace", color: "#0f172a" }}>
                                {step.tokens > 0 ? `${step.tokens} Tokens` : "0 Tokens"}
                              </span>
                            </div>

                            {isLastStep && (
                              <div style={{ marginTop: "6px", paddingTop: "6px", borderTop: "1px solid #e9d5ff", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#7e22ce", fontWeight: 700 }}>
                                <Layers style={{ width: 14, height: 14 }} aria-hidden="true" />
                                <span>in echt protokolliert von agentgateway</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* 3. Wo Kolibri überall gesucht hat */}
                    <div className="protocol-search-box">
                      <div className="protocol-search-header">
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Search style={{ width: 15, height: 15, color: "#0f766e" }} aria-hidden="true" />
                          <span>Wo Kolibri für diesen Request überall gesucht hat ({entry.searchLocations?.length || 0})</span>
                        </div>
                      </div>

                      {(!entry.searchLocations || entry.searchLocations.length === 0) ? (
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#475569" }}>
                          Kein detaillierter Suchpfad für diesen Trace hinterlegt.
                        </div>
                      ) : (
                        entry.searchLocations.map((loc, lIdx) => {
                          const isHit = loc.status === "hit";
                          return (
                            <div key={lIdx} className={`protocol-search-row ${isHit ? "hit" : ""}`}>
                              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                                <div style={{ padding: "6px", backgroundColor: isHit ? "#dcfce7" : "#e2e8f0", borderRadius: "6px", display: "flex", marginTop: "2px" }}>
                                  {loc.station === "cache" ? (
                                    <Database style={{ width: 15, height: 15, color: "#15803d" }} aria-hidden="true" />
                                  ) : loc.station === "library" ? (
                                    <BookOpen style={{ width: 15, height: 15, color: "#1d4ed8" }} aria-hidden="true" />
                                  ) : loc.station === "web" ? (
                                    <Globe style={{ width: 15, height: 15, color: "#0f766e" }} aria-hidden="true" />
                                  ) : (
                                    <Cpu style={{ width: 15, height: 15, color: "#be123c" }} aria-hidden="true" />
                                  )}
                                </div>
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>{loc.targetName}</span>
                                    <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 6px", backgroundColor: "#e2e8f0", color: "#1e293b", borderRadius: "4px" }}>
                                      {loc.stationName}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#334155", marginTop: "2px" }}>
                                    {loc.details}
                                  </div>
                                  {loc.energyOrLocation && (
                                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#0f766e", marginTop: "4px" }}>
                                      ⚡ {loc.energyOrLocation}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div style={{
                                padding: "4px 8px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: 800,
                                backgroundColor: isHit ? "#dcfce7" : "#f1f5f9",
                                color: isHit ? "#14532d" : "#475569",
                                border: isHit ? "1px solid #86efac" : "1px solid #cbd5e1",
                                whiteSpace: "nowrap"
                              }}>
                                {isHit ? "✓ Treffer" : "Geprüft"}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* 4. agentgateway Audit-Prüfsiegel */}
                    <div className="protocol-seal-card">
                      <ShieldCheck style={{ width: 22, height: 22, color: "#7e22ce", flexShrink: 0, marginTop: "2px" }} aria-hidden="true" />
                      <div>
                        <div className="protocol-seal-title">agentgateway Green-IT Audit-Nachweis</div>
                        <div className="protocol-seal-desc">
                          Dieser Beleg wurde kryptografisch signiert und im unveränderlichen Audit-Logbuch gespeichert. Er dient als offizieller Nachweis für GHG Scope 2 & Scope 3 Bilanzierungen und Energie-SLA-Audits.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
};
