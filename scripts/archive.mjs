#!/usr/bin/env node
/**
 * archive.mjs – Uppsala Schackfestival 2026
 * Fetches all external API data and saves as static JSON files.
 * Run with: node scripts/archive.mjs
 *
 * Outputs:
 *   data/archive/lcc/{groupId}/round-{r}/game-{g}.json
 *   data/archive/ssf/{id}/table.json
 *   data/archive/ssf/{id}/roundresults.json
 *   data/archive/ssf/{id}/group.json
 *   data/archive/manifest.json
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const LCC_BASE = 'https://1.pool.livechesscloud.com/get';
const SSF_BASE = 'https://member.schack.se/public/api/v1/tournamentresults';

const LCC_GROUPS = [
  { name: 'grupp-1', id: 'b9c6cd2c-e05d-4b1a-a4db-25c98c291b52' },
  { name: 'grupp-2', id: '8d579e31-c216-43c4-817e-597ba58db845' },
  { name: 'grupp-3', id: '3e1dead3-0b84-4d70-8dfe-34b099bd019b' },
  { name: 'grupp-4', id: 'b0741cd4-79ba-4ad3-990b-4e766946ca16' },
];
const LCC_ROUNDS = 7;
const LCC_BOARDS = 3;

const SSF_IDS = [19022, 19023, 19024, 19025, 19026, 19027, 19028, 19029];
const SSF_ENDPOINTS = ['table', 'roundresults', 'group'];

async function fetchJSON(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

function save(relPath, data) {
  const full = join(ROOT, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, JSON.stringify(data, null, 2), 'utf8');
}

const stats = { lcc: { ok: 0, skip: 0, err: 0 }, ssf: { ok: 0, err: 0 } };
const ts = new Date().toISOString();

console.log('Uppsala Chess Festival – archive.mjs');
console.log('Started:', ts);

// 1. LiveChessCloud
console.log('\n=== LiveChessCloud ===');
for (const grp of LCC_GROUPS) {
  for (let r = 1; r <= LCC_ROUNDS; r++) {
    for (let g = 1; g <= LCC_BOARDS; g++) {
      const url = `${LCC_BASE}/${grp.id}/round-${r}/game-${g}.json`;
      const data = await fetchJSON(url);
      if (data === null) { stats.lcc.skip++; continue; }
      save(`data/archive/lcc/${grp.id}/round-${r}/game-${g}.json`, data);
      stats.lcc.ok++;
      process.stdout.write('.');
    }
  }
  process.stdout.write(` ${grp.name} done\n`);
}

// 2. SSF
console.log('\n=== SSF ===');
for (const id of SSF_IDS) {
  for (const ep of SSF_ENDPOINTS) {
    const url = `${SSF_BASE}/${ep}/id/${id}`;
    const data = await fetchJSON(url);
    if (data === null) {
      console.warn(`  WARN: ${url}`);
      stats.ssf.err++;
      continue;
    }
    save(`data/archive/ssf/${id}/${ep}.json`, data);
    stats.ssf.ok++;
  }
  console.log(`  ${id} done`);
}

// 3. Manifest
save('data/archive/manifest.json', {
  generated: ts,
  lcc: { groups: LCC_GROUPS.map(g => g.id), rounds: LCC_ROUNDS, boards: LCC_BOARDS },
  ssf: { ids: SSF_IDS },
  stats,
});

console.log('\nDone.');
console.log(`LCC: ${stats.lcc.ok} saved, ${stats.lcc.skip} skipped`);
console.log(`SSF: ${stats.ssf.ok} saved, ${stats.ssf.err} errors`);
console.log('Manifest: data/archive/manifest.json');
