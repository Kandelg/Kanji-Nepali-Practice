const body = document.body;
const menuButton = document.getElementById('menuButton');
const sideMenu = document.getElementById('sideMenu');
const screenContent = document.querySelector('.screen-content');
const settingsPanel = document.getElementById('settingsPanel');
const closePanel = document.getElementById('closePanel');
const progressPanel = document.getElementById('progressPanel');
const closeProgressPanel = document.getElementById('closeProgressPanel');
const saveProgressModal = document.getElementById('saveProgressModal');
const saveProgressTitle = document.getElementById('saveProgressTitle');
const saveProgressMessage = document.getElementById('saveProgressMessage');
const saveProgressYes = document.getElementById('saveProgressYes');
const saveProgressNo = document.getElementById('saveProgressNo');
const savedSessionPanel = document.getElementById('savedSessionPanel');
const savedSessionList = document.getElementById('savedSessionList');
const soundToggle = document.getElementById('soundToggle');
const vibrationToggle = document.getElementById('vibrationToggle');
const backgroundSelect = document.getElementById('backgroundSelect');
const fontSizeRange = document.getElementById('fontSizeRange');
const navItems = document.querySelectorAll('.nav-item');
const menuItems = document.querySelectorAll('.menu-item');
const levelSelect = document.getElementById('levelSelect');
const languageSelect = document.getElementById('languageSelect');
const practiceTopLabel = document.getElementById('practiceTopLabel');
const kanjiMeta = document.querySelector('.kanji-meta');
const kanjiWord = document.querySelector('.kanji-word');
const metaRows = document.querySelectorAll('.meta-row');
const metaLabels = document.querySelectorAll('.meta-label');
const answerButtons = document.querySelectorAll('.answer-option');
const actionBarButtons = document.querySelectorAll('.action-button');
let wrongAttempts = 0;
let autoNextTimer = null;
const AUTO_NEXT_DELAY = 4000;
let currentKanjiChar = '';
// Pre-answer helper limits: each helper (speaker / hint / next) can be used
// only 6 times per day BEFORE the answer (meaning) is revealed.
const PRE_ANSWER_LIMIT = 6;
const PRE_ANSWER_LIMIT_KEY = 'kanji-helper-limit-v1';
let limitToastTimer = null;
let n5Kanji = Array.isArray(window.KANJI_N5_DATA) ? window.KANJI_N5_DATA : [];
let n4Kanji = Array.isArray(window.KANJI_N4_DATA) ? window.KANJI_N4_DATA : [];
let n3Kanji = Array.isArray(window.KANJI_N3_DATA) ? window.KANJI_N3_DATA : [];
let n2Kanji = Array.isArray(window.KANJI_N2_DATA) ? window.KANJI_N2_DATA : [];
let n1Kanji = Array.isArray(window.KANJI_N1_DATA) ? window.KANJI_N1_DATA : [];

function getCurrentKanjiPool() {
  const selectedLevel = levelSelect ? levelSelect.value : 'N5';

  if (selectedLevel === 'N4') {
    return n4Kanji.length > 0 ? n4Kanji : n5Kanji;
  }

  if (selectedLevel === 'N3') {
    return n3Kanji.length > 0 ? n3Kanji : n5Kanji;
  }

  if (selectedLevel === 'N2') {
    return n2Kanji.length > 0 ? n2Kanji : n5Kanji;
  }

  if (selectedLevel === 'N1') {
    return n1Kanji.length > 0 ? n1Kanji : n5Kanji;
  }

  return n5Kanji;
}

const defaults = {
  theme: 'beige',
  sound: true,
  vibration: true,
  fontSize: 18,
  level: 'N5',
  language: 'en'
};

const publicLevelSource = {
  N5: 'https://raw.githubusercontent.com/mochazi/kanji-on/main/web/data/n5.json',
  N4: 'https://raw.githubusercontent.com/mochazi/kanji-on/main/web/data/n4.json',
  N3: 'https://raw.githubusercontent.com/mochazi/kanji-on/main/web/data/n3.json',
  N2: 'https://raw.githubusercontent.com/mochazi/kanji-on/main/web/data/n2.json',
  N1: 'https://raw.githubusercontent.com/mochazi/kanji-on/main/web/data/n1.json'
};

function toHiragana(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/[ァ-ヶ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60));
}

function normalizeLevelPayload(payload) {
  if (!payload) return [];

  const rawEntries = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.kanji)
      ? payload.kanji
      : payload.kanji ? Object.values(payload.kanji) : [];

  return rawEntries
    .map((item) => {
      const candidates = [
        ...(Array.isArray(item && item.kunyomi) ? item.kunyomi : []),
        ...(Array.isArray(item && item.onyomi) ? item.onyomi : [])
      ];

      const reading = candidates
        .map((value) => toHiragana(value))
        .find((value) => value && value.trim()) || (typeof item?.reading === 'string' ? item.reading : '');

      const example = (Array.isArray(item && item.words) && item.words.length > 0)
        ? (item.words[0].word || item.words[0].kana || '')
        : '';

      const kanji = item?.kanji || item?.character || '';

      return {
        kanji,
        reading: reading || '',
        meaning: item?.meaning || 'Study word',
        example
      };
    })
    .filter((entry) => entry.kanji && entry.reading);
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('kanji-settings') || '{}');
    return { ...defaults, ...(saved && typeof saved === 'object' ? saved : {}) };
  } catch (error) {
    return { ...defaults };
  }
}

const languageLabels = {
  en: { reading: 'Reading', meaning: 'Meaning', example: 'Example' },
  phil: { reading: 'Pagbasa', meaning: 'Kahulugan', example: 'Halimbawa' },
  id: { reading: 'Baca', meaning: 'Arti', example: 'Contoh' },
  ne: { reading: 'पढ़ाइ', meaning: 'अर्थ', example: 'उदाहरण' },
  ko: { reading: '읽기', meaning: '의미', example: '예' },
  vi: { reading: 'Đọc', meaning: 'Ý nghĩa', example: 'Ví dụ' }
};

const practiceLabels = {
  en: (level) => `Today's practice: ${level} Kanji`,
  phil: (level) => `Aralin ngayon: ${level} Kanji`,
  id: (level) => `Latihan hari ini: ${level} Kanji`,
  ne: (level) => `आजको अभ्यास: ${level} कन्जी`,
  ko: (level) => `오늘의 연습: ${level} 한자`,
  vi: (level) => `Luyện tập hôm nay: ${level} Hán tự`
};

const actionLabels = {
  en: { write: 'Write', read: 'Read', meaning: 'Hints', next: 'Next' },
  phil: { write: 'Sumulat', read: 'Basahin', meaning: 'Pahiwatig', next: 'Susunod' },
  id: { write: 'Tulis', read: 'Baca', meaning: 'Petunjuk', next: 'Berikutnya' },
  ne: { write: 'लिख्नु', read: 'पढ्नु', meaning: 'संकेत', next: 'अर्को' },
  ko: { write: '쓰기', read: '읽기', meaning: '힌트', next: '다음' },
  vi: { write: 'Viết', read: 'Đọc', meaning: 'Gợi ý', next: 'Tiếp' }
};

function getMeaningCache() {
  try {
    return JSON.parse(localStorage.getItem('kanji-meaning-cache-v1') || '{}');
  } catch (error) {
    return {};
  }
}

function setMeaningCache(cache) {
  try {
    const keys = Object.keys(cache);
    const trimmed = {};
    keys.slice(-800).forEach((key) => { trimmed[key] = cache[key]; });
    localStorage.setItem('kanji-meaning-cache-v1', JSON.stringify(trimmed));
  } catch (error) {
    // Ignore quota errors so practice never breaks.
  }
}

function localizedMeaning(value) {
  const language = (languageSelect && languageSelect.value) || 'en';
  if (typeof value !== 'string') return value;
  if (language === 'en') return value;
  const cache = getMeaningCache();
  const cacheKey = `${language}|${value}`;
  if (cache[cacheKey]) return cache[cacheKey];
  if (typeof offlineTranslatedMeaning === 'function') {
    return offlineTranslatedMeaning(value, language);
  }
  return value;
}

function updateMetaLabels() {
  const activeLanguage = (languageSelect && languageSelect.value) || 'en';
  const labels = languageLabels[activeLanguage] || languageLabels.en;

  if (metaLabels.length >= 3) {
    metaLabels[0].textContent = labels.reading;
    metaLabels[1].textContent = labels.meaning;
    metaLabels[2].textContent = labels.example;
  }
}

function updateActionLabels() {
  const activeLanguage = (languageSelect && languageSelect.value) || 'en';
  const labels = actionLabels[activeLanguage] || actionLabels.en;

  const actionButtons = document.querySelectorAll('.action-button');
  if (actionButtons.length >= 4) {
    const writeLabel = actionButtons[0].querySelector('span:last-child');
    if (writeLabel) writeLabel.textContent = labels.write;
    const readLabel = actionButtons[1].querySelector('span:last-child');
    if (readLabel && !actionButtons[1].classList.contains('speaker-button')) {
      readLabel.textContent = labels.read;
    }
    const meaningLabel = actionButtons[2].querySelector('span:last-child');
    if (meaningLabel) meaningLabel.textContent = labels.meaning;
    // Next button is icon-only (premium >> look) — never inject text or it wipes the SVG.
  }
}

function updatePracticeTopLabel() {
  if (!practiceTopLabel) return;

  const activeLanguage = (languageSelect && languageSelect.value) || 'en';
  const lvl = levelSelect ? levelSelect.value : 'N5';
  const formatter = practiceLabels[activeLanguage] || practiceLabels.en;
  practiceTopLabel.textContent = formatter(lvl);
}

function applySettings() {
  let settings = null;
  try {
    settings = loadSettings();
  } catch (error) {
    settings = { ...defaults };
  }
  if (!settings || typeof settings !== 'object') settings = { ...defaults };
  if (!body) return;
  body.dataset.theme = settings.theme || defaults.theme;
  if (soundToggle) {
    soundToggle.classList.toggle('active', settings.sound !== false);
    soundToggle.setAttribute('aria-pressed', String(settings.sound !== false));
  }
  if (vibrationToggle) {
    vibrationToggle.classList.toggle('active', settings.vibration !== false);
    vibrationToggle.setAttribute('aria-pressed', String(settings.vibration !== false));
  }
  if (backgroundSelect) backgroundSelect.value = settings.theme || defaults.theme;
  if (fontSizeRange) fontSizeRange.value = settings.fontSize || defaults.fontSize;
  const fontSize = Number(settings.fontSize) || defaults.fontSize;
  document.documentElement.style.setProperty('--kanji-font-size', `${fontSize}px`);
  document.documentElement.style.setProperty('--word-size', `${Math.max(64, fontSize * 3.4)}px`);

  if (levelSelect) {
    const levelValue = ['N5', 'N4', 'N3', 'N2', 'N1'].includes(settings.level) ? settings.level : 'N5';
    levelSelect.value = levelValue;
  }

  if (languageSelect) {
    languageSelect.value = settings.language || 'en';
  }

  try { updatePracticeTopLabel(); } catch (error) { /* keep UI alive */ }
  try { updateMetaLabels(); } catch (error) { /* keep UI alive */ }
  try { updateActionLabels(); } catch (error) { /* keep UI alive */ }
  try { renderQuizCard(); } catch (error) { /* keep UI alive */ }
}

function saveSettings(next) {
  const current = loadSettings();
  const updated = { ...current, ...next };
  localStorage.setItem('kanji-settings', JSON.stringify(updated));
  applySettings();
}

const FIRST_ATTEMPT_KEY = 'kanji-first-attempt-log';
const MAX_FIRST_ATTEMPT_LOG = 5000;

function dayKeyFromTime(time) {
  const date = new Date(time);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayKey() {
  return dayKeyFromTime(Date.now());
}

function getFirstAttemptLog() {
  try {
    const stored = JSON.parse(localStorage.getItem(FIRST_ATTEMPT_KEY) || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch (error) {
    return [];
  }
}

function logFirstAttemptResult(kanji, wasCorrect) {
  try {
    const log = getFirstAttemptLog();
    log.push({
      kanji: kanji || '',
      correct: wasCorrect === true,
      at: Date.now(),
      day: todayKey()
    });
    const trimmed = log.slice(-MAX_FIRST_ATTEMPT_LOG);
    localStorage.setItem(FIRST_ATTEMPT_KEY, JSON.stringify(trimmed));
  } catch (error) {
    // Ignore storage errors so practice never breaks.
  }
}

function countFirstAttemptStats(days) {
  const log = getFirstAttemptLog();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const recent = log.filter((entry) => entry && entry.at >= cutoff);
  const seenKanji = new Set();
  const forgottenKanji = new Set();
  let firstTryCorrect = 0;

  recent.forEach((entry) => {
    if (entry.correct === true) {
      firstTryCorrect += 1;
      if (entry.kanji) seenKanji.add(entry.kanji);
    } else if (entry.correct === false && entry.kanji) {
      forgottenKanji.add(entry.kanji);
    }
  });

  return {
    attempts: recent.length,
    firstTryCorrect,
    masteredKanji: seenKanji.size,
    forgottenKanji: [...forgottenKanji].filter((kanji) => !seenKanji.has(kanji))
  };
}

function getYesterdayFirstAttemptCount() {
  const log = getFirstAttemptLog();
  const yesterday = dayKeyFromTime(Date.now() - 24 * 60 * 60 * 1000);
  return log.filter((entry) => entry && entry.day === yesterday && entry.correct === true).length;
}

function getTodayFirstAttemptCount() {
  const log = getFirstAttemptLog();
  const today = todayKey();
  return log.filter((entry) => entry && entry.day === today && entry.correct === true).length;
}

function getProgressComment(diff, forgottenCount) {
  if (diff > 0) {
    return `Amazing! You are up by ${diff} from yesterday — keep the streak going! 🚀`;
  }
  if (diff < 0) {
    const forgotText = forgottenCount > 0 ? ` You forgot ${forgottenCount} kanji which you picked right on first attempt before — review them once!` : '';
    return `Down by ${Math.abs(diff)} from yesterday. No worries, small steps every day! 💪${forgotText}`;
  }
  if (forgottenCount > 0) {
    return `Same as yesterday. You forgot ${forgottenCount} kanji which you picked at first attempt before — a quick review will fix it! 📚`;
  }
  return 'Same as yesterday — steady pace! One more round and you will climb. ✨';
}

function renderProgressPanel() {
  const totalEl = document.getElementById('progressTotal');
  const trendEl = document.getElementById('progressTrend');
  const commentEl = document.getElementById('progressComment');
  if (!totalEl || !trendEl || !commentEl) return;

  const stats = countFirstAttemptStats(15);
  const todayCount = getTodayFirstAttemptCount();
  const yesterdayCount = getYesterdayFirstAttemptCount();
  const diff = todayCount - yesterdayCount;

  totalEl.textContent = String(stats.firstTryCorrect);

  let trendClass = 'flat';
  let trendText = `━ Same as yesterday (${yesterdayCount})`;
  if (diff > 0) {
    trendClass = 'up';
    trendText = `▲ Up by ${diff} from yesterday (${yesterdayCount})`;
  } else if (diff < 0) {
    trendClass = 'down';
    trendText = `▼ Down by ${Math.abs(diff)} from yesterday (${yesterdayCount})`;
  }
  trendEl.className = `progress-trend ${trendClass}`;
  trendEl.textContent = trendText;

  commentEl.textContent = getProgressComment(diff, stats.forgottenKanji.length);
}

function getSavedSessions() {
  try {
    const stored = JSON.parse(localStorage.getItem('kanji-saved-sessions') || '[]');
    if (!Array.isArray(stored)) return [];
    if (stored.length > 4) {
      const trimmed = stored.slice(0, 4);
      localStorage.setItem('kanji-saved-sessions', JSON.stringify(trimmed));
      return trimmed;
    }
    return stored;
  } catch (error) {
    return [];
  }
}

function saveSessionToList(session) {
  if (!session || !session.savedAt) return;

  const nextSession = {
    id: session.id || `session-${Date.now()}`,
    level: session.level || 'N5',
    language: session.language || 'en',
    savedAt: session.savedAt,
    lastKanji: session.lastKanji || ''
  };

  const sessions = getSavedSessions();
  const merged = [nextSession, ...sessions.filter((item) => item.id !== nextSession.id)].slice(0, 4);
  localStorage.setItem('kanji-saved-sessions', JSON.stringify(merged));
  renderSavedSessions();
}

function renderSavedSessions() {
  if (!savedSessionList) return;

  const sessions = getSavedSessions();
  if (!sessions.length) {
    savedSessionList.innerHTML = '<div class="saved-session-item"><strong>No saved sessions yet.</strong></div>';
    return;
  }

  savedSessionList.innerHTML = sessions.map((session) => `
    <div class="saved-session-item">
      <strong>${session.level || 'N5'} · ${session.language || 'en'}</strong>
      <small>${new Date(session.savedAt).toLocaleString()}</small>
      <button type="button" data-restore-session-id="${session.id}">Resume</button>
    </div>
  `).join('');

  savedSessionList.querySelectorAll('[data-restore-session-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const sessionId = button.getAttribute('data-restore-session-id');
      const target = getSavedSessions().find((session) => session.id === sessionId);
      if (target) {
        restoreSessionState(target);
      }
    });
  });
}

function restoreSessionState(session) {
  if (!session) return;

  const validLevels = ['N5', 'N4', 'N3', 'N2', 'N1'];
  const validLanguages = ['en', 'phil', 'id', 'ne', 'ko', 'vi'];

  if (levelSelect && validLevels.includes(session.level)) {
    levelSelect.value = session.level;
  }

  if (languageSelect && validLanguages.includes(session.language)) {
    languageSelect.value = session.language;
  }

  saveSettings({
    level: levelSelect ? levelSelect.value : loadSettings().level,
    language: languageSelect ? languageSelect.value : loadSettings().language
  });

  updatePracticeTopLabel();
  updateMetaLabels();
  updateActionLabels();
  renderQuizCard();

  if (savedSessionPanel) {
    savedSessionPanel.classList.remove('is-open');
  }
}

function loadProgressSnapshot() {
  try {
    return JSON.parse(localStorage.getItem('kanji-progress') || '{}');
  } catch (error) {
    return {};
  }
}

function saveProgressSnapshot() {
  const sessionProgress = {
    id: `session-${Date.now()}`,
    level: levelSelect ? levelSelect.value : loadSettings().level,
    language: languageSelect ? languageSelect.value : loadSettings().language,
    lastKanji: kanjiWord ? kanjiWord.textContent : '',
    savedAt: new Date().toISOString()
  };

  localStorage.setItem('kanji-progress', JSON.stringify(sessionProgress));
  saveSessionToList(sessionProgress);
}

function restoreProgressSnapshot() {
  const progress = loadProgressSnapshot();
  if (!progress) return;

  const validLevels = ['N5', 'N4', 'N3', 'N2', 'N1'];
  const validLanguages = ['en', 'phil', 'id', 'ne', 'ko', 'vi'];

  if (levelSelect && validLevels.includes(progress.level)) {
    levelSelect.value = progress.level;
  }

  if (languageSelect && validLanguages.includes(progress.language)) {
    languageSelect.value = progress.language;
  }

  updatePracticeTopLabel();
  updateMetaLabels();
  updateActionLabels();
}

function setProgressModalState({ title, message, confirmText, cancelText, confirmAction }) {
  if (saveProgressTitle) saveProgressTitle.textContent = title;
  if (saveProgressMessage) saveProgressMessage.textContent = message;
  if (saveProgressYes) saveProgressYes.textContent = confirmText;
  if (saveProgressNo) saveProgressNo.textContent = cancelText;

  if (saveProgressYes) {
    saveProgressYes.onclick = () => {
      if (confirmAction) confirmAction();
      hideSaveProgressPrompt();
    };
  }

  if (saveProgressModal) {
    saveProgressModal.classList.add('is-open');
  }
}

function showSaveProgressPrompt() {
  setProgressModalState({
    title: 'Save progress?',
    message: 'Your last session can be restored when you return.',
    confirmText: 'Save',
    cancelText: 'No',
    confirmAction: () => {
      saveProgressSnapshot();
      renderQuizCard();
    }
  });
}

function showResumeProgressPrompt() {
  setProgressModalState({
    title: 'Resume from last saved session?',
    message: 'Your previous progress is available on this device. Continue where you left off?',
    confirmText: 'Resume',
    cancelText: 'Start fresh',
    confirmAction: () => {
      restoreProgressSnapshot();
      renderQuizCard();
    }
  });
}

function hideSaveProgressPrompt() {
  if (saveProgressModal) {
    saveProgressModal.classList.remove('is-open');
  }
}

window.addEventListener('beforeunload', (event) => {
  const activeElement = document.activeElement;
  const isFeedbackClick =
    (activeElement && activeElement.closest && activeElement.closest('.menu-feedback')) ||
    (event.target && event.target.closest && event.target.closest('.menu-feedback'));

  if (isFeedbackClick) {
    return;
  }

  saveProgressSnapshot();
  const message = 'Save your Kanji practice progress before closing?';
  event.preventDefault();
  event.returnValue = message;
  return message;
});

window.addEventListener('pagehide', () => {
  saveProgressSnapshot();
});

window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    saveProgressSnapshot();
  }
});

if (saveProgressNo) {
  saveProgressNo.addEventListener('click', () => {
    if (saveProgressModal && saveProgressModal.classList.contains('is-open')) {
      const titleText = saveProgressTitle ? saveProgressTitle.textContent : '';
      if (titleText.includes('Resume')) {
        try { localStorage.removeItem('kanji-progress'); } catch (error) { /* ignore */ }
      }
    }
    hideSaveProgressPrompt();
    try { renderQuizCard(); } catch (error) { /* keep UI alive */ }
  });
} else {
  // If modal buttons are missing, never block startup quiz rendering.
  try { hideSaveProgressPrompt(); } catch (error) { /* ignore */ }
}

try {
  applySettings();
} catch (error) { /* keep UI alive so buttons still bind below */ }
try {
  if (Object.keys(loadProgressSnapshot()).length > 0) {
    setTimeout(() => showResumeProgressPrompt(), 200);
  } else {
    renderQuizCard();
  }
} catch (error) {
  try { renderQuizCard(); } catch (innerError) { /* ignore */ }
}

try {
  if (typeof loadKanjiData === 'function') loadKanjiData();
} catch (error) { /* offline data already available */ }

if (menuButton && sideMenu) {
menuButton.addEventListener('click', (event) => {
  if (event) event.stopPropagation();
  sideMenu.classList.toggle('is-open');
});
}

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!sideMenu || !menuButton) return;
  const clickedInsideMenu = sideMenu.contains(target);
  const clickedMenuButton = menuButton.contains(target);

  if (!clickedInsideMenu && !clickedMenuButton && sideMenu.classList.contains('is-open')) {
    sideMenu.classList.remove('is-open');
  }
});

if (closePanel && settingsPanel) {
closePanel.addEventListener('click', () => {
  settingsPanel.classList.remove('is-open');
});
}

if (closeProgressPanel && progressPanel) {
  closeProgressPanel.addEventListener('click', () => {
    progressPanel.classList.remove('is-open');
  });
}

if (progressPanel) {
  progressPanel.addEventListener('click', (event) => {
    if (event.target === progressPanel) {
      progressPanel.classList.remove('is-open');
    }
  });
}

if (savedSessionPanel) {
  savedSessionPanel.addEventListener('click', (event) => {
    if (event.target === savedSessionPanel) {
      savedSessionPanel.classList.remove('is-open');
    }
  });
}

menuItems.forEach((item) => {
  item.addEventListener('click', () => {
    menuItems.forEach((button) => button.classList.remove('active'));
    item.classList.add('active');

    if (item.dataset.panel === 'settings') {
      settingsPanel.classList.add('is-open');
      if (progressPanel) progressPanel.classList.remove('is-open');
      savedSessionPanel.classList.remove('is-open');
      sideMenu.classList.remove('is-open');
      return;
    }

    if (item.dataset.panel === 'progress') {
      renderProgressPanel();
      if (progressPanel) progressPanel.classList.add('is-open');
      settingsPanel.classList.remove('is-open');
      savedSessionPanel.classList.remove('is-open');
      sideMenu.classList.remove('is-open');
      return;
    }

    if (item.dataset.panel === 'saved') {
      renderSavedSessions();
      savedSessionPanel.classList.add('is-open');
      settingsPanel.classList.remove('is-open');
      if (progressPanel) progressPanel.classList.remove('is-open');
      sideMenu.classList.remove('is-open');
      return;
    }

    if (item.dataset.panel === 'home') {
      savedSessionPanel.classList.remove('is-open');
      settingsPanel.classList.remove('is-open');
      if (progressPanel) progressPanel.classList.remove('is-open');
    }

    sideMenu.classList.remove('is-open');
  });
});

if (soundToggle) {
soundToggle.addEventListener('click', () => {
  const enabled = !soundToggle.classList.contains('active');
  saveSettings({ sound: enabled });
});
}

if (vibrationToggle) {
vibrationToggle.addEventListener('click', () => {
  const enabled = !vibrationToggle.classList.contains('active');
  saveSettings({ vibration: enabled });
});
}

if (backgroundSelect) {
backgroundSelect.addEventListener('change', (event) => {
  saveSettings({ theme: event.target.value });
});
}

if (levelSelect) {
  const updateLevel = (val) => {
    saveSettings({ level: val });
    updatePracticeTopLabel();
    renderQuizCard();
  };
  levelSelect.addEventListener('change', (e) => updateLevel(e.target.value));
  levelSelect.addEventListener('input', (e) => updateLevel(e.target.value));
}

if (languageSelect) {
  languageSelect.addEventListener('change', (event) => {
    saveSettings({ language: event.target.value });
    updatePracticeTopLabel();
    updateMetaLabels();
    updateActionLabels();
    renderQuizCard();
  });
}

const revealTranslation = () => {
  if (kanjiMeta) {
    kanjiMeta.classList.remove('hidden');
  }
  try { refreshHelperLimitUI(); } catch (e) { /* ignore */ }
  // If Settings > Sound is ON, auto-play kanji pronunciation when meaning shows.
  try {
    let soundOn = true;
    try {
      const s = loadSettings();
      soundOn = !(s && s.sound === false);
    } catch (e) { soundOn = true; }
    if (soundOn && typeof speakKanjiReading === 'function') {
      const kanjiAtReveal = currentKanjiChar;
      setTimeout(() => {
        try {
          if (currentKanjiChar !== kanjiAtReveal) return;
          if (kanjiMeta && kanjiMeta.classList.contains('hidden')) return;
          speakKanjiReading(true);
        } catch (e) { /* ignore */ }
      }, 300);
    }
  } catch (error) { /* never break UI */ }
};

function isAnswerRevealed() {
  try {
    return !!(kanjiMeta && !kanjiMeta.classList.contains('hidden'));
  } catch (e) { return false; }
}

function getHelperUsage() {
  const day = (typeof todayKey === 'function') ? todayKey() : '';
  try {
    const stored = JSON.parse(localStorage.getItem(PRE_ANSWER_LIMIT_KEY) || '{}');
    if (stored && typeof stored === 'object' && stored.day === day && stored.used && typeof stored.used === 'object') {
      return { day, used: { speaker: Number(stored.used.speaker) || 0, hint: Number(stored.used.hint) || 0, next: Number(stored.used.next) || 0 } };
    }
  } catch (e) { /* fall through */ }
  return { day, used: { speaker: 0, hint: 0, next: 0 } };
}

function setHelperUsage(used) {
  try {
    const day = (typeof todayKey === 'function') ? todayKey() : '';
    localStorage.setItem(PRE_ANSWER_LIMIT_KEY, JSON.stringify({ day, used }));
  } catch (e) { /* never break UI */ }
}

function remainingHelperUses(kind) {
  const { used } = getHelperUsage();
  return Math.max(0, PRE_ANSWER_LIMIT - (Number(used[kind]) || 0));
}

function showLimitToast(message) {
  try {
    const toast = document.getElementById('limitToast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    if (limitToastTimer) clearTimeout(limitToastTimer);
    limitToastTimer = setTimeout(() => { toast.classList.remove('show'); }, 2200);
  } catch (e) { /* ignore */ }
}

function refreshHelperLimitUI() {
  try {
    const { used } = getHelperUsage();
    const revealed = isAnswerRevealed();
    document.querySelectorAll('[data-limit-badge]').forEach((badge) => {
      const kind = badge.getAttribute('data-limit-badge');
      const left = Math.max(0, PRE_ANSWER_LIMIT - (Number(used[kind]) || 0));
      badge.textContent = revealed ? '∞' : String(left);
    });
    if (actionBarButtons && typeof actionBarButtons.forEach === 'function') {
      // actionBarButtons: [write, speaker, hint, next]
      const map = [null, 'speaker', 'hint', 'next'];
      actionBarButtons.forEach((btn, idx) => {
        if (!btn || !map[idx]) return;
        const left = Math.max(0, PRE_ANSWER_LIMIT - (Number(used[map[idx]]) || 0));
        btn.classList.toggle('is-limit-over', !revealed && left <= 0);
      });
    }
  } catch (e) { /* never break UI */ }
}

// Returns true if helper may run now; consumes one daily use only when the
// answer is still hidden. After reveal the helpers are unlimited.
function tryConsumeHelperUse(kind) {
  try {
    if (isAnswerRevealed()) return true;
    const { used } = getHelperUsage();
    const left = Math.max(0, PRE_ANSWER_LIMIT - (Number(used[kind]) || 0));
    if (left <= 0) {
      showLimitToast("Today's limit finished.");
      try { if (navigator.vibrate) navigator.vibrate([40, 40, 40]); } catch (e) { /* ignore */ }
      refreshHelperLimitUI();
      return false;
    }
    used[kind] = (Number(used[kind]) || 0) + 1;
    setHelperUsage(used);
    refreshHelperLimitUI();
    return true;
  } catch (e) { return true; }
};

let meaningRequestId = 0;

async function fetchOnlineMeaning(value, language) {
  const langMap = window.MEANING_API_LANG || {};
  const apiLang = langMap[language] || 'en';
  if (!value || language === 'en' || apiLang === 'en') return null;
  const cacheKey = `${language}|${value}`;
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(value)}&langpair=en|${apiLang}`
    );
    if (!res.ok) return null;
    const payload = await res.json();
    const translated = payload && payload.responseData && payload.responseData.translatedText;
    if (!translated || /MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID/i.test(translated)) return null;
    const cache = getMeaningCache();
    cache[cacheKey] = translated;
    setMeaningCache(cache);
    return translated;
  } catch (error) {
    return null;
  }
}

function enhanceMeaningTranslation(card) {
  if (!card || !metaRows || metaRows.length < 3) return;
  const language = (languageSelect && languageSelect.value) || 'en';
  const source = card.meaning || '';
  if (language === 'en' || !source) return;
  const requestId = ++meaningRequestId;
  const valueEl = metaRows[1] && metaRows[1].children ? metaRows[1].children[1] : null;
  if (!valueEl) return;
  fetchOnlineMeaning(source, language).then((translated) => {
    if (requestId !== meaningRequestId) return;
    if (!translated) return;
    if ((languageSelect && languageSelect.value) !== language) return;
    if (currentKanjiChar !== (card.kanji || '')) return;
    valueEl.textContent = translated;
  });
}

function renderQuizCard() {
  if (autoNextTimer) {
    clearTimeout(autoNextTimer);
    autoNextTimer = null;
  }

  const currentPool = getCurrentKanjiPool();
  if (!currentPool || currentPool.length === 0) {
    if (kanjiWord) kanjiWord.textContent = '—';
    if (kanjiMeta) kanjiMeta.classList.add('hidden');
    return;
  }

  const card = currentPool[Math.floor(Math.random() * currentPool.length)];

  currentKanjiChar = card.kanji || '';
  try { window.__currentQuizCard = card; } catch (e) { /* ignore */ }
  try {
    const hintBoxEl = document.getElementById('hintBox');
    if (hintBoxEl) { hintBoxEl.hidden = true; hintBoxEl.textContent = ''; hintBoxEl.dataset.kanji = ''; }
  } catch (e) { /* ignore */ }

  if (kanjiWord) {
    kanjiWord.textContent = card.kanji || '—';
  }

  if (metaRows.length >= 3) {
    metaRows[0].children[1].textContent = card.reading || '—';
    metaRows[1].children[1].textContent = localizedMeaning(card.meaning) || '—';
    metaRows[2].children[1].textContent = card.example || '—';
    enhanceMeaningTranslation(card);
  }

  const allPools = [n5Kanji, n4Kanji, n3Kanji, n2Kanji, n1Kanji]
    .filter(Array.isArray)
    .flat();

  const uniqueReadings = [...new Set(
    allPools
      .map((item) => item && item.reading)
      .filter((value) => typeof value === 'string' && value.trim())
  )];

  const wrongReadings = [...new Set(
    currentPool
      .map((item) => item && item.reading)
      .filter((value) => typeof value === 'string' && value.trim() && value !== (card.reading || ''))
  )];

  const candidateDistractors = [...wrongReadings, ...uniqueReadings.filter((value) => value !== (card.reading || ''))]
    .filter((value, index, array) => value && array.indexOf(value) === index);

  const distractors = candidateDistractors
    .filter((value) => value !== (card.reading || ''))
    .slice(0, 9);

  const fallbackOptions = ['にほんご', 'みず', 'やま', 'きょう', 'あめ', 'おはよう'];
  const choicePool = [card.reading || '', ...distractors, ...fallbackOptions]
    .filter((value, index, array) => typeof value === 'string' && value.trim() && array.indexOf(value) === index)
    .filter((value) => value !== (card.reading || ''));

  const choices = [card.reading || '', ...choicePool]
    .filter((value, index, array) => value && array.indexOf(value) === index)
    .slice(0, 4)
    .sort(() => Math.random() - 0.5);

  answerButtons.forEach((button, index) => {
    button.textContent = choices[index] || '';
    button.disabled = false;
    button.classList.remove('correct', 'wrong', 'selected');
    button.dataset.isCorrect = button.textContent === card.reading ? 'true' : 'false';
  });

  wrongAttempts = 0;

  if (kanjiMeta) {
    kanjiMeta.classList.add('hidden');
  }
  try { refreshHelperLimitUI(); } catch (e) { /* ignore */ }
}

async function loadLevelFromPublicSource(levelName) {
  const sourceUrl = publicLevelSource[levelName];
  if (!sourceUrl) return [];

  try {
    const response = await fetch(sourceUrl, { cache: 'no-store' });
    if (!response.ok) return [];
    const payload = await response.json();
    return normalizeLevelPayload(payload);
  } catch (error) {
    return [];
  }
}

function loadLocalLevelFallback(levelName) {
  const localDataMap = {
    N5: window.KANJI_N5_DATA,
    N4: window.KANJI_N4_DATA,
    N3: window.KANJI_N3_DATA,
    N2: window.KANJI_N2_DATA,
    N1: window.KANJI_N1_DATA
  };

  const localData = localDataMap[levelName];
  if (Array.isArray(localData) && localData.length > 0) {
    return localData;
  }

  return [];
}

function loadLocalJsonFallback(levelName, url) {
  return new Promise((resolve) => {
    const request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.onreadystatechange = function () {
      if (request.readyState !== 4) return;

      if (request.status >= 200 && request.status < 300) {
        try {
          const payload = JSON.parse(request.responseText);
          resolve(normalizeLevelPayload(payload));
        } catch (error) {
          resolve([]);
        }
        return;
      }

      resolve([]);
    };
    request.send();
  });
}

async function loadKanjiData() {
  const sourceResults = await Promise.all(
    Object.keys(publicLevelSource).map(async (levelName) => {
      const publicPool = await loadLevelFromPublicSource(levelName);
      if (publicPool.length > 0) {
        if (levelName === 'N5') n5Kanji = publicPool;
        if (levelName === 'N4') n4Kanji = publicPool;
        if (levelName === 'N3') n3Kanji = publicPool;
        if (levelName === 'N2') n2Kanji = publicPool;
        if (levelName === 'N1') n1Kanji = publicPool;
      }
    })
  );

  const fallbackSources = {
    N5: 'kanji-n5-data.json',
    N4: 'kanji-n4-data.json',
    N3: 'kanji-n3-data.json',
    N2: 'kanji-n2-data.json',
    N1: 'kanji-n1-data.json'
  };

  const fallbackResults = await Promise.all(
    Object.keys(fallbackSources).map(async (levelName) => {
      const fallbackPool = loadLocalLevelFallback(levelName);
      if (fallbackPool.length > 0) {
        if (levelName === 'N5') n5Kanji = fallbackPool;
        if (levelName === 'N4') n4Kanji = fallbackPool;
        if (levelName === 'N3') n3Kanji = fallbackPool;
        if (levelName === 'N2') n2Kanji = fallbackPool;
        if (levelName === 'N1') n1Kanji = fallbackPool;
        return;
      }

      const jsonPool = await loadLocalJsonFallback(levelName, fallbackSources[levelName]);
      if (jsonPool.length > 0) {
        if (levelName === 'N5') n5Kanji = jsonPool;
        if (levelName === 'N4') n4Kanji = jsonPool;
        if (levelName === 'N3') n3Kanji = jsonPool;
        if (levelName === 'N2') n2Kanji = jsonPool;
        if (levelName === 'N1') n1Kanji = jsonPool;
      }
    })
  );

  renderQuizCard();
}

answerButtons.forEach((button) => {
  button.addEventListener('click', () => {
    if (button.disabled) return;

    const scheduleAutoNext = () => {
      if (autoNextTimer) {
        clearTimeout(autoNextTimer);
      }
      autoNextTimer = setTimeout(() => {
        autoNextTimer = null;
        renderQuizCard();
      }, AUTO_NEXT_DELAY);
    };

    const correctButton = [...answerButtons].find((option) => option.dataset.isCorrect === 'true');

    if (button.dataset.isCorrect === 'true') {
      // Green hit -> lock everything + show meaning section + auto next
      answerButtons.forEach((option) => {
        option.disabled = true;
      });
      button.classList.add('correct', 'selected');
      revealTranslation();
      scheduleAutoNext();
    } else {
      // Wrong -> red only on clicked button, keep other 2 options clickable
      wrongAttempts += 1;
      button.disabled = true;
      button.classList.add('wrong', 'selected');

      if (wrongAttempts >= 3) {
        // 3rd attempt fail -> lock everything, show correct green + meaning section + auto next
        answerButtons.forEach((option) => {
          option.disabled = true;
        });
        if (correctButton) {
          correctButton.classList.add('correct');
        }
        revealTranslation();
        scheduleAutoNext();
      }
    }
  });
});

function speakKanjiReading(skipLimit) {
  try {
    // Gated by daily pre-answer limit unless bypassed (auto-play after reveal).
    if (skipLimit !== true && typeof tryConsumeHelperUse === 'function') {
      if (!tryConsumeHelperUse('speaker')) return;
    }
    const synth = window.speechSynthesis;
    if (!synth) return;
    const card = (typeof window !== 'undefined' && window.__currentQuizCard) || null;
    const text = (card && card.reading) || currentKanjiChar || (kanjiWord ? kanjiWord.textContent : '');
    if (!text || !text.trim()) return;
    try {
      const s = loadSettings();
      if (s && s.sound === false) return;
    } catch (e) { /* ignore, still speak */ }
    const cleanText = text.trim();
    let wasBusy = false;
    try { wasBusy = !!(synth.speaking || synth.pending); } catch (e) { wasBusy = false; }
    // NOTE: unconditional cancel() right before speak() swallows the new
    // utterance on some Chrome builds — only cancel when something is playing.
    try { if (wasBusy) synth.cancel(); } catch (e) { /* ignore */ }
    const doSpeak = () => {
      try {
        const utter = new SpeechSynthesisUtterance(cleanText);
        utter.lang = 'ja-JP';
        utter.rate = 0.85;
        utter.pitch = 1;
        try {
          const voices = synth.getVoices ? synth.getVoices() : [];
          const ja = voices.find((v) => (v.lang || '').toLowerCase().startsWith('ja'));
          if (ja) utter.voice = ja;
        } catch (e) { /* ignore */ }
        try { synth.resume(); } catch (e) { /* ignore */ }
        synth.speak(utter);
      } catch (e) { /* ignore */ }
    };
    if (wasBusy) setTimeout(doSpeak, 80);
    else doSpeak();
    try { if (navigator.vibrate) navigator.vibrate(10); } catch (e) { /* ignore */ }
  } catch (error) { /* never break UI */ }
}

function toggleHintSentence() {
  try {
    const box = document.getElementById('hintBox');
    if (!box) return;
    if (!box.hidden && box.dataset.kanji === currentKanjiChar && box.textContent) {
      box.hidden = true;
      return;
    }
    // Opening a hint consumes one daily pre-answer use (unlimited after reveal).
    if (typeof tryConsumeHelperUse === 'function') {
      if (!tryConsumeHelperUse('hint')) return;
    }
    const card = (typeof window !== 'undefined' && window.__currentQuizCard) || null;
    let sentence = '';
    try {
      if (typeof window.buildHintSentence === 'function') sentence = window.buildHintSentence(card) || '';
    } catch (e) { sentence = ''; }
    if (!sentence && card && card.kanji) sentence = '「' + card.kanji + '」 という ことば です。';
    if (!sentence) return;
    box.textContent = '💡 ' + sentence;
    box.dataset.kanji = currentKanjiChar;
    box.hidden = false;
    try { if (navigator.vibrate) navigator.vibrate(10); } catch (e) { /* ignore */ }
  } catch (error) { /* never break UI */ }
}

// ---- Stroke order viewer (KanjiVG) ----
const strokeState = { paths: [], current: 0, kanji: '', playTimer: null, cache: {} };

function stopStrokePlay() {
  try {
    if (strokeState.playTimer) clearInterval(strokeState.playTimer);
  } catch (e) { /* ignore */ }
  strokeState.playTimer = null;
  try {
    const playBtn = document.getElementById('strokePlay');
    if (playBtn) playBtn.textContent = '▶';
  } catch (e) { /* ignore */ }
}

function paintStrokeFrame() {
  try {
    const svg = document.getElementById('strokeSvg');
    const countEl = document.getElementById('strokeCount');
    const prevBtn = document.getElementById('strokePrev');
    const nextBtn = document.getElementById('strokeNext');
    const total = strokeState.paths.length;
    const shown = Math.max(0, Math.min(strokeState.current, total));
    if (svg) {
      const strokes = svg.querySelectorAll('.kvg-stroke');
      strokes.forEach((el, idx) => {
        el.classList.toggle('done', idx < shown - 1);
        el.classList.toggle('current', idx === shown - 1);
        el.style.display = idx < shown ? '' : 'none';
      });
      const numbers = svg.querySelectorAll('.kvg-number');
      numbers.forEach((el, idx) => {
        el.style.display = idx < shown ? '' : 'none';
      });
    }
    if (countEl) countEl.textContent = total ? (shown + ' / ' + total + ' strokes') : '';
    if (prevBtn) prevBtn.disabled = shown <= 1;
    if (nextBtn) nextBtn.disabled = shown >= total;
  } catch (e) { /* never break UI */ }
}

function renderStrokeSvg(paths) {
  const svg = document.getElementById('strokeSvg');
  if (!svg) return;
  const NS = 'http://www.w3.org/2000/svg';
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  paths.forEach((d) => {
    try {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      p.setAttribute('class', 'kvg-stroke');
      svg.appendChild(p);
    } catch (e) { /* ignore one bad stroke */ }
  });
  paths.forEach((d, idx) => {
    try {
      const m = /M\s*(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/i.exec(d || '');
      if (!m) return;
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('x', String(Number(m[1]) - 3));
      t.setAttribute('y', String(Number(m[2]) - 3));
      t.setAttribute('class', 'kvg-number');
      t.textContent = String(idx + 1);
      svg.appendChild(t);
    } catch (e) { /* ignore */ }
  });
}

function kanjiToCodepointHex(kanji) {
  try {
    const ch = String(kanji || '').trim().charAt(0);
    if (!ch) return '';
    const cp = ch.codePointAt(0);
    if (!cp) return '';
    return cp.toString(16).padStart(5, '0');
  } catch (e) { return ''; }
}

async function fetchKanjiVgPaths(kanji) {
  const code = kanjiToCodepointHex(kanji);
  if (!code) return null;
  if (strokeState.cache[code]) return strokeState.cache[code];
  const urls = [
    'https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/' + code + '.svg',
    'https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/' + code + '.svg'
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'force-cache' });
      if (!res.ok) continue;
      const text = await res.text();
      const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
      const found = Array.from(doc.querySelectorAll('path'))
        .map((p) => p.getAttribute('d'))
        .filter((d) => typeof d === 'string' && d.length > 4);
      if (found.length > 0) {
        strokeState.cache[code] = found;
        return found;
      }
    } catch (e) { /* try next CDN */ }
  }
  return null;
}

async function openStrokeModal() {
  try {
    stopStrokePlay();
    const modal = document.getElementById('strokeModal');
    const loading = document.getElementById('strokeLoading');
    const label = document.getElementById('strokeKanjiLabel');
    const card = (typeof window !== 'undefined' && window.__currentQuizCard) || null;
    const kanjiChar = (card && card.kanji) || currentKanjiChar || '';
    if (!kanjiChar) {
      showLimitToast('No kanji selected yet.');
      return;
    }
    if (label) label.textContent = kanjiChar;
    if (modal) {
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
    }
    if (loading) loading.style.display = 'flex';
    const paths = await fetchKanjiVgPaths(kanjiChar);
    if (loading) loading.style.display = 'none';
    const svg = document.getElementById('strokeSvg');
    const countEl = document.getElementById('strokeCount');
    if (!paths || !paths.length) {
      if (svg) while (svg.firstChild) svg.removeChild(svg.firstChild);
      if (countEl) countEl.textContent = 'Stroke data unavailable offline.';
      showLimitToast('Stroke order needs internet once.');
      return;
    }
    strokeState.paths = paths;
    strokeState.kanji = kanjiChar;
    renderStrokeSvg(paths);
    playStrokeOrder();
    try { if (navigator.vibrate) navigator.vibrate(10); } catch (e) { /* ignore */ }
  } catch (error) { /* never break UI */ }
}

function playStrokeOrder() {
  try {
    stopStrokePlay();
    const total = strokeState.paths.length;
    if (!total) return;
    const playBtn = document.getElementById('strokePlay');
    strokeState.current = 0;
    paintStrokeFrame();
    if (playBtn) playBtn.textContent = '⏸';
    strokeState.playTimer = setInterval(() => {
      strokeState.current += 1;
      paintStrokeFrame();
      if (strokeState.current >= total) stopStrokePlay();
    }, 650);
  } catch (e) { /* never break UI */ }
}

function closeStrokeModal() {
  try {
    stopStrokePlay();
    const modal = document.getElementById('strokeModal');
    if (modal) {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    }
  } catch (e) { /* never break UI */ }
}

try {
  const strokeCloseBtn = document.getElementById('strokeClose');
  if (strokeCloseBtn) strokeCloseBtn.addEventListener('click', closeStrokeModal);
  const strokeBackdrop = document.getElementById('strokeBackdrop');
  if (strokeBackdrop) strokeBackdrop.addEventListener('click', closeStrokeModal);
  const strokePrev = document.getElementById('strokePrev');
  if (strokePrev) strokePrev.addEventListener('click', () => {
    try {
      stopStrokePlay();
      strokeState.current = Math.max(1, strokeState.current - 1);
      paintStrokeFrame();
    } catch (e) { /* ignore */ }
  });
  const strokeNext = document.getElementById('strokeNext');
  if (strokeNext) strokeNext.addEventListener('click', () => {
    try {
      stopStrokePlay();
      strokeState.current = Math.min(strokeState.paths.length, strokeState.current + 1);
      paintStrokeFrame();
    } catch (e) { /* ignore */ }
  });
  const strokePlay = document.getElementById('strokePlay');
  if (strokePlay) strokePlay.addEventListener('click', () => {
    try {
      if (strokeState.playTimer) { stopStrokePlay(); return; }
      if (strokeState.current >= strokeState.paths.length) playStrokeOrder();
      else {
        stopStrokePlay();
        strokePlay.textContent = '⏸';
        strokeState.playTimer = setInterval(() => {
          strokeState.current += 1;
          paintStrokeFrame();
          if (strokeState.current >= strokeState.paths.length) stopStrokePlay();
        }, 650);
      }
    } catch (e) { /* ignore */ }
  });
  const strokeReplay = document.getElementById('strokeReplay');
  if (strokeReplay) strokeReplay.addEventListener('click', playStrokeOrder);
} catch (e) { /* never break UI */ }

if (actionBarButtons.length >= 4) {
  // 1st button (✏️) — show stroke-order animation for the current kanji
  try {
    actionBarButtons[0].addEventListener('click', () => {
      openStrokeModal();
    });
  } catch (e) { /* never break UI */ }
  // 2nd button (🔊) — speak current kanji reading (Japanese pronunciation)
  try {
    actionBarButtons[1].addEventListener('click', () => {
      speakKanjiReading();
    });
  } catch (e) { /* never break UI */ }
  try {
    actionBarButtons[2].addEventListener('click', () => {
      toggleHintSentence();
    });
  } catch (e) { /* never break UI */ }
  actionBarButtons[3].addEventListener('click', () => {
    // Skipping to next before answering consumes one daily pre-answer use.
    if (typeof tryConsumeHelperUse === 'function') {
      if (!tryConsumeHelperUse('next')) return;
    }
    if (autoNextTimer) {
      clearTimeout(autoNextTimer);
      autoNextTimer = null;
    }
    renderQuizCard();
  });
}

if (fontSizeRange) {
fontSizeRange.addEventListener('input', (event) => {
  saveSettings({ fontSize: Number(event.target.value) });
});
}
navItems.forEach((item) => {
  item.addEventListener('click', () => {
    navItems.forEach((button) => button.classList.remove('active'));
    item.classList.add('active');
    if (item.textContent.includes('設定')) {
      if (settingsPanel) settingsPanel.classList.add('is-open');
    }
  });
});

try {
  applySettings();
} catch (error) { /* keep UI alive */ }
try { refreshHelperLimitUI(); } catch (error) { /* ignore */ }
try {
  if (Object.keys(loadProgressSnapshot()).length > 0) {
    setTimeout(() => showResumeProgressPrompt(), 200);
  } else {
    renderQuizCard();
  }
} catch (error) {
  try { renderQuizCard(); } catch (innerError) { /* ignore */ }
}
