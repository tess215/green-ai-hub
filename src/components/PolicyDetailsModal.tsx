import React, { useState } from 'react';
import { X, Edit3, Trash2, FileText, Shield, Database, Cpu, Leaf, AlertTriangle } from 'lucide-react';
import { AgentPolicy } from '../policies';
import { PipelineContextConfig } from '../chain';
import { getAgentIcon } from './Icons';

interface PolicyDetailsModalProps {
  policy: AgentPolicy | null;
  contextConfig?: PipelineContextConfig;
  onClose: () => void;
  onEditInWizard: (policy: AgentPolicy) => void;
  onDeleteAgent: (filename: string) => void;
}

export const PolicyDetailsModal: React.FC<PolicyDetailsModalProps> = ({
  policy,
  contextConfig,
  onClose,
  onEditInWizard,
  onDeleteAgent,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!policy) return null;

  const Icon = getAgentIcon(policy.icon);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: policy.farbe || '#0F766E' }}
            >
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                Richtlinie: {policy.agent}
              </h2>
              <p className="text-xs text-slate-300 font-mono">
                richtlinien/{policy.filename}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Tasks */}
          {policy.aufgaben && policy.aufgaben.length > 0 && (
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Definierte Aufgaben ({policy.aufgaben.length}):
              </span>
              <div className="space-y-1.5">
                {policy.aufgaben.map((task, i) => (
                  <div key={i} className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-900 truncate">{task.text}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                        Häufigkeit: {task.haeufigkeit}
                      </span>
                      {task.personenbezogen === 'ja' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                          Personenbezogen
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sources and Providers Grid */}
          <div className="grid grid-cols-2 gap-2 text-slate-800">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold block uppercase mb-1">Erlaubte Quellen</span>
              <div className="space-y-0.5 font-medium text-slate-900">
                <div>Eco-Cache: {policy.quellen.cache ? '✔ Ja' : '✖ Nein'}</div>
                <div>Teamwissen: {policy.quellen.teamwissen ? '✔ Ja' : '✖ Nein'}</div>
                <div>Websuche: {policy.quellen.websuche ? '✔ Ja' : '✖ Nein'}</div>
                <div>Externe KI: {policy.quellen.externe_ki ? '✔ Ja' : '✖ Nein'}</div>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold block uppercase mb-1">Datenschutz &amp; Anbieter</span>
              <div className="space-y-0.5 font-medium text-slate-900">
                <div>Datenschutz: <strong>{policy.datenschutz?.personenbezogene_daten || 'erlaubt'}</strong></div>
                <div>Nur Ökostrom: {policy.anbieter.nur_gruen ? '✔ Ja' : '✖ Nein'}</div>
                <div>Fallback: {policy.anbieter.fallback_erlaubt ? 'Erlaubt' : 'Gesperrt'}</div>
                <div>Tagesbudget: <strong>{policy.tagesbudget_tokens.toLocaleString()} Tokens</strong></div>
              </div>
            </div>
          </div>

          {/* Current context switches (Lena Chat) */}
          {contextConfig && (
            <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200">
              <span className="text-[10px] font-bold text-rose-900 uppercase tracking-wider block mb-1.5">
                Aktive Kontext-Schalter von Lena (Chat)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-medium text-slate-800">
                <div>Eco-Cache: {contextConfig.enableCache ? '✔ Aktiv' : '✖ Aus'}</div>
                <div>Teamwissen: {contextConfig.enableLibrary ? '✔ Aktiv' : '✖ Aus'}</div>
                <div>Gespräche: {contextConfig.enableHistory ? '✔ Aktiv' : '✖ Aus'}</div>
                <div>Websuche: {contextConfig.localOnly ? '⛔ Gesperrt' : contextConfig.enableGreenWeb ? '✔ Aktiv' : '✖ Aus'}</div>
                <div>Externe KI: {contextConfig.localOnly ? '⛔ Gesperrt' : contextConfig.enableExternalAI ? '✔ Aktiv' : '✖ Aus'}</div>
                <div>Vor externer KI fragen: {contextConfig.askBeforeExternal ? '✔ Ja' : '✖ Nein'}</div>
              </div>
            </div>
          )}

          {/* Raw YAML preview */}
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Dateiquelle (YAML)
            </span>
            <pre className="p-3 bg-slate-900 text-emerald-300 font-mono text-[11px] rounded-xl overflow-x-auto max-h-40 leading-relaxed">
              {policy.rawYaml}
            </pre>
          </div>

          {/* Delete Confirmation Alert if active */}
          {confirmDelete && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl space-y-2 text-rose-950 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 font-bold text-xs text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Agent "{policy.agent}" wirklich entfernen?
              </div>
              <p className="text-[11px] text-rose-800">
                Die Richtliniendatei <strong>richtlinien/{policy.filename}</strong> wird unwiderruflich gelöscht.
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-1 text-xs text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteAgent(policy.filename);
                    onClose();
                  }}
                  className="px-3 py-1 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded cursor-pointer"
                >
                  Ja, endgültig löschen
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {!confirmDelete && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="text-xs font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Agent entfernen</span>
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => {
                onEditInWizard(policy);
                onClose();
              }}
              className="px-3.5 py-1.5 text-xs font-bold bg-white text-slate-800 hover:text-slate-950 border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-600" />
              <span>Im Assistenten bearbeiten</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
