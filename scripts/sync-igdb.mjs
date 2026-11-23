/**
 * Refresh cached IGDB metadata without exposing credentials to GitHub Pages.
 * Requires IGDB_CLIENT_ID and IGDB_CLIENT_SECRET in GitHub Actions secrets.
 * Uses only built-in Node.js APIs and preserves curated game descriptions.
 */
import { readFile, writeFile } from 'node:fs/promises';

const clientId = process.env.IGDB_CLIENT_ID;
const clientSecret = process.env.IGDB_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  console.log('IGDB credentials not configured; add IGDB_CLIENT_ID and IGDB_CLIENT_SECRET to GitHub Actions secrets. No changes made.');
  process.exit(0);
}

const site = await readFile('index.html', 'utf8');
const match = site.match(/const GAMES = (\[[^\n]+\]);/);
if (!match) throw new Error('Could not find PLAYABLE catalog in index.html');
const catalog = JSON.parse(match[1]);
const destination = 'data/enrichment.json';
const prior = JSON.parse(await readFile(destination, 'utf8'));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const normalized = value => String(value || '')
  .normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
const aliases = {
  pokemon: 'Pokemon Red Version',
  warioware: 'WarioWare, Inc.: Mega Microgame$!',
  okami: 'Okami',
  ac: 'Animal Crossing',
  cnc: 'Command & Conquer',
  rct: 'RollerCoaster Tycoon',
  chibi: 'Chibi-Robo! Plug into Adventure!'
};
const platformTerms = {
  'Game Boy': ['gb', 'game boy'], 'SNES': ['snes', 'super nintendo'],
  'DOS': ['dos', 'pc dos'], 'PS1': ['ps', 'ps1', 'playstation'],
  'N64': ['n64', 'nintendo 64'], 'GameCube': ['ngc', 'gamecube'],
  'GBA': ['gba', 'game boy advance'], 'PS2': ['ps2', 'playstation 2'],
  'Wii': ['wii'], 'PC': ['pc', 'win', 'windows'], 'Android': ['android'],
  'Arcade': ['arcade']
};
const desiredPlatforms = game => [...new Set(game.platform.split(/\s*\/\s*/).flatMap(name => platformTerms[name] || []))];
const titleScore = (wanted, actual) => {
  const w = normalized(wanted); const a = normalized(actual);
  if (w === a) return 80;
  if (a.startsWith(w + ' ') || w.startsWith(a + ' ')) return 45;
  return 0;
};
function candidateScore(game, candidate) {
  const names = [game.title, aliases[game.id]].filter(Boolean);
  const t = Math.max(...names.map(n => titleScore(n, candidate.name)));
  if (!t) return -Infinity;
  const year = candidate.first_release_date ? new Date(candidate.first_release_date * 1000).getUTCFullYear() : null;
  const distance = year ? Math.abs(year - game.year) : 999;
  if (distance > 12) return -Infinity; // Avoid modern remakes with the same name.
  const yearScore = year ? Math.max(0, 18 - distance * 3) : 0;
  const platforms = (candidate.platforms || []).flatMap(p => [normalized(p.name), normalized(p.abbreviation)]);
  const want = desiredPlatforms(game);
  const platformScore = want.some(p => platforms.some(c => c === normalized(p))) ? 12 : 0;
  return t + yearScore + platformScore;
}

const oauth = await fetch('https://id.twitch.tv/oauth2/token?' + new URLSearchParams({
  client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials'
}), { method: 'POST', signal: AbortSignal.timeout(15000) });
if (!oauth.ok) throw new Error(`Twitch OAuth failed (HTTP ${oauth.status}); verify the two repository secrets`);
const { access_token: accessToken } = await oauth.json();
if (!accessToken) throw new Error('Twitch token missing');
let lastCallAt = 0;
async function igdb(endpoint, query) {
  const delay = Math.max(0, 320 - (Date.now() - lastCallAt));
  if (delay) await sleep(delay);
  for (let attempt = 0; attempt < 3; attempt++) {
    lastCallAt = Date.now();
    const response = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
      method: 'POST',
      headers: { 'Client-ID': clientId, Authorization: `Bearer ${accessToken}`, Accept: 'application/json', 'Content-Type': 'text/plain' },
      body: query,
      signal: AbortSignal.timeout(18000)
    });
    if (response.ok) return response.json();
    if ((response.status === 429 || response.status >= 500) && attempt < 2) {
      await sleep(1000 * (attempt + 1)); continue;
    }
    throw new Error(`IGDB ${endpoint} returned HTTP ${response.status}: ${(await response.text()).slice(0, 180)}`);
  }
}

const matches = new Map();
const unresolved = [];
for (const game of catalog) {
  const searchName = aliases[game.id] || game.title.split(' / ')[0];
  const safeQuery = searchName.replace(/["\\\n\r]/g, ' ').trim();
  const candidates = await igdb('games', `search "${safeQuery}"; fields id,name,first_release_date,cover.image_id,url,platforms.name,platforms.abbreviation; limit 35;`);
  const ranked = (candidates || []).map(candidate => ({ candidate, score: candidateScore(game, candidate) })).sort((a, b) => b.score - a.score);
  if (ranked[0]?.score >= 75) matches.set(game.id, ranked[0].candidate);
  else unresolved.push(game.title);
}

const ids = [...new Set([...matches.values()].map(g => g.id))];
const byId = new Map();
if (ids.length) {
  const times = await igdb('game_time_to_beats', `fields game_id,hastily,normally,completely,count; where game_id = (${ids.join(',')}); limit 500;`);
  for (const t of times || []) byId.set(t.game_id, t);
}
const validHours = value => Number.isFinite(value) && value > 0 && value < 3600 * 10000 ? Math.round(value / 360) / 10 : null;
const output = { schemaVersion: 1, updatedAt: new Date().toISOString(), source: 'IGDB', games: { ...(prior.games || {}) } };
for (const [id, game] of matches) {
  const t = byId.get(game.id);
  const old = prior.games?.[id] || {};
  output.games[id] = {
    ...old,
    igdbId: game.id,
    igdbUrl: /^https:\/\/www\.igdb\.com\/games\//.test(game.url || '') ? game.url : `https://www.igdb.com/games/${encodeURIComponent(String(game.id))}`,
    coverUrl: /^[a-z0-9]+$/i.test(game.cover?.image_id || '') ? `https://images.igdb.com/igdb/image/upload/t_cover_big_2x/${game.cover.image_id}.jpg` : (old.coverUrl || null),
    timeToBeat: t ? { main: validHours(t.hastily), extras: validHours(t.normally), complete: validHours(t.completely), submissions: t.count || 0 } : (old.timeToBeat || null)
  };
}
await writeFile(destination, JSON.stringify(output, null, 2) + '\n');
console.log(`IGDB refresh complete: ${matches.size}/${catalog.length} matches, ${[...matches.keys()].filter(id => output.games[id]?.timeToBeat).length} with time estimates.`);
if (unresolved.length) console.log(`Needs manual ID review: ${unresolved.join('; ')}`);
