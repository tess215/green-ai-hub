import React, { useState } from 'react';
import { AgentPolicy, parseAndValidatePolicyYaml } from '../../policies';
import { performGreenCheck } from '../../greenCheck';
import { getAgentIcon, CheckCircle2, AlertTriangle, XCircle, ArrowLeft, Play, Leaf, Sparkles } from '../Icons';

interface AgentPreviewProps {
  policy: AgentPolicy;
  yamlContent: string;
  tokensSpentOnGeneration?: number;
  onBack: () => void;
  onStartAgent: (policy: AgentPolicy, yamlContent: string) => void;
}

export const AgentPreview: React.FC<AgentPreviewProps> = ({
  policy: initialPolicy,
  yamlContent: initialYaml,
  tokensSpentOnGeneration,
  onBack,
  onStartAgent,
}) => {
  const [yamlText, setYamlText] = useState(initialYaml);
  const [currentPolicy, setCurrentPolicy] = useState<AgentPolicy>(initialPolicy);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleYamlChange = (newYaml: string) => {
    setYamlText(newYaml);
    try {
      const parsed = parseAndValidatePolicyYaml(newYaml, currentPolicy.filename);
      setCurrentPolicy(parsed);
      setParseError(null);
    } catch {
      setParseError('YAML-Syntaxfehler');
    }
  };

  const greenCheck = performGreenCheck(currentPolicy);
  const Icon = getAgentIcon(currentPolicy.icon);

  const canStart = greenCheck.overallStatus !== 'red' && !parseError;

  return (
    <div className="space-y-5 font-sans">
      {/* Top Banner if AI generated tokens */}
      {tokensSpentOnGeneration !== undefined && tokensSpentOnGeneration > 0 && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs text-emerald-950 font-medium">
          <span className="flex items-center gap-1.5 font-bold">
            <Sparkles className="w-4 h-4 text-emerald-700" />
            Richtlinie erfolgreich via KI generiert
          </span>
          <span className="font-bold bg-white px-2 py-0.5 rounded border border-emerald-200">
            {tokensSpentOnGeneration} Tokens verbraucht
          </span>
        </div>
      )}

      {/* Two Columns: Visual Card Preview (Left) & Editable YAML (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Visual Card Preview */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Vorschau der Agenten-Karte
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              {currentPolicy.filename}
            </span>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3">
            <div className="flex items-start gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
                style={{ backgroundColor: currentPolicy.farbe || '#0F766E' }}
              >
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-900">{currentPolicy.agent}</h3>
                <span className="text-[11px] font-mono text-slate-500 block">
                  Richtlinie: {currentPolicy.filename}
                </span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                greenCheck.overallStatus === 'green'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : 'bg-amber-100 text-amber-900 border-amber-300'
              }`}>
                {greenCheck.overallStatus === 'green' ? '✔ Green Check Bestanden' : '! Warnungen vorhanden'}
              </span>
            </div>

            {/* Tasks */}
            {currentPolicy.aufgaben && currentPolicy.aufgaben.length > 0 && (
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Definierte Aufgaben ({currentPolicy.aufgaben.length})
                </span>
                <div className="space-y-1">
                  {currentPolicy.aufgaben.map((task, i) => (
                    <div key={i} className="text-xs text-slate-800 flex items-center justify-between gap-1 p-1.5 bg-slate-50 rounded border border-slate-200 font-medium">
                      <span className="truncate">{task.text}</span>
                      <span className="text-[10px] shrink-0 font-bold px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                        {task.haeufigkeit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Privacy and Sources */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Datenschutz</span>
                <strong className="text-slate-900 text-xs">
                  {currentPolicy.datenschutz?.personenbezogene_daten || 'erlaubt'}
                </strong>
              </div>
              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Tagesbudget</span>
                <strong className="text-slate-900 text-xs">
                  {currentPolicy.tagesbudget_tokens.toLocaleString()} Tokens
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Full Editable YAML */}
        <div className="lg:col-span-6 bg-slate-900 rounded-2xl p-4 text-white flex flex-col justify-between shadow-md">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                YAML-Richtlinie (Bearbeitbar)
              </span>
              <span className="text-[10px] font-mono text-emerald-400">
                {currentPolicy.filename}
              </span>
            </div>

            <textarea
              value={yamlText}
              onChange={e => handleYamlChange(e.target.value)}
              rows={13}
              className="w-full bg-transparent font-mono text-xs text-emerald-300 resize-none outline-none leading-relaxed"
              spellCheck={false}
            />

            {parseError && (
              <p className="text-[11px] text-rose-400 font-bold mt-1">
                {parseError}
              </p>
            )}
          </div>

          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800">
            Änderungen an der YAML-Datei aktualisieren automatisch die Vorschau und den Green-Check.
          </div>
        </div>
      </div>

      {/* Bottom: Green-Check Engine Results */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <Leaf className="w-4 h-4 text-emerald-700" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Green-Check &amp; Nachhaltigkeitsprüfung
            </h4>
          </div>

          {/* Savings Estimation */}
          <div className="flex items-center gap-3 text-xs">
            <span className="font-medium text-slate-600">
              Erwartete Ersparnis: <strong className="text-emerald-700 font-bold">{greenCheck.estimation.savedPercentage}% Tokens</strong>
            </span>
            <span className="font-medium text-slate-600">
              CO2-Einsparung: <strong className="text-emerald-700 font-bold">~{greenCheck.estimation.savedCo2Grams} g/Tag</strong>
            </span>
          </div>
        </div>

        {/* Rule Indicators list */}
        <div className="space-y-2">
          {greenCheck.items.map(item => {
            let IconComp = CheckCircle2;
            let textClass = 'text-emerald-950 bg-emerald-50 border-emerald-300';
            if (item.type === 'warning') {
              IconComp = AlertTriangle;
              textClass = 'text-amber-950 bg-amber-50 border-amber-300';
            } else if (item.type === 'error') {
              IconComp = XCircle;
              textClass = 'text-rose-950 bg-rose-50 border-rose-300';
            }

            return (
              <div
                key={item.id}
                className={`p-2.5 rounded-lg border flex items-start gap-2.5 text-xs font-medium ${textClass}`}
              >
                <IconComp className="w-4 h-4 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <span className="font-bold block">{item.title}</span>
                  <span className="text-[11px] leading-tight block mt-0.5">{item.description}</span>
                </div>
                {item.impact && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border shrink-0">
                    {item.impact}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-200">
        <button
          type="button"
          onClick={onBack}
          className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Zurück zur Bearbeitung</span>
        </button>

        <button
          type="button"
          disabled={!canStart}
          onClick={() => onStartAgent(currentPolicy, yamlText)}
          className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-xs cursor-pointer ${
            canStart
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-slate-200 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Agent starten &amp; aktivieren</span>
        </button>
      </div>
    </div>
  );
};
