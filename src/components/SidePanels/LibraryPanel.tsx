import React, { useState } from 'react';
import { X, BookOpen, Search, Plus, CheckCircle2, XCircle, ArrowRight, FileText, Check } from 'lucide-react';
import { INITIAL_LIBRARY_ITEMS, LibraryItem } from '../../config';
import { computeCombinedSimilarity } from '../../similarity';
import { PipelineExecutionResult } from '../../chain';

interface LibraryPanelProps {
  lastResult?: PipelineExecutionResult | null;
  onClose: () => void;
  onUseQuery: (query: string) => void;
}

export const LibraryPanel: React.FC<LibraryPanelProps> = ({ lastResult, onClose, onUseQuery }) => {
  const [activeTab, setActiveTab] = useState<'last' | 'content'>(lastResult ? 'last' : 'content');
  const [items, setItems] = useState<LibraryItem[]>(INITIAL_LIBRARY_ITEMS);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // New item form state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newQueries, setNewQueries] = useState('');
  const [newTags, setNewTags] = useState('');

  const filteredItems = items.filter(it => {
    if (!searchQuery) return true;
    const full = `${it.title} ${it.content} ${it.tags.join(' ')} ${it.queries.join(' ')}`;
    return computeCombinedSimilarity(searchQuery, full) > 0.35 || full.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const newItem: LibraryItem = {
      id: `lib-${Date.now()}`,
      title: newTitle.trim(),
      content: newContent.trim(),
      queries: newQueries.split(',').map(q => q.trim()).filter(Boolean),
      tags: newTags.split(',').map(t => t.trim()).filter(Boolean),
      tokens: Math.ceil(newContent.length / 4) + 40,
      lastUpdated: 'Gerade eben',
      author: 'Du (Team-Mitglied)',
    };

    setItems([newItem, ...items]);
    setShowAddForm(false);
    setNewTitle('');
    setNewContent('');
    setNewQueries('');
    setNewTags('');
  };

  const libAudit = lastResult?.stationAudits.find(a => a.stationId === 'library');

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[480px] bg-white border-l border-slate-300 shadow-2xl flex flex-col font-sans animate-in slide-in-from-right duration-200">
      {/* Header (Purple) */}
      <div className="bg-purple-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-700 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">Teamwissen &amp; Library</h2>
            <p className="text-[11px] text-purple-100 font-medium">
              Gepflegtes Wissen des Teams. Hilft bei ähnlichen Fragen.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-purple-200 hover:text-white p-1 rounded-lg hover:bg-purple-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 4 Stats Tiles */}
      <div className="grid grid-cols-4 gap-2 p-3 bg-purple-50 border-b border-purple-100 text-center">
        <div className="bg-white p-2 rounded-lg border border-purple-200">
          <span className="text-[10px] text-slate-600 font-bold block uppercase">Artikel</span>
          <span className="text-sm font-bold text-slate-900">{items.length}</span>
        </div>
        <div className="bg-white p-2 rounded-lg border border-purple-200">
          <span className="text-[10px] text-slate-600 font-bold block uppercase">Themen</span>
          <span className="text-sm font-bold text-purple-700">12</span>
        </div>
        <div className="bg-white p-2 rounded-lg border border-purple-200">
          <span className="text-[10px] text-slate-600 font-bold block uppercase">Tokens gespart</span>
          <span className="text-sm font-bold text-emerald-700">+1.480</span>
        </div>
        <div className="bg-white p-2 rounded-lg border border-purple-200">
          <span className="text-[10px] text-slate-600 font-bold block uppercase">Aktuell</span>
          <span className="text-xs font-bold text-slate-900">Heute</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50">
        <button
          type="button"
          onClick={() => setActiveTab('last')}
          className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition-colors cursor-pointer ${
            activeTab === 'last'
              ? 'border-purple-600 text-purple-800 bg-white'
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
              ? 'border-purple-600 text-purple-800 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Inhalt ({items.length})
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

                <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                  libAudit?.status === 'hit'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}>
                  {libAudit?.status === 'hit' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="text-xs font-bold mb-1">
                      {libAudit?.status === 'hit' ? 'Treffer im Teamwissen' : 'Kein Treffer'}
                    </h4>
                    <p className="text-xs font-medium leading-relaxed">
                      {libAudit?.summary}
                    </p>
                  </div>
                </div>

                {libAudit?.details?.item && (
                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-950">
                    <span className="text-[10px] font-bold uppercase block mb-1">Genutzter Wissensartikel</span>
                    <h4 className="font-bold text-xs text-purple-950">{libAudit.details.item.title}</h4>
                    <p className="text-xs text-slate-800 font-medium mt-1.5 leading-relaxed bg-white p-2.5 rounded border border-purple-200">
                      {libAudit.details.item.content}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-purple-800 font-bold mt-2">
                      <span>Autor: {libAudit.details.item.author}</span>
                      <span>Ähnlichkeit: {libAudit.details.percentage}%</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-6 text-center text-slate-500">
                <BookOpen className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-medium text-xs">Noch keine Anfrage ausgeführt.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'content' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Teamwissen durchsuchen..."
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Neuer Eintrag</span>
              </button>
            </div>

            {/* New entry form */}
            {showAddForm && (
              <form onSubmit={handleAddItem} className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 space-y-2.5">
                <h4 className="text-xs font-bold text-purple-950">Neuen Wissensartikel anlegen</h4>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Titel (z.B. Urlaubsantrag Fristen)"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900"
                />
                <textarea
                  required
                  rows={3}
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  placeholder="Inhaltliche Antwort oder Richtlinie..."
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900"
                />
                <input
                  type="text"
                  value={newQueries}
                  onChange={e => setNewQueries(e.target.value)}
                  placeholder="Beispielfragen (Komma-getrennt)"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-2.5 py-1 text-xs text-slate-700 hover:bg-purple-100 rounded"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded"
                  >
                    Speichern
                  </button>
                </div>
              </form>
            )}

            {/* List of articles */}
            <div className="space-y-3">
              {filteredItems.map(item => (
                <div key={item.id} className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs hover:border-purple-300 transition-colors">
                  <h4 className="font-bold text-slate-900 text-xs mb-1">{item.title}</h4>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed mb-2.5">
                    {item.content}
                  </p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {item.tags.map((t, idx) => (
                      <span key={idx} className="text-[10px] font-semibold bg-purple-50 text-purple-800 px-1.5 py-0.5 rounded border border-purple-200">
                        #{t}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-100 font-medium">
                    <span>{item.author} · {item.lastUpdated}</span>
                    {item.queries.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          onUseQuery(item.queries[0]);
                          onClose();
                        }}
                        className="text-purple-700 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        Beispielfrage nutzen <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    )}
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
