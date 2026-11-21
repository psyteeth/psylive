#!/usr/bin/env node
// Прогоняет логику apps_script/live.gs в node на выдуманных данных (test/fixture.json).
//   node test/run.js                     → печатает live.json
//   node test/run.js --efir месяц.csv    → добавляет лист эфиров из CSV (только локально, в репозиторий не класть)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const code = fs.readFileSync(path.join(__dirname, '..', 'apps_script', 'live.gs'), 'utf8');
const { buildLive_, efirNames_ } = new Function(code + '; return { buildLive_, efirNames_ };')();
const hash = (s) => crypto.createHash('sha256').update(s, 'utf8').digest().readUInt32BE(0);

function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const fx = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture.json'), 'utf8'));
const i = process.argv.indexOf('--efir');
if (i > 0) {
  const display = parseCsv(fs.readFileSync(process.argv[i + 1], 'utf8'));
  fx.months.unshift({ name: fx.current, display });
  if (process.argv.includes('--names-only')) { console.log(efirNames_(display).length + ' имён в листе'); process.exit(0); }
}
const out = buildLive_(fx, Date.parse(fx.now), 'test-salt', hash);
process.stdout.write(JSON.stringify(out, null, 2) + '\n');
