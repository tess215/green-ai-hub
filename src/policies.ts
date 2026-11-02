/**
 * Design Pattern: Policy & Rule Engine
 * Handles YAML policies loaded from richtlinien/*.yaml
 * Converts "ja"/"nein" to booleans, validates fields, and evaluates pipeline restrictions.
 */

import * as yaml from 'js-yaml';
import { AgentTask } from './config';

export interface AgentPolicy {
  filename: string;
  agent: string;
  icon?: string;
  farbe?: string;
  erkennt?: string[];
  anweisung?: string;
  aufgaben?: AgentTask[];
  rawYaml: string;
  quellen: {
    cache: boolean;
    teamwissen: boolean;
    websuche: boolean;
    externe_ki: boolean;
  };
  datenschutz?: {
    personenbezogene_daten?: 'nur_lokal' | 'eigener_server' | 'erlaubt';
  };
  anbieter: {
    nur_gruen: boolean;
    fallback_erlaubt: boolean;
  };
  tagesbudget_tokens: number;
}

export interface PolicyEvaluation {
  allowed: boolean;
  restrictedSources: {
    cache: boolean;
    teamwissen: boolean;
    websuche: boolean;
    externe_ki: boolean;
  };
  forceLocalOnly: boolean;
  forceOwnServerOnly: boolean;
  blockNonGreen: boolean;
  allowFallback: boolean;
  budgetExceeded: boolean;
  notices: string[];
}

function parseGermanBoolean(val: any): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    if (s === 'ja' || s === 'true' || s === 'yes' || s === '1') return true;
    if (s === 'nein' || s === 'false' || s === 'no' || s === '0') return false;
  }
  return false;
}

export function parseAndValidatePolicyYaml(content: string, filename = 'custom.yaml'): AgentPolicy {
  const parsed = (yaml.load(content) as any) || {};

  const agentName = parsed.agent || parsed.name || filename.replace('.yaml', '');
  const icon = parsed.icon || 'roboter';
  const farbe = parsed.farbe || '#0F766E';

  // Parse erkennt
  let erkennt: string[] = [];
  if (Array.isArray(parsed.erkennt)) {
    erkennt = parsed.erkennt
      .map((w: any) => String(w).trim().toLowerCase())
      .filter((w: string) => w.length > 0);
  } else if (typeof parsed.erkennt === 'string') {
    erkennt = parsed.erkennt
      .split(',')
      .map((w: string) => w.trim().toLowerCase())
      .filter((w: string) => w.length > 0);
  }

  // Parse anweisung
  const anweisung = typeof parsed.anweisung === 'string' ? parsed.anweisung.trim() : undefined;

  const rawAufgaben = Array.isArray(parsed.aufgaben) ? parsed.aufgaben : [];
  const aufgaben: AgentTask[] = rawAufgaben.map((item: any) => ({
    text: String(item.text || item.aufgabe || ''),
    haeufigkeit: item.haeufigkeit === 'hoch' || item.haeufigkeit === 'niedrig' ? item.haeufigkeit : 'mittel',
    personenbezogen: parseGermanBoolean(item.personenbezogen) ? 'ja' : 'nein',
  }));

  const quellenRaw = parsed.quellen || {};
  const quellen = {
    cache: quellenRaw.cache !== undefined ? parseGermanBoolean(quellenRaw.cache) : true,
    teamwissen: quellenRaw.teamwissen !== undefined ? parseGermanBoolean(quellenRaw.teamwissen) : true,
    websuche: quellenRaw.websuche !== undefined ? parseGermanBoolean(quellenRaw.websuche) : false,
    externe_ki: quellenRaw.externe_ki !== undefined ? parseGermanBoolean(quellenRaw.externe_ki) : true,
  };

  const anbieterRaw = parsed.anbieter || {};
  const anbieter = {
    nur_gruen: anbieterRaw.nur_gruen !== undefined ? parseGermanBoolean(anbieterRaw.nur_gruen) : true,
    fallback_erlaubt: anbieterRaw.fallback_erlaubt !== undefined ? parseGermanBoolean(anbieterRaw.fallback_erlaubt) : false,
  };

  let privacyVal: 'nur_lokal' | 'eigener_server' | 'erlaubt' = 'erlaubt';
  if (parsed.datenschutz?.personenbezogene_daten) {
    const d = String(parsed.datenschutz.personenbezogene_daten).toLowerCase();
    if (d === 'nur_lokal' || d === 'lokal') privacyVal = 'nur_lokal';
    else if (d === 'eigener_server' || d === 'kolibri') privacyVal = 'eigener_server';
    else privacyVal = 'erlaubt';
  }

  const budget = typeof parsed.tagesbudget_tokens === 'number' ? parsed.tagesbudget_tokens : 15000;

  return {
    filename,
    agent: agentName,
    icon,
    farbe,
    erkennt,
    anweisung,
    aufgaben,
    rawYaml: content,
    quellen,
    datenschutz: { personenbezogene_daten: privacyVal },
    anbieter,
    tagesbudget_tokens: budget,
  };
}

export function serializePolicyToYaml(policy: Partial<AgentPolicy>): string {
  const lines: string[] = [];
  lines.push(`# Richtlinie für ${policy.agent || 'Neuer Agent'}`);
  lines.push(`agent: ${policy.agent || 'Neuer Agent'}`);
  lines.push(`icon: ${policy.icon || 'roboter'}`);
  lines.push(`farbe: "${policy.farbe || '#0F766E'}"`);
  lines.push('');

  if (policy.erkennt && policy.erkennt.length > 0) {
    lines.push(`erkennt: [${policy.erkennt.join(', ')}]`);
  }

  if (policy.anweisung) {
    lines.push('anweisung: >');
    const indented = policy.anweisung.split('\n').map(l => `  ${l}`).join('\n');
    lines.push(indented);
    lines.push('');
  }

  if (policy.aufgaben && policy.aufgaben.length > 0) {
    lines.push('aufgaben:');
    policy.aufgaben.forEach(a => {
      lines.push(`  - text: ${a.text}`);
      lines.push(`    haeufigkeit: ${a.haeufigkeit}`);
      lines.push(`    personenbezogen: ${a.personenbezogen}`);
    });
    lines.push('');
  }

  lines.push('quellen:');
  lines.push(`  cache: ${policy.quellen?.cache ? 'ja' : 'nein'}`);
  lines.push(`  teamwissen: ${policy.quellen?.teamwissen ? 'ja' : 'nein'}`);
  lines.push(`  websuche: ${policy.quellen?.websuche ? 'ja' : 'nein'}`);
  lines.push(`  externe_ki: ${policy.quellen?.externe_ki ? 'ja' : 'nein'}`);
  lines.push('');

  lines.push('datenschutz:');
  lines.push(`  personenbezogene_daten: ${policy.datenschutz?.personenbezogene_daten || 'erlaubt'}`);
  lines.push('');

  lines.push('anbieter:');
  lines.push(`  nur_gruen: ${policy.anbieter?.nur_gruen ? 'ja' : 'nein'}`);
  lines.push(`  fallback_erlaubt: ${policy.anbieter?.fallback_erlaubt ? 'ja' : 'nein'}`);
  lines.push('');

  lines.push(`tagesbudget_tokens: ${policy.tagesbudget_tokens || 15000}`);

  return lines.join('\n');
}

export function evaluateRestrictions(
  policy: AgentPolicy,
  currentUsedBudget = 0,
  hasPersonalData = false
): PolicyEvaluation {
  const notices: string[] = [];

  let forceLocalOnly = false;
  let forceOwnServerOnly = false;

  if (hasPersonalData || policy.datenschutz?.personenbezogene_daten === 'nur_lokal') {
    forceLocalOnly = true;
    notices.push('Datenschutz aktiv: Keine Daten an externe Anbieter erlaubt (nur Eco-Cache & Teamwissen).');
  } else if (policy.datenschutz?.personenbezogene_daten === 'eigener_server') {
    forceOwnServerOnly = true;
    notices.push('Datenschutz aktiv: Eigener Kolibri-Server erlaubt, fremde Cloud-Anbieter gesperrt.');
  }

  const budgetExceeded = currentUsedBudget >= policy.tagesbudget_tokens;
  if (budgetExceeded) {
    notices.push(`Tagesbudget von ${policy.tagesbudget_tokens.toLocaleString()} Tokens erreicht.`);
  }

  const restrictedSources = {
    cache: policy.quellen.cache,
    teamwissen: policy.quellen.teamwissen,
    websuche: policy.quellen.websuche && !forceLocalOnly,
    externe_ki: policy.quellen.externe_ki && !forceLocalOnly && !budgetExceeded,
  };

  return {
    allowed: true,
    restrictedSources,
    forceLocalOnly,
    forceOwnServerOnly,
    blockNonGreen: policy.anbieter.nur_gruen,
    allowFallback: policy.anbieter.fallback_erlaubt,
    budgetExceeded,
    notices,
  };
}

// Client Policy Store that synchronizes with /api/policies
export class PolicyStore {
  private policies: Map<string, AgentPolicy> = new Map();
  private listeners: (() => void)[] = [];

  constructor() {
    this.fetchPolicies();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  public async fetchPolicies(): Promise<AgentPolicy[]> {
    try {
      const resp = await fetch('/api/policies/list');
      if (resp.ok) {
        const data = await resp.json();
        this.policies.clear();
        for (const item of data.files) {
          const parsed = parseAndValidatePolicyYaml(item.content, item.filename);
          this.policies.set(item.filename, parsed);
        }
        this.notify();
        return Array.from(this.policies.values());
      }
    } catch (e) {
      console.warn('Could not fetch policies from server, using in-memory store:', e);
    }
    return Array.from(this.policies.values());
  }

  public getAll(): AgentPolicy[] {
    return Array.from(this.policies.values());
  }

  public get(filename: string): AgentPolicy | undefined {
    return this.policies.get(filename);
  }

  public async savePolicy(filename: string, content: string): Promise<boolean> {
    const parsed = parseAndValidatePolicyYaml(content, filename);
    this.policies.set(filename, parsed);
    this.notify();

    try {
      const res = await fetch('/api/policies/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, content }),
      });
      return res.ok;
    } catch {
      return true; // Still preserved in client memory
    }
  }

  private activeFilename: string = 'rechnungs-agent.yaml';

  public setActivePolicy(filename: string): void {
    this.activeFilename = filename;
    this.notify();
  }

  public getActivePolicy(): AgentPolicy {
    const p = this.policies.get(this.activeFilename);
    if (p) return p;
    const first = Array.from(this.policies.values())[0];
    if (first) return first;
    return parseAndValidatePolicyYaml('agent: Standard\nquellen:\n  cache: ja\n  teamwissen: ja\n  websuche: nein\n  externe_ki: nein\nanbieter:\n  nur_gruen: ja\n  fallback_erlaubt: nein\ntagesbudget_tokens: 5000\n', 'standard.yaml');
  }

  public async deletePolicy(filename: string): Promise<boolean> {
    this.policies.delete(filename);
    if (this.activeFilename === filename) {
      const remaining = Array.from(this.policies.keys());
      this.activeFilename = remaining[0] || 'standard.yaml';
    }
    this.notify();

    try {
      const res = await fetch('/api/policies/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });
      return res.ok;
    } catch {
      return true;
    }
  }
}

export const globalPolicyStore = new PolicyStore();
