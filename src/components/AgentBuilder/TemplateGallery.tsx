import React from 'react';
import { AGENT_TEMPLATES, AgentTemplate } from '../../config';
import { AgentPolicy } from '../../policies';
import { getAgentIcon } from '../Icons';
import { CheckCircle2, ArrowRight } from 'lucide-react';

interface TemplateGalleryProps {
  existingPolicies: AgentPolicy[];
  onSelectTemplate: (template: AgentTemplate) => void;
}

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  existingPolicies,
  onSelectTemplate,
}) => {
  const activeFilenames = new Set(existingPolicies.map(p => p.filename));

  return (
    <div className="space-y-4 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Fertige Vorlagen für nachhaltige Agenten
          </h3>
          <p className="text-xs text-slate-600 font-medium">
            Erprobte Richtlinien mit optimierten Eco-Cache-Regeln und Datenschutz-Voreinstellungen.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {AGENT_TEMPLATES.map(template => {
          const isAlreadyRunning = activeFilenames.has(template.filename);
          const Icon = getAgentIcon(template.icon);

          return (
            <div
              key={template.id}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                isAlreadyRunning
                  ? 'bg-slate-50/70 border-slate-200'
                  : 'bg-white border-slate-300 hover:border-rose-400 hover:shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 shadow-2xs"
                      style={{ backgroundColor: template.color }}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{template.name}</h4>
                      <span className="text-[10px] font-mono text-slate-500">{template.filename}</span>
                    </div>
                  </div>

                  {isAlreadyRunning ? (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                      Läuft schon
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                      Vorlage
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-700 font-medium mb-3 leading-relaxed">
                  {template.description}
                </p>

                <div className="space-y-1 mb-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Typische Aufgaben:
                  </span>
                  {template.tasks.slice(0, 2).map((task, i) => (
                    <div key={i} className="text-[11px] text-slate-800 flex items-center gap-1.5 font-medium truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                      <span className="truncate">{task.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600">
                  Budget: {template.dailyBudgetTokens.toLocaleString()} Tokens
                </span>
                <button
                  type="button"
                  onClick={() => onSelectTemplate(template)}
                  className="px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <span>Vorlage anpassen &amp; starten</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
