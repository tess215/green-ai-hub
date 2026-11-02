import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Leaf,
  SlidersHorizontal,
  ChevronDown,
  Check,
} from 'lucide-react';
import { globalEcoCache, CacheEntry } from '../cache';
import { TaskType, PipelineContextConfig } from '../chain';
import { ContextPanel } from './ContextPanel';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  onRequestImprovement: (text: string) => void;
  onDirectAnswerFromCache: (entry: CacheEntry) => void;
  disabled?: boolean;
  isImproving?: boolean;
  externalText?: string;
  taskType: TaskType;
  onTaskTypeChange: (type: TaskType) => void;
  contextConfig: PipelineContextConfig;
  onContextConfigChange: (config: PipelineContextConfig) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onRequestImprovement,
  onDirectAnswerFromCache,
  disabled,
  isImproving,
  externalText,
  taskType,
  onTaskTypeChange,
  contextConfig,
  onContextConfigChange,
}) => {
  const [text, setText] = useState('');
  const [liveCacheMatch, setLiveCacheMatch] = useState<{
    entry: CacheEntry;
    similarity: number;
    percentage: number;
  } | null>(null);

  const [isTaskPopoverOpen, setIsTaskPopoverOpen] = useState(false);
  const [isContextOpen, setIsContextOpen] = useState(false);

  const taskPopoverRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (externalText !== undefined) {
      setText(externalText);
    }
  }, [externalText]);

  // Click outside to close Task Popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (taskPopoverRef.current && !taskPopoverRef.current.contains(e.target as Node)) {
        setIsTaskPopoverOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsTaskPopoverOpen(false);
      }
    };
    if (isTaskPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isTaskPopoverOpen]);

  // Live-Hinweis beim Tippen (400ms debounce)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (text.trim().length < 6) {
      setLiveCacheMatch(null);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      const check = globalEcoCache.checkCache(text.trim(), 0.75);
      if (check.hit && check.entry) {
        setLiveCacheMatch({
          entry: check.entry,
          similarity: check.similarity || 0.8,
          percentage: Math.round((check.similarity || 0.8) * 100),
        });
      } else {
        setLiveCacheMatch(null);
      }
    }, 400);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [text]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || disabled) return;
    onSendMessage(text.trim());
    setText('');
    setLiveCacheMatch(null);
    setIsTaskPopoverOpen(false);
    setIsContextOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const renderTaskIcon = () => {
    if (taskType === 'quick') {
      return <Leaf className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600 shrink-0" />;
    }
    if (taskType === 'daily') {
      return (
        <div className="flex items-center -space-x-1 shrink-0">
          <Leaf className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
          <Leaf className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
        </div>
      );
    }
    return (
      <div className="flex items-center -space-x-1 shrink-0">
        <Leaf className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
        <Leaf className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
        <Leaf className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
      </div>
    );
  };

  const getTaskLabel = () => {
    if (taskType === 'quick') return 'Schnelle Antwort';
    if (taskType === 'daily') return 'Alltagsaufgabe';
    return 'Große Aufgabe';
  };

  const getContextSummary = () => {
    if (contextConfig.localOnly) {
      return 'Nur lokal';
    }
    let active = 0;
    if (contextConfig.enableCache) active++;
    if (contextConfig.enableLibrary) active++;
    if (contextConfig.enableHistory) active++;
    if (contextConfig.enableGreenWeb) active++;
    if (contextConfig.enableExternalAI) active++;
    return `${active}/5 · ${contextConfig.askBeforeExternal ? 'Rückfrage an' : 'Direkt'}`;
  };

  return (
    <div className="relative bg-white rounded-2xl border border-slate-300 shadow-sm focus-within:border-rose-400 focus-within:ring-2 focus-within:ring-rose-200 transition-all">
      {/* Context Panel Modal (opens over the input field) */}
      {isContextOpen && (
        <ContextPanel
          config={contextConfig}
          onChange={onContextConfigChange}
          onClose={() => setIsContextOpen(false)}
        />
      )}

      {/* Task Type Popover */}
      {isTaskPopoverOpen && (
        <div
          ref={taskPopoverRef}
          className="absolute bottom-full mb-2 left-3 z-40 bg-white rounded-xl border border-slate-300 shadow-xl w-72 overflow-hidden animate-in fade-in zoom-in-95 font-sans"
        >
          <div className="divide-y divide-slate-100">
            {/* Row 1: Schnelle Antwort */}
            <button
              type="button"
              onClick={() => {
                onTaskTypeChange('quick');
                setIsTaskPopoverOpen(false);
              }}
              title="In echt: Kolibri, kleines effizientes Modell"
              className={`w-full p-3 text-left transition-colors flex items-center justify-between gap-2 hover:bg-slate-50 cursor-pointer ${
                taskType === 'quick' ? 'bg-rose-50/70 font-bold' : ''
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <Leaf className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                  <span>Schnelle Antwort</span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                  Kurze Frage, kleines Modell
                </p>
              </div>
              {taskType === 'quick' && <Check className="w-4 h-4 text-rose-600" />}
            </button>

            {/* Row 2: Alltagsaufgabe */}
            <button
              type="button"
              onClick={() => {
                onTaskTypeChange('daily');
                setIsTaskPopoverOpen(false);
              }}
              title="In echt: Kolibri, mittleres Modell"
              className={`w-full p-3 text-left transition-colors flex items-center justify-between gap-2 hover:bg-slate-50 cursor-pointer ${
                taskType === 'daily' ? 'bg-rose-50/70 font-bold' : ''
              }`}
            >
              <div>
                <div className="flex items-center gap-1 text-xs font-bold text-slate-900">
                  <div className="flex items-center -space-x-1">
                    <Leaf className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                    <Leaf className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                  </div>
                  <span>Alltagsaufgabe</span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                  Normale Aufgabe, mittleres Modell
                </p>
              </div>
              {taskType === 'daily' && <Check className="w-4 h-4 text-rose-600" />}
            </button>

            {/* Row 3: Große Aufgabe */}
            <button
              type="button"
              onClick={() => {
                onTaskTypeChange('complex');
                setIsTaskPopoverOpen(false);
              }}
              title="In echt: Kolibri, großes Modell mit Vorab-Planung"
              className={`w-full p-3 text-left transition-colors flex items-center justify-between gap-2 hover:bg-slate-50 cursor-pointer ${
                taskType === 'complex' ? 'bg-amber-50/70 font-bold' : ''
              }`}
            >
              <div>
                <div className="flex items-center gap-1 text-xs font-bold text-slate-900">
                  <div className="flex items-center -space-x-1">
                    <Leaf className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <Leaf className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <Leaf className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  </div>
                  <span>Große Aufgabe</span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                  Komplexe Aufgabe, mit Plan vorab
                </p>
              </div>
              {taskType === 'complex' && <Check className="w-4 h-4 text-amber-600" />}
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-3">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Stell eine Frage oder gib eine Aufgabe ein … (z. B. 'Wie lauten die Reiserichtlinien für die Bahn?')"
          rows={3}
          disabled={disabled}
          className="w-full resize-none border-none outline-none text-sm font-medium text-slate-900 placeholder:text-slate-500 bg-transparent leading-relaxed"
        />

        {/* Lower Toolbar: von links nach rechts */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* 1. Button Aufgabenwahl */}
            <button
              type="button"
              onClick={() => {
                setIsTaskPopoverOpen(!isTaskPopoverOpen);
                setIsContextOpen(false);
              }}
              title={
                taskType === 'quick'
                  ? 'Schnelle Antwort (In echt: Kolibri, kleines Modell)'
                  : taskType === 'daily'
                  ? 'Alltagsaufgabe (In echt: Kolibri, mittleres Modell)'
                  : 'Große Aufgabe (In echt: Kolibri, großes Modell mit Vorab-Planung)'
              }
              className="px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs"
            >
              {renderTaskIcon()}
              <span className="hidden sm:inline">{getTaskLabel()}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {/* 2. Button Kontext */}
            <button
              type="button"
              onClick={() => {
                setIsContextOpen(!isContextOpen);
                setIsTaskPopoverOpen(false);
              }}
              title="Kontext steuern & Grenzen anpassen"
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer border shadow-2xs ${
                contextConfig.localOnly
                  ? 'bg-amber-50 text-amber-950 border-amber-300'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-300'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-700" />
              <span className="hidden sm:inline">Kontext</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white text-slate-700 border border-slate-200">
                {getContextSummary()}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {/* 3. Button Prompt verbessern */}
            <button
              type="button"
              onClick={() => onRequestImprovement(text)}
              disabled={!text.trim() || isImproving || disabled}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                text.trim() && !isImproving && !disabled
                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                  : 'text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed'
              }`}
              title="Prompt verbessern: Prüft Cache & optimiert Formulierung"
            >
              {isImproving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                  <span className="hidden sm:inline">Prüfe Prompt...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                  <span className="hidden sm:inline">Prompt verbessern</span>
                </>
              )}
            </button>
          </div>

          {/* 4. Rechts: Enter zum Senden + Senden Button */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-600 hidden md:inline">
              Enter zum Senden ↵
            </span>
            <button
              type="submit"
              disabled={!text.trim() || disabled}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs ${
                text.trim() && !disabled
                  ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer'
                  : 'bg-slate-200 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>Senden</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </form>

      {/* Live-Hinweis beim Tippen (ohne KI, Ähnlichkeits-Check >= 75%) */}
      {liveCacheMatch && (
        <div className="px-4 py-2.5 bg-emerald-50/90 border-t border-emerald-200 rounded-b-2xl flex flex-wrap items-center justify-between gap-2 text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="text-slate-900 font-medium">
              Ähnliche Frage schon beantwortet:{' '}
              <strong className="text-emerald-950 font-bold">"{liveCacheMatch.entry.originalQuery}"</strong> ·{' '}
              <span className="text-emerald-800 font-bold">0 Tokens</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => onDirectAnswerFromCache(liveCacheMatch.entry)}
            className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline flex items-center gap-1 cursor-pointer"
          >
            Antwort sofort anzeigen
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
