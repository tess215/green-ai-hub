import React from 'react';
import { Database, BookOpen, Globe, Cpu, ChevronRight, CheckCircle2, ShieldAlert, GitFork } from 'lucide-react';
import { PipelineExecutionResult, PipelineContextConfig } from '../chain';
import { globalEcoCache } from '../cache';
import { INITIAL_LIBRARY_ITEMS, INITIAL_WEB_SEARCH_ITEMS, INITIAL_PROVIDERS } from '../config';

interface PipelineWidgetProps {
  lastResult?: PipelineExecutionResult | null;
  contextConfig?: PipelineContextConfig;
  onOpenStation: (stationId: 'router' | 'cache' | 'library' | 'web' | 'provider') => void;
}

export const PipelineWidget: React.FC<PipelineWidgetProps> = ({
  lastResult,
  contextConfig,
  onOpenStation,
}) => {
  const cacheEntriesCount = globalEcoCache.getAll().length;
  const libraryCount = INITIAL_LIBRARY_ITEMS.length;
  const webHostsCount = INITIAL_WEB_SEARCH_ITEMS.length;
  const providersCount = INITIAL_PROVIDERS.filter(p => p.isGreen).length;

  const isCacheEnabled = contextConfig ? contextConfig.enableCache : true;
  const isLibraryEnabled = contextConfig ? contextConfig.enableLibrary : true;
  const isWebEnabled = contextConfig ? (contextConfig.enableGreenWeb && !contextConfig.localOnly) : true;
  const isProviderEnabled = contextConfig ? (contextConfig.enableExternalAI && !contextConfig.localOnly) : true;

  const routerAudit = lastResult?.stationAudits.find(a => a.stationId === 'router');

  const stations = [
    {
      id: 'router' as const,
      name: 'Agentenwahl',
      subtitle: 'Wer ist zuständig? · Wie eine Empfangsdame',
      color: '#FF6B8A',
      icon: GitFork,
      badgeText: routerAudit?.status === 'skipped' ? 'Übersprungen' : '0 Tokens · Lokal',
      enabled: true,
      hit: routerAudit?.checked && routerAudit?.status !== 'skipped',
      bgActive: 'bg-rose-50 border-[#FF6B8A] text-rose-950',
    },
    {
      id: 'cache' as const,
      name: 'Eco-Cache',
      subtitle: isCacheEnabled ? '0 Tokens · Lokal' : 'Im Kontext-Panel deaktiviert',
      color: '#3B82F6',
      icon: Database,
      badgeText: isCacheEnabled ? `${cacheEntriesCount} Einträge` : 'Deaktiviert',
      enabled: isCacheEnabled,
      hit: lastResult?.resolvedStation === 'cache',
      bgActive: 'bg-blue-50 border-blue-400 text-blue-950',
    },
    {
      id: 'library' as const,
      name: 'Teamwissen & Library',
      subtitle: isLibraryEnabled ? 'Geprüftes Firmenwissen' : 'Im Kontext-Panel deaktiviert',
      color: '#8B5CF6',
      icon: BookOpen,
      badgeText: isLibraryEnabled ? `${libraryCount} Artikel` : 'Deaktiviert',
      enabled: isLibraryEnabled,
      hit: lastResult?.resolvedStation === 'library',
      bgActive: 'bg-purple-50 border-purple-400 text-purple-950',
    },
    {
      id: 'web' as const,
      name: 'Grüne Websuche',
      subtitle: contextConfig?.localOnly
        ? 'Gesperrt (Nur lokal aktiv)'
        : isWebEnabled
        ? 'Ökostrom zertifiziert'
        : 'Im Kontext-Panel deaktiviert',
      color: '#22C55E',
      icon: Globe,
      badgeText: !isWebEnabled
        ? (contextConfig?.localOnly ? 'Nur lokal' : 'Deaktiviert')
        : `${webHostsCount} Quellen`,
      enabled: isWebEnabled,
      hit: lastResult?.resolvedStation === 'web',
      bgActive: 'bg-emerald-50 border-emerald-400 text-emerald-950',
    },
    {
      id: 'provider' as const,
      name: 'Externe KI & Green-Routing',
      subtitle: contextConfig?.localOnly
        ? 'Gesperrt (Nur lokal aktiv)'
        : isProviderEnabled
        ? 'Island / Schweden Cluster'
        : 'Im Kontext-Panel deaktiviert',
      color: '#FF6B8A',
      icon: Cpu,
      badgeText: !isProviderEnabled
        ? (contextConfig?.localOnly ? 'Nur lokal' : 'Deaktiviert')
        : `${providersCount} Grüne Cluster`,
      enabled: isProviderEnabled,
      hit: lastResult?.resolvedStation === 'provider',
      bgActive: 'bg-rose-50 border-rose-400 text-rose-950',
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs font-sans">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Kolibri Pipeline-Stationen
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            Klicke auf eine Station für Live-Statistiken &amp; Details
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {stations.map(st => {
          const Icon = st.icon;

          return (
            <button
              key={st.id}
              type="button"
              onClick={() => onOpenStation(st.id)}
              className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 group cursor-pointer ${
                !st.enabled
                  ? 'bg-slate-50 border-slate-200 opacity-60 hover:opacity-80'
                  : st.hit
                  ? `${st.bgActive} ring-1 ring-emerald-400 shadow-2xs font-bold`
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs transition-transform group-hover:scale-105 ${
                    !st.enabled ? 'grayscale opacity-70' : ''
                  }`}
                  style={{ backgroundColor: st.color }}
                >
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-slate-950">
                      {st.name}
                    </span>
                    {st.hit && st.enabled && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300 flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Treffer
                      </span>
                    )}
                    {!st.enabled && (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-300 flex items-center gap-0.5">
                        <ShieldAlert className="w-2.5 h-2.5" /> Aus
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 block">
                    {st.subtitle}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    !st.enabled
                      ? 'bg-amber-100/70 text-amber-950 border-amber-300'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {st.badgeText}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
