/**
 * Kanji data builder — downloads full kanji list and writes local files.
 * Source: https://github.com/davidluzgouveia/kanji-data (kanji.json)
 * Enrichment: kanjiapi.dev for readings/examples.
 * Usage: node tools/build-kanji-data.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'kanji-builder' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchJson(res.headers.location));
      }
      if (res.statusCode !== 200) {
        reject(new Error('HTTP ' + res.statusCode + ' for ' + url));
        res.resume();
        return;
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function toHiragana(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

function cleanReading(value) {
  if (typeof value !== 'string') return '';
  return toHiragana(value.split('.')[0]).trim();
}

function pickReading(entry) {
  const kun = Array.isArray(entry.kun_readings) ? entry.kun_readings : [];
  const on = Array.isArray(entry.on_readings) ? entry.on_readings : [];
  const all = [...kun, ...on].map(cleanReading).filter(Boolean);
  return all.length > 0 ? all[0] : '';
}

function pickJukugo(apiEntry) {
  if (apiEntry && Array.isArray(apiEntry.jukugo) && apiEntry.jukugo.length > 0) {
    const first = apiEntry.jukugo.find((w) => w && w.kanji && w.reading);
    if (first) return first.kanji;
  }
  return '';
}

async function main() {
  console.log('Downloading kanji.json ...');
  const kanjiJson = await fetchJson('https://raw.githubusercontent.com/davidluzgouveia/kanji-data/master/kanji.json');
  const keys = Object.keys(kanjiJson);
  console.log('Total kanji in source: ' + keys.length);
  console.log('Sample: ' + JSON.stringify(kanjiJson[keys[0]]).slice(0, 400));

  const byJlpt = { 5: [], 4: [], 3: [], 2: [], 1: [] };
  keys.forEach((key) => {
    const item = kanjiJson[key] || {};
    const jlpt = item.jlpt_new || item.jlpt;
    if (byJlpt[jlpt]) byJlpt[jlpt].push({ char: key, entry: item });
    // Classic (pre-2010) JLPT level 4 kanji also belong to the N5 deck.
    // This keeps N5 at the well known "First 103 kanji" size (modern tagging
    // alone would give only 79), while the other levels stay on modern tags.
    if (item.jlpt_old === 4 && jlpt !== 5) byJlpt[5].push({ char: key, entry: item });
  });
  console.log('Counts: ' + JSON.stringify({
    N5: byJlpt[5].length, N4: byJlpt[4].length, N3: byJlpt[3].length,
    N2: byJlpt[2].length, N1: byJlpt[1].length
  }));

  const localByKanji = {};
  ['n5', 'n4', 'n3', 'n2', 'n1'].forEach((lv) => {
    try {
      const arr = JSON.parse(fs.readFileSync(path.join(ROOT, 'kanji-' + lv + '-data.json'), 'utf8'));
      arr.forEach((it) => {
        if (it && it.kanji && !localByKanji[it.kanji]) localByKanji[it.kanji] = it;
      });
    } catch (e) { /* ignore */ }
  });

  const levelMap = { N5: 5, N4: 4, N3: 3, N2: 2, N1: 1 };
  for (const level of ['N5', 'N4', 'N3', 'N2', 'N1']) {
    const list = byJlpt[levelMap[level]];
    console.log(level + ': enriching ' + list.length + ' via kanjiapi.dev ...');
    const out = new Array(list.length);
    let idx = 0;
    async function worker() {
      while (idx < list.length) {
        const i = idx++;
        const rec = list[i];
        const char = rec.char;
        const entry = rec.entry;
        const local = localByKanji[char] || {};
        let meanings = Array.isArray(entry.meanings) ? entry.meanings.filter(Boolean) : [];
        if (meanings.length === 0 && local.meaning) meanings = [local.meaning];
        let reading = local.reading || pickReading(entry);
        let example = local.example || '';
        try {
          const api = await fetchJson('https://kanjiapi.dev/v1/kanji/' + encodeURIComponent(char));
          if (api) {
            if (!reading) {
              const kun = Array.isArray(api.kun_readings) ? api.kun_readings : [];
              const on = Array.isArray(api.on_readings) ? api.on_readings : [];
              reading = [...kun, ...on].map(cleanReading).filter(Boolean)[0] || '';
            }
            if (!example) example = pickJukugo(api);
          }
        } catch (e) { /* keep local */ }
        out[i] = {
          kanji: char,
          reading: reading || '',
          meaning: meanings.slice(0, 4).join(', ') || local.meaning || 'Study word',
          example: example || char
        };
        if ((i + 1) % 100 === 0) console.log('  ' + level + ' ' + (i + 1) + '/' + list.length);
      }
    }
    const workers = [];
    for (let w = 0; w < 6; w++) workers.push(worker());
    await Promise.all(workers);
    const filtered = out.filter((it) => it && it.kanji && it.reading);
    console.log(level + ': kept ' + filtered.length + '/' + list.length);
    fs.writeFileSync(path.join(ROOT, 'kanji-' + level.toLowerCase() + '-data.json'), JSON.stringify(filtered, null, 2) + '\n');
    fs.writeFileSync(path.join(ROOT, 'kanji-' + level.toLowerCase() + '-data.js'), 'window.KANJI_' + level + '_DATA = ' + JSON.stringify(filtered, null, 2) + ';\n');
    console.log('Wrote ' + level + ' files');
  }
  console.log('DONE');
}

main().catch((e) => { console.error('BUILD FAILED:', e && e.message); process.exit(1); });

