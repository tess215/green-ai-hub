import React, { useRef, useEffect } from "react";
import {
  Database,
  BookOpen,
  History,
  Globe,
  Cpu,
  Shield,
  HelpCircle,
  X,
  Check,
} from "lucide-react";
import { PipelineContextConfig } from "../chain";
import "./ContextPanel.css";

interface ContextPanelProps {
  config: PipelineContextConfig;
  onChange: (updated: PipelineContextConfig) => void;
  onClose: () => void;
}

export const ContextPanel: React.FC<ContextPanelProps> = ({
  config,
  onChange,
  onClose,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    // Timeout to avoid immediate trigger from the toggle button
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const toggleKey = (key: keyof PipelineContextConfig) => {
    onChange({
      ...config,
      [key]: !config[key],
    });
  };

  const handleToggleLocalOnly = () => {
    const nextLocalOnly = !config.localOnly;
    onChange({
      ...config,
      localOnly: nextLocalOnly,
      enableGreenWeb: nextLocalOnly ? false : config.enableGreenWeb,
      enableExternalAI: nextLocalOnly ? false : config.enableExternalAI,
    });
  };

  const contextItems = [
    {
      key: "enableCache" as const,
      icon: Database,
      title: "Eco-Cache",
      subtitle: "Automatisch gespeicherte Antworten. Findet gleiche Fragen.",
      color: "#3b82f6",
      disabled: false,
    },
    {
      key: "enableLibrary" as const,
      icon: BookOpen,
      title: "Teamwissen",
      subtitle: "Gepflegte Artikel und Dokumente. Findet ähnliche Fragen.",
      color: "#8b5cf6",
      disabled: false,
    },
    {
      key: "enableHistory" as const,
      icon: History,
      title: "Bisherige Gespräche",
      subtitle: "Kontext aus diesem Chat. Für Rückfragen und Verweise.",
      color: "#6366f1",
      disabled: false,
    },
    {
      key: "enableGreenWeb" as const,
      icon: Globe,
      title: "Grüne Websuche",
      subtitle: "Sucht nur auf Ökostrom-Websites. Für aktuelle Daten.",
      color: "#22c55e",
      disabled: config.localOnly,
    },
    {
      key: "enableExternalAI" as const,
      icon: Cpu,
      title: "Externe KI",
      subtitle: "Wenn lokal nichts passt. Green-Routing zum saubersten Modell.",
      color: "#ff6b8a",
      disabled: config.localOnly,
    },
  ];

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-labelledby="context-panel-title"
      aria-modal="true"
      className="context-panel-dialog font-sans"
    >
      {/* Header */}
      <div className="context-panel-header">
        <div>
          <h3 id="context-panel-title" className="context-panel-title">
            Agent-Kontext steuern
          </h3>
          <p className="context-panel-desc">
            Bestimme, welche Datenquellen und Inferenzstationen aktiv sind.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Panel schließen"
          className="text-slate-700 hover:text-slate-950 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5 text-slate-800" aria-hidden="true" />
        </button>
      </div>

      {/* Grid of Context Sources in 2 Columns */}
      <div className="context-panel-grid">
        {contextItems.map((item) => {
          const Icon = item.icon;
          const isChecked = config[item.key] && !item.disabled;
          return (
            <button
              key={item.key}
              type="button"
              role="checkbox"
              aria-checked={isChecked}
              disabled={item.disabled}
              onClick={() => !item.disabled && toggleKey(item.key)}
              className={`context-source-card ${isChecked ? "checked" : ""}`}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ padding: "8px", backgroundColor: "#f1f5f9", borderRadius: "8px" }}>
                  <Icon style={{ width: 20, height: 20, color: item.color }} aria-hidden="true" />
                </div>
                <div>
                  <div className="context-source-title">{item.title}</div>
                  <div className="context-source-subtitle">{item.subtitle}</div>
                </div>
              </div>

              <div className={`context-checkbox-box ${isChecked ? "checked" : ""}`}>
                {isChecked && <Check style={{ width: 16, height: 16, strokeWidth: 3 }} aria-hidden="true" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Row "Grenzen & Freigaben" */}
      <div className="context-boundaries-section">
        <div className="context-boundaries-header">
          Grenzen &amp; Freigaben
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px" }}>
          <label className="context-switch-label cursor-pointer">
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Shield style={{ width: 20, height: 20, color: "#15803d" }} aria-hidden="true" />
              <div>
                <span className="context-switch-title block">Nur lokal</span>
                <span className="context-switch-desc block">Websuche &amp; Externe KI ausschalten</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={config.localOnly}
              onChange={handleToggleLocalOnly}
              style={{ width: "20px", height: "20px", accentColor: "#ff6b8a", cursor: "pointer" }}
            />
          </label>

          <label className="context-switch-label cursor-pointer">
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <HelpCircle style={{ width: 20, height: 20, color: "#0f766e" }} aria-hidden="true" />
              <div>
                <span className="context-switch-title block">Vor externer KI fragen</span>
                <span className="context-switch-desc block">Freigabe-Karte vor Token-Verbrauch</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={config.askBeforeExternal}
              onChange={() => toggleKey("askBeforeExternal")}
              style={{ width: "20px", height: "20px", accentColor: "#ff6b8a", cursor: "pointer" }}
            />
          </label>
        </div>
      </div>
    </div>
  );
};
