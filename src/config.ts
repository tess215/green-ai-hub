/**
 * Test data and default configurations for Kolibri
 * All values can be customized without deep programming knowledge.
 */

export interface ProviderConfig {
  id: string;
  name: string;
  isGreen: boolean;
  score: number; // 0 to 100
  carbonIntensity: number; // gCO2/kWh
  pue: number; // Power Usage Effectiveness
  renewableShare: number; // percentage (0-100)
  location: string;
  latencyMs: number;
  costPer1kTokens: number; // in cents
  isFallback: boolean;
}

export interface LibraryItem {
  id: string;
  title: string;
  tags: string[];
  queries: string[];
  content: string;
  tokens: number;
  lastUpdated: string;
  author: string;
}

export interface WebSearchResult {
  id: string;
  queryKeywords: string[];
  title: string;
  domain: string;
  url: string;
  isGreen: boolean;
  hostedBy: string;
  snippet: string;
  fullText: string;
  lastChecked: string;
}

export interface PromptChip {
  id: string;
  title: string;
  prompt: string;
  reason: string;
  category: string;
}

export interface AgentTask {
  text: string;
  haeufigkeit: 'hoch' | 'mittel' | 'niedrig';
  personenbezogen: 'ja' | 'nein';
}

export interface AgentTemplate {
  id: string;
  filename: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  erkennt?: string[];
  anweisung?: string;
  tasks: AgentTask[];
  sources: {
    cache: boolean;
    teamwissen: boolean;
    websuche: boolean;
    externe_ki: boolean;
  };
  privacy: 'nur_lokal' | 'eigener_server' | 'erlaubt';
  provider: {
    nur_gruen: boolean;
    fallback_erlaubt: boolean;
  };
  dailyBudgetTokens: number;
}

export const INITIAL_PROVIDERS: ProviderConfig[] = [
  {
    id: 'kolibri-green',
    name: 'Kolibri Green Cluster (Island)',
    isGreen: true,
    score: 98,
    carbonIntensity: 18,
    pue: 1.08,
    renewableShare: 100,
    location: 'Reykjavik, Island (Geothermie)',
    latencyMs: 140,
    costPer1kTokens: 0.15,
    isFallback: false,
  },
  {
    id: 'nordic-eco',
    name: 'Nordic Eco Cloud (Schweden)',
    isGreen: true,
    score: 94,
    carbonIntensity: 26,
    pue: 1.12,
    renewableShare: 98,
    location: 'Luleå, Schweden (Wasserkraft)',
    latencyMs: 110,
    costPer1kTokens: 0.18,
    isFallback: false,
  },
  {
    id: 'alpine-hydro',
    name: 'Alpine Hydro Compute (Schweiz)',
    isGreen: true,
    score: 91,
    carbonIntensity: 34,
    pue: 1.15,
    renewableShare: 95,
    location: 'Wallis, Schweiz (Wasserkraft)',
    latencyMs: 90,
    costPer1kTokens: 0.22,
    isFallback: false,
  },
  {
    id: 'standard-eu',
    name: 'Standard Cloud EU-Central (Frankfurt)',
    isGreen: false,
    score: 62,
    carbonIntensity: 310,
    pue: 1.35,
    renewableShare: 58,
    location: 'Frankfurt, Deutschland (Mischstrom)',
    latencyMs: 45,
    costPer1kTokens: 0.20,
    isFallback: true,
  },
  {
    id: 'standard-us',
    name: 'Standard Cloud US-East (Virginia)',
    isGreen: false,
    score: 41,
    carbonIntensity: 430,
    pue: 1.48,
    renewableShare: 32,
    location: 'North Virginia, USA (Fossil)',
    latencyMs: 180,
    costPer1kTokens: 0.19,
    isFallback: true,
  },
];

export const INITIAL_LIBRARY_ITEMS: LibraryItem[] = [
  {
    id: 'lib-1',
    title: 'Dienstreisen: Bahn vs. Flugzeug Richtlinie',
    tags: ['reise', 'nachhaltigkeit', 'spesen', 'bahn'],
    queries: [
      'Dienstreise Richtlinie Bahn oder Flugzeug?',
      'Wann darf ich fliegen bei Dienstreisen?',
      'Reisekostenrichtlinie Zugverbindung',
      'Flugbuchung Genehmigung'
    ],
    content: 'Innerhalb Deutschlands und für Strecken unter 5 Stunden Fahrzeit mit der Bahn ist zwingend die Bahn 2. Klasse (mit BahnCard) zu nutzen. Inlandsflüge werden grundsätzlich nicht erstattet. Für Auslandsreisen über 8 Stunden ist die Genehmigung der Abteilungsleitung erforderlich.',
    tokens: 72,
    lastUpdated: '15. Januar 2025',
    author: 'Reisekostenstelle',
  },
  {
    id: 'lib-2',
    title: 'Homeoffice-Pauschale & Hardware-Ausstattung',
    tags: ['homeoffice', 'hardware', 'arbeitsplatz', 'budget'],
    queries: [
      'Welches Budget gibt es für Homeoffice Hardware?',
      'Zuschuss für Monitor und Tastatur zu Hause',
      'Homeoffice Ausstattung bestellen',
      'Hardware Budget Ergonomie'
    ],
    content: 'Jeder Mitarbeiter erhält einmalig ein Budget von 600 € brutto für ergonomische Ausstattung im Homeoffice (externer Monitor, Maus, Tastatur, Stuhl). Die Anschaffung erfolgt über das interne IT-Bestellportal unter Angabe der Kostenstelle.',
    tokens: 58,
    lastUpdated: '02. Februar 2025',
    author: 'People & Culture',
  },
  {
    id: 'lib-3',
    title: 'Git Workflow & Branching-Regeln',
    tags: ['git', 'code', 'pull-request', 'review'],
    queries: [
      'Wie lauten die Git Branching Regeln?',
      'Wie benenne ich Branches im Team?',
      'Pull Request Anforderungen und Tests',
      'Git Workflow Standard'
    ],
    content: 'Wir nutzen Trunk-Based Development mit kurzlebigen Feature-Branches nach dem Muster `feature/JIRA-123-kurzbeschreibung`. Jeder PR benötigt mindestens einen Approval von einem Senior Developer sowie bestandene CI/CD-Tests vor dem Squash & Merge in `main`.',
    tokens: 65,
    lastUpdated: '20. Januar 2025',
    author: 'Tech Lead Team',
  },
  {
    id: 'lib-4',
    title: 'Rechnungsfreigabe: IBAN & Betragsgrenzen',
    tags: ['rechnung', 'buchhaltung', 'iban', 'freigabe'],
    queries: [
      'Wie läuft die Rechnungsfreigabe ab?',
      'Wer muss Rechnungen über 5000 Euro freigeben?',
      'Prüfung von Lieferanten IBAN',
      'Vier-Augen-Prinzip Buchhaltung'
    ],
    content: 'Rechnungen bis 1.000 € können direkt vom Teamlead freigegeben werden. Rechnungen von 1.000 € bis 10.000 € erfordern die Zweitzeichnung der Bereichsleitung. Bei neuen oder geänderten IBAN-Daten ist stets eine telefonische Rückbestätigung mit dem hinterlegten Lieferantenkontakt zwingend erforderlich (Fraud-Prevention).',
    tokens: 88,
    lastUpdated: '10. Januar 2025',
    author: 'Finanzen & Buchhaltung',
  },
];

export const INITIAL_WEB_SEARCH_ITEMS: WebSearchResult[] = [
  {
    id: 'web-1',
    queryKeywords: ['green', 'software', 'energie', 'effizienz', 'prinzipien'],
    title: 'Green Software Foundation: Core Principles of Carbon Efficiency',
    domain: 'greensoftware.foundation',
    url: 'https://greensoftware.foundation/principles',
    isGreen: true,
    hostedBy: 'Hetzner Online GmbH (100% Wasserkraft)',
    snippet: 'Die Kernprinzipien für grüne Software umfassen Energieeffizienz, Hardware-Lebensdauer, Kohlenstoffintensitäts-Optimierung und messbaren Stromverbrauch im Rechenzentrum.',
    fullText: 'Grüne Softwareentwicklung minimiert Treibhausgasemissionen durch bewusste Reduktion von Rechenzeit, Caching wiederkehrender Anfragen und Verlagerung von Lasten in Regionen mit hoher Verfügbarkeit erneuerbarer Energien.',
    lastChecked: 'Heute, 08:30 Uhr',
  },
  {
    id: 'web-2',
    queryKeywords: ['wetter', 'deutschland', 'erneuerbare', 'strommix', 'prognose'],
    title: 'Agora Energiewende: Aktueller Strommix und CO2-Intensität Deutschland',
    domain: 'agora-energiewende.de',
    url: 'https://www.agora-energiewende.de/daten-strommix',
    isGreen: true,
    hostedBy: 'Strato AG (Ökostrom zertifiziert)',
    snippet: 'Echtzeit-Daten zu Solar-, Wind- und Wasserkraft-Einspeisung. Heute liegt der Anteil der Erneuerbaren im deutschen Netz bei durchschnittlich 57%.',
    fullText: 'Durch stetigen Ausbau von Photovoltaik und Windkraft schwankt der CO2-Ausstoß je kWh zwischen 180g (sonnige Mittagsstunden) und 420g (Dunkelflaute). Kolibri priorisiert Berechnungen in den grünen Zeitfenstern.',
    lastChecked: 'Heute, 09:15 Uhr',
  },
  {
    id: 'web-3',
    queryKeywords: ['wichtig', 'ai', 'token', 'spar', 'tipps'],
    title: 'Prompt-Engineering Handbuch: Token sparen ohne Qualitätsverlust',
    domain: 'promptguide.green-ai.org',
    url: 'https://promptguide.green-ai.org/token-savings',
    isGreen: true,
    hostedBy: 'OVHcloud Eco-Datacenter Gravelines',
    snippet: 'Prägnante Formulierungen und Vermeidung redundanter Füllwörter sparen bis zu 45% der Inferenz-Tokens und damit direkte Energiekosten.',
    fullText: 'Ein strukturierter Prompt mit klaren Vorgaben und ohne ausschweifende Höflichkeitsfloskeln reduziert sowohl Prompt- als auch Completion-Tokens erheblich. Im Durchschnitt spart dies 120 Tokens pro Aufruf.',
    lastChecked: 'Gestern, 14:00 Uhr',
  },
  {
    id: 'web-4',
    queryKeywords: ['rechnung', 'vorschriften', 'pflichtangaben', 'steuernummer'],
    title: 'Bundesministerium der Finanzen: Gesetzliche Pflichtangaben auf Rechnungen § 14 UStG',
    domain: 'bundesfinanzministerium.de',
    url: 'https://www.bundesfinanzministerium.de/rechnungsanforderungen',
    isGreen: false,
    hostedBy: 'Bundesrechenzentrum (Konventioneller Netzstrom)',
    snippet: 'Vollständige Übersicht über die nach § 14 Abs. 4 UStG vorgeschriebenen Pflichtbestandteile für ordnungsgemäße Rechnungen in Deutschland.',
    fullText: 'Jede Rechnung muss Name und Anschrift von leistendem Unternehmer und Leistungsempfänger, Steuernummer oder USt-IdNr., Ausstellungsdatum, fortlaufende Nummer, Menge und Art der gelieferten Gegenstände sowie den Steuersatz enthalten.',
    lastChecked: 'Gestern, 18:20 Uhr',
  },
  {
    id: 'web-5',
    queryKeywords: ['kolibri', 'architektur', 'gateway', 'pattern'],
    title: 'Kolibri Whitepaper: Vier-Stufen-Architektur für sparsame Unternehmens-KI',
    domain: 'kolibri.eco',
    url: 'https://kolibri.eco/docs/architecture',
    isGreen: true,
    hostedBy: 'Kolibri Eco Datacenter Island (Geothermie)',
    snippet: 'Die Kolibri-Pipeline fängt bis zu 78% aller Firmenanfragen im Eco-Cache und Teamwissen ab – mit 0 g CO2 und 0 externen Tokens.',
    fullText: 'Durch die Kette aus lokalem Cache, validiertem Teamwissen, streng gefilterter grüner Websuche und gezieltem Green-Routing an zertifizierte KI-Cluster arbeitet Kolibri als intelligenter Gatekeeper.',
    lastChecked: 'Heute, 07:00 Uhr',
  },
];

export const INITIAL_PROMPT_CHIPS: PromptChip[] = [
  {
    id: 'chip-1',
    title: 'Dienstreise Richtlinie Bahn oder Flug?',
    prompt: 'Darf ich für die 4-stündige Dienstreise nach Hamburg das Flugzeug nehmen oder muss ich Bahn fahren?',
    reason: 'Wird oft montags von Projektleitern abgefragt (liegt im Teamwissen)',
    category: 'Richtlinie',
  },
  {
    id: 'chip-2',
    title: 'Git Branching Regeln für PRs',
    prompt: 'Wie lauten unsere Git Branching Regeln und welche Anforderungen gibt es für Pull Requests?',
    reason: 'Häufige Frage im Tech-Onboarding (im Teamwissen vorhanden)',
    category: 'Entwicklung',
  },
  {
    id: 'chip-3',
    title: 'Rechnungsfreigabe Betragsgrenze',
    prompt: 'Ab welchem Rechnungsbetrag benötigt eine Eingangsrechnung eine Zweitzeichnung durch die Bereichsleitung?',
    reason: 'Monatlicher Wiederholer in der Buchhaltung (liegt im Teamwissen)',
    category: 'Finanzen',
  },
  {
    id: 'chip-4',
    title: 'Was sind die Prinzipien von Green Software?',
    prompt: 'Was sind die Kernprinzipien von Green Software nach der Green Software Foundation?',
    reason: 'Aktuelles Thema im Architekturkreis (wird über grüne Websuche gefunden)',
    category: 'Nachhaltigkeit',
  },
];

export const SIMULATED_USER_HISTORY = {
  userName: 'Lena Weber (Tech & Finanzen)',
  notes: 'Lena fragt häufig nach Reisekosten, Software-Standards und Rechnungsprüfungen.',
  savedQueriesCount: 42,
  cacheHitRatio: '68%',
};

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'rechnungs-agent',
    filename: 'rechnungs-agent.yaml',
    name: 'Rechnungs-Agent',
    description: 'Prüft Eingangsrechnungen, IBAN-Daten und doppelte Belege. Hohe Wiederholungsrate.',
    icon: 'rechnung',
    color: '#0F766E',
    erkennt: ['rechnung', 'beleg', 'mahnung', 'zahlungserinnerung', 'gutschrift', 'rechnungsbetrag'],
    anweisung: 'Du erstellst und prüfst Rechnungen. Antworte strukturiert: Rechnungsposten als Tabelle, darunter Summe, MwSt. und fehlende Pflichtangaben.',
    tasks: [
      { text: 'Prüfe Rechnungsbetrag und IBAN gegen Lieferantenstamm', haeufigkeit: 'hoch', personenbezogen: 'ja' },
      { text: 'Suche doppelt eingereichte Belege und Quittungen', haeufigkeit: 'hoch', personenbezogen: 'ja' },
      { text: 'Erfasse Belegkategorie und Vorsteuer', haeufigkeit: 'mittel', personenbezogen: 'nein' }
    ],
    sources: { cache: true, teamwissen: true, websuche: true, externe_ki: true },
    privacy: 'nur_lokal',
    provider: { nur_gruen: true, fallback_erlaubt: false },
    dailyBudgetTokens: 20000,
  },
  {
    id: 'support-agent',
    filename: 'support-agent.yaml',
    name: 'Support-Agent',
    description: 'Kundenanfragen und Ticket-Klassifizierung mit striktem Schutz von Bestandsdaten.',
    icon: 'kopfhoerer',
    color: '#1D4ED8',
    erkennt: ['kunde', 'ticket', 'beschwerde', 'reklamation', 'kundenanfrage', 'rückerstattung'],
    anweisung: 'Du beantwortest Kundenanliegen freundlich und knapp. Gib nie personenbezogene Daten in der Antwort wieder.',
    tasks: [
      { text: 'Klassifiziere eingehende Kundenbeschwerden nach Priorität', haeufigkeit: 'hoch', personenbezogen: 'ja' },
      { text: 'Erstelle standardisierte Antwortvorschläge aus FAQ', haeufigkeit: 'hoch', personenbezogen: 'nein' },
      { text: 'Ermittle zuständigen Ansprechpartner aus CRM', haeufigkeit: 'mittel', personenbezogen: 'ja' }
    ],
    sources: { cache: true, teamwissen: true, websuche: false, externe_ki: true },
    privacy: 'nur_lokal',
    provider: { nur_gruen: true, fallback_erlaubt: false },
    dailyBudgetTokens: 15000,
  },
  {
    id: 'meeting-agent',
    filename: 'meeting-agent.yaml',
    name: 'Meeting-Agent',
    description: 'Fasst Meetings zusammen, extrahiert To-Dos und formuliert Beschlüsse.',
    icon: 'kalender',
    color: '#7E22CE',
    erkennt: ['besprechung', 'meeting', 'protokoll', 'termin', 'zusammenfassung'],
    anweisung: 'Du fasst Besprechungen und Termine strukturiert zusammen. Liste Teilnehmer, Beschlüsse und offene Aufgaben mit Zuständigkeiten auf.',
    tasks: [
      { text: 'Fasse Meeting-Transkript in 5 Kernpunkten zusammen', haeufigkeit: 'mittel', personenbezogen: 'ja' },
      { text: 'Extrahiere Aufgaben mit Zuständigkeit und Deadline', haeufigkeit: 'hoch', personenbezogen: 'ja' },
      { text: 'Formuliere Beschlussvorlage für das Team', haeufigkeit: 'niedrig', personenbezogen: 'nein' }
    ],
    sources: { cache: true, teamwissen: true, websuche: false, externe_ki: true },
    privacy: 'eigener_server',
    provider: { nur_gruen: true, fallback_erlaubt: false },
    dailyBudgetTokens: 25000,
  },
  {
    id: 'coding-agent',
    filename: 'coding-agent.yaml',
    name: 'Coding-Agent',
    description: 'Hilft bei Code-Reviews, Test-Generierung und Architektur-Fragen.',
    icon: 'code',
    color: '#BE123C',
    erkennt: ['code', 'fehler', 'php', 'test', 'funktion', 'klasse', 'typescript', 'python', 'bug', 'refactoring'],
    anweisung: 'Du bist ein erfahrener Software-Entwickler. Gib präzisen, sauberen Code mit kurzen Erläuterungen und Tests aus.',
    tasks: [
      { text: 'Erstelle Unit-Tests für TypeScript und PHP Funktionen', haeufigkeit: 'hoch', personenbezogen: 'nein' },
      { text: 'Prüfe Code auf Sicherheitslücken und OWASP Risiken', haeufigkeit: 'mittel', personenbezogen: 'nein' },
      { text: 'Erkläre unbekannte Fehlermeldungen und Stacktraces', haeufigkeit: 'hoch', personenbezogen: 'nein' }
    ],
    sources: { cache: true, teamwissen: true, websuche: true, externe_ki: true },
    privacy: 'erlaubt',
    provider: { nur_gruen: true, fallback_erlaubt: true },
    dailyBudgetTokens: 40000,
  },
  {
    id: 'bewerbungs-agent',
    filename: 'bewerbungs-agent.yaml',
    name: 'Bewerbungs-Agent',
    description: 'Sichtet Lebensläufe, gleicht Qualifikationen ab und schützt Bewerberdaten auf eigenem Server.',
    icon: 'aktentasche',
    color: '#0EA5E9',
    erkennt: ['bewerbung', 'lebenslauf', 'kandidat', 'anschreiben', 'vorstellungsgespräch', 'stelle'],
    anweisung: 'Du sichtest und bewertest Bewerbungen diskret und strukturiert nach Qualifikationen, Stärken und offenen Fragen.',
    tasks: [
      { text: 'Ordne Bewerbung einer offenen Stelle zu', haeufigkeit: 'hoch', personenbezogen: 'ja' },
      { text: 'Fasse Lebenslauf in drei Sätzen zusammen', haeufigkeit: 'mittel', personenbezogen: 'ja' },
      { text: 'Prüfe formale Vollständigkeit der Unterlagen', haeufigkeit: 'hoch', personenbezogen: 'ja' }
    ],
    sources: { cache: true, teamwissen: true, websuche: false, externe_ki: true },
    privacy: 'eigener_server',
    provider: { nur_gruen: true, fallback_erlaubt: false },
    dailyBudgetTokens: 10000,
  },
  {
    id: 'social-media-agent',
    filename: 'social-media-agent.yaml',
    name: 'Social-Media-Agent',
    description: 'Recherchiert Trends im grünen Web und erstellt Beiträge ohne Personenbezug.',
    icon: 'megafon',
    color: '#D97706',
    erkennt: ['social media', 'post', 'linkedin', 'beitrag', 'kampagne', 'hashtag'],
    anweisung: 'Du erstellst ansprechende Posts und Kampagnen für Social Media mit passenden Hashtags und klarem Call-to-Action.',
    tasks: [
      { text: 'Recherchiere aktuelle Nachhaltigkeits-Trends im Web', haeufigkeit: 'hoch', personenbezogen: 'nein' },
      { text: 'Formuliere LinkedIn-Beitrag mit 3 Kern-Hashtags', haeufigkeit: 'mittel', personenbezogen: 'nein' },
      { text: 'Erstelle kurzen Teaser für den Unternehmens-Newsletter', haeufigkeit: 'mittel', personenbezogen: 'nein' }
    ],
    sources: { cache: true, teamwissen: true, websuche: true, externe_ki: true },
    privacy: 'erlaubt',
    provider: { nur_gruen: true, fallback_erlaubt: false },
    dailyBudgetTokens: 18000,
  },
];
