# Kanji-Nepali-Practice
This is a mobile-style Japanese kanji practice app built as a front-end prototype.

## Notes on JLPT data
The app includes N5, N4, N3, N2, and N1 pools for practice, but the JLPT does not publish one single official public kanji list file that every source agrees on in machine-readable form. Public studies and websites often overlap, but they can differ slightly by level and by which entries are included. This app therefore uses a curated study dataset for demo and learning flow purposes rather than claiming to be a canonical government-approved list.

## Validation
The JavaScript and level data files are validated with `node --check` to confirm the app loads cleanly in the browser.

Hint sentences (`kanji-hint-sentences.js`) have their own checker:

```
node tools/check-hints.js   # duplicate keys, kana-only rule, N5 coverage
```

## Level overlap
N5 follows the classic "First 103 kanji" list, so 22 of its kanji (口手目立少古花足会多社言空安店週魚買道飲新駅) are also tagged N4 in modern sources and therefore appear in both decks. First-attempt progress is counted per kanji, so an overlapping kanji is only counted once.
