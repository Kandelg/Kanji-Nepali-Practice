/**
 * Validation helper for the premium theme system.
 * Rules enforced:
 *   1. script.js PREMIUM_THEMES has exactly 10 entries with unique ids,
 *   2. every premium id has a body[data-theme="..."] block in style.css,
 *   3. every premium id is offered by the Settings #backgroundSelect dropdown,
 *   4. the main-page button + picker panel wiring exists in index.html,
 *   5. script.js renders the grid into #themeGrid and saves theme changes.
 * Usage: node tools/check-themes.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CSS_FILE = path.join(ROOT, 'style.css');
const SCRIPT_FILE = path.join(ROOT, 'script.js');
const HTML_FILE = path.join(ROOT, 'index.html');
const EXPECTED_PREMIUM_THEMES = 10;
// Classic themes shipped before the premium pack (see THEME_LABELS in script.js).
// "beige" is the app default, declared on :root instead of body[data-theme].
const CLASSIC_THEME_IDS = ['dark', 'mint', 'royal'];
const BASE_THEME_ID = 'beige';

function read(file) {
  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
}

function premiumThemeIds() {
  const block = read(SCRIPT_FILE).match(/const PREMIUM_THEMES = \[([\s\S]*?)\n\];/);
  if (!block) return null;
  return [...block[1].matchAll(/id: '([a-z0-9-]+)'/g)].map((match) => match[1]);
}

function main() {
  const css = read(CSS_FILE);
  const html = read(HTML_FILE);
  const script = read(SCRIPT_FILE);
  const ids = premiumThemeIds();

  if (!ids || ids.length === 0) {
    console.error('FAILED: could not read PREMIUM_THEMES from ' + path.basename(SCRIPT_FILE));
    process.exit(1);
  }

  const problems = [];

  if (ids.length !== EXPECTED_PREMIUM_THEMES) {
    problems.push('expected ' + EXPECTED_PREMIUM_THEMES + ' premium themes, found ' + ids.length);
  }

  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length > 0) {
    problems.push('duplicate premium theme id(s): ' + [...new Set(duplicates)].join(', '));
  }

  ids.forEach((id) => {
    const cssRule = new RegExp('body\\[data-theme="' + id + '"\\]\\s*\\{');
    if (!cssRule.test(css)) {
      problems.push('missing style.css block: body[data-theme="' + id + '"]');
    }

    const option = new RegExp('<option value="' + id + '">');
    if (!option.test(html)) {
      problems.push('missing #backgroundSelect <option value="' + id + '">');
    }

    if (!script.includes("'" + id + "'")) {
      problems.push('theme id ' + id + ' is not referenced by ' + path.basename(SCRIPT_FILE));
    }
  });

  // Every CSS-declared theme id must be either a classic or a premium theme.
  const cssThemes = [...new Set([...css.matchAll(/body\[data-theme="([a-z0-9-]+)"\]\s*\{/g)].map((m) => m[1]))];
  cssThemes
    .filter((id) => !ids.includes(id) && !CLASSIC_THEME_IDS.includes(id))
    .forEach((id) => {
      problems.push('style.css theme "' + id + '" is neither a classic nor a PREMIUM_THEMES entry');
    });

  CLASSIC_THEME_IDS.forEach((id) => {
    if (!cssThemes.includes(id)) problems.push('style.css is missing the classic theme "' + id + '"');
  });

  // The default theme must stay in :root, in defaults.theme and in the dropdown.
  if (!/:root\s*\{/.test(css) || !html.includes('<option value="' + BASE_THEME_ID + '">')) {
    problems.push('default theme "' + BASE_THEME_ID + '" is missing from :root or the dropdown');
  }
  if (!script.includes("theme: '" + BASE_THEME_ID + "'")) {
    problems.push('defaults.theme in script.js should be "' + BASE_THEME_ID + '"');
  }

  // Wiring: button -> panel -> grid -> saveSettings.
  const requiredHtml = [
    ['id="premiumThemeBtn"', 'main-page premium theme button'],
    ['id="premiumThemeCurrent"', 'active theme chip in the button'],
    ['id="themePanel"', 'theme picker panel'],
    ['id="themeGrid"', 'theme picker grid'],
    ['id="closeThemePanel"', 'theme picker close button'],
    ['class="theme-panel"', 'theme panel styles hook']
  ];

  requiredHtml.forEach(([needle, label]) => {
    if (!html.includes(needle)) problems.push('index.html is missing ' + label + ' (' + needle + ')');
  });

  ['function renderThemeGrid', 'function openThemePanel', 'function hideThemePanel',
    'function updatePremiumThemeLabel', 'saveSettings({ theme: themeId })'].forEach((needle) => {
      if (!script.includes(needle)) problems.push('script.js is missing ' + needle);
    });

  if (!css.includes('.premium-theme-btn') || !css.includes('.theme-card')) {
    problems.push('style.css is missing the premium button / theme card styles');
  }

  if (problems.length > 0) {
    problems.forEach((problem) => console.error('FAILED: ' + problem));
    process.exit(1);
  }

  console.log('OK: ' + ids.length + ' premium themes wired in script.js, style.css and index.html');
  console.log('    ' + ids.join(', '));
}

main();
