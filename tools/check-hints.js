/**
 * Validation helper for kanji-hint-sentences.js.
 * Rules enforced:
 *   1. one entry per kanji (a duplicate key silently overrides the earlier hint),
 *   2. every hint sentence contains its own kanji,
 *   3. no other kanji appears in the sentence (kana-only hint rule),
 *   4. every kanji in kanji-n5-data.json has a hint sentence.
 * Usage: node tools/check-hints.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HINTS_FILE = path.join(ROOT, 'kanji-hint-sentences.js');
const N5_FILE = path.join(ROOT, 'kanji-n5-data.json');
const KANA_ONLY = /^[\u3040-\u309F\u30A0-\u30FF\u0020\u3000\u3002\u300C\u300D]+$/;

function readHintEntries() {
  const text = fs.readFileSync(HINTS_FILE, 'utf8').replace(/^\uFEFF/, '');
  const pattern = /^\s*'([^']+)':\s*'([^']*)',?\s*$/gm;
  const entries = [];
  let match = pattern.exec(text);
  while (match) {
    entries.push({
      kanji: match[1],
      sentence: match[2],
      line: text.slice(0, match.index).split('\n').length
    });
    match = pattern.exec(text);
  }
  return entries;
}

function main() {
  const entries = readHintEntries();
  if (entries.length === 0) {
    console.error('FAILED: no hint entries found in ' + path.basename(HINTS_FILE));
    process.exit(1);
  }

  const problems = [];
  const firstSeen = new Map();

  entries.forEach((entry) => {
    if (firstSeen.has(entry.kanji)) {
      problems.push('duplicate key ' + entry.kanji + ' on line ' + entry.line +
        ' (first seen on line ' + firstSeen.get(entry.kanji) + ')');
      return;
    }
    firstSeen.set(entry.kanji, entry.line);

    if (!entry.sentence.includes(entry.kanji)) {
      problems.push('hint for ' + entry.kanji + ' does not contain ' + entry.kanji +
        ' (line ' + entry.line + ')');
      return;
    }

    const rest = entry.sentence.split(entry.kanji).join('');
    if (!KANA_ONLY.test(rest)) {
      const extra = [...new Set([...rest].filter((ch) => !KANA_ONLY.test(ch)))].join('');
      problems.push('hint for ' + entry.kanji + ' uses other kanji/characters: ' + extra +
        ' (line ' + entry.line + ')');
    }
  });

  const n5 = JSON.parse(fs.readFileSync(N5_FILE, 'utf8').replace(/^\uFEFF/, ''));
  const covered = new Set(firstSeen.keys());
  const missing = n5.map((item) => item.kanji).filter((kanji) => !covered.has(kanji));

  console.log('hint entries: ' + entries.length + ' (unique keys: ' + firstSeen.size + ')');
  console.log('N5 kanji with a hint: ' + (n5.length - missing.length) + '/' + n5.length);
  if (missing.length > 0) {
    problems.push('N5 kanji without a hint: ' + missing.join(''));
  }

  if (problems.length > 0) {
    console.error('\nFAILED:');
    problems.forEach((problem) => console.error('  - ' + problem));
    process.exit(1);
  }

  console.log('OK: hints are duplicate-free, kana-only and cover the N5 deck.');
}

try {
  main();
} catch (error) {
  console.error('FAILED:', error && error.message);
  process.exit(1);
}
