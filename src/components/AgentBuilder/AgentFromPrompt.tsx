import React, { useState } from 'react';
import { Sparkles, CheckCircle2, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';
import { findMatchingTemplateForPrompt, generateAgentPolicyWithAi, createPolicyFromTemplate, PromptMatchResult } from '../../agentBuilder';
import { AgentPolicy } from '../../policies';
import { AgentTemplate } from '../../config';

interface AgentFromPromptProps {
  onSuccess: (policy: AgentPolicy, yamlContent: string, tokensUsed: number) => void;
  onCancel: () => void;
}

const EXAMPLE_BRIEFS = [
  'Agent für Reisekostenabrechnungen, Hotelbelege und Bahn-Pauschalen',
  'Agent für GitHub Pull Requests, PHP Unit-Tests und Code-Reviews',
  'Agent für Kundenfeedback, NPS-Auswertungen und Beschwerde-Tickets',
];

export const AgentFromPrompt: React.FC<AgentFromPromptProps> = ({ onSuccess, onCancel }) => {
  const [brief, setBrief] = useState('');
  const [matchResult, setMatchResult] = useState<PromptMatchResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleStartAnalysis = async () => {
    if (!brief.trim() || isGenerating) return;

    setStatusMessage('1. Prüfe, ob eine bestehende Vorlage passt (0 Tokens)...');
    const match = findMatchingTemplateForPrompt(brief.trim(), 0.70);

    if (match) {
      setMatchResult(match);
      setStatusMessage(null);
      return;
    }

    // No match -> proceed to AI Generation
    await handleTriggerAiGeneration();
  };

  const handleTriggerAiGeneration = async () => {
    setIsGenerating(true);
    setStatusMessage('Generiere individuelle Agenten-Richtlinie mit KI...');

    try {
      const result = await generateAgentPolicyWithAi(brief.trim());
      setIsGenerating(false);
      onSuccess(result.policy, result.yamlContent, result.tokens);
    } catch (err: any) {
      setIsGenerating(false);
      setStatusMessage('Fehler bei der KI-Generierung. Bitte versuche es erneut.');
    }
  };

  const handleUseTemplateMatch = (template: AgentTemplate) => {
    const policy = createPolicyFromTemplate(template);
    onSuccess(policy, policy.rawYaml, 0);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 font-sans animate-in fade-in duration-150">
      <div>
        <h3 className="text-sm font-bold text-slate-900">
          Agenten per Beschreibung bauen lassen
        </h3>
        <p className="text-xs text-slate-600 font-medium mt-0.5">
          Beschreibe in eigenen Worten, was der Agent tun soll. Kolibri prüft zuerst energiesparend lokale Vorlagen (0 Tokens) und nutzt erst bei Bedarf Gemini.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-800 block">
          Was ist die Aufgabe des Agenten?
        </label>
        <textarea
          value={brief}
          onChange={e => {
            setBrief(e.target.value);
            setMatchResult(null);
          }}
          rows={4}
          placeholder="z. B. Ein Agent für unser Social-Media-Team, der Trends recherchiert, Beiträge verfasst und keine persönlichen Kundendaten verarbeitet..."
          className="w-full p-3 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 leading-relaxed"
        />

        {/* Quick Example Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-bold text-slate-500 mr-1">Beispiele:</span>
          {EXAMPLE_BRIEFS.map((ex, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setBrief(ex);
                setMatchResult(null);
              }}
              className="text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md border border-slate-200 transition-colors text-left"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Match Result Banner (0 Tokens!) */}
      {matchResult && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 animate-in fade-in duration-200 space-y-3">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-emerald-950">
                Passende Vorlage gefunden: {matchResult.template.name} ({matchResult.percentage}% Match) · 0 Tokens!
              </h4>
              <p className="text-xs text-slate-700 mt-0.5">
                {matchResult.template.description}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-emerald-200">
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleTriggerAiGeneration}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Trotzdem neu mit KI generieren
            </button>
            <button
              type="button"
              onClick={() => handleUseTemplateMatch(matchResult.template)}
              className="px-3.5 py-1.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <span>Vorlage direkt nutzen (0 Tokens)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Status or Progress */}
      {statusMessage && (
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs font-medium text-blue-900 flex items-center gap-2">
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin text-blue-700" /> : null}
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Zurück</span>
        </button>

        {!matchResult && (
          <button
            type="button"
            disabled={!brief.trim() || isGenerating}
            onClick={handleStartAnalysis}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs ${
              brief.trim() && !isGenerating
                ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer'
                : 'bg-slate-200 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generiere...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Agenten erstellen</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
