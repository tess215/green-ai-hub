import React, { useState, useRef, useEffect } from 'react';
import { Bot, ChevronDown, Check, Sparkles } from 'lucide-react';
import { AgentPolicy } from '../policies';
import { getAgentIcon } from './Icons';

interface AgentChipProps {
  selectedAgent: AgentPolicy | null;
  isLearned?: boolean;
  allPolicies: AgentPolicy[];
  onChangeAgent: (newAgent: AgentPolicy | null) => void;
}

export const AgentChip: React.FC<AgentChipProps> = ({
  selectedAgent,
  isLearned = false,
  allPolicies,
  onChangeAgent,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const Icon = selectedAgent ? getAgentIcon(selectedAgent.icon) : Bot;
  const agentColor = selectedAgent?.farbe || '#475569';
  const agentName = selectedAgent ? selectedAgent.agent : 'Allgemeiner Assistent';

  return (
    <div className="relative inline-block font-sans" ref={dropdownRef}>
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border shadow-2xs transition-all animate-in fade-in"
        style={{
          backgroundColor: selectedAgent ? `${agentColor}12` : '#f1f5f9',
          borderColor: selectedAgent ? `${agentColor}40` : '#cbd5e1',
          color: selectedAgent ? agentColor : '#0f172a',
        }}
      >
        <div
          className="w-4 h-4 rounded-full flex items-center justify-center text-white shrink-0"
          style={{ backgroundColor: agentColor }}
        >
          <Icon className="w-2.5 h-2.5 text-white" />
        </div>

        <span className="font-bold">
          {agentName} übernimmt
          {isLearned && (
            <span className="ml-1 px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[10px]">
              gelernt
            </span>
          )}
        </span>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs font-semibold underline hover:opacity-80 flex items-center gap-0.5 cursor-pointer ml-1"
          style={{ color: selectedAgent ? agentColor : '#334155' }}
        >
          <span>ändern</span>
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {/* Dropdown Menu to switch Agent */}
      {isOpen && (
        <div className="absolute left-0 bottom-full mb-2 z-50 w-64 bg-white rounded-xl border border-slate-300 shadow-xl overflow-hidden font-sans animate-in fade-in zoom-in-95">
          <div className="p-2.5 bg-slate-50 border-b border-slate-200">
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
              Agent manuell auswählen
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 p-1">
            {/* Allgemeiner Assistent Option */}
            <button
              type="button"
              onClick={() => {
                onChangeAgent(null);
                setIsOpen(false);
              }}
              className={`w-full p-2 rounded-lg text-left text-xs font-bold transition-colors flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-100 ${
                !selectedAgent ? 'bg-slate-100 text-slate-900' : 'text-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-slate-700 text-white flex items-center justify-center shrink-0">
                  <Bot className="w-3 h-3 text-white" />
                </div>
                <div>
                  <span className="block font-bold">Allgemeiner Assistent</span>
                  <span className="block text-[10px] text-slate-500 font-normal">Keine Spezialisierung</span>
                </div>
              </div>
              {!selectedAgent && <Check className="w-4 h-4 text-emerald-600" />}
            </button>

            {/* List of custom Agents */}
            {allPolicies.map(policy => {
              const PolIcon = getAgentIcon(policy.icon);
              const isSelected = selectedAgent?.filename === policy.filename;
              return (
                <button
                  key={policy.filename}
                  type="button"
                  onClick={() => {
                    onChangeAgent(policy);
                    setIsOpen(false);
                  }}
                  className={`w-full p-2 rounded-lg text-left text-xs font-bold transition-colors flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-100 ${
                    isSelected ? 'bg-rose-50 text-rose-950' : 'text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <div
                      className="w-5 h-5 rounded-md text-white flex items-center justify-center shrink-0"
                      style={{ backgroundColor: policy.farbe || '#0F766E' }}
                    >
                      <PolIcon className="w-3 h-3 text-white" />
                    </div>
                    <div className="truncate">
                      <span className="block font-bold truncate">{policy.agent}</span>
                      <span className="block text-[10px] text-slate-500 font-mono truncate">
                        {policy.filename}
                      </span>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-rose-600" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
