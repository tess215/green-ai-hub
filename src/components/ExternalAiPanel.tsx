import React, { useState, useEffect, useRef } from "react";
import {
  Cpu,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
  CheckCircle2,
  XCircle,
  HelpCircle,
  DollarSign,
  Leaf,
  Info,
} from "lucide-react";
import { globalExternalAiStore } from "../externalAi";
import {
  globalStrategyManager,
  StrategyType,
  ProviderScoreDetails,
  calculateEfficiencyScore,
} from "../strategy";
import { ModelProvider } from "../config";
import "./ExternalAiPanel.css";

interface ExternalAiPanelProps {
  onClose: () => void;
  isStationDisabled?: boolean;
  onReEnableStation?: () => void;
  initialSection?: "strategy" | "adapter" | null;
  askBeforeExternal: boolean;
  onToggleAskBeforeExternal: (val: boolean) => void;
}

export const ExternalAiPanel: React.FC<ExternalAiPanelProps> = ({
  onClose,
  isStationDisabled = false,
  onReEnableStation,
  initialSection = null,
  askBeforeExternal,
  onToggleAskBeforeExternal,
}) => {
  const [activeTab, setActiveTab] = useState<"lastQuery" | "providers" | "strategy">("lastQuery");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const triggerUpdate = () => setVersion((v) => v + 1);

  const strategyRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialSection === "strategy" && strategyRef.current) {
      strategyRef.current.scrollIntoView({ behavior: "smooth" });
    } else if (initialSection === "adapter" && adapterRef.current) {
      adapterRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [initialSection]);

  const lastLog = globalExternalAiStore.getLastQueryLog();
  const metrics = globalExternalAiStore.getMetrics();
  const activeStrategyType = globalStrategyManager.getActiveStrategyType();
  const allGreenDisabled = globalStrategyManager.isAllGreenDisabled();
  const allowFallback = globalStrategyManager.isAllowNonGreenFallback();
  const providers = globalStrategyManager.getProviders();

  // Aktuelles Ranking berechnen
  const currentTaskType = lastLog?.taskType || "daily";
  const rankingResult = globalStrategyManager.rank(currentTaskType);

  const handleSelectStrategy = (type: StrategyType) => {
    globalStrategyManager.setActiveStrategyType(type);
    triggerUpdate();
  };

  const handleToggleProvider = (providerId: string, currentVal: boolean) => {
    globalStrategyManager.setProviderAvailable(providerId, !currentVal);
    triggerUpdate();
  };

  const handleToggleAllGreen = (val: boolean) => {
    globalStrategyManager.setAllGreenDisabled(val);
    triggerUpdate();
  };

  const handleToggleFallback = (val: boolean) => {
    globalStrategyManager.setAllowNonGreenFallback(val);
    triggerUpdate();
  };

  return (
    <div className="extai-panel-container">
      {/* 4 Kennzahlen oben */}
      <div className="extai-metrics-grid">
        <div className="extai-metric-card">
          <div className="extai-metric-val">{metrics.totalCalls}</div>
          <div className="extai-metric-label">KI-Aufrufe</div>
        </div>
        <div className="extai-metric-card">
          <div className="extai-metric-val">{metrics.totalTokensConsumed.toLocaleString("de-DE")}</div>
          <div className="extai-metric-label">Verbrauchte Tokens</div>
        </div>
        <div className="extai-metric-card">
          <div className="extai-metric-val">{metrics.greenSharePercent}%</div>
          <div className="extai-metric-label">Anteil grüne Anbieter</div>
        </div>
        <div className="extai-metric-card">
          <div className="extai-metric-val">{metrics.fallbackCount}</div>
          <div className="extai-metric-label">Fallbacks</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="extai-tabs-bar" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "lastQuery"}
          onClick={() => setActiveTab("lastQuery")}
          className={`extai-tab-btn ${activeTab === "lastQuery" ? "active" : ""}`}
        >
          Letzte Anfrage
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "providers"}
          onClick={() => setActiveTab("providers")}
          className={`extai-tab-btn ${activeTab === "providers" ? "active" : ""}`}
        >
          Anbieter ({providers.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "strategy"}
          onClick={() => setActiveTab("strategy")}
          className={`extai-tab-btn ${activeTab === "strategy" ? "active" : ""}`}
        >
          Strategie ({activeStrategyType === "green" ? "Grün" : "Kosten"})
        </button>
      </div>

      {/* TAB 1: LETZTE ANFRAGE (3 Abschnitte untereinander) */}
      {activeTab === "lastQuery" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* 1. Anbieterwahl (Strategy Pattern) - orange */}
          <div ref={strategyRef} className="extai-section-box strategy">
            <div className="extai-section-header">
              <span className="extai-section-title">
                <Sparkles style={{ width: 16, height: 16 }} />
                1. Anbieterwahl (Strategy Pattern)
              </span>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#c2410c", backgroundColor: "#ffedd5", padding: "2px 6px", borderRadius: "4px" }}>
                Aufgabe: {currentTaskType === "quick" ? "Schnell" : currentTaskType === "daily" ? "Alltag" : "Groß"} · {activeStrategyType === "green" ? "Strategie Grün" : "Strategie Kosten"}
              </span>
            </div>

            {/* Rangliste als Tabelle */}
            <table className="extai-ranking-table">
              <thead>
                <tr>
                  <th>Anbieter</th>
                  <th>Strom</th>
                  <th>Effizienz</th>
                  <th>Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rankingResult.allRanked.map((item) => {
                  const isChosen = rankingResult.selected?.id === item.provider.id;
                  const isOut = item.status === "nicht_erreichbar";
                  const isUnfit = item.status === "nicht_geeignet";

                  return (
                    <tr
                      key={item.provider.id}
                      className={`extai-ranking-row ${isChosen ? "chosen" : ""} ${isOut ? "disabled" : ""}`}
                    >
                      <td>
                        <strong>{item.provider.name}</strong>
                        {isChosen && (
                          <span style={{ marginLeft: "4px", fontSize: "10px", color: "#c2410c", fontWeight: 900 }}>
                            ★
                          </span>
                        )}
                      </td>
                      <td>
                        {item.stromScore}%
                        <div className="extai-bar-mini">
                          <div className="extai-bar-fill-green" style={{ width: `${item.stromScore}%` }} />
                        </div>
                      </td>
                      <td>
                        {item.effizienzScore}%
                        <div className="extai-bar-mini">
                          <div className="extai-bar-fill-teal" style={{ width: `${item.effizienzScore}%` }} />
                        </div>
                      </td>
                      <td style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 800 }}>
                        {item.gesamtScore}
                      </td>
                      <td>
                        {isOut ? (
                          <span style={{ color: "#b91c1c", fontWeight: 700 }}>nicht erreichbar</span>
                        ) : isUnfit ? (
                          <span style={{ color: "#64748b" }}>nicht geeignet</span>
                        ) : (
                          <span style={{ color: "#15803d", fontWeight: 700 }}>verfügbar</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Begründungssatz */}
            <div style={{ fontSize: "12px", color: "#334155", fontWeight: 600, lineHeight: 1.5 }}>
              {rankingResult.reason}
            </div>

            {rankingResult.isFallback && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "#9a3412", backgroundColor: "#fff7ed", padding: "8px", borderRadius: "6px", border: "1px solid #fed7aa" }}>
                <AlertTriangle style={{ width: 16, height: 16, color: "#ea580c" }} />
                <span>Kein grüner Anbieter erreichbar – Fallback auf {rankingResult.selected?.name} (nicht grün)</span>
              </div>
            )}
          </div>

          {/* 2. Freigabe */}
          <div className="extai-section-box permission">
            <span style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase", color: "#475569" }}>
              2. Freigabe
            </span>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
              {lastLog?.permissionNote || "Automatisch (Rückfrage ausgeschaltet)"}
            </div>
          </div>

          {/* 3. Übertragung (Adapter Pattern) - lila */}
          <div ref={adapterRef} className="extai-section-box adapter">
            <div className="extai-section-header">
              <span className="extai-section-title">
                <Layers style={{ width: 16, height: 16 }} />
                3. Übertragung (Adapter Pattern)
              </span>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#6d28d9", backgroundColor: "#ede9fe", padding: "2px 6px", borderRadius: "4px" }}>
                Adapter: {lastLog?.adapterName || "KolibriAdapter"}
              </span>
            </div>

            <div style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>
              {lastLog?.adapterDescription || "Übersetzt in OpenAI-kompatibles Format."}
            </div>

            {/* Aufklappbare Anfrage-Vorschau (JSON) */}
            <div>
              <button
                type="button"
                onClick={() => setPreviewOpen(!previewOpen)}
                style={{ background: "none", border: "none", padding: 0, fontSize: "12px", fontWeight: 700, color: "#7c3aed", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                <span>Anfrage-Vorschau (JSON)</span>
                {previewOpen ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
              </button>

              {previewOpen && (
                <div style={{ marginTop: "6px" }}>
                  <pre className="extai-json-preview">
                    <code>{lastLog?.previewJson || "{}"}</code>
                  </pre>
                  <span style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", display: "block" }}>
                    Gekürzt – vollständige Prompts werden nicht angezeigt.
                  </span>
                </div>
              )}
            </div>

            {/* Token-Verbrauch Kacheln */}
            {lastLog?.tokens && (
              <div className="extai-token-stats-grid">
                <div className="extai-token-stat-item">
                  <span className="extai-token-stat-label">Eingabe</span>
                  <span className="extai-token-stat-val">{lastLog.tokens.prompt}</span>
                </div>
                <div className="extai-token-stat-item">
                  <span className="extai-token-stat-label">Ausgabe</span>
                  <span className="extai-token-stat-val">{lastLog.tokens.completion}</span>
                </div>
                <div className="extai-token-stat-item">
                  <span className="extai-token-stat-label">Provider-Cache</span>
                  <span className="extai-token-stat-val">{lastLog.tokens.cached}</span>
                </div>
                <div className="extai-token-stat-item">
                  <span className="extai-token-stat-label">Dauer</span>
                  <span className="extai-token-stat-val">{lastLog.durationMs}ms</span>
                </div>
                <div className="extai-token-stat-item">
                  <span className="extai-token-stat-label">Trace-ID</span>
                  <span className="extai-token-stat-val">{lastLog.traceId}</span>
                </div>
                <div className="extai-token-stat-item">
                  <span className="extai-token-stat-label">Gesamt</span>
                  <span className="extai-token-stat-val">{lastLog.tokens.total} Tok</span>
                </div>
              </div>
            )}

            <div style={{ fontSize: "11px", color: "#64748b", fontStyle: "italic" }}>
              Demo: beantwortet von Gemini. In echt über agentgateway an {rankingResult.selected?.name || "gewählten Anbieter"}.
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ANBIETER */}
      {activeTab === "providers" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
            <Info style={{ width: 13, height: 13 }} />
            <span>Alle Werte sind Testdaten.</span>
          </div>

          <div className="extai-providers-list">
            {providers.map((p) => {
              const eff = calculateEfficiencyScore(p.aktiveParameter);

              return (
                <div
                  key={p.id}
                  className={`extai-provider-card ${!p.isAvailable ? "disabled" : ""}`}
                >
                  <div className="extai-provider-top">
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className="extai-provider-name">{p.name}</span>
                      {p.isGreen ? (
                        <span className="extai-badge-green">grün</span>
                      ) : (
                        <span className="extai-badge-std">Standard</span>
                      )}
                    </div>

                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={p.isAvailable}
                        onChange={() => handleToggleProvider(p.id, p.isAvailable)}
                      />
                      <span>verfügbar</span>
                    </label>
                  </div>

                  <div className="extai-provider-specs-grid">
                    <div>Ökostrom: <strong>{p.strom}%</strong></div>
                    <div>Parameter: <strong>{p.aktiveParameter ? `${p.aktiveParameter} Mrd.` : "nicht veröff."}</strong></div>
                    <div>Effizienz: <strong>{eff.score}%</strong></div>
                    <div>Preis / 1k: <strong>{p.pricePer1k.toFixed(2)} €</strong></div>
                    <div>Caching: <strong>{p.cachingType}</strong></div>
                    <div>Aufgaben: <strong>{p.suitableTasks.join(", ")}</strong></div>
                    <div>Nutzungen: <strong>{p.usageCount}</strong></div>
                    <div>Tokens: <strong>{p.tokensUsed.toLocaleString("de-DE")}</strong></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Schalter: Alle grünen Anbieter ausschalten (Demo-Steuerung) */}
          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>Grüne Anbieter nicht erreichbar</div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>Schaltet alle grünen Anbieter gleichzeitig aus (Demo für Fallback).</div>
            </div>
            <input
              type="checkbox"
              checked={allGreenDisabled}
              onChange={(e) => handleToggleAllGreen(e.target.checked)}
            />
          </div>
        </div>
      )}

      {/* TAB 3: STRATEGIE */}
      {activeTab === "strategy" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Strategie Karten */}
          <div
            onClick={() => handleSelectStrategy("green")}
            className={`extai-strategy-card ${activeStrategyType === "green" ? "selected" : ""}`}
          >
            <div className="extai-strategy-title">
              <span>Grün (Standard)</span>
              {activeStrategyType === "green" && <CheckCircle2 style={{ width: 18, height: 18, color: "#ea580c" }} />}
            </div>
            <div style={{ fontSize: "12px", color: "#334155", lineHeight: 1.4 }}>
              Gesamtscore = 60 % Strom + 40 % Effizienz. Bevorzugt kleine, ressourcenschonende Modelle mit echtem Grünstrom.
            </div>
          </div>

          <div
            onClick={() => handleSelectStrategy("cost")}
            className={`extai-strategy-card ${activeStrategyType === "cost" ? "selected" : ""}`}
          >
            <div className="extai-strategy-title">
              <span>Kosten (Demo)</span>
              {activeStrategyType === "cost" && <CheckCircle2 style={{ width: 18, height: 18, color: "#ea580c" }} />}
            </div>
            <div style={{ fontSize: "12px", color: "#334155", lineHeight: 1.4 }}>
              Sortiert rein nach Preis pro 1.000 Tokens aus config.ts.
              <br />
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                Geplante Erweiterung – zeigt, dass Strategien austauschbar sind, ohne Kette oder Adapter zu ändern.
              </span>
            </div>
          </div>

          {/* Erklärung der Effizienz */}
          <div className="extai-efficiency-explain">
            <span style={{ fontWeight: 800, color: "#0f172a" }}>Erklärung der Modell-Effizienz:</span>
            <span>Weniger aktive Parameter = weniger Rechenaufwand pro Antwort.</span>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "4px" }}>
              <div className="extai-efficiency-step">
                <span>bis 5 Mrd. Parameter:</span>
                <strong>Score 95 (sehr effizient)</strong>
              </div>
              <div className="extai-efficiency-step">
                <span>bis 20 Mrd. Parameter:</span>
                <strong>Score 75</strong>
              </div>
              <div className="extai-efficiency-step">
                <span>bis 70 Mrd. Parameter:</span>
                <strong>Score 50</strong>
              </div>
              <div className="extai-efficiency-step">
                <span>darüber (&gt; 70 Mrd.):</span>
                <strong>Score 30 (hoher Verbrauch)</strong>
              </div>
              <div className="extai-efficiency-step">
                <span>nicht veröffentlicht:</span>
                <strong>Score 50 (Schätzung)</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Einstellungen unten */}
      <div className="extai-settings-box">
        <div className="extai-setting-row">
          <div>
            <div className="extai-setting-label">Vor externer KI fragen</div>
            <div className="extai-setting-desc">
              Erfordert Bestätigung vor der Übergabe an ein Cloud-Modell.
            </div>
          </div>
          <input
            type="checkbox"
            checked={askBeforeExternal}
            onChange={(e) => onToggleAskBeforeExternal(e.target.checked)}
          />
        </div>

        <div className="extai-setting-row" style={{ borderTop: "1px solid #e2e8f0", paddingTop: "8px" }}>
          <div>
            <div className="extai-setting-label">Fallback auf nicht-grüne Anbieter erlauben</div>
            <div className="extai-setting-desc">
              {allowFallback
                ? "Wenn kein grüner Anbieter verfügbar ist, wird ein Standardmodell (OpenAI/Anthropic) gewählt."
                : "Kein Fallback. Ist kein grünes Modell da, wird die Antwort verweigert."}
            </div>
          </div>
          <input
            type="checkbox"
            checked={allowFallback}
            onChange={(e) => handleToggleFallback(e.target.checked)}
          />
        </div>
      </div>
    </div>
  );
};
