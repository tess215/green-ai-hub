import React, { useState, useMemo } from "react";
import {
  CheckCircle2,
  XCircle,
  Database,
  Trash2,
  ArrowRight,
  Eye,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Search,
  Sparkles,
} from "lucide-react";
import { globalCacheProxy, CacheEntryItem, CacheLastQueryLog } from "../cache";
import { calculateTrigramSimilarity } from "../similarity";
import "./CachePanel.css";

interface CachePanelProps {
  onTransferToLibrary: (item: CacheEntryItem) => void;
  onClose: () => void;
  isStationDisabled?: boolean;
  onReEnableStation?: () => void;
}

export const CachePanel: React.FC<CachePanelProps> = ({
  onTransferToLibrary,
  onClose,
  isStationDisabled = false,
  onReEnableStation,
}) => {
  const lastQuery = globalCacheProxy.getLastQueryLog();
  const [activeTab, setActiveTab] = useState<"lastQuery" | "content">(
    lastQuery ? "lastQuery" : "content"
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<"hits" | "newest" | "savings">("hits");
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [scope, setScope] = useState<"user" | "team">(globalCacheProxy.getScope());
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  // Trigger re-render helper
  const [version, setVersion] = useState(0);
  const triggerUpdate = () => setVersion((v) => v + 1);

  const entries = useMemo(() => {
    return globalCacheProxy.getAllEntries();
  }, [version]);

  const metrics = useMemo(() => {
    return globalCacheProxy.getMetrics();
  }, [version, entries]);

  const filteredEntries = useMemo(() => {
    let list = [...entries];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((item) => {
        const textToSearch = `${item.prompt} ${item.aliases?.join(" ")} ${item.provider}`;
        if (textToSearch.toLowerCase().includes(q)) return true;
        return calculateTrigramSimilarity(q, item.prompt) >= 45;
      });
    }

    if (sortOption === "hits") {
      list.sort((a, b) => b.hitCount - a.hitCount);
    } else if (sortOption === "newest") {
      list.sort((a, b) => {
        const dateA = new Date(a.expiresAtIso || 0).getTime();
        const dateB = new Date(b.expiresAtIso || 0).getTime();
        return dateB - dateA;
      });
    } else if (sortOption === "savings") {
      list.sort((a, b) => b.tokensSavedTotal - a.tokensSavedTotal);
    }

    return list;
  }, [entries, searchQuery, sortOption]);

  const handleDelete = (id: string) => {
    globalCacheProxy.deleteItem(id);
    triggerUpdate();
  };

  const handleClearCache = () => {
    globalCacheProxy.clear();
    setConfirmClearOpen(false);
    triggerUpdate();
  };

  const handleScopeChange = (newScope: "user" | "team") => {
    setScope(newScope);
    globalCacheProxy.setScope(newScope);
    triggerUpdate();
  };

  return (
    <div className="cache-panel-container">
      {/* 4 Kennzahlen oben */}
      <div className="cache-metrics-grid">
        <div className="cache-metric-card">
          <div className="cache-metric-val">{metrics.totalEntries}</div>
          <div className="cache-metric-label">Einträge</div>
        </div>
        <div className="cache-metric-card">
          <div className="cache-metric-val">{metrics.totalHits}</div>
          <div className="cache-metric-label">Treffer gesamt</div>
        </div>
        <div className="cache-metric-card">
          <div className="cache-metric-val">{metrics.savedTokens.toLocaleString("de-DE")}</div>
          <div className="cache-metric-label">Gesparte Tokens</div>
        </div>
        <div className="cache-metric-card">
          <div className="cache-metric-val">{metrics.hitRatePercent}%</div>
          <div className="cache-metric-label">Trefferquote</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="cache-tabs-bar" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "lastQuery"}
          onClick={() => setActiveTab("lastQuery")}
          className={`cache-tab-btn ${activeTab === "lastQuery" ? "active" : ""}`}
        >
          Letzte Anfrage
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "content"}
          onClick={() => setActiveTab("content")}
          className={`cache-tab-btn ${activeTab === "content" ? "active" : ""}`}
        >
          Inhalt ({entries.length})
        </button>
      </div>

      {/* TAB 1: LETZTE ANFRAGE */}
      {activeTab === "lastQuery" && (
        <div className="cache-query-box">
          {lastQuery ? (
            <>
              <div className="cache-query-row">
                <span className="cache-query-label">Deine Frage</span>
                <span className="cache-query-val-text">{lastQuery.query}</span>
              </div>

              <div className="cache-query-row">
                <span className="cache-query-label">Normalisiert</span>
                <span className="cache-query-val-mono">{lastQuery.normalized || "—"}</span>
              </div>

              <div className="cache-query-row">
                <span className="cache-query-label">Fingerprint</span>
                <span className="cache-query-val-mono">{lastQuery.fingerprint}</span>
              </div>

              {lastQuery.isHit ? (
                <div className="cache-result-banner hit">
                  <div className="cache-result-title">
                    <CheckCircle2 style={{ width: 18, height: 18, color: "#16a34a" }} aria-hidden="true" />
                    <span>Treffer ({lastQuery.similarityPercent || 100}%)</span>
                  </div>
                  <div className="cache-result-meta">
                    <strong>Gefunden:</strong> „{lastQuery.foundItem?.prompt}“
                    <br />
                    <strong>Art:</strong> {lastQuery.hitType}
                    <br />
                    <span style={{ color: "#15803d", fontWeight: 700 }}>
                      ✓ {lastQuery.tokensSaved || lastQuery.foundItem?.initialTokens || 600} Tokens gespart (100% Einsparung)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="cache-result-banner miss">
                  <div className="cache-result-title">
                    <XCircle style={{ width: 18, height: 18, color: "#64748b" }} aria-hidden="true" />
                    <span>Kein Treffer</span>
                  </div>
                  <div className="cache-result-meta">
                    {lastQuery.bestMiss ? (
                      <>
                        Ähnlichster Eintrag: „{lastQuery.bestMiss.prompt}“ – {lastQuery.bestMiss.similarityPercent}%
                        <br />
                        <span style={{ color: "#64748b" }}>
                          (unter der Mindestschwelle von 75% für automatische Cache-Antworten)
                        </span>
                      </>
                    ) : (
                      "Keine ähnlichen Einträge im Cache gefunden."
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "24px 12px", color: "#475569" }}>
              <Sparkles style={{ width: 28, height: 28, color: "#3b82f6", margin: "0 auto 8px" }} aria-hidden="true" />
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>Noch keine Anfrage gestellt</div>
              <div style={{ fontSize: "12px", marginTop: "4px" }}>
                Sobald du im Chat eine Frage stellst, siehst du hier Normalisierung, Hash-Fingerprint und den Treffer-Status.
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INHALT */}
      {activeTab === "content" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Suche & Sortierung */}
          <div className="cache-content-controls">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cache fehlertolerant durchsuchen …"
              className="cache-search-input"
            />

            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as any)}
              className="cache-sort-select"
            >
              <option value="hits">Meiste Treffer</option>
              <option value="newest">Neueste</option>
              <option value="savings">Meiste Ersparnis</option>
            </select>
          </div>

          {/* Liste der Cache-Einträge */}
          <div className="cache-cards-list">
            {filteredEntries.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 10px", color: "#64748b" }}>
                Keine passenden Einträge im Eco-Cache gefunden.
              </div>
            ) : (
              filteredEntries.map((item) => {
                const isExpired = globalCacheProxy.isExpired(item);
                const isExpanded = expandedItemId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`cache-card ${isExpired ? "expired" : ""}`}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                      <div className="cache-card-question">{item.prompt}</div>
                      {isExpired && (
                        <span style={{ fontSize: "10px", fontWeight: 800, backgroundColor: "#fee2e2", color: "#991b1b", padding: "2px 6px", borderRadius: "4px", textTransform: "uppercase" }}>
                          abgelaufen
                        </span>
                      )}
                    </div>

                    {/* Aliase als kleine graue Chips */}
                    {item.aliases && item.aliases.length > 0 && (
                      <div className="cache-aliases-wrap">
                        <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748b" }}>Aliase:</span>
                        {item.aliases.map((al, idx) => (
                          <span key={idx} className="cache-alias-chip">
                            {al}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Antwort-Vorschau (aufklappbar) */}
                    <div
                      onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                      className="cache-card-answer-preview"
                    >
                      {isExpanded ? (
                        <div>
                          <p style={{ fontWeight: 600 }}>{item.shortSummary}</p>
                          <p style={{ marginTop: "4px" }}>{item.details}</p>
                          {item.codeSnippet && (
                            <pre style={{ marginTop: "6px", padding: "8px", backgroundColor: "#0f172a", color: "#f8fafc", borderRadius: "6px", fontSize: "11px", overflowX: "auto" }}>
                              <code>{item.codeSnippet}</code>
                            </pre>
                          )}
                        </div>
                      ) : (
                        <p style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {item.shortSummary}
                        </p>
                      )}
                    </div>

                    {/* Kleine Metazeilen */}
                    <div className="cache-card-meta-line">
                      <span>Ursprünglich von: <strong>{item.provider}</strong></span>
                      <span>·</span>
                      <span>{item.initialTokens} Tokens</span>
                      <span>·</span>
                      <span>{item.hitCount} Treffer</span>
                      <span>·</span>
                      <span style={{ color: "#15803d", fontWeight: 700 }}>{item.tokensSavedTotal.toLocaleString("de-DE")} Tokens gespart</span>
                    </div>

                    <div className="cache-card-meta-line" style={{ color: "#64748b" }}>
                      <span>Gespeichert: {item.createdAt}</span>
                      <span>·</span>
                      <span>Gültig bis: {item.expiresAt}</span>
                    </div>

                    {/* Aktionen */}
                    <div className="cache-card-actions">
                      <button
                        type="button"
                        onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                        className="cache-action-btn"
                        title="Antwort vollständig anzeigen"
                      >
                        <Eye style={{ width: 13, height: 13 }} aria-hidden="true" />
                        <span>{isExpanded ? "Zuklappen" : "Ansehen"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onTransferToLibrary(item)}
                        className="cache-action-btn primary"
                        title="Diesen Cache-Eintrag als Skill ins Teamwissen übernehmen"
                      >
                        <ArrowRight style={{ width: 13, height: 13 }} aria-hidden="true" />
                        <span>Ins Teamwissen übernehmen</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="cache-action-btn danger"
                        title="Eintrag löschen"
                      >
                        <Trash2 style={{ width: 13, height: 13 }} aria-hidden="true" />
                        <span>Entfernen</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Unten: Scope & Cache leeren */}
          <div className="cache-bottom-box">
            <div className="cache-scope-row">
              <span style={{ fontSize: "12px", fontWeight: 800, color: "#1e293b" }}>Gilt für:</span>
              <div className="cache-scope-radios">
                <label className="cache-radio-label">
                  <input
                    type="radio"
                    name="cache-scope"
                    value="user"
                    checked={scope === "user"}
                    onChange={() => handleScopeChange("user")}
                  />
                  <span>Nur mich</span>
                </label>
                <label className="cache-radio-label">
                  <input
                    type="radio"
                    name="cache-scope"
                    value="team"
                    checked={scope === "team"}
                    onChange={() => handleScopeChange("team")}
                  />
                  <span>Mein Team</span>
                </label>
              </div>
            </div>

            <div className="cache-scope-hint">
              Team-Cache spart mehr, teilt aber Antworten im Team.
            </div>

            {confirmClearOpen ? (
              <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", padding: "10px", borderRadius: "6px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#991b1b" }}>
                  Möchtest du wirklich alle {entries.length} Cache-Einträge leeren?
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={handleClearCache}
                    style={{ flex: 1, padding: "6px", backgroundColor: "#dc2626", color: "#ffffff", border: "none", borderRadius: "4px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                  >
                    Ja, Cache leeren
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearOpen(false)}
                    style={{ flex: 1, padding: "6px", backgroundColor: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClearOpen(true)}
                className="cache-clear-btn"
              >
                <Trash2 style={{ width: 14, height: 14 }} aria-hidden="true" />
                <span>Cache leeren</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
