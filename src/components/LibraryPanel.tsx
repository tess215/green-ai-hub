import React, { useState, useMemo } from "react";
import {
  BookOpen,
  Wand2,
  Plus,
  CheckCircle2,
  XCircle,
  Eye,
  Edit2,
  Trash2,
  X,
  FileText,
  Sparkles,
} from "lucide-react";
import { globalLibraryStore } from "../library";
import { LibraryEntry } from "../config";
import { calculateTrigramSimilarity } from "../similarity";
import "./LibraryPanel.css";

interface LibraryPanelProps {
  onClose: () => void;
  isStationDisabled?: boolean;
  onReEnableStation?: () => void;
  prefillSkillData?: {
    title: string;
    keywords: string[];
    content: string;
    source?: string;
  } | null;
  onClearPrefillSkill?: () => void;
}

export const LibraryPanel: React.FC<LibraryPanelProps> = ({
  onClose,
  isStationDisabled = false,
  onReEnableStation,
  prefillSkillData,
  onClearPrefillSkill,
}) => {
  const lastQuery = globalLibraryStore.getLastQueryLog();
  const [activeTab, setActiveTab] = useState<"lastQuery" | "content">(
    lastQuery ? "lastQuery" : "content"
  );

  const [filterType, setFilterType] = useState<"all" | "document" | "skill">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntryForView, setSelectedEntryForView] = useState<LibraryEntry | null>(null);

  // Formular-Zustand für Hinzufügen / Bearbeiten
  const [isFormOpen, setIsFormOpen] = useState(!!prefillSkillData);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState(prefillSkillData?.title || "");
  const [formType, setFormType] = useState<"document" | "skill">("skill");
  const [formKeywords, setFormKeywords] = useState(prefillSkillData?.keywords.join(", ") || "");
  const [formContent, setFormContent] = useState(prefillSkillData?.content || "");
  const [formSource, setFormSource] = useState(prefillSkillData?.source || "manuell angelegt");

  // Re-render Trigger
  const [version, setVersion] = useState(0);
  const triggerUpdate = () => setVersion((v) => v + 1);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const entries = useMemo(() => {
    return globalLibraryStore.getAll();
  }, [version]);

  const metrics = useMemo(() => {
    return globalLibraryStore.getMetrics();
  }, [version, entries]);

  const filteredEntries = useMemo(() => {
    let list = [...entries];

    if (filterType !== "all") {
      list = list.filter((e) => e.type === filterType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((e) => {
        const text = `${e.title} ${e.keywords.join(" ")} ${e.summary} ${e.sections.map((s) => s.heading + " " + s.content).join(" ")}`;
        if (text.toLowerCase().includes(q)) return true;
        return calculateTrigramSimilarity(q, e.title) >= 45;
      });
    }

    return list;
  }, [entries, filterType, searchQuery]);

  const handleOpenAdd = () => {
    setEditingEntryId(null);
    setFormTitle("");
    setFormType("skill");
    setFormKeywords("");
    setFormContent("## Abschnitt 1: Übersicht\nBeschreibe hier die Vorgehensweise oder den Code.");
    setFormSource("manuell angelegt");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (entry: LibraryEntry) => {
    setEditingEntryId(entry.id);
    setFormTitle(entry.title);
    setFormType(entry.type);
    setFormKeywords(entry.keywords.join(", "));
    setFormContent(entry.rawContent || entry.sections.map((s) => `## ${s.heading}\n${s.content}`).join("\n\n"));
    setFormSource(entry.source);
    setIsFormOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const kwArray = formKeywords.split(",").map((k) => k.trim()).filter(Boolean);

    if (editingEntryId) {
      globalLibraryStore.updateEntry(editingEntryId, {
        title: formTitle,
        type: formType,
        keywords: kwArray,
        rawContent: formContent,
      });
      showToast("Eintrag erfolgreich aktualisiert");
    } else {
      globalLibraryStore.addEntry({
        title: formTitle,
        type: formType,
        keywords: kwArray,
        rawContent: formContent,
        source: formSource,
      });
      showToast("Im Teamwissen gespeichert");
    }

    setIsFormOpen(false);
    if (onClearPrefillSkill) onClearPrefillSkill();
    triggerUpdate();
  };

  const handleDelete = (id: string) => {
    globalLibraryStore.deleteEntry(id);
    triggerUpdate();
  };

  return (
    <div className="lib-panel-container">
      {/* 3 Kennzahlen oben */}
      <div className="lib-metrics-grid">
        <div className="lib-metric-card">
          <div className="lib-metric-val">{metrics.totalDocs}</div>
          <div className="lib-metric-label">Dokumente</div>
        </div>
        <div className="lib-metric-card">
          <div className="lib-metric-val">{metrics.totalSkills}</div>
          <div className="lib-metric-label">Skills</div>
        </div>
        <div className="lib-metric-card">
          <div className="lib-metric-val">{metrics.weeklyUsage}</div>
          <div className="lib-metric-label">Nutzungen diese Woche</div>
        </div>
      </div>

      {/* Tabs & Hinzufügen Button */}
      <div className="lib-top-actions">
        <div className="lib-tabs-bar" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "lastQuery"}
            onClick={() => setActiveTab("lastQuery")}
            className={`lib-tab-btn ${activeTab === "lastQuery" ? "active" : ""}`}
          >
            Letzte Anfrage
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "content"}
            onClick={() => setActiveTab("content")}
            className={`lib-tab-btn ${activeTab === "content" ? "active" : ""}`}
          >
            Inhalt ({entries.length})
          </button>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="lib-add-btn"
        >
          <Plus style={{ width: 16, height: 16 }} aria-hidden="true" />
          <span>+ Hinzufügen</span>
        </button>
      </div>

      {/* TAB 1: LETZTE ANFRAGE */}
      {activeTab === "lastQuery" && (
        <div className="lib-query-box">
          {lastQuery ? (
            <>
              <div>
                <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: "#475569" }}>
                  Gesucht nach
                </span>
                <div className="lib-chips-wrap">
                  {lastQuery.queriedKeywords.map((kw, i) => (
                    <span key={i} className="lib-kw-chip">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>
                Durchsuchte Einträge: <strong>{lastQuery.totalSearched}</strong>
              </div>

              {lastQuery.isHit ? (
                <div className="lib-result-banner hit">
                  <div className="lib-result-title">
                    <CheckCircle2 style={{ width: 18, height: 18, color: "#16a34a" }} aria-hidden="true" />
                    <span>Treffer ({lastQuery.similarityPercent || 100}%)</span>
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                    Gefunden in: <strong>{lastQuery.foundTitle}</strong>, {lastQuery.foundSection}
                  </div>
                  {lastQuery.excerpt && (
                    <div className="lib-excerpt-box">
                      „{lastQuery.excerpt}“
                    </div>
                  )}
                </div>
              ) : (
                <div className="lib-result-banner miss">
                  <div className="lib-result-title">
                    <XCircle style={{ width: 18, height: 18, color: "#64748b" }} aria-hidden="true" />
                    <span>Nichts Passendes gefunden</span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#475569", lineHeight: 1.5 }}>
                    Bester Treffer: „{lastQuery.bestMiss?.title}“ – {lastQuery.bestMiss?.similarityPercent}%.
                    <br />
                    Weiter zur grünen Websuche.
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "24px 12px", color: "#475569" }}>
              <BookOpen style={{ width: 28, height: 28, color: "#16a34a", margin: "0 auto 8px" }} aria-hidden="true" />
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>Noch keine Anfrage gestellt</div>
              <div style={{ fontSize: "12px", marginTop: "4px" }}>
                Sobald eine Frage gestellt wird, zeigt diese Ansicht den Abgleich der Abschnitte und Textauszüge.
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INHALT */}
      {activeTab === "content" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Filter Chips & Suche */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div className="lib-filter-bar">
              <button
                type="button"
                onClick={() => setFilterType("all")}
                className={`lib-filter-pill ${filterType === "all" ? "active" : ""}`}
              >
                Alle ({entries.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType("document")}
                className={`lib-filter-pill ${filterType === "document" ? "active" : ""}`}
              >
                Dokumente ({metrics.totalDocs})
              </button>
              <button
                type="button"
                onClick={() => setFilterType("skill")}
                className={`lib-filter-pill ${filterType === "skill" ? "active" : ""}`}
              >
                Skills ({metrics.totalSkills})
              </button>
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Teamwissen durchsuchen …"
              className="lib-search-input"
            />
          </div>

          {/* Liste der Einträge */}
          <div className="lib-cards-list">
            {filteredEntries.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 10px", color: "#64748b" }}>
                Keine Einträge für diese Auswahl gefunden.
              </div>
            ) : (
              filteredEntries.map((entry) => {
                const isSkill = entry.type === "skill";

                return (
                  <div key={entry.id} className="lib-card">
                    <div className="lib-card-header">
                      <div className="lib-card-title-wrap">
                        {isSkill ? (
                          <Wand2 style={{ width: 16, height: 16, color: "#15803d" }} aria-hidden="true" />
                        ) : (
                          <BookOpen style={{ width: 16, height: 16, color: "#475569" }} aria-hidden="true" />
                        )}
                        <span className="lib-card-title">{entry.title}</span>
                      </div>

                      <span className={`lib-type-badge ${isSkill ? "skill" : "doc"}`}>
                        {isSkill ? "Skill" : "Dokument"}
                      </span>
                    </div>

                    {/* Keywords als Chips */}
                    <div className="lib-chips-wrap">
                      {entry.keywords.map((kw, i) => (
                        <span key={i} className="lib-kw-chip">
                          {kw}
                        </span>
                      ))}
                    </div>

                    {/* Quelle & Nutzungen */}
                    <div className="lib-card-meta">
                      <div>Quelle: <strong>{entry.source}</strong></div>
                      <div>
                        {entry.usageCount} {entry.usageCount === 1 ? "Nutzung" : "Nutzungen"} · zuletzt {entry.lastUsed}
                      </div>
                    </div>

                    {/* Aktionen */}
                    <div className="lib-card-actions">
                      <button
                        type="button"
                        onClick={() => setSelectedEntryForView(entry)}
                        className="lib-action-btn"
                        title="Abschnitte ansehen"
                      >
                        <Eye style={{ width: 13, height: 13 }} aria-hidden="true" />
                        <span>Ansehen</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(entry)}
                        className="lib-action-btn"
                        title="Bearbeiten"
                      >
                        <Edit2 style={{ width: 13, height: 13 }} aria-hidden="true" />
                        <span>Bearbeiten</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id)}
                        className="lib-action-btn danger"
                        title="Löschen"
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
        </div>
      )}

      {/* MODAL: ABSCHNITTE ANSEHEN */}
      {selectedEntryForView && (
        <div className="lib-modal-overlay" role="dialog" aria-modal="true">
          <div className="lib-modal-card">
            <div className="lib-modal-title">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {selectedEntryForView.type === "skill" ? (
                  <Wand2 style={{ width: 18, height: 18, color: "#15803d" }} aria-hidden="true" />
                ) : (
                  <BookOpen style={{ width: 18, height: 18, color: "#475569" }} aria-hidden="true" />
                )}
                <span>{selectedEntryForView.title}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEntryForView(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#475569" }}
              >
                <X style={{ width: 18, height: 18 }} aria-hidden="true" />
              </button>
            </div>

            <div style={{ fontSize: "12px", color: "#475569" }}>
              Quelle: <strong>{selectedEntryForView.source}</strong> · {selectedEntryForView.usageCount} Gesamtnutzungen
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
              {selectedEntryForView.sections.map((sec, i) => (
                <div key={i} style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", backgroundColor: "#f8fafc" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>
                      {sec.heading}
                    </span>
                    <span style={{ fontSize: "10px", fontWeight: 800, backgroundColor: "#dbeafe", color: "#1e40af", padding: "2px 6px", borderRadius: "4px" }}>
                      {sec.usageCount} {sec.usageCount === 1 ? "Nutzung" : "Nutzungen"}
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#334155", lineHeight: 1.5, whiteSpace: "pre-line" }}>
                    {sec.content}
                  </div>
                </div>
              ))}

              {selectedEntryForView.codeSnippet && (
                <div style={{ marginTop: "4px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: "#475569", marginBottom: "4px" }}>
                    Code-Snippet
                  </div>
                  <pre style={{ backgroundColor: "#0f172a", color: "#f8fafc", padding: "10px", borderRadius: "6px", fontSize: "11px", overflowX: "auto" }}>
                    <code>{selectedEntryForView.codeSnippet}</code>
                  </pre>
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
              <button
                type="button"
                onClick={() => setSelectedEntryForView(null)}
                style={{ padding: "8px 16px", backgroundColor: "#f1f5f9", color: "#0f172a", border: "1px solid #cbd5e1", borderRadius: "6px", fontWeight: 700, cursor: "pointer" }}
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: HINZUFÜGEN / BEARBEITEN */}
      {isFormOpen && (
        <div className="lib-modal-overlay" role="dialog" aria-modal="true">
          <form onSubmit={handleSaveForm} className="lib-modal-card">
            <div className="lib-modal-title">
              <span>{editingEntryId ? "Eintrag bearbeiten" : "+ Neuer Eintrag im Teamwissen"}</span>
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  if (onClearPrefillSkill) onClearPrefillSkill();
                }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#475569" }}
              >
                <X style={{ width: 18, height: 18 }} aria-hidden="true" />
              </button>
            </div>

            {formSource.includes("aus Antwort gelernt") && (
              <div style={{ backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0", padding: "8px 12px", borderRadius: "6px", fontSize: "12px", color: "#065f46", fontWeight: 600 }}>
                💡 <strong>Hinweis:</strong> Einmal gelöst, nie wieder neu berechnet.
              </div>
            )}

            <div className="lib-form-group">
              <label className="lib-form-label">Titel</label>
              <input
                type="text"
                required
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="z. B. Service-Klasse mit PHPUnit testen"
                className="lib-form-input"
              />
            </div>

            <div className="lib-form-group">
              <label className="lib-form-label">Typ</label>
              <div style={{ display: "flex", gap: "16px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="lib-type"
                    value="document"
                    checked={formType === "document"}
                    onChange={() => setFormType("document")}
                  />
                  <span>Dokument</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="lib-type"
                    value="skill"
                    checked={formType === "skill"}
                    onChange={() => setFormType("skill")}
                  />
                  <span>Skill</span>
                </label>
              </div>
            </div>

            <div className="lib-form-group">
              <label className="lib-form-label">Schlagworte (kommagetrennt)</label>
              <input
                type="text"
                value={formKeywords}
                onChange={(e) => setFormKeywords(e.target.value)}
                placeholder="php, testing, mock, service"
                className="lib-form-input"
              />
            </div>

            <div className="lib-form-group">
              <label className="lib-form-label">
                Inhalt (Abschnitte mit <code>## Überschrift</code> unterteilen)
              </label>
              <textarea
                required
                rows={6}
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder={`## Abschnitt 1: Best Practice\nErklärung des Vorgehens...\n\n## Abschnitt 2: Beispiel\nCode oder Anweisung...`}
                className="lib-form-textarea"
              />
            </div>

            <div className="lib-modal-footer">
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  if (onClearPrefillSkill) onClearPrefillSkill();
                }}
                style={{ padding: "8px 14px", backgroundColor: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1", borderRadius: "6px", fontWeight: 700, cursor: "pointer" }}
              >
                Abbrechen
              </button>
              <button
                type="submit"
                style={{ padding: "8px 16px", backgroundColor: "#15803d", color: "#ffffff", border: "none", borderRadius: "6px", fontWeight: 700, cursor: "pointer" }}
              >
                Speichern
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="lib-toast" role="status">
          <CheckCircle2 style={{ width: 16, height: 16 }} aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
