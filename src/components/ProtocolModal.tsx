import React from 'react';
import { X, CheckCircle2, XCircle, ShieldAlert, Database, BookOpen, Globe, Cpu, Clock, Leaf, DollarSign } from 'lucide-react';
import { PipelineExecutionResult } from '../chain';

interface ProtocolModalProps {
  result: PipelineExecutionResult | null;
  onClose: () => void;
}

export const ProtocolModal: React.FC<ProtocolModalProps> = ({ result, onClose }) => {
  if (!result) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white">
              <Leaf className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                Kolibri Kassenbon-Protokoll
              </h2>
              <p className="text-xs text-slate-300">
                Vollständiger Transparenzbericht über die Suchstationen der Pipeline
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-sans">
          {/* Summary Box */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Geprüfte Nutzeranfrage
            </span>
            <p className="text-xs font-bold text-slate-900 mb-3">
              "{result.query}"
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 text-slate-800">
              <div>
                <span className="text-[10px] text-slate-500 block">Ergebnis-Quelle</span>
                <span className="font-bold text-slate-900">{result.resolvedStation.toUpperCase()}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Externe Tokens</span>
                <span className="font-bold text-slate-900">{result.totalTokensUsed} Tokens</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Gespart</span>
                <span className="font-bold text-emerald-700">+{result.totalTokensSaved} Tokens</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Ausführungszeit</span>
                <span className="font-bold text-slate-900 font-mono">{result.durationMs} ms</span>
              </div>
            </div>
          </div>

          {/* Policy notices if any */}
          {result.policyNotices && result.policyNotices.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950">
              <span className="font-bold flex items-center gap-1.5 mb-1 text-xs">
                <ShieldAlert className="w-4 h-4 text-amber-700" />
                Aktive Richtlinien-Filter:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] font-medium text-amber-900">
                {result.policyNotices.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Sequential Station Inspection */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 mb-2.5 uppercase tracking-wider">
              Chronologisches Such- und Entscheidungsprotokoll:
            </h3>

            <div className="space-y-3">
              {result.stationAudits.map((audit, idx) => {
                let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-300';
                let Icon = Database;
                if (audit.stationId === 'cache') Icon = Database;
                if (audit.stationId === 'library') Icon = BookOpen;
                if (audit.stationId === 'web') Icon = Globe;
                if (audit.stationId === 'provider') Icon = Cpu;

                if (audit.status === 'hit') badgeStyle = 'bg-emerald-100 text-emerald-900 border-emerald-300';
                if (audit.status === 'blocked') badgeStyle = 'bg-amber-100 text-amber-900 border-amber-300';

                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-slate-100 border border-slate-300 flex items-center justify-center font-bold text-[10px] text-slate-700">
                          {idx + 1}
                        </span>
                        <Icon className="w-4 h-4 text-slate-700" />
                        <span className="font-bold text-slate-900 text-xs">{audit.name}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeStyle}`}>
                        {audit.status === 'hit' ? '✔ TREFFER GENUTZT' : audit.status === 'blocked' ? '⛔ GESPERRT' : '✖ KEIN TREFFER'}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-slate-800 mb-2">
                      {audit.summary}
                    </p>

                    {/* Detailed Station Metadata */}
                    {audit.details && (
                      <div className="p-2 rounded bg-slate-50 border border-slate-200 font-mono text-[10px] text-slate-700 space-y-1">
                        {audit.details.fingerprint && (
                          <div>Fingerprint: <strong className="text-slate-900">{audit.details.fingerprint}</strong></div>
                        )}
                        {audit.details.normalized && (
                          <div>Normalisiert: "{audit.details.normalized}"</div>
                        )}
                        {audit.details.percentage && (
                          <div>Übereinstimmung: {audit.details.percentage}%</div>
                        )}
                        {audit.details.topResult && (
                          <div>Genutzte Quelle: {audit.details.topResult.domain} ({audit.details.topResult.hostedBy})</div>
                        )}
                        {audit.details.provider && (
                          <div>Cluster: {audit.details.provider.name} | Ökostrom: {audit.details.provider.renewableShare}% | CO2-Intensität: {audit.details.provider.carbonIntensity} g/kWh</div>
                        )}
                      </div>
                    )}

                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 font-medium">
                      <span>Dauer dieser Station: {audit.durationMs} ms</span>
                      <span>
                        {audit.tokensSaved > 0
                          ? `Tokens eingespart: +${audit.tokensSaved}`
                          : audit.tokensCharged > 0
                          ? `Inferenz-Tokens: ${audit.tokensCharged}`
                          : '0 Tokens'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
