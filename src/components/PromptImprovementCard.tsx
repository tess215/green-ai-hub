import React from 'react';
import { Check, X, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { CacheEntry } from '../cache';

interface PromptImprovementCardProps {
  originalText: string;
  improvedText: string;
  tokensUsed: number;
  matchedCacheEntry?: CacheEntry | null;
  matchPercentage?: number;
  matchPhase?: 'initial' | 'after_improvement';
  statusMessage?: string;
  onApply: (newText: string) => void;
  onShowDirectAnswer?: (entry: CacheEntry) => void;
  onDismiss: () => void;
}

export const PromptImprovementCard: React.FC<PromptImprovementCardProps> = ({
  originalText,
  improvedText,
  tokensUsed,
  matchedCacheEntry,
  matchPercentage,
  matchPhase,
  statusMessage,
  onApply,
  onShowDirectAnswer,
  onDismiss,
}) => {
  // Compute word difference for visualization (green underline for altered words, bold for additions)
  const origWords = originalText.trim().split(/\s+/);
  const impWords = improvedText.trim().split(/\s+/);

  return (
    <div className="mb-3 p-4 rounded-xl border border-rose-200 bg-rose-50/60 shadow-xs animate-in fade-in duration-200">
      {/* Header status */}
      <div className="flex items-center justify-between gap-2 pb-2 mb-3 border-b border-rose-200/80">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-rose-600" />
          <span className="text-xs font-bold text-slate-900">
            Prompt-Verbesserung
          </span>
          {statusMessage && (
            <span className="text-xs text-slate-700 font-medium">
              · {statusMessage}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-slate-600 hover:text-slate-950 p-1 rounded-md hover:bg-rose-100 transition-colors"
          title="Schließen"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Special Banner if matched in Eco-Cache */}
      {matchedCacheEntry && (
        <div className="mb-3 p-3 rounded-lg bg-emerald-50 border border-emerald-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-emerald-950">
                {matchPhase === 'after_improvement'
                  ? 'Mit der korrigierten Fassung im Eco-Cache gefunden!'
                  : `Schon beantwortet (${matchPercentage || 82}% Ähnlichkeit)`}
              </p>
              <p className="text-xs text-slate-800 font-medium mt-0.5">
                "{matchedCacheEntry.originalQuery}"
              </p>
            </div>
          </div>
          {onShowDirectAnswer && (
            <button
              type="button"
              onClick={() => onShowDirectAnswer(matchedCacheEntry)}
              className="shrink-0 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              Antwort sofort anzeigen (0 Tokens)
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Text comparison */}
      <div className="space-y-2 mb-3">
        <div>
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
            Dein Text:
          </span>
          <p className="text-xs text-slate-800 bg-white p-2.5 rounded-lg border border-slate-300 font-medium">
            {originalText}
          </p>
        </div>

        <div>
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
            Vorschlag (präzisiert):
          </span>
          <div className="text-xs text-slate-950 bg-white p-2.5 rounded-lg border border-emerald-300 font-medium leading-relaxed">
            {impWords.map((word, i) => {
              const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'„“]/g, '').toLowerCase();
              const isOld = origWords.some(w => w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'„“]/g, '').toLowerCase() === cleanWord);

              if (!isOld) {
                return (
                  <span key={i} className="font-bold text-emerald-950 bg-emerald-100/70 px-1 py-0.5 rounded mx-0.5">
                    {word}{' '}
                  </span>
                );
              }

              return (
                <span key={i} className="underline decoration-emerald-500 decoration-2 underline-offset-2">
                  {word}{' '}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer bar with token count & buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-rose-200">
        <span className="text-xs font-bold text-slate-700">
          Verbesserung: ca. {tokensUsed} Tokens genutzt
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-950 hover:bg-rose-100 rounded-lg transition-colors"
          >
            Verwerfen
          </button>
          <button
            type="button"
            onClick={() => onApply(improvedText)}
            className="px-3.5 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            Übernehmen
          </button>
        </div>
      </div>
    </div>
  );
};
