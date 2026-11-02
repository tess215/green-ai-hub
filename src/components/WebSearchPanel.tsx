import React, { useState, useMemo } from "react";
import {
  Globe,
  Leaf,
  CheckCircle2,
  AlertTriangle,
  Search,
  ExternalLink,
  Sparkles,
  Loader2,
  ShieldCheck,
  Info,
} from "lucide-react";
import { globalWebSearchEngine, WebSearchResultItem, KnownWebHost } from "../websearch";
import "./WebSearchPanel.css";

interface WebSearchPanelProps {
  onClose: () => void;
  isStationDisabled?: boolean;
  onReEnableStation?: () => void;
}

export const WebSearchPanel: React.FC<WebSearchPanelProps> = ({
  onClose,
  isStationDisabled = false,
  onReEnableStation,
}) => {
  const lastQuery = globalWebSearchEngine.getLastQueryLog();
  const [activeTab, setActiveTab] = useState<"lastQuery" | "hosts">(
    lastQuery ? "lastQuery" : "hosts"
  );

  const [version, setVersion] = useState(0);
  const triggerUpdate = () => setVersion((v) => v + 1);

  const [inputDomain, setInputDomain] = useState("");
  const [isCheckingHost, setIsCheckingHost] = useState(false);
  const [hostCheckMsg, setHostCheckMsg] = useState<string | null>(null);

  const settings = globalWebSearchEngine.getSettings();
  const metrics = globalWebSearchEngine.getMetrics();
  const knownHosts = globalWebSearchEngine.getKnownHosts();

  const handleCheckHost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputDomain.trim()) return;

    setIsCheckingHost(true);
    setHostCheckMsg(null);
    try {
      const res = await globalWebSearchEngine.checkHostDomain(inputDomain.trim());
      setHostCheckMsg(
        res.isGreen
          ? `✓ ${res.domain} läuft mit Ökostrom (${res.hostedBy})`
          : `✗ ${res.domain} ist nicht als grüner Host verifiziert (${res.hostedBy})`
      );
      setInputDomain("");
      triggerUpdate();
    } catch {
      setHostCheckMsg("Prüfung fehlgeschlagen. Bitte Domain prüfen.");
    } finally {
      setIsCheckingHost(false);
    }
  };

  const handleToggleStrict = (val: boolean) => {
    globalWebSearchEngine.setSettings({ strictGreenOnly: val });
    triggerUpdate();
  };

  const handleSetMaxResults = (num: 3 | 5 | 10) => {
    globalWebSearchEngine.setSettings({ maxResults: num });
    triggerUpdate();
  };

  return (
    <div className="websearch-panel-container">
      {/* 4 Kennzahlen oben */}
      <div className="websearch-metrics-grid">
        <div className="websearch-metric-card">
          <div className="websearch-metric-val">{metrics.totalSearches}</div>
          <div className="websearch-metric-label">Suchen</div>
        </div>
        <div className="websearch-metric-card">
          <div className="websearch-metric-val">{metrics.totalHits}</div>
          <div className="websearch-metric-label">Treffer</div>
        </div>
        <div className="websearch-metric-card">
          <div className="websearch-metric-val">{metrics.checkedHostsCount}</div>
          <div className="websearch-metric-label">Geprüfte Hosts</div>
        </div>
        <div className="websearch-metric-card">
          <div className="websearch-metric-val">{metrics.greenHostsCount}</div>
          <div className="websearch-metric-label">Davon grün</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="websearch-tabs-bar" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "lastQuery"}
          onClick={() => setActiveTab("lastQuery")}
          className={`websearch-tab-btn ${activeTab === "lastQuery" ? "active" : ""}`}
        >
          Letzte Anfrage
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "hosts"}
          onClick={() => setActiveTab("hosts")}
          className={`websearch-tab-btn ${activeTab === "hosts" ? "active" : ""}`}
        >
          Hosts ({knownHosts.length})
        </button>
      </div>

      {/* TAB 1: LETZTE ANFRAGE */}
      {activeTab === "lastQuery" && (
        <div className="websearch-query-box">
          {lastQuery ? (
            <>
              <div>
                <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: "#475569" }}>
                  Gesucht nach
                </span>
                <div className="websearch-keywords-chips">
                  {lastQuery.keywords.map((kw, idx) => (
                    <span key={idx} className="websearch-kw-chip">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

              <div className="websearch-summary-line">
                {lastQuery.totalFound} Ergebnisse gefunden · {lastQuery.filteredOutCount} ausgefiltert
              </div>

              {/* Ergebnisliste */}
              <div className="websearch-results-list">
                {lastQuery.results.map((res) => {
                  return (
                    <div
                      key={res.id}
                      className={`websearch-result-card ${res.isUsed ? "used" : ""} ${res.isFilteredOut ? "filtered" : ""}`}
                    >
                      <div className="websearch-result-header">
                        <div>
                          <div className="websearch-result-title">{res.title}</div>
                          <div className="websearch-result-domain">{res.domain}</div>
                        </div>

                        {res.isGreen ? (
                          <div className="websearch-badge-green" title={res.hostedBy}>
                            <Leaf style={{ width: 12, height: 12, color: "#15803d" }} aria-hidden="true" />
                            <span>Grüner Host · {res.hostedBy}</span>
                          </div>
                        ) : (
                          <div className="websearch-badge-filtered">
                            Nicht als grün verifiziert – ausgefiltert
                          </div>
                        )}
                      </div>

                      {/* Hervorhebung wenn genutzt */}
                      {res.isUsed && (
                        <div className="websearch-used-banner">
                          <CheckCircle2 style={{ width: 13, height: 13 }} aria-hidden="true" />
                          <span>Für die Antwort genutzt</span>
                        </div>
                      )}

                      {/* Textauszug */}
                      <div className="websearch-snippet-box">
                        {res.snippet}
                      </div>
                    </div>
                  );
                })}
              </div>

              {lastQuery.usedResult ? (
                <div className="websearch-cache-notice">
                  <Leaf style={{ width: 14, height: 14 }} aria-hidden="true" />
                  <span>Antwort im Eco-Cache gespeichert · gültig 7 Tage (Webinhalte ändern sich).</span>
                </div>
              ) : (
                <div style={{ fontSize: "12px", color: "#475569", padding: "8px 0" }}>
                  Keine passende Seite auf grünen Hosts gefunden. Weiter zur externen KI.
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "24px 12px", color: "#475569" }}>
              <Globe style={{ width: 28, height: 28, color: "#16a34a", margin: "0 auto 8px" }} aria-hidden="true" />
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>Noch keine Websuche durchgeführt</div>
              <div style={{ fontSize: "12px", marginTop: "4px" }}>
                Wenn eine Frage lokal nicht beantwortet werden kann, recherchiert Kolibri auf zertifizierten Ökostrom-Websites.
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: HOSTS */}
      {activeTab === "hosts" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Host prüfen Formular */}
          <form onSubmit={handleCheckHost} className="websearch-host-check-box">
            <span style={{ fontSize: "12px", fontWeight: 800, color: "#0f172a" }}>
              Host prüfen (Green Web Foundation API)
            </span>
            <div className="websearch-host-check-row">
              <input
                type="text"
                value={inputDomain}
                onChange={(e) => setInputDomain(e.target.value)}
                placeholder="Domain eingeben (z. B. wikipedia.org) …"
                className="websearch-host-input"
              />
              <button
                type="submit"
                disabled={isCheckingHost || !inputDomain.trim()}
                className="websearch-host-btn"
              >
                {isCheckingHost ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                    Prüfen …
                  </span>
                ) : (
                  "Prüfen"
                )}
              </button>
            </div>

            {hostCheckMsg && (
              <div style={{ fontSize: "12px", fontWeight: 700, color: hostCheckMsg.startsWith("✓") ? "#15803d" : "#991b1b" }}>
                {hostCheckMsg}
              </div>
            )}
          </form>

          {/* Liste bekannter Hosts */}
          <div className="websearch-hosts-list">
            {knownHosts.map((host, idx) => (
              <div key={idx} className="websearch-host-card">
                <div>
                  <div className="websearch-host-domain">{host.domain}</div>
                  <div className="websearch-host-sub">
                    gehostet bei: <strong>{host.hostedBy}</strong> · zuletzt geprüft: {host.lastChecked}
                    {host.isTestData && " (Testdaten)"}
                  </div>
                </div>

                {host.isGreen ? (
                  <span className="websearch-badge-green">
                    <Leaf style={{ width: 12, height: 12 }} />
                    grün
                  </span>
                ) : (
                  <span className="websearch-badge-filtered">
                    nicht verifiziert
                  </span>
                )}
              </div>
            ))}
          </div>

          <div style={{ fontSize: "11px", color: "#475569", display: "flex", alignItems: "center", gap: "6px" }}>
            <Info style={{ width: 13, height: 13, flexShrink: 0 }} />
            <span>Grün bewertet wird das Hosting der Website, nicht der Inhalt.</span>
          </div>
        </div>
      )}

      {/* Einstellungen unten */}
      <div className="websearch-settings-box">
        <div className="websearch-setting-row">
          <div>
            <div className="websearch-setting-label">Strenger Modus: nur verifiziert grüne Hosts</div>
            <div className="websearch-setting-desc">
              {settings.strictGreenOnly
                ? "Nicht verifizierte Websites werden strikt herausgefiltert."
                : "Nicht verifizierte Websites werden mit Warnsymbol zugelassen."}
            </div>
          </div>
          <label className="websearch-toggle-label">
            <input
              type="checkbox"
              className="websearch-toggle-input"
              checked={settings.strictGreenOnly}
              onChange={(e) => handleToggleStrict(e.target.checked)}
            />
            <span className="websearch-toggle-slider" />
          </label>
        </div>

        <div className="websearch-setting-row" style={{ borderTop: "1px solid #e2e8f0", paddingTop: "8px" }}>
          <div className="websearch-setting-label">Max. Ergebnisse</div>
          <div className="websearch-max-pills">
            {([3, 5, 10] as const).map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleSetMaxResults(num)}
                className={`websearch-max-btn ${settings.maxResults === num ? "active" : ""}`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
