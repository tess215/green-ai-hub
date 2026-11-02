import React, { useState, useEffect } from 'react';
import { AgentPolicy, serializePolicyToYaml, parseAndValidatePolicyYaml } from '../../policies';
import { AgentTask } from '../../config';
import { getAgentIcon, Plus, Trash2, ArrowRight, ArrowLeft, Check, Sparkles, Shield, Cpu, Database } from '../Icons';

interface AgentWizardProps {
  initialPolicy?: Partial<AgentPolicy>;
  onComplete: (policy: AgentPolicy, yamlContent: string) => void;
  onCancel: () => void;
}

const AVAILABLE_ICONS = [
  'roboter',
  'rechnung',
  'kopfhoerer',
  'kalender',
  'code',
  'aktentasche',
  'megafon',
  'suche',
];

const PRESET_COLORS = [
  '#0F766E', // Teal
  '#1D4ED8', // Blue
  '#7E22CE', // Purple
  '#BE123C', // Rose/Red
  '#0EA5E9', // Sky
  '#D97706', // Amber
  '#059669', // Emerald
  '#4338CA', // Indigo
];

export const AgentWizard: React.FC<AgentWizardProps> = ({
  initialPolicy,
  onComplete,
  onCancel,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form states
  const [name, setName] = useState(initialPolicy?.agent || 'Projekt-Agent');
  const [icon, setIcon] = useState(initialPolicy?.icon || 'roboter');
  const [color, setColor] = useState(initialPolicy?.farbe || '#0F766E');

  const [tasks, setTasks] = useState<AgentTask[]>(
    initialPolicy?.aufgaben && initialPolicy.aufgaben.length > 0
      ? initialPolicy.aufgaben
      : [
          { text: 'Eingehende Projekt-Tickets strukturieren', haeufigkeit: 'hoch', personenbezogen: 'nein' },
          { text: 'Wöchentlichen Statusbericht entwerfen', haeufigkeit: 'mittel', personenbezogen: 'nein' },
        ]
  );

  const [sources, setSources] = useState({
    cache: initialPolicy?.quellen?.cache ?? true,
    teamwissen: initialPolicy?.quellen?.teamwissen ?? true,
    websuche: initialPolicy?.quellen?.websuche ?? false,
    externe_ki: initialPolicy?.quellen?.externe_ki ?? true,
  });

  const [privacy, setPrivacy] = useState<'nur_lokal' | 'eigener_server' | 'erlaubt'>(
    initialPolicy?.datenschutz?.personenbezogene_daten || 'nur_lokal'
  );

  const [provider, setProvider] = useState({
    nur_gruen: initialPolicy?.anbieter?.nur_gruen ?? true,
    fallback_erlaubt: initialPolicy?.anbieter?.fallback_erlaubt ?? false,
  });

  const [dailyBudget, setDailyBudget] = useState(initialPolicy?.tagesbudget_tokens || 15000);

  // Live YAML string
  const [yamlCode, setYamlCode] = useState('');
  const [yamlError, setYamlError] = useState<string | null>(null);

  // Synchronize Form -> YAML
  useEffect(() => {
    const policyObj: Partial<AgentPolicy> = {
      agent: name,
      icon,
      farbe: color,
      aufgaben: tasks,
      quellen: sources,
      datenschutz: { personenbezogene_daten: privacy },
      anbieter: provider,
      tagesbudget_tokens: dailyBudget,
    };
    const generated = serializePolicyToYaml(policyObj);
    setYamlCode(generated);
  }, [name, icon, color, tasks, sources, privacy, provider, dailyBudget]);

  const handleYamlChange = (newCode: string) => {
    setYamlCode(newCode);
    try {
      const parsed = parseAndValidatePolicyYaml(newCode);
      setName(parsed.agent);
      if (parsed.icon) setIcon(parsed.icon);
      if (parsed.farbe) setColor(parsed.farbe);
      if (parsed.aufgaben) setTasks(parsed.aufgaben);
      setSources(parsed.quellen);
      if (parsed.datenschutz?.personenbezogene_daten) {
        setPrivacy(parsed.datenschutz.personenbezogene_daten);
      }
      setProvider(parsed.anbieter);
      setDailyBudget(parsed.tagesbudget_tokens);
      setYamlError(null);
    } catch (e: any) {
      setYamlError('YAML-Syntaxfehler: Bitte Format prüfen');
    }
  };

  const addTask = () => {
    setTasks([...tasks, { text: '', haeufigkeit: 'mittel', personenbezogen: 'nein' }]);
  };

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const updateTask = (index: number, field: keyof AgentTask, val: any) => {
    const updated = [...tasks];
    updated[index] = { ...updated[index], [field]: val };
    setTasks(updated);
  };

  const handleFinish = () => {
    const filename = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.yaml`;
    const finalPolicy = parseAndValidatePolicyYaml(yamlCode, filename);
    onComplete(finalPolicy, yamlCode);
  };

  const CurrentIcon = getAgentIcon(icon);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">
      {/* Left Column: 4-Step Interactive Form */}
      <div className="lg:col-span-7 space-y-4">
        {/* Step progress bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStep(s as any)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                  step === s
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : s < step
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {s < step ? '✔' : s}
              </button>
            ))}
            <span className="text-xs font-bold text-slate-800 ml-2">
              {step === 1 && 'Schritt 1: Basisdaten'}
              {step === 2 && 'Schritt 2: Aufgaben & Häufigkeit'}
              {step === 3 && 'Schritt 3: Quellen & Datenschutz'}
              {step === 4 && 'Schritt 4: Anbieter & Budget'}
            </span>
          </div>
        </div>

        {/* Step 1: Basisdaten */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div>
              <label className="text-xs font-bold text-slate-900 block mb-1">
                Name des Agenten *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="z. B. Logistik-Agent oder Recherche-Agent"
                className="w-full px-3 py-2 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-900 block mb-1.5">
                Symbol / Icon auswählen
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {AVAILABLE_ICONS.map(ic => {
                  const IconComp = getAgentIcon(ic);
                  return (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setIcon(ic)}
                      className={`p-2.5 rounded-lg border flex flex-col items-center justify-center transition-all cursor-pointer ${
                        icon === ic
                          ? 'border-rose-600 bg-rose-50 text-rose-700 ring-2 ring-rose-200'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                      }`}
                      title={ic}
                    >
                      <IconComp className="w-5 h-5" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-900 block mb-1.5">
                Farbe
              </label>
              <div className="flex flex-wrap gap-2.5">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-lg transition-all cursor-pointer ${
                      color === c ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Aufgaben */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Aufgaben des Agenten
                </h4>
                <p className="text-[11px] text-slate-600">
                  Häufige Aufgaben erhöhen die Cache-Trefferquote drastisch.
                </p>
              </div>
              <button
                type="button"
                onClick={addTask}
                className="px-2.5 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Aufgabe hinzufügen</span>
              </button>
            </div>

            <div className="space-y-3">
              {tasks.map((task, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={task.text}
                      onChange={e => updateTask(idx, 'text', e.target.value)}
                      placeholder="Aufgabenbeschreibung..."
                      className="flex-1 px-2.5 py-1.5 text-xs font-medium text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-400"
                    />
                    {tasks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTask(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded"
                        title="Entfernen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-600">Häufigkeit:</span>
                      <select
                        value={task.haeufigkeit}
                        onChange={e => updateTask(idx, 'haeufigkeit', e.target.value)}
                        className="text-xs font-semibold px-2 py-1 bg-slate-50 border border-slate-300 rounded-md text-slate-900"
                      >
                        <option value="hoch">Hoch (viele Wiederholungen)</option>
                        <option value="mittel">Mittel</option>
                        <option value="niedrig">Niedrig</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-600">Personenbezogen?</span>
                      <select
                        value={task.personenbezogen}
                        onChange={e => updateTask(idx, 'personenbezogen', e.target.value)}
                        className="text-xs font-semibold px-2 py-1 bg-slate-50 border border-slate-300 rounded-md text-slate-900"
                      >
                        <option value="ja">Ja (Kundendaten / Bewerber)</option>
                        <option value="nein">Nein (Öffentlich / Sachdaten)</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Quellen & Datenschutz */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div>
              <h4 className="text-xs font-bold text-slate-900 mb-2">
                Erlaubte Datenquellen der Pipeline
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-white cursor-pointer hover:border-slate-300">
                  <input
                    type="checkbox"
                    checked={sources.cache}
                    onChange={e => setSources({ ...sources, cache: e.target.checked })}
                    className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Eco-Cache</span>
                    <span className="text-[11px] text-slate-600">Lokale Antworten mit 0 Tokens</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-white cursor-pointer hover:border-slate-300">
                  <input
                    type="checkbox"
                    checked={sources.teamwissen}
                    onChange={e => setSources({ ...sources, teamwissen: e.target.checked })}
                    className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Teamwissen / Library</span>
                    <span className="text-[11px] text-slate-600">Interne Richtlinien und Dokumente</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-white cursor-pointer hover:border-slate-300">
                  <input
                    type="checkbox"
                    checked={sources.websuche}
                    onChange={e => setSources({ ...sources, websuche: e.target.checked })}
                    className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Grüne Websuche</span>
                    <span className="text-[11px] text-slate-600">Nur zertifizierte Ökostrom-Websites</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-white cursor-pointer hover:border-slate-300">
                  <input
                    type="checkbox"
                    checked={sources.externe_ki}
                    onChange={e => setSources({ ...sources, externe_ki: e.target.checked })}
                    className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Externe KI</span>
                    <span className="text-[11px] text-slate-600">Green-Cloud Cluster (Island / Schweden)</span>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-900 mb-1.5">
                Datenschutz für personenbezogene Daten
              </h4>
              <div className="space-y-2">
                {[
                  {
                    val: 'nur_lokal',
                    label: 'Nur lokal (Eco-Cache & Teamwissen)',
                    desc: 'Sensible Daten verlassen niemals das interne Firmennetz.',
                  },
                  {
                    val: 'eigener_server',
                    label: 'Eigener Kolibri-Server',
                    desc: 'Inhouse-Kolibri-Hosting erlaubt; externe fremde Clouds gesperrt.',
                  },
                  {
                    val: 'erlaubt',
                    label: 'Externe KI erlaubt',
                    desc: 'Keine datenschutzbezogene Blockierung externer Inferenz.',
                  },
                ].map(opt => (
                  <label
                    key={opt.val}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      privacy === opt.val
                        ? 'bg-rose-50/50 border-rose-400 ring-1 ring-rose-300'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="privacy"
                      checked={privacy === opt.val}
                      onChange={() => setPrivacy(opt.val as any)}
                      className="mt-0.5 text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">{opt.label}</span>
                      <span className="text-[11px] text-slate-600 font-medium">{opt.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Anbieter & Budget */}
        {step === 4 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div>
              <h4 className="text-xs font-bold text-slate-900 mb-2">
                Anbieter-Kriterien (GreenStrategy)
              </h4>
              <div className="space-y-2">
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-white cursor-pointer hover:border-slate-300">
                  <input
                    type="checkbox"
                    checked={provider.nur_gruen}
                    onChange={e => setProvider({ ...provider, nur_gruen: e.target.checked })}
                    className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Nur 100% Ökostrom (Island, Schweden, Schweiz)</span>
                    <span className="text-[11px] text-slate-600">Schließt konventionelle fossile Rechenzentren strikt aus.</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-white cursor-pointer hover:border-slate-300">
                  <input
                    type="checkbox"
                    checked={provider.fallback_erlaubt}
                    onChange={e => setProvider({ ...provider, fallback_erlaubt: e.target.checked })}
                    className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Fossiler Fallback bei Ausfall erlaubt</span>
                    <span className="text-[11px] text-slate-600">Empfehlung: Nein (lieber kurz warten als schmutzigen Strom nutzen).</span>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-900 block mb-1">
                Tagesbudget Tokens *
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1000}
                  max={200000}
                  step={1000}
                  value={dailyBudget}
                  onChange={e => setDailyBudget(Number(e.target.value))}
                  className="w-48 px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
                <span className="text-xs text-slate-600 font-medium">
                  Tokens pro Tag (z. B. 15.000 Tokens ≈ ca. 60–80 Anfragen)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Step navigation buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((step - 1) as any)}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Zurück</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Abbrechen
              </button>
            )}
          </div>

          <div>
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((step + 1) as any)}
                className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>Weiter</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>Weiter zur Vorschau &amp; Green-Check</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Live YAML Code Editor Side-by-Side */}
      <div className="lg:col-span-5 bg-slate-900 rounded-2xl p-4 text-white flex flex-col justify-between shadow-md">
        <div>
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Live YAML-Richtlinie
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
              Echtzeit synchron
            </span>
          </div>

          <textarea
            value={yamlCode}
            onChange={e => handleYamlChange(e.target.value)}
            rows={18}
            className="w-full bg-transparent font-mono text-xs text-emerald-300 resize-none outline-none leading-relaxed"
            spellCheck={false}
          />

          {yamlError && (
            <p className="text-[11px] text-rose-400 font-medium mt-1">
              {yamlError}
            </p>
          )}
        </div>

        <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400">
          Werte wie <strong className="text-white">ja / nein</strong> werden automatisch zu Booleans konvertiert.
        </div>
      </div>
    </div>
  );
};
