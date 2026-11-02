import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, User } from 'lucide-react';
import { PromptChip, SIMULATED_USER_HISTORY } from '../config';

interface PromptChipsProps {
  chips: PromptChip[];
  onSelectPrompt: (promptText: string) => void;
}

export const PromptChips: React.FC<PromptChipsProps> = ({ chips, onSelectPrompt }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="mb-3 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden transition-all">
      {/* Header with collapse/expand toggle */}
      <div className="px-4 py-2.5 flex items-center justify-between bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-rose-600" />
          <span className="text-xs font-bold text-slate-900 tracking-wide uppercase">
            Für dich vorbereitet
          </span>
          <span className="text-xs text-slate-600 font-medium">
            · Profil: {SIMULATED_USER_HISTORY.userName}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs font-semibold text-slate-700 hover:text-slate-950 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-200/60 transition-colors"
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Vorschläge einklappen' : 'Vorschläge ausklappen'}
        >
          <span>{isOpen ? 'Einklappen' : 'Ausklappen (4)'}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isOpen && (
        <div className="p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {chips.map(chip => (
              <button
                key={chip.id}
                type="button"
                onClick={() => onSelectPrompt(chip.prompt)}
                className="text-left p-2.5 rounded-lg border border-slate-300 hover:border-rose-400 bg-white hover:bg-rose-50/40 transition-all group focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-2xs"
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-xs font-bold text-slate-900 group-hover:text-rose-700 leading-snug">
                    {chip.title}
                  </span>
                  <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">
                    {chip.category}
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-700 leading-tight">
                  {chip.reason}
                </p>
              </button>
            ))}
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-700">
            <span className="flex items-center gap-1 font-medium">
              <User className="w-3.5 h-3.5 text-slate-500" />
              {SIMULATED_USER_HISTORY.notes}
            </span>
            <span className="font-semibold text-slate-800">
              Historische Cache-Quote: {SIMULATED_USER_HISTORY.cacheHitRatio}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
