import React, { useState } from "react";
import { Download, X, FileArchive, ShieldAlert, Check } from "lucide-react";
import { globalAuditLogger } from "../logger";
import "./ExportModal.css";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const [includeContent, setIncludeContent] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const blob = await globalAuditLogger.exportReport(includeContent);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `green-ai-bericht-${dateStr}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportComplete(true);
      setTimeout(() => {
        setExportComplete(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-labelledby="export-modal-title"
      aria-modal="true"
      className="export-modal-backdrop"
    >
      <div className="export-modal-card">
        {/* Header */}
        <div className="export-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ padding: "10px", backgroundColor: "#ccfbf1", borderRadius: "10px", color: "#0f766e" }}>
              <FileArchive style={{ width: 24, height: 24 }} aria-hidden="true" />
            </div>
            <div>
              <h2 id="export-modal-title" className="export-modal-title">
                Bericht exportieren
              </h2>
              <p className="export-modal-sub">
                Lade ein vollständiges Audit-Archiv als ZIP herunter.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Dialog schließen"
            style={{ background: "none", border: "none", padding: "6px", cursor: "pointer", borderRadius: "8px" }}
          >
            <X style={{ width: 20, height: 20, color: "#0f172a" }} aria-hidden="true" />
          </button>
        </div>

        {/* Content summary */}
        <div className="export-files-list">
          <div className="export-files-title">
            Enthaltene Dateien in der ZIP-Datei:
          </div>
          <ul style={{ margin: 0, paddingLeft: "18px" }}>
            <li className="export-file-item">
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 800 }}>protokoll.json</span> – Vollständiger Audit-Trail mit Trace-IDs
            </li>
            <li className="export-file-item">
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 800 }}>protokoll.csv</span> – Excel-kompatible Tabelle (Semikolon)
            </li>
            <li className="export-file-item">
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 800 }}>zusammenfassung.md</span> – Kennzahlen & Nachhaltigkeitsbewertung
            </li>
          </ul>
        </div>

        {/* Privacy Checkbox */}
        <div className="export-checkbox-row">
          <label className="export-checkbox-label">
            <input
              type="checkbox"
              checked={includeContent}
              onChange={(e) => setIncludeContent(e.target.checked)}
              style={{ width: "20px", height: "20px", accentColor: "#be123c", cursor: "pointer" }}
            />
            <span>Fragen und Antworten mitexportieren</span>
          </label>
          <div className="export-warning-text" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <ShieldAlert style={{ width: 16, height: 16, color: "#b45309" }} aria-hidden="true" />
            <span>
              Standardmäßig nur Metadaten – Protokolle können sensible Daten enthalten.
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="export-actions">
          <button
            type="button"
            onClick={onClose}
            className="export-cancel-btn"
          >
            Abbrechen
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={handleDownload}
            className="export-download-btn"
          >
            {exportComplete ? (
              <>
                <Check style={{ width: 16, height: 16, strokeWidth: 3 }} aria-hidden="true" />
                <span>Heruntergeladen!</span>
              </>
            ) : isExporting ? (
              <span>Erstelle ZIP …</span>
            ) : (
              <>
                <Download style={{ width: 16, height: 16 }} aria-hidden="true" />
                <span>Herunterladen</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
