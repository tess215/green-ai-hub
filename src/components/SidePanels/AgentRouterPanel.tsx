import React, { useState, useEffect } from 'react';
import {
  X,
  GitFork,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Trash2,
  ExternalLink,
  Sparkles,
  User,
  Settings,
  HelpCircle,
  Shield,
  Layers,
} from 'lucide-react';
import { globalAgentRouter, AgentRoutingResult, RoutingMode, LearnedRoute } from '../../agentRouter';
import { AgentPolicy } from '../../policies';
import { getAgentIcon } from '../Icons';

interface AgentRouterPanelProps {
  lastRoutingResult?: AgentRoutingResult | null;
  policies: AgentPolicy[];
  onOpenPolicyFile: (policy: AgentPolicy) => void;
  onClose: () => void;
}

export const AgentRouterPanel: React.FC<AgentRouterPanelProps> = ({
  lastRoutingResult,
  policies,
  onOpenPolicyFile,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'last' | 'mappings'>('last');
  const [routingMode, setRoutingMode] = useState<RoutingMode>(globalAgentRouter.getRoutingMode());
  const [learnedRoutes, setLearnedRoutes] = useState<LearnedRoute[]>(globalAgentRouter.getLearnedRoutes());

  useEffect(() => {
    const unsub = globalAgentRouter.subscribe(() => {
      setRoutingMode(globalAgentRouter.getRoutingMode());
      setLearnedRoutes(globalAgentRouter.getLearnedRoutes());
    });
    return () => unsub();
  }, []);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const currentResult = lastRoutingResult || globalAgentRouter.getLastResult();

  const handleModeChange = (mode: RoutingMode) => {
    globalAgentRouter.setRoutingMode(mode);
    setRoutingMode(mode);
  };

  const handleRemoveLearned = (id: string) => {
    globalAgentRouter.removeLearnedRoute(id);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[480px] bg-white border-l border-slate-300 shadow-2xl flex flex-col font-sans animate-in slide-in-from-right duration-200">
      {/* Header (Korallrosa #FF6B8A) */}
      <div className="bg-[#FF6B8A] text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-700/40 border border-white/20 flex items-center justify-center">
            <GitFork className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold text-white tracking-wide">Agentenwahl</h2>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white/20 text-white">
                0 Tokens
              </span>
            </div>
            <p className="text-[11px] text-rose-100 font-medium">
              Findet automatisch den zuständigen Agenten anhand deiner Frage. 0 Tokens.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-rose-100 hover:text-white p-1 rounded-lg hover:bg-rose-700/40 transition-colors cursor-pointer"
          title="Schließen (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50">
        <button
          type="button"
          onClick={() => setActiveTab('last')}
          className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition-colors cursor-pointer ${
            activeTab === 'last'
              ? 'border-[#FF6B8A] text-rose-900 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Letzte Anfrage
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('mappings')}
          className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition-colors cursor-pointer ${
            activeTab === 'mappings'
              ? 'border-[#FF6B8A] text-rose-900 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Zuordnungen &amp; Gelernt
        </button>
      </div>

      {/* Panel Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'last' ? (
          <>
            {currentResult ? (
              <div className="space-y-4">
                {/* Status-Banner */}
                <div
                  className="p-3.5 rounded-xl border flex items-start gap-3"
                  style={{
                    backgroundColor: currentResult.selectedAgent ? `${currentResult.selectedAgent.farbe}10` : '#f8fafc',
                    borderColor: currentResult.selectedAgent ? `${currentResult.selectedAgent.farbe}40` : '#cbd5e1',
                  }}
                >
                  {currentResult.selectedAgent ? (
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 mt-0.5"
                      style={{ backgroundColor: currentResult.selectedAgent.farbe || '#0F766E' }}
                    >
                      {React.createElement(getAgentIcon(currentResult.selectedAgent.icon), {
                        className: 'w-4 h-4 text-white',
                      })}
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-slate-700 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}

                  <div className="flex-1">
                    <span className="text-xs font-bold text-slate-900 block">
                      {currentResult.selectedAgent
                        ? `${currentResult.selectedAgent.agent} übernimmt`
                        : currentResult.type === 'clarification_needed'
                        ? 'Rückfrage erforderlich'
                        : 'Allgemeiner Assistent übernimmt'}
                    </span>
                    <p className="text-xs text-slate-700 font-medium mt-1 leading-relaxed">
                      {currentResult.explanation}
                    </p>
                  </div>
                </div>

                {/* Erkannte Wörter */}
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Erkannte Wörter
                  </span>
                  {currentResult.recognizedWords && currentResult.recognizedWords.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {currentResult.recognizedWords.map((word, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-900 border border-rose-200 text-xs font-bold"
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 italic">
                      Keine spezifischen Fachwörter erkannt
                    </span>
                  )}
                </div>

                {/* Score-Balken je Agent */}
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                    Agenten-Punktzahl (0–100)
                  </span>
                  <div className="space-y-2.5">
                    {currentResult.allScores && currentResult.allScores.length > 0 ? (
                      currentResult.allScores.map(item => {
                        const isChosen = currentResult.selectedAgent?.filename === item.policy.filename;
                        const AgentIcon = getAgentIcon(item.policy.icon);
                        return (
                          <div
                            key={item.policy.filename}
                            className={`p-2.5 rounded-xl border transition-all ${
                              isChosen
                                ? 'bg-rose-50/80 border-[#FF6B8A] shadow-xs ring-1 ring-[#FF6B8A]/40'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <div
                                  className="w-4 h-4 rounded text-white flex items-center justify-center shrink-0"
                                  style={{ backgroundColor: item.policy.farbe || '#0F766E' }}
                                >
                                  <AgentIcon className="w-2.5 h-2.5 text-white" />
                                </div>
                                <span className={isChosen ? 'text-rose-950 font-bold' : 'text-slate-800'}>
                                  {item.policy.agent}
                                </span>
                                {isChosen && (
                                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300">
                                    Gewählt
                                  </span>
                                )}
                              </div>
                              <span
                                className={`font-mono text-xs ${
                                  isChosen ? 'text-rose-900 font-bold' : 'text-slate-600'
                                }`}
                              >
                                {item.score} / 100 Pkt.
                              </span>
                            </div>

                            {/* Bar */}
                            <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.max(4, item.score)}%`,
                                  backgroundColor: isChosen ? (item.policy.farbe || '#FF6B8A') : '#94a3b8',
                                }}
                              />
                            </div>

                            {item.recognizedWords.length > 0 && (
                              <div className="mt-1 text-[11px] text-slate-600 font-medium">
                                Treffer: {item.recognizedWords.join(', ')}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                        Keine Score-Daten für die letzte Anfrage vorhanden
                      </div>
                    )}
                  </div>
                </div>

                {/* Richtlinien-Verweis */}
                {currentResult.selectedAgent && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-slate-600" />
                      <div>
                        <span className="text-slate-500 block text-[10px] font-bold uppercase">Gilt jetzt</span>
                        <strong className="text-slate-900">
                          Richtlinie {currentResult.selectedAgent.filename}
                        </strong>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenPolicyFile(currentResult.selectedAgent!)}
                      className="px-2.5 py-1 text-xs font-bold text-rose-700 hover:text-rose-900 bg-white border border-rose-200 rounded-lg shadow-2xs hover:bg-rose-50 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Datei ansehen</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-10 space-y-2">
                <GitFork className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-xs font-bold text-slate-700">Noch keine Anfrage geroutet</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Stell eine Frage im Chat – Kolibri analysiert automatisch die Zuständigkeit anhand der Agenten-Begriffe.
                </p>
              </div>
            )}
          </>
        ) : (
          /* Tab "Zuordnungen & Gelernt" */
          <div className="space-y-5">
            {/* 1. Erkennungswörter je Agent */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Erkennungswörter je Agent (aus YAML)
                </span>
              </div>
              <div className="space-y-2.5">
                {policies.map(p => {
                  const AgentIcon = getAgentIcon(p.icon);
                  const words = p.erkennt || [];
                  return (
                    <div key={p.filename} className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-5 h-5 rounded-md text-white flex items-center justify-center shrink-0"
                            style={{ backgroundColor: p.farbe || '#0F766E' }}
                          >
                            <AgentIcon className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-xs font-bold text-slate-900">{p.agent}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenPolicyFile(p)}
                          className="text-[11px] font-bold text-rose-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          Datei bearbeiten
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>

                      {words.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {words.map((w, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-medium border border-slate-200"
                            >
                              {w}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-amber-800 italic block">
                          Keine Erkennungswörter definiert (nur bei manueller Auswahl aktiv)
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Gelernte Zuordnungen */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Gelernte Zuordnungen aus Korrekturen ({learnedRoutes.length})
                </span>
                {learnedRoutes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => globalAgentRouter.clearLearnedRoutes()}
                    className="text-[11px] font-bold text-rose-700 hover:underline cursor-pointer"
                  >
                    Alle löschen
                  </button>
                )}
              </div>

              {learnedRoutes.length > 0 ? (
                <div className="space-y-2">
                  {learnedRoutes.map(item => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex-1 truncate">
                        <span className="font-bold text-slate-900 block truncate">"{item.originalQuery}"</span>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-600">
                          <span
                            className="font-bold"
                            style={{ color: item.agentColor || '#0F766E' }}
                          >
                            → {item.agentName}
                          </span>
                          <span>·</span>
                          <span className="text-slate-400 font-mono">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveLearned(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded transition-colors cursor-pointer"
                        title="Zuordnung entfernen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 leading-relaxed font-medium">
                  Noch keine gelernten Zuordnungen. Wenn du im Chat über <em>„ändern“</em> einen anderen Agenten wählst, merkt sich Kolibri deine Präferenz für künftige Anfragen (ab 85 % Ähnlichkeit).
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Einstellung unten: Modus-Auswahl */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 font-sans">
        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
          Agentenwahl-Einstellung
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => handleModeChange('auto')}
            className={`py-1.5 px-2 text-xs font-bold rounded-lg border text-center transition-colors cursor-pointer ${
              routingMode === 'auto'
                ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            Automatisch
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('always_ask')}
            className={`py-1.5 px-2 text-xs font-bold rounded-lg border text-center transition-colors cursor-pointer ${
              routingMode === 'always_ask'
                ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            Immer fragen
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('off')}
            className={`py-1.5 px-2 text-xs font-bold rounded-lg border text-center transition-colors cursor-pointer ${
              routingMode === 'off'
                ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            Aus
          </button>
        </div>
      </div>
    </div>
  );
};
