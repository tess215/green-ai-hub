import React, { useState, useEffect } from "react";
import {
  Database,
  BookOpen,
  Globe,
  Cpu,
  AlertTriangle,
  Sparkles,
  Zap,
  Shield,
  Lock,
  FileCode,
} from "lucide-react";
import { PipelineContextConfig } from "../chain";
import { defaultGreenStrategy, TaskType } from "../strategy";
import { StationType, StepStatus } from "../logger";
import { globalPolicyStore } from "../policies";
import "./PipelineSidebar.css";

interface PipelineSidebarProps {
  config: PipelineContextConfig;
  currentStation?: StationType | null;
  currentStationStatus?: StepStatus | null;
  taskType: TaskType;
  onClickStation?: (
    stationId: "router" | "cache" | "library" | "web" | "provider",
    targetSection?: "strategy" | "adapter"
  ) => void;
  cacheCount?: number;
  libraryCount?: number;
  webCount?: number;
  providerCount?: number;
}

export const PipelineSidebar: React.FC<PipelineSidebarProps> = ({
  config,
  currentStation,
  currentStationStatus,
  taskType,
  onClickStation,
  cacheCount = 5,
  libraryCount = 5,
  webCount = 11,
  providerCount = 6,
}) => {
  const [, setStoreVersion] = useState(0);

  useEffect(() => {
    const unsub = globalPolicyStore.subscribe(() => {
      setStoreVersion((v) => v + 1);
    });
    return () => unsub();
  }, []);

  const activePolicy = globalPolicyStore.getActivePolicy();
  const selection = defaultGreenStrategy.selectProvider(taskType);
  const ranked = selection.allRanked;

  // Richtlinien-Einschränkungen ermitteln
  const getPolicyRestrictionForStation = (stationId: StationType): string | null => {
    if (stationId === "cache" && !activePolicy.quellen.cache) {
      return `Blockiert durch ${activePolicy.filename} → quellen.cache: nein`;
    }
    if (stationId === "library" && !activePolicy.quellen.teamwissen) {
      return `Blockiert durch ${activePolicy.filename} → quellen.teamwissen: nein`;
    }
    if (stationId === "web") {
      if (activePolicy.datenschutz?.personenbezogene_daten === "nur_lokal") {
        return `Blockiert durch ${activePolicy.filename} → datenschutz.personenbezogene_daten: nur_lokal`;
      }
      if (!activePolicy.quellen.websuche) {
        return `Blockiert durch ${activePolicy.filename} → quellen.websuche: nein`;
      }
    }
    if (stationId === "provider") {
      if (activePolicy.datenschutz?.personenbezogene_daten === "nur_lokal") {
        return `Blockiert durch ${activePolicy.filename} → datenschutz.personenbezogene_daten: nur_lokal`;
      }
      if (!activePolicy.quellen.externe_ki) {
        return `Blockiert durch ${activePolicy.filename} → quellen.externe_ki: nein`;
      }
      if (!activePolicy.anbieter.fallback_erlaubt) {
        return `Eingeschränkt durch ${activePolicy.filename} → anbieter.fallback_erlaubt: nein`;
      }
    }
    return null;
  };

  const isWebAllowedByPolicy = activePolicy.quellen.websuche && activePolicy.datenschutz?.personenbezogene_daten !== "nur_lokal";
  const isProviderAllowedByPolicy = activePolicy.quellen.externe_ki && activePolicy.datenschutz?.personenbezogene_daten !== "nur_lokal";

  const stations: Array<{
    id: StationType;
    stepNumber: number;
    title: string;
    subtitle: string;
    icon: React.ComponentType<{ style?: React.CSSProperties }>;
    isEnabled: boolean;
    color: string;
    isClickable: boolean;
    count?: number;
    policyRestriction?: string | null;
  }> = [
    {
      id: "cache",
      stepNumber: 1,
      title: "Eco-Cache",
      subtitle: "Proxy-Lookup (0 Tokens)",
      icon: Database,
      isEnabled: config.enableCache && activePolicy.quellen.cache,
      color: "#2563eb",
      isClickable: true,
      count: cacheCount,
      policyRestriction: getPolicyRestrictionForStation("cache"),
    },
    {
      id: "library",
      stepNumber: 2,
      title: "Teamwissen",
      subtitle: "Interne Guidelines & Skills",
      icon: BookOpen,
      isEnabled: config.enableLibrary && activePolicy.quellen.teamwissen,
      color: "#16a34a",
      isClickable: true,
      count: libraryCount,
      policyRestriction: getPolicyRestrictionForStation("library"),
    },
    {
      id: "web",
      stepNumber: 3,
      title: "Grüne Websuche",
      subtitle: "Hosts mit 100% Ökostrom",
      icon: Globe,
      isEnabled: !config.localOnly && config.enableGreenWeb && isWebAllowedByPolicy,
      color: "#0f766e",
      isClickable: true,
      count: webCount,
      policyRestriction: getPolicyRestrictionForStation("web"),
    },
    {
      id: "provider",
      stepNumber: 4,
      title: "Externe KI",
      subtitle: `Modellwahl (${selection.selected?.name ?? "Kein Anbieter"})`,
      icon: Cpu,
      isEnabled: !config.localOnly && config.enableExternalAI && isProviderAllowedByPolicy,
      color: "#be123c",
      isClickable: true,
      count: providerCount,
      policyRestriction: getPolicyRestrictionForStation("provider"),
    },
  ];

  return (
    <aside aria-label="Pipeline und Modell-Rangliste" className="pipeline-sidebar-container">
      {/* Pipeline Stations */}
      <div>
        <div className="pipeline-section-header">
          <h2 className="pipeline-section-title">
            Pipeline-Stationen
          </h2>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>
            {config.localOnly ? "Nur lokal" : "Chain of Responsibility"}
          </span>
        </div>

        {/* Aktiver Agent & Richtlinie Badge */}
        <div style={{ marginTop: "10px", padding: "8px 12px", backgroundColor: "#f8fafc", border: "1.5px solid #cbd5e1", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 800, color: "#0f172a" }}>
            <Shield style={{ width: 14, height: 14, color: "#334155" }} aria-hidden="true" />
            <span>{activePolicy.agent}</span>
          </div>
          <span style={{ fontSize: "11px", fontWeight: 700, fontFamily: "JetBrains Mono, monospace", color: "#475569", display: "flex", alignItems: "center", gap: "4px" }}>
            <FileCode style={{ width: 12, height: 12 }} aria-hidden="true" />
            {activePolicy.filename}
          </span>
        </div>

        <div style={{ marginTop: "12px" }}>
          {stations.map((st) => {
            const Icon = st.icon;
            const isCurrent = currentStation === st.id;
            const isDisabled = !st.isEnabled;
            const isClickable = st.isClickable;
            const restriction = st.policyRestriction;

            return (
              <div
                key={st.id}
                role={isClickable ? "button" : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onClick={() => {
                  if (isClickable && onClickStation) {
                    onClickStation(st.id as "cache" | "library" | "web" | "provider");
                  }
                }}
                onKeyDown={(e) => {
                  if (isClickable && (e.key === "Enter" || e.key === " ") && onClickStation) {
                    e.preventDefault();
                    onClickStation(st.id as "cache" | "library" | "web" | "provider");
                  }
                }}
                className={`pipeline-station-card ${isClickable ? "clickable" : ""} ${isDisabled ? "disabled" : ""} ${isCurrent ? "active" : ""}`}
                title={isClickable ? `Klicken, um ${st.title} Detailpanel zu öffnen` : undefined}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div className={`pipeline-step-badge ${isCurrent ? "active" : ""}`}>
                      {isCurrent ? <Zap style={{ width: 16, height: 16, fill: "#ffffff" }} aria-hidden="true" /> : st.stepNumber}
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span className="pipeline-station-title">{st.title}</span>
                        <Icon style={{ width: 16, height: 16, color: st.color }} />
                        {st.count !== undefined && (
                          <span className={`pipeline-count-badge ${st.id}`} title={`${st.count} Einträge`}>
                            {st.count}
                          </span>
                        )}
                      </div>
                      <div className="pipeline-station-subtitle">{st.subtitle}</div>
                    </div>
                  </div>

                  <div>
                    {isDisabled ? (
                      <span className="pipeline-status-badge pipeline-status-disabled">
                        deaktiviert
                      </span>
                    ) : isCurrent ? (
                      <span className="pipeline-status-badge pipeline-status-active">
                        aktiv …
                      </span>
                    ) : (
                      <span className="pipeline-status-badge pipeline-status-ready">
                        bereit
                      </span>
                    )}
                  </div>
                </div>

                {/* Richtlinien-Einschränkung oder Blockade direkt auf Station */}
                {restriction && (
                  <div
                    style={{
                      marginTop: "8px",
                      paddingTop: "6px",
                      borderTop: "1px dashed #cbd5e1",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: restriction.startsWith("Blockiert") ? "#b91c1c" : "#b45309",
                    }}
                  >
                    <Lock style={{ width: 13, height: 13, flexShrink: 0 }} aria-hidden="true" />
                    <span style={{ lineHeight: 1.3 }}>{restriction}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Station 4 Details: Anbieter-Rangliste */}
      <div
        className="provider-ranking-box clickable"
        role="button"
        tabIndex={0}
        onClick={() => onClickStation && onClickStation("provider", "strategy")}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && onClickStation) {
            e.preventDefault();
            onClickStation("provider", "strategy");
          }
        }}
        title="Klicken, um Anbieter-Rangliste und Strategie im Detailpanel zu öffnen"
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", borderBottom: "2px solid #e2e8f0", paddingBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles style={{ width: 18, height: 18, color: "#be123c" }} aria-hidden="true" />
            <h3 className="pipeline-section-title">Anbieter-Rangliste</h3>
          </div>
          <span style={{ fontSize: "12px", fontWeight: 700, backgroundColor: "#e2e8f0", padding: "2px 8px", borderRadius: "6px", color: "#0f172a" }}>
            {taskType === "complex" ? "Große Aufgabe" : "Kolibri gewählt"}
          </span>
        </div>

        <div>
          {ranked.map((item) => {
            const isSelected = !!selection.selected && item.provider.id === selection.selected.id;

            return (
              <div
                key={item.provider.id}
                className={`provider-item-card ${isSelected ? "selected" : ""}`}
                style={{ cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onClickStation) {
                    onClickStation("provider", "strategy");
                  }
                }}
                title="Klicken, um Anbieter-Rangliste & Modell-Details anzuzeigen"
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="provider-name">{item.provider.name}</span>
                    {isSelected && (
                      <span style={{ backgroundColor: "#be123c", color: "#ffffff", fontSize: "11px", fontWeight: 800, padding: "2px 6px", borderRadius: "4px" }}>
                        Aktiv
                      </span>
                    )}
                    {item.provider.isFallback && (
                      <span style={{ backgroundColor: "#fef3c7", color: "#78350f", border: "1px solid #fde68a", fontSize: "11px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <AlertTriangle style={{ width: 12, height: 12, color: "#b45309" }} aria-hidden="true" /> Fallback
                      </span>
                    )}
                  </div>
                  <span className="provider-score">
                    Score: {item.gesamtScore}
                  </span>
                </div>

                <p className="provider-desc">
                  {item.provider.hinweis}
                </p>

                <div>
                  <div className="provider-bar-label">
                    <span>Ökostrom-Anteil</span>
                    <span style={{ color: "#15803d" }}>{item.stromScore}%</span>
                  </div>
                  <div className="provider-bar-track">
                    <div className="provider-bar-fill-green" style={{ width: `${item.stromScore}%` }} />
                  </div>

                  <div className="provider-bar-label">
                    <span>Effizienz ({item.isPublishedParams ? `${item.provider.aktiveParameter}B` : "nicht veröff."})</span>
                    <span style={{ color: "#0f766e" }}>{item.effizienzScore}%</span>
                  </div>
                  <div className="provider-bar-track">
                    <div className="provider-bar-fill-teal" style={{ width: `${item.effizienzScore}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
