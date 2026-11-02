import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const richtlinienDir = path.join(__dirname, 'richtlinien');
if (!fs.existsSync(richtlinienDir)) {
  fs.mkdirSync(richtlinienDir, { recursive: true });
}

// Gemini Client initialization if key exists
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  try {
    aiClient = new GoogleGenAI({ apiKey });
  } catch (err) {
    console.warn('Failed to initialize GoogleGenAI with GEMINI_API_KEY:', err);
  }
}

// API: List Richtlinien files
app.get('/api/policies/list', (_req, res) => {
  try {
    if (!fs.existsSync(richtlinienDir)) {
      return res.json({ files: [] });
    }
    const files = fs.readdirSync(richtlinienDir)
      .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
      .map(filename => {
        const fullPath = path.join(richtlinienDir, filename);
        const content = fs.readFileSync(fullPath, 'utf-8');
        return { filename, content };
      });
    res.json({ files });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Save Richtlinie file
app.post('/api/policies/save', (req, res) => {
  try {
    const { filename, content } = req.body;
    if (!filename || typeof content !== 'string') {
      return res.status(400).json({ error: 'filename and content required' });
    }
    const safeFilename = path.basename(filename);
    const fullPath = path.join(richtlinienDir, safeFilename);
    fs.writeFileSync(fullPath, content, 'utf-8');
    res.json({ success: true, filename: safeFilename });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Delete Richtlinie file
app.post('/api/policies/delete', (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'filename required' });
    }
    const safeFilename = path.basename(filename);
    const fullPath = path.join(richtlinienDir, safeFilename);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    res.json({ success: true, deleted: safeFilename });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Green Web Foundation check proxy
app.get('/api/greencheck', async (req, res) => {
  const urlParam = req.query.url as string;
  if (!urlParam) {
    return res.status(400).json({ error: 'url required' });
  }
  try {
    const cleanDomain = urlParam.replace(/^https?:\/\//, '').split('/')[0];
    const resp = await fetch(`https://api.thegreenwebfoundation.org/greencheck/${encodeURIComponent(cleanDomain)}`);
    if (resp.ok) {
      const data = await resp.json();
      return res.json(data);
    }
    res.status(resp.status).json({ error: 'Green Web Foundation API returned error' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Gemini Generate (Prompt enhancement, Agent Builder generation, and External AI answers)
app.post('/api/gemini/generate', async (req, res) => {
  const { prompt, systemInstruction, maxOutputTokens, mode } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'prompt required' });
  }

  // If real Gemini API Key is available
  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction || undefined,
          maxOutputTokens: maxOutputTokens || 600,
          temperature: 0.2,
        },
      });

      const text = response.text || '';
      const usage = response.usageMetadata;
      const totalTokens = usage?.totalTokenCount || (Math.ceil((prompt.length + text.length) / 4) + 20);

      return res.json({
        text: text.trim(),
        tokens: totalTokens,
        source: 'gemini-live',
        model: 'gemini-2.5-flash',
      });
    } catch (err: any) {
      console.warn('Gemini API call failed, falling back to mock generator:', err.message);
    }
  }

  // Mock / Offline Fallback Generator
  if (mode === 'prompt_improve') {
    let improved = prompt.trim();
    if (!improved.endsWith('?') && !improved.endsWith('.')) {
      improved += '?';
    }
    // Correct common German typos and clarify
    improved = improved
      .replace(/kannst du/i, 'Wie kann')
      .replace(/zeig mir/i, 'Bitte erläutere')
      .replace(/wo finde ich/i, 'Wo befinden sich die aktuellen')
      .replace(/was kostet/i, 'Welche Kosten entstehen bei')
      .replace(/wie geht/i, 'Welche Schritte sind erforderlich für');
    
    if (improved.length < 20) {
      improved = `Präzise Anfrage: ${improved}`;
    }

    return res.json({
      text: improved,
      tokens: 38,
      source: 'mock-local',
      model: 'Kolibri-Local-Enhancer',
    });
  }

  if (mode === 'agent_builder') {
    // Generate valid YAML for agent builder
    const titleMatch = prompt.match(/Agent für ([^,\.]+)/i);
    const suggestedTitle = titleMatch ? titleMatch[1].trim() : 'Projekt-Agent';
    const filename = suggestedTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.yaml';

    const yamlResult = `# Richtlinie für ${suggestedTitle}
# Automatisch generiert durch Kolibri Assistent
agent: ${suggestedTitle}
icon: roboter
farbe: "#059669"

erkennt: [${suggestedTitle.toLowerCase().replace(/[^a-z0-9]+/g, ' ')}, info, hilfe, aufgabe]
anweisung: >
  Du bist der ${suggestedTitle}. Antworte strukturiert, freundlich und präzise auf Fragen zu deinem Fachbereich.

aufgaben:
  - text: Bearbeite fachliche Anfragen zu ${suggestedTitle}
    haeufigkeit: hoch
    personenbezogen: nein
  - text: Erstelle standardisierte Zusammenfassungen
    haeufigkeit: mittel
    personenbezogen: nein

quellen:
  cache: ja
  teamwissen: ja
  websuche: ja
  externe_ki: ja

datenschutz:
  personenbezogene_daten: nur_lokal

anbieter:
  nur_gruen: ja
  fallback_erlaubt: nein

tagesbudget_tokens: 15000
`;

    return res.json({
      text: yamlResult,
      filename,
      tokens: 142,
      source: 'mock-local',
      model: 'Kolibri-Agent-Generator',
    });
  }

  // General answering fallback
  return res.json({
    text: `Dies ist eine energieeffiziente Antwort von Kolibri für die Anfrage: "${prompt}". Die Ausführung erfolgte unter strenger Einhaltung der Nachhaltigkeitsrichtlinie mit 100% grünem Stromnachweis.`,
    tokens: 85,
    source: 'mock-local',
    model: 'Kolibri-Eco-Fallback',
  });
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kolibri server running on http://localhost:${PORT}`);
  });
}

startServer();
