import React from 'react';
import { Database, BookOpen, Globe, Cpu, Leaf, FileText, Check, X, ShieldAlert, ArrowUpRight } from 'lucide-react';
import { PipelineExecutionResult } from '../chain';

interface ReceiptCardProps {
  result: PipelineExecutionResult;
  onOpenProtocol: () => void;
}

export const ReceiptCard: React.FC<ReceiptCardProps> = ({ result, onOpenProtocol }) => {
  const getStationBadge = () => {
    switch (result.resolvedStation) {
      case 'cache':
        return {
          label: 'Eco-Cache (Lokal)',
          icon: Database,
          bgColor: 'bg-blue-50 text-blue-900 border-blue-200',
          dotColor: 'bg-blue-600',
        };
      case 'library':
        return {
          label: 'Teamwissen & Library',
          icon: BookOpen,
          bgColor: 'bg-purple-50 text-purple-900 border-purple-200',
          dotColor: 'bg-purple-600',
        };
      case 'web':
        return {
          label: 'Grüne Websuche',
          icon: Globe,
          bgColor: 'bg-emerald-50 text-emerald-900 border-emerald-200',
          dotColor: 'bg-emerald-600',
        };
      case 'provider':
        return {
          label: result.providerDetails?.provider.name || 'Externe Grüne KI',
          icon: Cpu,
          bgColor: 'bg-rose-50 text-rose-900 border-rose-200',
          dotColor: 'bg-rose-600',
        };
      default:
        return {
          label: 'Gestoppt durch Richtlinie',
          icon: ShieldAlert,
          bgColor: 'bg-amber-50 text-amber-900 border-amber-200',
          dotColor: 'bg-amber-600',
        };
    }
  };

  const badge = getStationBadge();
  const Icon = badge.icon;

  return (
    <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs font-sans text-xs">
      {/* Top station source bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            Beantwortet via:
          </span>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-bold text-xs ${badge.bgColor}`}>
            <span className={`w-2 h-2 rounded-full ${badge.dotColor}`} />
            <Icon className="w-3.5 h-3.5" />
            {badge.label}
          </span>
          {result.activeAgent && (
            <span className="text-xs font-bold text-slate-700">
              über {result.activeAgent.agent}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onOpenProtocol}
          className="text-xs font-bold text-slate-800 hover:text-rose-700 bg-white hover:bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
          title="Detailliertes Suchprotokoll einsehen"
        >
          <FileText className="w-3.5 h-3.5 text-slate-600" />
          Kassenbon Protokoll ansehen
          <ArrowUpRight className="w-3 h-3 text-slate-500" />
        </button>
      </div>

      {/* Where Kolibri searched summary pills */}
      <div className="mb-2.5">
        <div className="text-[11px] font-bold text-slate-700 mb-1.5">
          Wo Kolibri überall gesucht hat:
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {result.stationAudits.map(audit => {
            let statusIcon = <X className="w-3 h-3 text-slate-500" />;
            let statusBg = 'bg-white text-slate-700 border-slate-300';
            let label = 'Kein Treffer';

            if (audit.status === 'hit') {
              statusIcon = <Check className="w-3 h-3 text-emerald-700" />;
              statusBg = 'bg-emerald-50 text-emerald-950 border-emerald-300 font-bold';
              label = 'Treffer genutzt';
            } else if (audit.status === 'blocked') {
              statusIcon = <ShieldAlert className="w-3 h-3 text-amber-700" />;
              statusBg = 'bg-amber-50 text-amber-950 border-amber-300';
              label = 'Gesperrt';
            } else if (audit.status === 'skipped') {
              label = 'Übersprungen';
            }

            return (
              <div
                key={audit.stationId}
                className={`p-1.5 rounded-md border text-[11px] flex items-center justify-between gap-1 ${statusBg}`}
                title={audit.summary}
              >
                <span className="font-semibold truncate">{audit.name.split(' ')[0]}</span>
                <span className="flex items-center gap-0.5 text-[10px] shrink-0">
                  {statusIcon}
                  <span>{label}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Savings and Cost Metrics */}
      <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-slate-800">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
              Externe Tokens
            </span>
            <span className="font-bold text-slate-900 text-xs">
              {result.totalTokensUsed > 0 ? `${result.totalTokensUsed} genutzt` : '0 (100% lokal)'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
              Gesparte Tokens
            </span>
            <span className="font-bold text-emerald-800 text-xs">
              +{result.totalTokensSaved} gespart
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
              CO2-Einsparung
            </span>
            <span className="font-bold text-emerald-800 text-xs flex items-center gap-0.5">
              <Leaf className="w-3 h-3 text-emerald-700" />
              ~{result.co2SavedGrams} g CO2
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
            Dauer
          </span>
          <span className="font-bold text-slate-800 text-xs font-mono">
            {result.durationMs} ms
          </span>
        </div>
      </div>
    </div>
  );
};
