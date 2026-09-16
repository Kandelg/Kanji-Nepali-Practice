/**
 * Analysis helper: compares the classic JLPT level-4 kanji list (jlpt_old === 4,
 * 103 kanji = the well known "First 103 kanji" N5 list) with the local data files.
 * Usage: node tools/check-n5-classic.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LEVELS = ['n5', 'n4', 'n3', 'n2', 'n1'];

function readLocal(level) {
  const file = path.join(ROOT, 'kanji-' + level + '-data.json');
  const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(text);
}

async function main() {
  const res = await fetch('https://raw.githubusercontent.com/davidluzgouveia/kanji-data/master/kanji.json', {
    signal: AbortSignal.timeout(120000)
  });
  const source = await res.json();

  const old4 = [];
  Object.keys(source).forEach((key) => {
    if (source[key] && source[key].jlpt_old === 4) old4.push(key);
  });
  console.log('classic level-4 count: ' + old4.length);

  const local = {};
  LEVELS.forEach((lv) => { local[lv] = readLocal(lv); });

  const n5Set = new Set(local.n5.map((it) => it.kanji));
  const missing = [];
  const foundIn = {};
  old4.forEach((char) => {
    if (n5Set.has(char)) return;
    const owners = LEVELS.filter((lv) => local[lv].some((it) => it.kanji === char));
    foundIn[char] = owners;
    if (owners.length === 0) missing.push(char);
  });

  console.log('extras vs current N5: ' + Object.keys(foundIn).length);
  Object.keys(foundIn).forEach((char) => {
    const src = source[char] || {};
    console.log('  ' + char + ' -> ' + (foundIn[char].join(',') || 'NOT FOUND') +
      ' | jlpt_new=' + src.jlpt_new + ' grade=' + src.grade);
  });
  console.log('missing everywhere: ' + (missing.join('') || 'none'));
}

main().catch((e) => { console.error('FAILED:', e && e.message); process.exit(1); });
