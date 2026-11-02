import React, { useState } from 'react';
import { X, Cpu, Zap, Leaf, CheckCircle2, ShieldAlert, Award, Server, HelpCircle } from 'lucide-react';
import { INITIAL_PROVIDERS, ProviderConfig } from '../../config';
import { PipelineExecutionResult } from '../../chain';

interface ExternalAiPanelProps {
  lastResult?: PipelineExecutionResult | null;
  askBeforeExternal?: boolean;
  onToggleAskBeforeExternal?: (val: boolean) => void;
  onClose: () => void;
}

export const ExternalAiPanel: React.FC<ExternalAiPanelProps> = ({
  lastResult,
  askBeforeExternal = true,
  onToggleAskBeforeExternal,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'last' | 'providers'>(lastResult ? 'last' : 'providers');

  const providerAudit = lastResult?.stationAudits.find(a => a.stationId === 'provider');
  const details = lastResult?.providerDetails;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[480px] bg-white border-l border-slate-300 shadow-2xl flex flex-col font-sans animate-in slide-in-from-right duration-200">
      {/* Header (Rose/Coral) */}
      <div className="bg-rose-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-700 flex items-center justify-center">
            <Cpu className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">Externe KI &amp; Green-Routing</h2>
            <p className="text-[11px] text-rose-100 font-medium">
              Routet Anfragen an Rechenzentren mit dem höchsten Ökostrom-Anteil.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-rose-200 hover:text-white p-1 rounded-lg hover:bg-rose-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 4 Stats Tiles */}
      <div className="grid grid-cols-4 gap-2 p-3 bg-rose-50 border-b border-rose-100 text-center">
        <div className="bg-white p-2 rounded-lg border border-rose-200">
          <span className="text-[10px] text-slate-600 font-bold block uppercase">Cluster</span>
          <span className="text-sm font-bold text-slate-900">3 Grün</span>
        </div>
        <div className="bg-white p-2 rounded-lg border border-rose-200">
          <span className="text-[10px] text-slate-600 font-bold block uppercase">Ökostrom</span>
          <span className="text-sm font-bold text-emerald-700">100%</span>
        </div>
        <div className="bg-white p-2 rounded-lg border border-rose-200">
          <span className="text-[10px] text-slate-600 font-bold block uppercase">PUE Schnitt</span>
          <span className="text-sm font-bold text-slate-900">1.11</span>
        </div>
        <div className="bg-white p-2 rounded-lg border border-rose-200">
          <span className="text-[10px] text-slate-600 font-bold block uppercase">Latenz</span>
          <span className="text-sm font-bold text-slate-900">110 ms</span>
        </div>
      </div>

      {/* Synchronized Switch: Vor externer KI fragen */}
      <div className="p-3 bg-rose-50/70 border-b border-rose-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-rose-700" />
          <div>
            <span className="font-bold text-slate-900 block">Vor externer KI fragen</span>
            <span className="text-[11px] text-slate-600 font-medium">Zeigt Freigabe-Karte vor Token-Verbrauch</span>
          </div>
        </div>
        <input
          type="checkbox"
          checked={askBeforeExternal}
          onChange={e => onToggleAskBeforeExternal?.(e.target.checked)}
          style={{ width: "20px", height: "20px", accentColor: "#ff6b8a", cursor: "pointer" }}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50">
        <button
          type="button"
          onClick={() => setActiveTab('last')}
          className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition-colors cursor-pointer ${
            activeTab === 'last'
              ? 'border-rose-600 text-rose-800 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Letzte Inferenz
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('providers')}
          className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition-colors cursor-pointer ${
            activeTab === 'providers'
              ? 'border-rose-600 text-rose-800 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Anbieter-Ranking ({INITIAL_PROVIDERS.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {activeTab === 'last' && (
          <div className="space-y-3">
            {lastResult && lastResult.resolvedStation === 'provider' ? (
              <>
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-950">
                  <span className="text-[10px] font-bold uppercase block mb-1">Gewählter Rechencluster</span>
                  <h4 className="font-bold text-xs flex items-center gap-1.5 text-slate-900">
                    <Award className="w-4 h-4 text-rose-600" />
                    {details?.provider.name}
                  </h4>
                  <p className="text-xs text-slate-800 mt-1 font-medium">
                    Standort: {details?.provider.location}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-800">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Genutzte Tokens</span>
                    <span className="font-bold text-sm text-slate-900">{details?.tokensUsed}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">CO2-Ausstoß</span>
                    <span className="font-bold text-sm text-emerald-800">~{details?.carbonGrams} g CO2</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Adapter-Modus</span>
                    <span className="font-bold text-xs text-slate-900">{details?.adapterName}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Latenz</span>
                    <span className="font-bold text-xs text-slate-900 font-mono">{details?.latencyMs} ms</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">GreenStrategy Begründung:</span>
                  <p className="text-xs text-slate-800 font-medium leading-relaxed">
                    {providerAudit?.summary}
                  </p>
                </div>
              </>
            ) : (
              <div className="p-6 text-center text-slate-500">
                <Cpu className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-medium text-xs">
                  {lastResult
                    ? 'Letzte Anfrage wurde bereits in Eco-Cache oder Teamwissen beantwortet (0 externe KI-Aufrufe).'
                    : 'Noch keine Anfrage ausgeführt.'}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'providers' && (
          <div className="space-y-3">
            <p className="text-[11px] text-slate-600 font-medium">
              Die <strong>GreenStrategy</strong> bewertet Anbieter dynamisch nach Ökostromanteil, PUE-Effizienz und regionaler CO2-Intensität:
            </p>

            {INITIAL_PROVIDERS.map((p, index) => (
              <div
                key={p.id}
                className={`p-3.5 rounded-xl border ${
                  p.isGreen
                    ? 'bg-white border-slate-200 hover:border-rose-300'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-[10px]">
                      #{index + 1}
                    </span>
                    <h4 className="font-bold text-xs text-slate-900">{p.name}</h4>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    p.isGreen
                      ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                      : 'bg-amber-100 text-amber-950 border-amber-300'
                  }`}>
                    Score {p.score}/100
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 mb-2 font-medium">
                  {p.location}
                </p>

                <div className="grid grid-cols-3 gap-1.5 text-[10px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-slate-500 block">Ökostrom</span>
                    <strong className="text-emerald-800">{p.renewableShare}%</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">CO2-Intensität</span>
                    <strong className="text-slate-900">{p.carbonIntensity} g/kWh</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">PUE</span>
                    <strong className="text-slate-900">{p.pue}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
