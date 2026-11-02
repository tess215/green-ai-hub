import React from 'react';
import { Leaf, RefreshCw, Sparkles, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  useMockMode: boolean;
  onToggleMockMode: (val: boolean) => void;
  onResetDemo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  useMockMode,
  onToggleMockMode,
  onResetDemo,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3.5 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-white shadow-sm shadow-rose-200">
            <span className="font-bold text-xl tracking-tight">K</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Kolibri</h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1 border border-emerald-300">
                <Leaf className="w-3 h-3 text-emerald-700" /> 100% Green AI
              </span>
            </div>
            <p className="text-xs text-slate-700 font-medium">
              Ressourcensparende Pipeline · Eco-Cache &amp; Teamwissen vor externer KI
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Mode Switch */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-300">
            <button
              type="button"
              onClick={() => onToggleMockMode(false)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                !useMockMode
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-300'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
              title="Nutzt Gemini über Server-Proxy (mit automatischem Fallback)"
            >
              <Sparkles className={`w-3.5 h-3.5 ${!useMockMode ? 'text-rose-600' : 'text-slate-500'}`} />
              Gemini Live
            </button>
            <button
              type="button"
              onClick={() => onToggleMockMode(true)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                useMockMode
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-300'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
              title="100% offline-fähig mit lokalem MockAdapter"
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${useMockMode ? 'text-emerald-700' : 'text-slate-500'}`} />
              Mock-Modus (Offline)
            </button>
          </div>

          {/* Reset Demo Button */}
          <button
            type="button"
            onClick={onResetDemo}
            className="px-3.5 py-1.5 text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 hover:text-slate-900 border border-slate-300 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
            title="Setzt Cache, Testdaten und Agenten auf Anfangszustand zurück"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
            Demo zurücksetzen
          </button>
        </div>
      </div>
    </header>
  );
};
