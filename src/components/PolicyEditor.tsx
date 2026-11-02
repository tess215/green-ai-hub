import React, { useState, useEffect, useRef } from "react";
import {
  Folder,
  FileCode,
  Save,
  RotateCcw,
  Plus,
  AlertTriangle,
  CheckCircle,
  FileText,
  X,
} from "lucide-react";
import { globalPolicyStore, PolicyFileRecord } from "../policies";
import "./PolicyEditor.css";

interface PolicyEditorProps {
  initialFilename?: string;
  onSaved?: (agentId: string) => void;
}

export const PolicyEditor: React.FC<PolicyEditorProps> = ({
  initialFilename,
  onSaved,
}) => {
  const [files, setFiles] = useState<PolicyFileRecord[]>([]);
  const [selectedFilename, setSelectedFilename] = useState<string>(
    initialFilename || "rechnungs-agent.yaml"
  );
  const [editorContent, setEditorContent] = useState<string>("");
  const [errors, setErrors] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newFilenameInput, setNewFilenameInput] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Sync with store
  useEffect(() => {
    const update = () => {
      const all = globalPolicyStore.getAllFiles();
      setFiles(all);
    };
    update();
    const unsub = globalPolicyStore.subscribe(update);
    return () => unsub();
  }, []);

  // Update selected file if initialFilename changes
  useEffect(() => {
    if (initialFilename) {
      setSelectedFilename(initialFilename);
    }
  }, [initialFilename]);

  // When selected file changes, load its content
  useEffect(() => {
    const current = globalPolicyStore.getFile(selectedFilename);
    if (current) {
      setEditorContent(current.rawYaml);
      setErrors([]);
      setSuccessMsg(null);
    } else if (files.length > 0) {
      setSelectedFilename(files[0].filename);
    }
  }, [selectedFilename, files]);

  const currentRecord = globalPolicyStore.getFile(selectedFilename);

  // Synchronize scrolling between line numbers and textarea
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const lineCount = Math.max(1, editorContent.split("\n").length);
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  const handleSave = () => {
    setErrors([]);
    setSuccessMsg(null);

    const result = globalPolicyStore.saveFile(selectedFilename, editorContent);
    if (!result.success) {
      setErrors(result.errors || ["Fehler beim Validieren der Richtlinie."]);
      return;
    }

    setSuccessMsg("Richtlinie angewendet – gilt ab der nächsten Anfrage");
    if (onSaved && result.policy) {
      onSaved(currentRecord?.agentId || result.policy.agent);
    }

    setTimeout(() => {
      setSuccessMsg(null);
    }, 4500);
  };

  const handleDiscard = () => {
    if (currentRecord) {
      setEditorContent(currentRecord.rawYaml);
      setErrors([]);
      setSuccessMsg(null);
    }
  };

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!newFilenameInput.trim()) {
      setModalError("Bitte einen Dateinamen eingeben.");
      return;
    }

    const res = globalPolicyStore.createNewPolicy(newFilenameInput);
    if (!res.success) {
      setModalError(res.error || "Fehler beim Anlegen der Datei.");
      return;
    }

    setSelectedFilename(res.filename);
    setIsNewModalOpen(false);
    setNewFilenameInput("");
    setSuccessMsg(`Neue Richtlinie '${res.filename}' erstellt.`);
  };

  return (
    <div className="policy-editor-container" role="region" aria-label="Richtlinien-Editor">
      {/* Linke Spalte: Dateiliste */}
      <aside className="policy-files-sidebar" aria-label="Richtlinien-Dateien">
        <div className="policy-files-header">
          <div className="policy-folder-title">
            <Folder style={{ width: 18, height: 18, color: "#334155" }} aria-hidden="true" />
            <span>richtlinien/</span>
          </div>
          <span style={{ fontSize: "11px", fontWeight: 800, backgroundColor: "#e2e8f0", padding: "2px 7px", borderRadius: "10px", color: "#334155" }}>
            {files.length}
          </span>
        </div>

        <div className="policy-file-list" role="list">
          {files.map((file) => {
            const isActive = file.filename === selectedFilename;
            return (
              <button
                key={file.filename}
                type="button"
                role="listitem"
                onClick={() => {
                  setSelectedFilename(file.filename);
                }}
                className={`policy-file-item ${isActive ? "active" : ""}`}
              >
                <div className="policy-file-row">
                  <div className="policy-file-name">
                    <FileCode style={{ width: 15, height: 15, color: isActive ? "#0f172a" : "#64748b" }} aria-hidden="true" />
                    <span>{file.filename}</span>
                  </div>
                </div>

                <div className="policy-file-row">
                  <span className="policy-file-agent-badge">
                    Agent: {file.policy.agent}
                  </span>
                  <span className="policy-file-date">
                    {file.lastModified.replace("Zuletzt geändert: ", "")}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="policy-files-footer">
          <button
            type="button"
            onClick={() => {
              setNewFilenameInput("");
              setModalError(null);
              setIsNewModalOpen(true);
            }}
            className="policy-new-btn"
          >
            <Plus style={{ width: 16, height: 16 }} aria-hidden="true" />
            <span>+ Neue Richtlinie</span>
          </button>
        </div>
      </aside>

      {/* Rechte Spalte: Editor */}
      <section className="policy-editor-main" aria-label="Editor-Bereich">
        {/* Editor Kopfzeile */}
        <div className="policy-editor-header">
          <div className="policy-editor-title-block">
            <h2 className="policy-editor-filename">
              <FileText style={{ width: 18, height: 18, color: "#334155" }} aria-hidden="true" />
              <span>richtlinien/{selectedFilename}</span>
            </h2>
            <span className="policy-editor-last-modified">
              Zuletzt geändert: {currentRecord?.lastModified || "gerade eben"}
            </span>
          </div>

          <div className="policy-editor-actions">
            <button
              type="button"
              onClick={handleDiscard}
              className="policy-btn-secondary"
              title="Auf den zuletzt gespeicherten Stand zurücksetzen"
            >
              <RotateCcw style={{ width: 14, height: 14, display: "inline-block", marginRight: "4px" }} aria-hidden="true" />
              Änderungen verwerfen
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="policy-btn-primary"
              title="Prüfen, speichern und für Agenten aktivieren"
            >
              <Save style={{ width: 15, height: 15 }} aria-hidden="true" />
              Speichern & anwenden
            </button>
          </div>
        </div>

        {/* Monospace Code Editor mit Zeilennummern */}
        <div className="policy-code-workspace">
          <div ref={lineNumbersRef} className="policy-line-numbers" aria-hidden="true">
            {lineNumbers.map((num) => (
              <div key={num}>{num}</div>
            ))}
          </div>

          <div className="policy-textarea-container">
            <textarea
              ref={textareaRef}
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              onScroll={handleScroll}
              spellCheck={false}
              aria-label={`YAML-Editor für ${selectedFilename}`}
              className="policy-textarea"
            />
            <div className="policy-syntax-badge">YAML · Deutsch (ja / nein)</div>
          </div>
        </div>

        {/* Fehler-Bereich direkt unter dem Editor */}
        {errors.length > 0 && (
          <div className="policy-error-box" role="alert">
            {errors.map((err, idx) => (
              <div key={idx} className="policy-error-item">
                <AlertTriangle style={{ width: 16, height: 16, color: "#dc2626", flexShrink: 0, marginTop: "2px" }} aria-hidden="true" />
                <span>{err}</span>
              </div>
            ))}
          </div>
        )}

        {/* Erfolgsmeldung */}
        {successMsg && (
          <div className="policy-success-banner" role="status">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle style={{ width: 18, height: 18, color: "#16a34a" }} aria-hidden="true" />
              <span>{successMsg}</span>
            </div>
          </div>
        )}
      </section>

      {/* Modal für "+ Neue Richtlinie" */}
      {isNewModalOpen && (
        <div className="policy-modal-overlay" role="dialog" aria-modal="true" aria-label="Neue Richtlinie erstellen">
          <div className="policy-modal-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <h3 className="policy-modal-title">Neue Richtlinie anlegen</h3>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}
              >
                <X style={{ width: 18, height: 18, color: "#64748b" }} aria-hidden="true" />
              </button>
            </div>
            <p className="policy-modal-desc">
              Erstellt eine neue Datei als Kopie von <code>standard.yaml</code> im Ordner <code>richtlinien/</code>.
            </p>

            <form onSubmit={handleCreateNew}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                Dateiname (z. B. <code>marketing-agent.yaml</code>):
              </label>
              <input
                type="text"
                value={newFilenameInput}
                onChange={(e) => setNewFilenameInput(e.target.value)}
                placeholder="neuer-agent.yaml"
                className="policy-input"
                autoFocus
              />

              {modalError && (
                <div style={{ color: "#dc2626", fontSize: "12px", fontWeight: 700, marginBottom: "12px" }}>
                  {modalError}
                </div>
              )}

              <div className="policy-modal-buttons">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="policy-btn-secondary"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="policy-btn-primary"
                >
                  Datei anlegen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
