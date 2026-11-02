import React from 'react';
import { AgentPolicy } from '../policies';
import { getAgentIcon, Plus, Settings, ShieldCheck, Check } from './Icons';

interface AgentCardsBarProps {
  policies: AgentPolicy[];
  selectedPolicy: AgentPolicy | null;
  onSelectPolicy: (policy: AgentPolicy) => void;
  onOpenPolicyDetails: (policy: AgentPolicy) => void;
  onOpenAgentBuilder: () => void;
}

export const AgentCardsBar: React.FC<AgentCardsBarProps> = ({
  policies,
  selectedPolicy,
  onSelectPolicy,
  onOpenPolicyDetails,
  onOpenAgentBuilder,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs font-sans">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Absender-Agent
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            Bestimmt Nachhaltigkeitsregeln &amp; Datenschutz
          </p>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
          {policies.length} aktiv
        </span>
      </div>

      {/* List of Agent Cards */}
      <div className="space-y-2">
        {policies.map(policy => {
          const isSelected = selectedPolicy?.filename === policy.filename;
          const Icon = getAgentIcon(policy.icon);

          return (
            <div
              key={policy.filename}
              onClick={() => onSelectPolicy(policy)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                isSelected
                  ? 'border-2 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
              }`}
              style={{
                backgroundColor: isSelected ? `${policy.farbe || '#0F766E'}0D` : undefined,
                borderColor: isSelected ? policy.farbe || '#0F766E' : undefined,
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs ${
                    isSelected ? 'animate-pulse' : ''
                  }`}
                  style={{ backgroundColor: policy.farbe || '#0F766E' }}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {policy.agent}
                    </h4>
                    {isSelected && (
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-offset-1 animate-pulse"
                        style={{
                          backgroundColor: policy.farbe || '#0F766E',
                          boxShadow: `0 0 0 2px ${policy.farbe || '#0F766E'}40`,
                        }}
                        title="Aktiver Absender-Agent"
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      onOpenPolicyDetails(policy);
                    }}
                    className="text-[10px] font-mono text-slate-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer truncate mt-0.5"
                    title="Richtlinie ansehen und bearbeiten"
                  >
                    <span>Richtlinie: {policy.filename}</span>
                    <Settings className="w-2.5 h-2.5 opacity-70" />
                  </button>
                </div>
              </div>

              {/* Status indicator on the right */}
              <div className="text-right shrink-0">
                <span className="text-[10px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 block">
                  {policy.tagesbudget_tokens >= 1000
                    ? `${Math.round(policy.tagesbudget_tokens / 1000)}k`
                    : policy.tagesbudget_tokens}{' '}
                  Tokens
                </span>
                <span className="text-[9px] font-semibold text-emerald-800 block mt-0.5">
                  {policy.anbieter.nur_gruen ? '100% Grün' : 'Mischstrom'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Button: + Agent hinzufügen */}
      <div className="mt-3 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onOpenAgentBuilder}
          className="w-full py-2.5 px-3 text-xs font-bold text-slate-800 hover:text-slate-950 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 hover:border-rose-400 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs group"
        >
          <div className="w-5 h-5 rounded-md bg-white border border-slate-300 group-hover:border-rose-400 group-hover:bg-rose-50 flex items-center justify-center text-slate-700 group-hover:text-rose-700 transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </div>
          <span>+ Agent hinzufügen</span>
        </button>
      </div>
    </div>
  );
};
