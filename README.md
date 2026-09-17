# Kanji-Nepali-Practice
This is a mobile-style Japanese kanji practice app built as a front-end prototype.

## Notes on JLPT data
The app includes N5, N4, N3, N2, and N1 pools for practice, but the JLPT does not publish one single official public kanji list file that every source agrees on in machine-readable form. Public studies and websites often overlap, but they can differ slightly by level and by which entries are included. This app therefore uses a curated study dataset for demo and learning flow purposes rather than claiming to be a canonical government-approved list.

## Themes
The app ships four classic looks (Warm beige, Dark night, Soft mint, Royal blue)
selectable from **Settings → Background color**. On the main practice page there is
a **✨ Premium Theme** button that opens a picker with 10 extra themed looks:

| id | label |
| --- | --- |
| `fuji` | Mt. Fuji — snow peak & sky blue |
| `sakura` | Sakura — pink petals |
| `ninja` | Ninja — stealth night & ember red |
| `anime` | Anime Pop — bright pink/purple/cyan |
| `temple` | Temple — torii red & aged wood |
| `sea` | Sea — harbour blue & turquoise waves |
| `train` | Bullet Train — silver & Shinkansen nose stripe |
| `matcha` | Matcha — calm matcha green |
| `matsuri` | Matsuri Night — festival lantern glow |
| `neon` | Neo Tokyo — neon night cyan/magenta |

Picking a theme saves it to `localStorage` (`kanji-settings.theme`) immediately, so
the look sticks across sessions and stays in sync with the Settings dropdown and the
button chip. There is no payment gateway in this front-end prototype — the themes are
"premium" as a cosmetic tier. Each premium id maps 1:1 to a `body[data-theme="…"]`
variable block in `style.css`.

## Validation
The JavaScript and level data files are validated with `node --check` to confirm the app loads cleanly in the browser.

Hint sentences (`kanji-hint-sentences.js`) have their own checker:

```
node tools/check-hints.js   # duplicate keys, kana-only rule, N5 coverage
```

Premium themes are cross-checked across the three files (theme id present in CSS,
the Settings dropdown and the picker data) with:

```
node tools/check-themes.js   # 10 premium themes wired in script.js, style.css and index.html
```

## Level overlap
N5 follows the classic "First 103 kanji" list, so 22 of its kanji (口手目立少古花足会多社言空安店週魚買道飲新駅) are also tagged N4 in modern sources and therefore appear in both decks. First-attempt progress is counted per kanji, so an overlapping kanji is only counted once.
