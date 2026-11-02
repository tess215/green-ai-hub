import React, { useEffect } from "react";
import { X, Database, BookOpen, Globe, Cpu, AlertCircle } from "lucide-react";
import { CachePanel } from "./CachePanel";
import { LibraryPanel } from "./LibraryPanel";
import { WebSearchPanel } from "./WebSearchPanel";
import { ExternalAiPanel } from "./ExternalAiPanel";
import { CacheEntryItem } from "../config";
import "./StationPanel.css";

export type ActiveStationPanelType = "cache" | "library" | "web" | "provider";

interface StationPanelProps {
  station: ActiveStationPanelType | null;
  onClose: () => void;
  isStationDisabled: boolean;
  onReEnableStation: () => void;
  onTransferCacheToLibrary: (item: CacheEntryItem) => void;
  prefillSkillData?: {
    title: string;
    keywords: string[];
    content: string;
    source?: string;
  } | null;
  onClearPrefillSkill?: () => void;
  initialAiSection?: "strategy" | "adapter" | null;
  askBeforeExternal?: boolean;
  onToggleAskBeforeExternal?: (val: boolean) => void;
}

export const StationPanel: React.FC<StationPanelProps> = ({
  station,
  onClose,
  isStationDisabled,
  onReEnableStation,
  onTransferCacheToLibrary,
  prefillSkillData,
  onClearPrefillSkill,
  initialAiSection,
  askBeforeExternal,
  onToggleAskBeforeExternal,
}) => {
  // Escape Key Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (station) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [station, onClose]);

  if (!station) return null;

  const getStationConfig = () => {
    switch (station) {
      case "cache":
        return {
          title: "Eco-Cache",
          subtitle: "Automatisch gespeicherte Antworten. Hilft bei gleichen Fragen.",
          headerClass: "cache",
          icon: Database,
          ariaLabel: "Eco-Cache Detailpanel",
        };
      case "library":
        return {
          title: "Teamwissen",
          subtitle: "Gepflegtes Wissen des Teams. Hilft bei ähnlichen Fragen.",
          headerClass: "library",
          icon: BookOpen,
          ariaLabel: "Teamwissen Detailpanel",
        };
      case "web":
        return {
          title: "Grüne Websuche",
          subtitle: "Sucht nur auf Websites, die nachweislich mit Ökostrom laufen (geprüft über die Green Web Foundation).",
          headerClass: "web",
          icon: Globe,
          ariaLabel: "Grüne Websuche Detailpanel",
        };
      case "provider":
        return {
          title: "Externe KI",
          subtitle: "Nur wenn Cache, Teamwissen und Websuche nichts finden. Wählt den grünsten passenden Anbieter (Strategy) und übersetzt die Anfrage in sein Format (Adapter).",
          headerClass: "provider",
          icon: Cpu,
          ariaLabel: "Externe KI Detailpanel",
        };
    }
  };

  const stConfig = getStationConfig();
  const Icon = stConfig.icon;

  return (
    <div
      className="station-drawer-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label={stConfig.ariaLabel}
    >
      <div className="station-drawer">
        {/* Header */}
        <div className={`station-drawer-header ${stConfig.headerClass}`}>
          <div className="station-drawer-top-row">
            <div className="station-drawer-title-group">
              <Icon style={{ width: 22, height: 22, color: "#ffffff" }} aria-hidden="true" />
              <h2 className="station-drawer-title">
                {stConfig.title}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="station-drawer-close-btn"
              aria-label="Panel schließen (Esc)"
              title="Panel schließen (Esc)"
            >
              <X style={{ width: 20, height: 20 }} aria-hidden="true" />
            </button>
          </div>

          <p className="station-drawer-subtitle">
            {stConfig.subtitle}
          </p>
        </div>

        {/* Deaktiviert-Hinweis oben */}
        {isStationDisabled && (
          <div className="station-disabled-alert" role="status">
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <AlertCircle style={{ width: 16, height: 16, color: "#64748b" }} aria-hidden="true" />
              <span className="station-disabled-text">
                Diese Station ist für Anfragen gerade deaktiviert.
              </span>
            </div>
            <button
              type="button"
              onClick={onReEnableStation}
              className="station-disabled-action"
            >
              Wieder aktivieren
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="station-drawer-body">
          {station === "cache" && (
            <CachePanel
              onTransferToLibrary={onTransferCacheToLibrary}
              onClose={onClose}
              isStationDisabled={isStationDisabled}
              onReEnableStation={onReEnableStation}
            />
          )}

          {station === "library" && (
            <LibraryPanel
              onClose={onClose}
              isStationDisabled={isStationDisabled}
              onReEnableStation={onReEnableStation}
              prefillSkillData={prefillSkillData}
              onClearPrefillSkill={onClearPrefillSkill}
            />
          )}

          {station === "web" && (
            <WebSearchPanel
              onClose={onClose}
              isStationDisabled={isStationDisabled}
              onReEnableStation={onReEnableStation}
            />
          )}

          {station === "provider" && (
            <ExternalAiPanel
              onClose={onClose}
              initialSection={initialAiSection}
              isStationDisabled={isStationDisabled}
              onReEnableStation={onReEnableStation}
              askBeforeExternal={askBeforeExternal ?? true}
              onToggleAskBeforeExternal={onToggleAskBeforeExternal ?? (() => {})}
            />
          )}
        </div>
      </div>
    </div>
  );
};
