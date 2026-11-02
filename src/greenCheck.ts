/**
 * Green-Check Engine
 * Verifies sustainability and data protection rules for agent configurations,
 * and calculates daily token and CO2 savings.
 */

import { AgentPolicy } from './policies';

export interface GreenCheckItem {
  id: string;
  type: 'success' | 'warning' | 'error';
  title: string;
  description: string;
  impact?: string;
}

export interface TokenEstimation {
  dailyQueries: number;
  unoptimizedTokens: number;
  expectedAvoidableTokens: number;
  expectedRemainingTokens: number;
  savedPercentage: number;
  savedCo2Grams: number;
}

export function performGreenCheck(policy: Partial<AgentPolicy>): {
  items: GreenCheckItem[];
  estimation: TokenEstimation;
  overallStatus: 'green' | 'amber' | 'red';
} {
  const items: GreenCheckItem[] = [];

  const tasks = policy.aufgaben || [];
  const highFreqCount = tasks.filter(t => t.haeufigkeit === 'hoch').length;
  const personalDataTasks = tasks.filter(t => t.personenbezogen === 'ja');

  // Rule 1: Repetition and Cache effectiveness
  if (highFreqCount > 0 && (policy.quellen?.cache ?? true)) {
    items.push({
      id: 'cache-effective',
      type: 'success',
      title: 'Hohe Wiederholungsrate (Eco-Cache greift)',
      description: `${highFreqCount} Aufgabe(n) mit hoher Frequenz: Kolibri fängt ca. 60–75 % der Anfragen lokal ab (0 Tokens).`,
      impact: 'Sehr hohe Energieersparnis',
    });
  }

  // Rule 2: Privacy setting vs tasks
  const privacy = policy.datenschutz?.personenbezogene_daten || 'erlaubt';
  if (personalDataTasks.length > 0) {
    if (privacy === 'nur_lokal') {
      items.push({
        id: 'privacy-local',
        type: 'success',
        title: 'Maximaler Datenschutz (nur lokal)',
        description: 'Personenbezogene Daten verlassen niemals das interne Netz. Externe KI-Aufrufe sind gesperrt.',
        impact: '100% datenschutzkonform',
      });
    } else if (privacy === 'eigener_server') {
      items.push({
        id: 'privacy-own-server',
        type: 'success',
        title: 'Datenschutz: Eigener Kolibri-Server',
        description: 'Sensible Daten dürfen an den unternehmenseigenen Kolibri-Cluster gesendet werden, fremde Clouds sind blockiert.',
        impact: 'Geschütztes Inhouse-Hosting',
      });
    } else {
      items.push({
        id: 'privacy-warning',
        type: 'warning',
        title: 'Achtung: Personenbezogene Daten bei externer KI',
        description: 'Es sind persönliche Aufgaben definiert, aber der Datenschutz erlaubt externe Cloud-Aufrufe.',
        impact: 'Prüfe Datenschutz-Einstellung',
      });
    }
  }

  // Rule 3: Web search with personal data
  if (personalDataTasks.length > 0 && policy.quellen?.websuche) {
    items.push({
      id: 'web-personal',
      type: 'warning',
      title: 'Websuche aktiv bei persönlichen Aufgaben',
      description: 'Bei Rechnungs- oder Personaldaten sollte Websuche deaktiviert sein, um Suchlecks zu vermeiden.',
      impact: 'Websuche deaktivieren empfohlen',
    });
  }

  // Rule 4: Green provider enforcement
  if (policy.anbieter?.nur_gruen) {
    if (!policy.anbieter?.fallback_erlaubt) {
      items.push({
        id: 'pure-green',
        type: 'success',
        title: '100 % Ökostrom garantiert (Kein fossiler Fallback)',
        description: 'Anfragen werden ausschließlich an zertifizierte grüne Rechenzentren (Island, Schweden, Schweiz) geroutet.',
        impact: '0 % fossiler Strommix',
      });
    } else {
      items.push({
        id: 'fallback-warning',
        type: 'warning',
        title: 'Fallback auf konventionellen Strommix erlaubt',
        description: 'Bei Nichterreichbarkeit grüner Cluster weicht Kolibri auf Standard-Rechenzentren mit Mischstrom aus.',
        impact: 'Potenzielle CO2-Emissionen bei Lastspitzen',
      });
    }
  } else {
    items.push({
      id: 'no-green-enforcement',
      type: 'warning',
      title: 'Kein grüner Stromfilter aktiv',
      description: 'Anbieter werden ohne Nachhaltigkeitsbewertung angesteuert.',
      impact: 'Erhöhter CO2-Ausstoß',
    });
  }

  // Rule 5: Daily Token Budget
  const budget = policy.tagesbudget_tokens ?? 0;
  if (!budget || budget <= 0) {
    items.push({
      id: 'budget-error',
      type: 'error',
      title: 'Kein Tagesbudget festgelegt',
      description: 'Ein Token-Tagesbudget ist zwingend erforderlich, um unkontrollierte Inferenz-Kosten zu verhindern.',
      impact: 'Agent kann nicht gestartet werden',
    });
  } else if (budget > 100000) {
    items.push({
      id: 'budget-high',
      type: 'warning',
      title: 'Sehr hohes Tagesbudget',
      description: `Budget von ${budget.toLocaleString()} Tokens/Tag. Überprüfe, ob eine engere Deckelung sinnvoll ist.`,
    });
  } else {
    items.push({
      id: 'budget-ok',
      type: 'success',
      title: `Tagesbudget: ${budget.toLocaleString()} Tokens`,
      description: 'Sichere Deckelung gegen Endlosschleifen und unvorhersehbare Last.',
    });
  }

  // Calculations for Estimation
  let estQueries = 0;
  tasks.forEach(t => {
    if (t.haeufigkeit === 'hoch') estQueries += 40;
    else if (t.haeufigkeit === 'mittel') estQueries += 15;
    else estQueries += 5;
  });
  if (estQueries === 0) estQueries = 30;

  const avgTokensPerQuery = 240;
  const unoptimizedTokens = estQueries * avgTokensPerQuery;

  // Efficiency calculation
  let cacheRate = 0.50;
  if (highFreqCount > 1) cacheRate = 0.70;
  else if (highFreqCount === 1) cacheRate = 0.60;
  if (!policy.quellen?.cache) cacheRate = 0;

  let libraryRate = 0.15;
  if (!policy.quellen?.teamwissen) libraryRate = 0;

  const totalLocalRate = Math.min(0.85, cacheRate + libraryRate);
  const expectedAvoidableTokens = Math.round(unoptimizedTokens * totalLocalRate);
  const expectedRemainingTokens = Math.min(budget, unoptimizedTokens - expectedAvoidableTokens);
  const savedPercentage = Math.round((expectedAvoidableTokens / unoptimizedTokens) * 100);
  const savedCo2Grams = Number(((expectedAvoidableTokens * 0.00045)).toFixed(1)); // ~0.45g CO2 saved per 1000 tokens

  const hasErrors = items.some(i => i.type === 'error');
  const hasWarnings = items.some(i => i.type === 'warning');
  const overallStatus = hasErrors ? 'red' : hasWarnings ? 'amber' : 'green';

  return {
    items,
    estimation: {
      dailyQueries: estQueries,
      unoptimizedTokens,
      expectedAvoidableTokens,
      expectedRemainingTokens,
      savedPercentage,
      savedCo2Grams,
    },
    overallStatus,
  };
}
