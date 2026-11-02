import React, { useState } from 'react';
import { X, Database, Search, CheckCircle2, XCircle, ArrowRight, Sparkles } from 'lucide-react';
import { globalEcoCache, CacheEntry, CacheStats } from '../../cache';
import { computeCombinedSimilarity } from '../../similarity';
import { PipelineExecutionResult } from '../../chain';

interface EcoCachePanelProps {
  lastResult?: PipelineExecutionResult | null;
  onClose: () => void;
  onUseQuery: (query: string) => void;
}

export const EcoCachePanel: React.FC<EcoCachePanelProps> = ({ lastResult, onClose, onUseQuery }) => {
  const [activeTab, setActiveTab] = useState<'last' | 'content'>(lastResult ? 'last' : 'content');
  const [searchQuery, setSearchQuery] = useState('');
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<any>(null);

  const entries = globalEcoCache.getAll();
  const stats: CacheStats = globalEcoCache.getStats();

  // Filter entries in "Inhalt" tab
  const filteredEntries = entries.filter(e => {
    if (!searchQuery) return true;
    const s = computeCombinedSimilarity(searchQuery, `${e.originalQuery} ${e.answer}`);
    return s > 0.4 || e.originalQuery.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleTest = () => {
    if (!testInput.trim()) return;
    const res = globalEcoCache.checkCache(testInput.trim(), 0.75);
    setTestResult(res);
  };

  const cacheAudit = lastResult?.stationAudits.find(a => a.stationId === 'cache');

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[480px] bg-white border-l border-slate-300 shadow-2xl flex flex-col font-sans animate-in slide-in-from-right duration-200">
      {/* Header (Blue) */}
      <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center">
            <Database className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">Eco-Cache</h2>
            <p className="text-[11px] text-blue-100 font-medium">
              Automatisch gespeicherte Antworten. Hilft bei gleichen Fragen.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-blue-200 hover:text-white p-1 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 4 Stats Tiles */}
      <div className="grid grid-cols-4 gap-2 p-3 bg-blue-50 border-b border-blue-100 text-center">
        <div className="bg-white p-2 rounded-lg border border-blue-200">
          <span className="text-[10px] text-slate-600 font-bold block uppercase">Einträge</span>
          <span className="text-sm font-bold text-slate-900">{stats.totalEntries}</span>
        </div>
        <div className="bg-white p-2 rounded-lg border border-blue-200">
          <span className="text-[10px] text-slate-600 font-bold block uppercase">Treffer</span>
          <span className="text-sm font-bold text-blue-700">{stats.totalHits}</span>
        </div>
        <div className="bg-white p-2 rounded-lg border border-blue-200">
          <span className="text-[10px] text-slate-600 font-bold block uppercase">Tokens gespart</span>
          <span className="text-sm font-bold text-emerald-700">+{stats.totalTokensSaved}</span>
        </div>
        <div className="bg-white p-2 rounded-lg border border-blue-200">
          <span className="text-[10px] text-slate-600 font-bold block uppercase">Trefferquote</span>
          <span className="text-sm font-bold text-slate-900">{Math.round(stats.hitRatio * 100)}%</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50">
        <button
          type="button"
          onClick={() => setActiveTab('last')}
          className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition-colors cursor-pointer ${
            activeTab === 'last'
              ? 'border-blue-600 text-blue-800 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Letzte Anfrage
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('content')}
          className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition-colors cursor-pointer ${
            activeTab === 'content'
              ? 'border-blue-600 text-blue-800 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Inhalt ({entries.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {activeTab === 'last' && (
          <div className="space-y-3">
            {lastResult ? (
              <>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Deine Frage</span>
                  <p className="text-xs font-bold text-slate-900">"{lastResult.query}"</p>
                </div>

                {cacheAudit?.details?.normalized && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Normalisiert</span>
                    <code className="text-xs font-mono text-slate-800 block break-all">
                      {cacheAudit.details.normalized}
                    </code>
                  </div>
                )}

                {cacheAudit?.details?.fingerprint && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Fingerprint</span>
                      <code className="text-xs font-mono font-bold text-blue-700">{cacheAudit.details.fingerprint}</code>
                    </div>
                    <span className="text-[10px] text-slate-500">Deterministischer Hash</span>
                  </div>
                )}

                {/* Big Result Badge */}
                <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                  cacheAudit?.status === 'hit'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}>
                  {cacheAudit?.status === 'hit' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="text-xs font-bold mb-1">
                      {cacheAudit?.status === 'hit' ? 'Treffer im Eco-Cache' : 'Kein Treffer'}
                    </h4>
                    <p className="text-xs font-medium leading-relaxed">
                      {cacheAudit?.summary}
                    </p>
                  </div>
                </div>

                {cacheAudit?.details?.closest && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950">
                    <span className="text-[10px] font-bold uppercase block mb-1">Ähnlichster Eintrag im Cache</span>
                    <p className="font-semibold text-xs">"{cacheAudit.details.closest.query}"</p>
                    <span className="text-[11px] font-bold text-amber-800 mt-1 block">
                      {Math.round(cacheAudit.details.closest.similarity * 100)} % Ähnlichkeit (unter Schwelle 75%)
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="p-6 text-center text-slate-500">
                <Database className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-medium text-xs">Noch keine Anfrage ausgeführt.</p>
                <p className="text-[11px] mt-1">Stelle eine Frage im Chat, um die Pipeline-Station live zu analysieren.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'content' && (
          <div className="space-y-4">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cache nach Stichwort oder Frage durchsuchen..."
                className="w-full pl-9 pr-3 py-2 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Test field */}
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200">
              <span className="text-xs font-bold text-blue-950 block mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-700" />
                Frage gegen Cache testen:
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testInput}
                  onChange={e => setTestInput(e.target.value)}
                  placeholder="Testfrage eintippen..."
                  className="flex-1 px-2.5 py-1.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleTest}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Prüfen
                </button>
              </div>

              {testResult && (
                <div className="mt-2 p-2 rounded bg-white border border-blue-200 text-[11px]">
                  {testResult.hit ? (
                    <span className="text-emerald-800 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Treffer ({Math.round(testResult.similarity * 100)}%): "{testResult.entry?.originalQuery}"
                    </span>
                  ) : (
                    <span className="text-slate-700">
                      Kein Treffer. {testResult.closestNonMatch ? `Nächster: ${Math.round(testResult.closestNonMatch.similarity * 100)}%` : ''}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* List of Entries */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Gespeicherte Einträge ({filteredEntries.length})
              </span>

              {filteredEntries.map(entry => (
                <div
                  key={entry.id}
                  className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-bold text-slate-900 text-xs">
                      "{entry.originalQuery}"
                    </p>
                    <span className="text-[10px] font-mono bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200 shrink-0">
                      {entry.fingerprint}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 line-clamp-2 mb-2 font-medium">
                    {entry.answer}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-100">
                    <span>{entry.hitCount}x aufgerufen · {entry.tokensSaved} Tokens/Aufruf</span>
                    <button
                      type="button"
                      onClick={() => {
                        onUseQuery(entry.originalQuery);
                        onClose();
                      }}
                      className="text-blue-700 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      Im Chat fragen <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
