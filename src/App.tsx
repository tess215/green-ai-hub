import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { PromptChips } from './components/PromptChips';
import { ChatInput } from './components/ChatInput';
import { ChatMessageItem, ChatMessage } from './components/ChatMessageItem';
import { PromptImprovementCard } from './components/PromptImprovementCard';
import { ProtocolModal } from './components/ProtocolModal';
import { AgentCardsBar } from './components/AgentCardsBar';
import { PolicyDetailsModal } from './components/PolicyDetailsModal';
import { PipelineWidget } from './components/PipelineWidget';
import { EcoCachePanel } from './components/SidePanels/EcoCachePanel';
import { LibraryPanel } from './components/SidePanels/LibraryPanel';
import { GreenWebPanel } from './components/SidePanels/GreenWebPanel';
import { ExternalAiPanel } from './components/SidePanels/ExternalAiPanel';
import { AgentBuilderModal } from './components/AgentBuilder/AgentBuilderModal';

import { globalPolicyStore, AgentPolicy } from './policies';
import {
  globalPipelineChain,
  PipelineExecutionResult,
  TaskType,
  PipelineContextConfig,
  DEFAULT_PIPELINE_CONTEXT_CONFIG,
  StationAudit,
} from './chain';
import { globalEcoCache, CacheEntry } from './cache';
import { INITIAL_PROMPT_CHIPS, ProviderConfig } from './config';
import { Leaf, Sparkles, Database, ShieldCheck, ArrowRight } from 'lucide-react';

export const App: React.FC = () => {
  // App state
  const [useMockMode, setUseMockMode] = useState(false);
  const [policies, setPolicies] = useState<AgentPolicy[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<AgentPolicy | null>(null);

  // Context & Task selection state
  const [contextConfig, setContextConfig] = useState<PipelineContextConfig>(DEFAULT_PIPELINE_CONTEXT_CONFIG);
  const [taskType, setTaskType] = useState<TaskType>('daily');

  // Pending approval before external KI
  const [pendingApproval, setPendingApproval] = useState<{
    query: string;
    provider: ProviderConfig;
    estimatedTokens: number;
    auditsSoFar: StationAudit[];
    policy: AgentPolicy;
  } | null>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content:
        'Willkommen bei Kolibri! 🌱 Ich bin dein ressourcensparendes KI-Gateway.\n\nBevor eine rechenintensive externe KI gestartet wird, prüfe ich zuerst automatisch:\n1. ⚡ Eco-Cache (gespeicherte Antworten, 0 Tokens, 0 g CO2)\n2. 📚 Teamwissen & Library (geprüfte interne Richtlinien)\n3. 🌿 Grüne Websuche (ausschließlich verifizierte Ökostrom-Websites)\n4. ☁ Externe KI (streng geroutet an nachweisliche Ökostrom-Rechenzentren in Island und Skandinavien)\n\nWähle oben einen Vorschlag oder stelle eine eigene Frage!',
      timestamp: 'Heute, 09:00 Uhr',
    },
  ]);

  const [lastResult, setLastResult] = useState<PipelineExecutionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [inputOverrideText, setInputOverrideText] = useState('');

  // Prompt Improvement Modal/Card state
  const [improvementData, setImprovementData] = useState<{
    originalText: string;
    improvedText: string;
    tokensUsed: number;
    matchedCacheEntry?: CacheEntry | null;
    matchPercentage?: number;
    matchPhase?: 'initial' | 'after_improvement';
    statusMessage?: string;
  } | null>(null);

  // Panels & Modals
  const [activeSidePanel, setActiveSidePanel] = useState<'cache' | 'library' | 'web' | 'provider' | null>(null);
  const [protocolModalResult, setProtocolModalResult] = useState<PipelineExecutionResult | null>(null);
  const [policyDetailsModal, setPolicyDetailsModal] = useState<AgentPolicy | null>(null);
  const [isBuilderModalOpen, setIsBuilderModalOpen] = useState(false);
  const [builderEditPolicy, setBuilderEditPolicy] = useState<AgentPolicy | undefined>(undefined);

  // Sync policies from PolicyStore
  useEffect(() => {
    const updatePolicies = () => {
      const all = globalPolicyStore.getAll();
      setPolicies(all);
      if (all.length > 0 && !selectedPolicy) {
        setSelectedPolicy(all[0]);
      }
    };

    updatePolicies();
    const unsubscribe = globalPolicyStore.subscribe(updatePolicies);
    return () => unsubscribe();
  }, [selectedPolicy]);

  // Escape key closes open side panels or modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveSidePanel(null);
        setProtocolModalResult(null);
        setPolicyDetailsModal(null);
        setIsBuilderModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sending a message through the Kolibri Pipeline Chain
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isProcessing) return;

    const currentAgent = selectedPolicy || policies[0];
    if (!currentAgent) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);
    setInputOverrideText('');
    setImprovementData(null);
    setPendingApproval(null);

    try {
      // Check if approval is needed before external KI
      if (contextConfig.askBeforeExternal && !contextConfig.localOnly && contextConfig.enableExternalAI) {
        const check = await globalPipelineChain.checkBeforeExternal(text, currentAgent, {
          useMockOnly: useMockMode,
          contextConfig,
          taskType,
        });

        if (check.hasLocalHit && check.localResult) {
          setLastResult(check.localResult);
          setMessages(prev => [
            ...prev,
            {
              id: `assist-${Date.now()}`,
              role: 'assistant',
              content: check.localResult!.answer,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              result: check.localResult,
            },
          ]);
          setIsProcessing(false);
          return;
        }

        if (check.requiresApproval && check.candidateProvider) {
          // Present Freigabe-Karte
          setPendingApproval({
            query: text,
            provider: check.candidateProvider,
            estimatedTokens: check.estimatedTokens || 140,
            auditsSoFar: check.auditsSoFar,
            policy: currentAgent,
          });
          setIsProcessing(false);
          return;
        }
      }

      // Standard run
      const result = await globalPipelineChain.processQuery(text, currentAgent, {
        useMockOnly: useMockMode,
        contextConfig,
        taskType,
      });

      setLastResult(result);

      const assistantMessage: ChatMessage = {
        id: `assist-${Date.now()}`,
        role: 'assistant',
        content: result.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        result,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Fehler bei der Anfrage: ${err.message || 'Die Anfrage konnte nicht verarbeitet werden.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  // User approvals for external AI
  const handleApproveExternal = async () => {
    if (!pendingApproval) return;
    const { query, policy, auditsSoFar } = pendingApproval;
    setPendingApproval(null);
    setIsProcessing(true);

    try {
      const result = await globalPipelineChain.processQuery(query, policy, {
        useMockOnly: useMockMode,
        contextConfig,
        taskType,
        skipLocalAudits: auditsSoFar,
      });

      setLastResult(result);
      setMessages(prev => [
        ...prev,
        {
          id: `assist-${Date.now()}`,
          role: 'assistant',
          content: result.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          result,
        },
      ]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `Fehler bei der Inferenz: ${err.message || 'Fehler aufgetreten.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectExternal = () => {
    if (!pendingApproval) return;
    const { query, auditsSoFar } = pendingApproval;
    setPendingApproval(null);

    const rejectedResult: PipelineExecutionResult = {
      query,
      resolvedStation: 'none',
      answer: 'Anfrage gestoppt: Keine Übergabe an externe KI gewünscht (0 externe Tokens verbraucht).',
      stationAudits: auditsSoFar,
      totalTokensUsed: 0,
      totalTokensSaved: 0,
      co2SavedGrams: 0,
      costSavedCents: 0,
      durationMs: 35,
      isMock: false,
      policyNotices: ['Übergabe an externe KI vom Nutzer abgelehnt.'],
    };

    setLastResult(rejectedResult);
    setMessages(prev => [
      ...prev,
      {
        id: `reject-${Date.now()}`,
        role: 'assistant',
        content: 'Anfrage gestoppt: Keine Übergabe an externe KI gewünscht (0 externe Tokens verbraucht).',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        result: rejectedResult,
      },
    ]);
  };

  // Direct Answer from Cache link click
  const handleDirectAnswerFromCache = (entry: CacheEntry) => {
    handleSendMessage(entry.originalQuery);
  };

  // 3-Step Prompt Improvement
  const handleRequestImprovement = async (rawText: string) => {
    if (!rawText.trim() || isImproving) return;

    setIsImproving(true);

    // Step 1: Check Eco-Cache first locally (0 tokens)
    const initialCheck = globalEcoCache.checkCache(rawText, 0.75);

    if (initialCheck.hit && initialCheck.entry) {
      setImprovementData({
        originalText: rawText,
        improvedText: initialCheck.entry.originalQuery,
        tokensUsed: 0,
        matchedCacheEntry: initialCheck.entry,
        matchPercentage: Math.round((initialCheck.similarity || 0.8) * 100),
        matchPhase: 'initial',
        statusMessage: 'Frage schon im Eco-Cache vorhanden (0 Tokens)',
      });
      setIsImproving(false);
      return;
    }

    // Step 2: Call Gemini to improve punctuation, clarity, precision
    try {
      const resp = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: rawText,
          systemInstruction:
            'Verbessere diese Frage an einen KI-Assistenten. Korrigiere Rechtschreibung und Grammatik, formuliere klar und präzise, erhalte die Bedeutung. Antworte nur mit der verbesserten Frage.',
          mode: 'prompt_improve',
          maxOutputTokens: 100,
        }),
      });

      if (!resp.ok) throw new Error('Prompt-Verbesserung fehlgeschlagen');
      const data = await resp.json();
      const improved = data.text || rawText;
      const tokens = data.tokens || 35;

      // Step 3: Check Eco-Cache again with improved text
      const secondCheck = globalEcoCache.checkCache(improved, 0.75);

      setImprovementData({
        originalText: rawText,
        improvedText: improved,
        tokensUsed: tokens,
        matchedCacheEntry: secondCheck.hit ? secondCheck.entry : null,
        matchPercentage: secondCheck.hit ? Math.round((secondCheck.similarity || 0.8) * 100) : undefined,
        matchPhase: secondCheck.hit ? 'after_improvement' : undefined,
        statusMessage: secondCheck.hit
          ? 'Mit der korrigierten Fassung im Eco-Cache gefunden!'
          : 'Formulierung präzisiert und Grammatik optimiert',
      });
    } catch {
      // Offline fallback
      let fallbackImproved = rawText.trim();
      if (!fallbackImproved.endsWith('?')) fallbackImproved += '?';
      setImprovementData({
        originalText: rawText,
        improvedText: fallbackImproved,
        tokensUsed: 0,
        statusMessage: 'Lokale Zeichensetzungs-Korrektur (Offline)',
      });
    } finally {
      setIsImproving(false);
    }
  };

  // Reset Demo to initial state
  const handleResetDemo = () => {
    globalEcoCache.reset();
    globalPolicyStore.fetchPolicies();
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        content: 'Demo wurde erfolgreich zurückgesetzt! Alle Stationen, Testdaten und Anfangs-Agenten sind wieder aktiv.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setLastResult(null);
    setImprovementData(null);
    setInputOverrideText('');
  };

  // Deleting an agent
  const handleDeleteAgent = async (filename: string) => {
    await globalPolicyStore.deletePolicy(filename);
    const updated = globalPolicyStore.getAll();
    setPolicies(updated);
    if (selectedPolicy?.filename === filename) {
      setSelectedPolicy(updated[0] || null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-rose-100 selection:text-rose-900">
      {/* Top Header */}
      <Header
        useMockMode={useMockMode}
        onToggleMockMode={setUseMockMode}
        onResetDemo={handleResetDemo}
      />

      {/* Main 2-Column Responsive Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Chat-Oberfläche (7 Columns) */}
        <section className="lg:col-span-7 flex flex-col space-y-4">
          {/* Vorschlags-Chips (ausklappbar) */}
          <PromptChips
            chips={INITIAL_PROMPT_CHIPS}
            onSelectPrompt={p => setInputOverrideText(p)}
          />

          {/* Chat Messages Log */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs min-h-[380px] max-h-[560px] overflow-y-auto flex flex-col">
            <div className="flex-1">
              {messages.map(msg => (
                <ChatMessageItem
                  key={msg.id}
                  message={msg}
                  onOpenProtocol={res => setProtocolModalResult(res)}
                />
              ))}

              {/* Freigabe-Karte vor externer KI */}
              {pendingApproval && (
                <div className="my-3 p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 shadow-sm animate-in fade-in duration-150 font-sans">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                          Freigabe erforderlich
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                          Vor externer KI fragen
                        </span>
                      </div>
                      <p className="text-xs text-slate-900 font-medium leading-relaxed">
                        Lokal nichts gefunden. An <strong>{pendingApproval.provider.name}</strong> übergeben?
                        <span className="block mt-1 text-emerald-900 font-bold">
                          Ca. {pendingApproval.estimatedTokens} Tokens · 100% Ökostrom ({pendingApproval.provider.location})
                        </span>
                      </p>
                      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-amber-200">
                        <button
                          type="button"
                          onClick={handleApproveExternal}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                        >
                          <span>Übergeben</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleRejectExternal}
                          className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition-colors cursor-pointer"
                        >
                          Nein, danke
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isProcessing && (
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 animate-pulse">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                  <span className="font-semibold text-slate-900">
                    Kolibri Pipeline prüft Stationen (Eco-Cache → Teamwissen → Grüne Websuche → Externe KI)...
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Prompt Improvement Banner if active */}
          {improvementData && (
            <PromptImprovementCard
              originalText={improvementData.originalText}
              improvedText={improvementData.improvedText}
              tokensUsed={improvementData.tokensUsed}
              matchedCacheEntry={improvementData.matchedCacheEntry}
              matchPercentage={improvementData.matchPercentage}
              matchPhase={improvementData.matchPhase}
              statusMessage={improvementData.statusMessage}
              onApply={text => {
                setInputOverrideText(text);
                setImprovementData(null);
              }}
              onShowDirectAnswer={entry => {
                handleSendMessage(entry.originalQuery);
                setImprovementData(null);
              }}
              onDismiss={() => setImprovementData(null)}
            />
          )}

          {/* Chat Input with Live Similarity Matching, Aufgabenwahl & Kontext-Panel */}
          <ChatInput
            onSendMessage={handleSendMessage}
            onRequestImprovement={handleRequestImprovement}
            onDirectAnswerFromCache={handleDirectAnswerFromCache}
            disabled={isProcessing || !!pendingApproval}
            isImproving={isImproving}
            externalText={inputOverrideText}
            taskType={taskType}
            onTaskTypeChange={setTaskType}
            contextConfig={contextConfig}
            onContextConfigChange={setContextConfig}
          />
        </section>

        {/* Right Column: Absender-Agent & Pipeline Stations (5 Columns) */}
        <aside className="lg:col-span-5 space-y-5 sticky top-20">
          {/* Absender-Agent Bar */}
          <AgentCardsBar
            policies={policies}
            selectedPolicy={selectedPolicy}
            onSelectPolicy={p => setSelectedPolicy(p)}
            onOpenPolicyDetails={p => setPolicyDetailsModal(p)}
            onOpenAgentBuilder={() => {
              setBuilderEditPolicy(undefined);
              setIsBuilderModalOpen(true);
            }}
          />

          {/* Clickable Pipeline Stations Widget with Deaktiviert-Status */}
          <PipelineWidget
            lastResult={lastResult}
            contextConfig={contextConfig}
            onOpenStation={stId => setActiveSidePanel(stId)}
          />

          {/* Eco Banner info card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/60 border border-emerald-200 text-xs font-medium text-emerald-950 flex items-start gap-3 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-emerald-950 text-xs mb-0.5">
                Energieeffizienz nach Design
              </h4>
              <p className="text-[11px] text-emerald-900 leading-relaxed font-normal">
                Jede Abfrage wird zuerst deterministisch normalisiert. Über 70% wiederkehrender Firmenfragen werden direkt aus dem Speicher beantwortet – ohne Netzwerktraffic und ohne externe GPU-Inferenz.
              </p>
            </div>
          </div>
        </aside>
      </main>

      {/* Side Panels for Pipeline Stations */}
      {activeSidePanel === 'cache' && (
        <EcoCachePanel
          lastResult={lastResult}
          onClose={() => setActiveSidePanel(null)}
          onUseQuery={q => setInputOverrideText(q)}
        />
      )}

      {activeSidePanel === 'library' && (
        <LibraryPanel
          lastResult={lastResult}
          onClose={() => setActiveSidePanel(null)}
          onUseQuery={q => setInputOverrideText(q)}
        />
      )}

      {activeSidePanel === 'web' && (
        <GreenWebPanel
          lastResult={lastResult}
          onClose={() => setActiveSidePanel(null)}
        />
      )}

      {activeSidePanel === 'provider' && (
        <ExternalAiPanel
          lastResult={lastResult}
          askBeforeExternal={contextConfig.askBeforeExternal}
          onToggleAskBeforeExternal={val => setContextConfig(prev => ({ ...prev, askBeforeExternal: val }))}
          onClose={() => setActiveSidePanel(null)}
        />
      )}

      {/* Kassenbon & Protocol Modal */}
      {protocolModalResult && (
        <ProtocolModal
          result={protocolModalResult}
          onClose={() => setProtocolModalResult(null)}
        />
      )}

      {/* Policy Details & Delete/Edit Modal */}
      {policyDetailsModal && (
        <PolicyDetailsModal
          policy={policyDetailsModal}
          contextConfig={contextConfig}
          onClose={() => setPolicyDetailsModal(null)}
          onEditInWizard={p => {
            setBuilderEditPolicy(p);
            setIsBuilderModalOpen(true);
          }}
          onDeleteAgent={handleDeleteAgent}
        />
      )}

      {/* Agent Builder Modal (3 Pathways: Template, Wizard, Prompt) */}
      {isBuilderModalOpen && (
        <AgentBuilderModal
          existingPolicies={policies}
          initialMode={builderEditPolicy ? 'wizard' : 'template'}
          initialPolicyForEdit={builderEditPolicy}
          onClose={() => {
            setIsBuilderModalOpen(false);
            setBuilderEditPolicy(undefined);
          }}
          onAgentCreated={newPolicy => {
            setSelectedPolicy(newPolicy);
          }}
        />
      )}
    </div>
  );
};

export default App;
