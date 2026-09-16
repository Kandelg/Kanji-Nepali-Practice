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
const offlinePanel = document.getElementById('offlinePanel');
const closeOfflinePanel = document.getElementById('closeOfflinePanel');
const offlineStatus = document.getElementById('offlineStatus');
const offlineLevel = document.getElementById('offlineLevel');
const offlineLang = document.getElementById('offlineLang');
const offlineDownloadBtn = document.getElementById('offlineDownloadBtn');
const offlinePackList = document.getElementById('offlinePackList');
const offlineModeToggle = document.getElementById('offlineModeToggle');
const soundToggle = document.getElementById('soundToggle');
const vibrationToggle = document.getElementById('vibrationToggle');
const backgroundSelect = document.getElementById('backgroundSelect');
const fontSizeRange = document.getElementById('fontSizeRange');
const autoNextDelaySelect = document.getElementById('autoNextDelaySelect');
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

function isDeviceOffline() {
  try {
    return typeof navigator !== 'undefined' && navigator.onLine === false;
  } catch (error) {
    return false;
  }
}

function shouldUseOfflinePack() {
  // Rule: online हुँदा सधैं online data use हुन्छ (offline data होइन);
  // offline हुँदा मात्र (र toggle ON भए) downloaded pack बाट चल्छ।
  if (!isDeviceOffline()) return false;
  return isOfflineModePreferred();
}

function getCurrentKanjiPool() {
  const selectedLevel = levelSelect ? levelSelect.value : 'N5';

  if (shouldUseOfflinePack()) {
    const offline = resolveOfflinePool(selectedLevel);
    if (offline && Array.isArray(offline.entries) && offline.entries.length > 0) {
      return offline.entries;
    }
    // Offline but no pack yet -> fall through to bundled in-memory data.
  }

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
  language: 'en',
  autoNextDelay: 4
};

const AUTO_NEXT_DELAY_OPTIONS = [3, 4, 5, 6];

function getAutoNextDelay() {
  try {
    const s = loadSettings();
    const v = Number(s && s.autoNextDelay);
    if (AUTO_NEXT_DELAY_OPTIONS.includes(v)) return v * 1000;
  } catch (e) { /* fall through to default */ }
  return 4000;
}

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

const streakTitles = {
  en: (today, streak) => `Correct today: ${today} · Streak: ${streak}`,
  phil: (today, streak) => `Tama ngayon: ${today} · Sunod-sunod: ${streak}`,
  id: (today, streak) => `Benar hari ini: ${today} · Beruntun: ${streak}`,
  ne: (today, streak) => `आज मिलेको: ${today} · लगातार: ${streak}`,
  ko: (today, streak) => `오늘 정답: ${today} · 연속: ${streak}`,
  vi: (today, streak) => `Đúng hôm nay: ${today} · Chuỗi: ${streak}`
};

function getStreakTitle(todayCount, streakCount) {
  const activeLanguage = (languageSelect && languageSelect.value) || 'en';
  const formatter = streakTitles[activeLanguage] || streakTitles.en;
  return formatter(todayCount, streakCount);
}

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
  if (autoNextDelaySelect) {
    const delayVal = Number(settings.autoNextDelay);
    autoNextDelaySelect.value = AUTO_NEXT_DELAY_OPTIONS.includes(delayVal) ? String(delayVal) : String(defaults.autoNextDelay);
  }
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
      if (entry.kanji) seenKanji.add(entry.kanji);
    } else if (entry.correct === false && entry.kanji) {
      forgottenKanji.add(entry.kanji);
    }
  });

  return {
    attempts: recent.length,
    firstTryCorrect: seenKanji.size,
    masteredKanji: seenKanji.size,
    forgottenKanji: [...forgottenKanji].filter((kanji) => !seenKanji.has(kanji))
  };
}

function getTodayStartTime() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setHours(0, 0, 0, 0);
  return start.getTime();
}

function getYesterdayFirstAttemptCount() {
  const log = getFirstAttemptLog();
  const todayStart = getTodayStartTime();
  const yesterdayStart = new Date(todayStart);
  const yesterdayDate = new Date(yesterdayStart);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStartTime = yesterdayDate.getTime();
  // Kanji already matched correctly BEFORE yesterday => not counted again.
  const previouslyMastered = new Set();
  log.forEach((entry) => {
    if (entry && entry.correct === true && entry.kanji && entry.at < yesterdayStartTime) {
      previouslyMastered.add(entry.kanji);
    }
  });
  const uniqueKanji = new Set();
  log.forEach((entry) => {
    if (entry && entry.correct === true && entry.kanji &&
        entry.at >= yesterdayStartTime && entry.at < todayStart &&
        !previouslyMastered.has(entry.kanji)) {
      uniqueKanji.add(entry.kanji);
    }
  });
  return uniqueKanji.size;
}

function getTodayFirstAttemptCount() {
  const log = getFirstAttemptLog();
  const todayStart = getTodayStartTime();
  // Kanji already matched correctly BEFORE today => not counted again.
  const previouslyMastered = new Set();
  log.forEach((entry) => {
    if (entry && entry.correct === true && entry.kanji && entry.at < todayStart) {
      previouslyMastered.add(entry.kanji);
    }
  });
  const uniqueKanji = new Set();
  log.forEach((entry) => {
    if (entry && entry.correct === true && entry.kanji &&
        entry.at >= todayStart && !previouslyMastered.has(entry.kanji)) {
      uniqueKanji.add(entry.kanji);
    }
  });
  return uniqueKanji.size;
}

function getTodayAccuracyStats() {
  // Accuracy = first-attempt correct / total first attempts, for TODAY.
  const log = getFirstAttemptLog();
  const today = todayKey();
  const entries = log.filter((entry) => entry && entry.day === today && typeof entry.correct === 'boolean');
  const total = entries.length;
  const correct = entries.filter((entry) => entry.correct === true).length;
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
  return { total, correct, percent };
}

function getCurrentStreak() {
  // Trailing run of correct first attempts (across days, newest -> oldest).
  const log = getFirstAttemptLog();
  let streak = 0;
  for (let i = log.length - 1; i >= 0; i -= 1) {
    const entry = log[i];
    if (!entry || typeof entry.correct !== 'boolean') continue;
    if (entry.correct === true) streak += 1;
    else break;
  }
  return streak;
}

function refreshStreakBadge() {
  try {
    const badge = document.getElementById('streakBadge');
    if (!badge) return;
    // Show TODAY's total first-attempt correct count (never resets to 0 on wrong).
    const count = getTodayFirstAttemptCount();
    const streak = getCurrentStreak();
    const numEl = document.getElementById('streakNum');
    if (numEl) numEl.textContent = String(count);
    // Tooltip follows the selected language instead of always being Nepali.
    badge.title = getStreakTitle(count, streak);
  } catch (e) { /* never break UI */ }
}

function getWeekStartTime() {
  // Monday 00:00 local time = start of current week.
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = monday.getDay(); // 0=Sun ... 6=Sat
  const diffToMonday = (day + 6) % 7;
  monday.setDate(monday.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday.getTime();
}

function countWeekFirstAttempt() {
  const log = getFirstAttemptLog();
  const weekStart = getWeekStartTime();
  // Kanji already matched correctly BEFORE this week => not new this week.
  const previouslyMastered = new Set();
  log.forEach((entry) => {
    if (entry && entry.correct === true && entry.kanji && entry.at < weekStart) {
      previouslyMastered.add(entry.kanji);
    }
  });
  const uniqueKanji = new Set();
  log.forEach((entry) => {
    if (entry && entry.at >= weekStart && entry.correct === true && entry.kanji &&
        !previouslyMastered.has(entry.kanji)) {
      uniqueKanji.add(entry.kanji);
    }
  });
  return uniqueKanji.size;
}

function getWeeklyProgressText(count) {
  const lang = (languageSelect && languageSelect.value) || 'en';
  // "जस्तो: तपाईंले यो हप्ता 50 ओटा कान्जी पहिलो प्रयासमै चिन्नुभयो"
  switch (lang) {
    case 'ne':
      return count > 0
        ? `🎉 तपाईंले यो हप्ता ${count} ओटा कान्जी पहिलो प्रयासमै चिन्नुभयो!`
        : 'यो हप्ता अझै पहिलो प्रयासमै सही भएको छैन — अभ्यास जारी राख्नुहोस्! 💪';
    case 'phil':
      return count > 0
        ? `🎉 Nakilala mo ang ${count} na kanji sa unang subok ngayong linggo!`
        : 'Wala ka pang tamang sagot sa unang subok ngayong linggo — tuloy lang! 💪';
    case 'id':
      return count > 0
        ? `🎉 Kamu mengenali ${count} kanji pada percobaan pertama minggu ini!`
        : 'Belum ada jawaban benar pada percobaan pertama minggu ini — terus berlatih! 💪';
    case 'ko':
      return count > 0
        ? `🎉 이번 주에 ${count}개의 한자를 첫 시도에 맞혔어요!`
        : '이번 주에는 아직 첫 시도에 맞힌 한자가 없어요 — 계속 연습해요! 💪';
    case 'vi':
      return count > 0
        ? `🎉 Tuần này bạn đã nhận đúng ${count} chữ kanji ngay từ lần thử đầu tiên!`
        : 'Tuần này bạn chưa trả lời đúng ngay lần đầu — hãy tiếp tục luyện tập! 💪';
    default:
      return count > 0
        ? `🎉 You recognized ${count} kanji on the first attempt this week!`
        : 'No first-attempt correct answers yet this week — keep practicing! 💪';
  }
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
  const weeklyEl = document.getElementById('progressWeekly');
  const todayEl = document.getElementById('progressToday');
  const yesterdayEl = document.getElementById('progressYesterday');
  const weekEl = document.getElementById('progressWeek');
  if (!totalEl) return;

  const stats = countFirstAttemptStats(15);
  const todayCount = getTodayFirstAttemptCount();
  const yesterdayCount = getYesterdayFirstAttemptCount();
  const weekCount = countWeekFirstAttempt();

  totalEl.textContent = String(stats.firstTryCorrect);

  if (todayEl) todayEl.textContent = String(todayCount);
  if (yesterdayEl) yesterdayEl.textContent = String(yesterdayCount);
  if (weekEl) weekEl.textContent = String(weekCount);

  if (weeklyEl) {
    weeklyEl.textContent = getWeeklyProgressText(weekCount);
  }

  // Day-over-day comment (up/down vs yesterday + kanji worth a quick review).
  const commentEl = document.getElementById('progressComment');
  if (commentEl) {
    const forgottenCount = Array.isArray(stats.forgottenKanji) ? stats.forgottenKanji.length : 0;
    commentEl.textContent = getProgressComment(todayCount - yesterdayCount, forgottenCount);
  }
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

// ---- Offline packs (text-only: kanji + reading + meaning + example) ----
// Downloaded packs are stored in localStorage so practice works with no
// internet. Voice, stroke order and hint sentences still need internet.
const OFFLINE_PACK_KEY = 'kanji-offline-packs-v1';
const OFFLINE_PREF_KEY = 'kanji-offline-pref-v1';
const OFFLINE_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];
const OFFLINE_LANGS = ['en', 'phil', 'id', 'ne', 'ko', 'vi'];

// Throttled MyMemory translation (used at download time only): ~4 req/sec max.
let offlineTranslateQueue = Promise.resolve();
let offlineLastTranslateAt = 0;
function throttledTranslate(englishMeaning, lang) {
  offlineTranslateQueue = offlineTranslateQueue.then(async () => {
    const wait = Math.max(0, 280 - (Date.now() - offlineLastTranslateAt));
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    const out = await fetchOnlineMeaning(englishMeaning, lang);
    offlineLastTranslateAt = Date.now();
    return out;
  });
  return offlineTranslateQueue;
}

function getOfflinePacks() {
  try {
    const stored = JSON.parse(localStorage.getItem(OFFLINE_PACK_KEY) || '{}');
    return stored && typeof stored === 'object' ? stored : {};
  } catch (error) {
    return {};
  }
}

function getOfflinePref() {
  try {
    const stored = JSON.parse(localStorage.getItem(OFFLINE_PREF_KEY) || '{}');
    return stored && typeof stored === 'object' ? stored : {};
  } catch (error) {
    return {};
  }
}

function setOfflinePref(pref) {
  try {
    localStorage.setItem(OFFLINE_PREF_KEY, JSON.stringify(pref || {}));
  } catch (error) { /* ignore */ }
}

function isOfflineModePreferred() {
  try {
    const pref = getOfflinePref();
    if (pref.useOffline === false) return false;
    if (pref.useOffline === true) return true;
    // Default: ON once at least one pack is downloaded.
    return Object.keys(getOfflinePacks()).length > 0;
  } catch (error) {
    return false;
  }
}

function offlinePackId(level, lang) {
  return `${level}|${lang}`;
}

function getOfflinePack(level, lang) {
  try {
    const pack = getOfflinePacks()[offlinePackId(level, lang)];
    if (pack && Array.isArray(pack.entries) && pack.entries.length > 0) return pack;
  } catch (error) { /* ignore */ }
  return null;
}

function resolveOfflinePool(selectedLevel) {
  try {
    const lang = (languageSelect && languageSelect.value) || 'en';
    const exact = getOfflinePack(selectedLevel, lang);
    if (exact) return { entries: exact.entries, lang: exact.lang, level: exact.level };
    const packs = getOfflinePacks();
    const anyKey = Object.keys(packs).find((key) => key.split('|')[0] === selectedLevel && Array.isArray(packs[key].entries) && packs[key].entries.length > 0);
    if (anyKey) return { entries: packs[anyKey].entries, lang: packs[anyKey].lang, level: packs[anyKey].level };
  } catch (error) { /* ignore */ }
  return null;
}

function refreshOfflineUI() {
  try {
    const packs = getOfflinePacks();
    const keys = Object.keys(packs);
    let totalEntries = 0;
    keys.forEach((key) => {
      if (Array.isArray(packs[key].entries)) totalEntries += packs[key].entries.length;
    });
    if (offlineStatus) {
      offlineStatus.textContent = keys.length === 0
        ? 'No packs downloaded yet.'
        : `${keys.length} pack${keys.length > 1 ? 's' : ''} downloaded · ${totalEntries} words (text only).`;
    }
    if (offlinePackList) {
      offlinePackList.innerHTML = keys.sort().map((key) => {
        const pack = packs[key] || {};
        const count = Array.isArray(pack.entries) ? pack.entries.length : 0;
        return `<div class="offline-pack-row"><div><div class="offline-pack-name">${pack.level || key} · ${pack.lang || ''}</div><div class="offline-pack-meta">${count} words · text only</div></div><button type="button" data-offline-delete="${key}">Delete</button></div>`;
      }).join('');
      offlinePackList.querySelectorAll('[data-offline-delete]').forEach((btn) => {
        btn.addEventListener('click', () => {
          try {
            const packsNow = getOfflinePacks();
            delete packsNow[btn.getAttribute('data-offline-delete')];
            try {
              localStorage.setItem(OFFLINE_PACK_KEY, JSON.stringify(packsNow));
            } catch (e) { /* ignore */ }
            refreshOfflineUI();
          } catch (error) { /* ignore */ }
        });
      });
    }
    if (offlineModeToggle) {
      offlineModeToggle.textContent = `Use offline data: ${isOfflineModePreferred() ? 'ON' : 'OFF'}`;
    }
    if (offlineLevel && levelSelect && OFFLINE_LEVELS.includes(levelSelect.value)) {
      offlineLevel.value = levelSelect.value;
    }
    if (offlineLang && languageSelect && OFFLINE_LANGS.includes(languageSelect.value)) {
      offlineLang.value = languageSelect.value;
    }
  } catch (error) { /* never break UI */ }
}

function openOfflinePanel() {
  try {
    refreshOfflineUI();
    if (offlinePanel) offlinePanel.classList.add('is-open');
    if (settingsPanel) settingsPanel.classList.remove('is-open');
    if (progressPanel) progressPanel.classList.remove('is-open');
    if (savedSessionPanel) savedSessionPanel.classList.remove('is-open');
    if (sideMenu) sideMenu.classList.remove('is-open');
  } catch (error) { /* ignore */ }
}

function closeOfflinePanelUI() {
  try {
    if (offlinePanel) offlinePanel.classList.remove('is-open');
    setActiveMenuItem('home');
  } catch (error) { /* ignore */ }
}

function closeAllPanels() {
  try {
    if (settingsPanel) settingsPanel.classList.remove('is-open');
    if (progressPanel) progressPanel.classList.remove('is-open');
    if (savedSessionPanel) savedSessionPanel.classList.remove('is-open');
    if (offlinePanel) offlinePanel.classList.remove('is-open');
    setActiveMenuItem('home');
  } catch (error) { /* ignore */ }
}

async function downloadOfflinePack() {
  try {
    const level = (offlineLevel && offlineLevel.value) || (levelSelect && levelSelect.value) || 'N5';
    const lang = (offlineLang && offlineLang.value) || (languageSelect && languageSelect.value) || 'en';
    if (!OFFLINE_LEVELS.includes(level) || !OFFLINE_LANGS.includes(lang)) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      if (offlineStatus) offlineStatus.textContent = 'No internet — connect once to download.';
      return;
    }
    let pool = [];
    if (level === 'N5') pool = n5Kanji;
    else if (level === 'N4') pool = n4Kanji;
    else if (level === 'N3') pool = n3Kanji;
    else if (level === 'N2') pool = n2Kanji;
    else if (level === 'N1') pool = n1Kanji;
    if (!Array.isArray(pool) || pool.length === 0) {
      if (offlineStatus) offlineStatus.textContent = `Level ${level} data not loaded yet — wait a moment, then retry.`;
      return;
    }
    if (offlineDownloadBtn) {
      offlineDownloadBtn.disabled = true;
      offlineDownloadBtn.textContent = `⬇️ Downloading ${level}… 0/${pool.length}`;
    }
    if (offlineStatus) offlineStatus.textContent = `Downloading ${level} · ${lang}… 0/${pool.length}`;
    const entries = [];
    let done = 0;
    for (const item of pool) {
      const kanji = (item && item.kanji) || '';
      const reading = (item && item.reading) || '';
      const english = (item && item.meaning) || '';
      if (kanji && reading) {
        let meaning = english;
        if (lang !== 'en' && english) {
          let local = null;
          try {
            if (typeof offlineTranslatedMeaning === 'function') local = offlineTranslatedMeaning(english, lang);
          } catch (e) { local = null; }
          if (local && local !== english) {
            meaning = local;
          } else {
            const cache = getMeaningCache();
            const cached = cache[`${lang}|${english}`];
            if (cached) {
              meaning = cached;
            } else {
              try {
                const fetched = await throttledTranslate(english, lang);
                if (fetched) meaning = fetched;
              } catch (e) { /* keep English */ }
            }
          }
        }
        entries.push({ kanji, reading, meaning, example: (item && item.example) || '' });
      }
      done += 1;
      if (done % 5 === 0 || done === pool.length) {
        if (offlineDownloadBtn) offlineDownloadBtn.textContent = `⬇️ Downloading ${level}… ${done}/${pool.length}`;
        if (offlineStatus) offlineStatus.textContent = `Downloading ${level} · ${lang}… ${done}/${pool.length}`;
      }
    }
    const packs = getOfflinePacks();
    const packId = offlinePackId(level, lang);
    const isUpdate = !!packs[packId];
    packs[packId] = { level, lang, savedAt: Date.now(), entries };
    try {
      localStorage.setItem(OFFLINE_PACK_KEY, JSON.stringify(packs));
    } catch (quotaError) {
      if (offlineStatus) offlineStatus.textContent = 'Storage full — delete a pack, then retry.';
      return;
    }
    if (offlineStatus) offlineStatus.textContent = isUpdate
      ? `Updated ${level} · ${lang} — ${entries.length} words (text only).`
      : `Saved ${level} · ${lang} — ${entries.length} words (text only).`;
    try { showLimitToast(isUpdate ? `Offline pack updated (${level} · ${lang}).` : `Offline pack saved (${level} · ${lang}).`); } catch (e) { /* ignore */ }
    try {
      setOfflinePref({ ...(getOfflinePref() || {}), useOffline: true });
    } catch (e) { /* ignore */ }
    try { renderQuizCard(); } catch (e) { /* ignore */ }
  } finally {
    if (offlineDownloadBtn) {
      offlineDownloadBtn.disabled = false;
      offlineDownloadBtn.textContent = '⬇️ Download pack';
    }
    refreshOfflineUI();
  }
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

// NOTE: startup (applySettings + resume prompt + first card) runs exactly once,
// at the very bottom of this file, after every handler above has been bound.
// It used to run here as well, which queued the resume prompt twice.

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
  setActiveMenuItem('home');
});
}

if (closeProgressPanel && progressPanel) {
  closeProgressPanel.addEventListener('click', () => {
    progressPanel.classList.remove('is-open');
    setActiveMenuItem('home');
  });
}

if (progressPanel) {
  progressPanel.addEventListener('click', (event) => {
    if (event.target === progressPanel) {
      progressPanel.classList.remove('is-open');
      setActiveMenuItem('home');
    }
  });
}

if (savedSessionPanel) {
  savedSessionPanel.addEventListener('click', (event) => {
    if (event.target === savedSessionPanel) {
      savedSessionPanel.classList.remove('is-open');
      setActiveMenuItem('home');
    }
  });
}

// Which bottom-nav tab belongs to each side-menu panel.
const panelNavTab = {
  home: '',
  progress: 'stats',
  saved: 'record',
  settings: 'settings',
  offline: 'offline'
};

function setActiveMenuItem(panel) {
  try {
    if (menuItems && menuItems.length > 0) {
      menuItems.forEach((button) => {
        button.classList.toggle('active', button.dataset.panel === panel);
      });
    }
    // Keep the bottom nav highlight in sync too — closing a panel with × or the
    // backdrop used to leave 統計 / 記録 looking selected.
    if (navItems && navItems.length > 0) {
      const activeTab = Object.prototype.hasOwnProperty.call(panelNavTab, panel) ? panelNavTab[panel] : '';
      navItems.forEach((button) => {
        button.classList.toggle('active', (button.getAttribute('data-nav-tab') || '') === activeTab);
      });
    }
  } catch (e) { /* ignore */ }
}

// Main page (practice area + header/footer empty space) click -> close any open panel and return Home.
// Settings/Progress/Saved panels are position:fixed (outside .screen-content),
// so a document-level listener is needed — but panel/menu/quiz clicks are ignored.
document.addEventListener('click', (event) => {
  try {
    const target = event.target;
    if (!target || typeof target.closest !== 'function') return;
    // Clicks inside panels, menus, modals or the Settings menu item itself must NOT close.
    if (target.closest('.settings-panel, .progress-panel, .saved-session-panel, .offline-panel, .side-menu, .save-progress-modal, .stroke-modal, .menu-item, .nav-item, .bottom-nav')) return;
    // Only react when some panel is actually open.
    const settingsOpen = settingsPanel && settingsPanel.classList.contains('is-open');
    const progressOpen = progressPanel && progressPanel.classList.contains('is-open');
    const savedOpen = savedSessionPanel && savedSessionPanel.classList.contains('is-open');
    const offlineOpen = offlinePanel && offlinePanel.classList.contains('is-open');
    if (!settingsOpen && !progressOpen && !savedOpen && !offlineOpen) return;
    // Only clicks on the main page surface (practice area / phone frame background).
    if (!target.closest('.screen-content, .phone-frame, .page-shell')) return;
    if (settingsOpen) settingsPanel.classList.remove('is-open');
    if (progressOpen) progressPanel.classList.remove('is-open');
    if (savedOpen) savedSessionPanel.classList.remove('is-open');
    if (offlineOpen) offlinePanel.classList.remove('is-open');
    setActiveMenuItem('home');
  } catch (e) { /* never break clicks */ }
});

menuItems.forEach((item) => {
  item.addEventListener('click', () => {
    setActiveMenuItem(item.dataset.panel);

    if (item.dataset.panel === 'settings') {
      settingsPanel.classList.add('is-open');
      if (progressPanel) progressPanel.classList.remove('is-open');
      if (offlinePanel) offlinePanel.classList.remove('is-open');
      savedSessionPanel.classList.remove('is-open');
      sideMenu.classList.remove('is-open');
      return;
    }

    if (item.dataset.panel === 'progress') {
      renderProgressPanel();
      if (progressPanel) progressPanel.classList.add('is-open');
      settingsPanel.classList.remove('is-open');
      if (offlinePanel) offlinePanel.classList.remove('is-open');
      savedSessionPanel.classList.remove('is-open');
      sideMenu.classList.remove('is-open');
      return;
    }

    if (item.dataset.panel === 'saved') {
      renderSavedSessions();
      savedSessionPanel.classList.add('is-open');
      settingsPanel.classList.remove('is-open');
      if (progressPanel) progressPanel.classList.remove('is-open');
      if (offlinePanel) offlinePanel.classList.remove('is-open');
      sideMenu.classList.remove('is-open');
      return;
    }

    if (item.dataset.panel === 'offline') {
      openOfflinePanel();
      return;
    }

    if (item.dataset.panel === 'home') {
      savedSessionPanel.classList.remove('is-open');
      settingsPanel.classList.remove('is-open');
      if (progressPanel) progressPanel.classList.remove('is-open');
      if (offlinePanel) offlinePanel.classList.remove('is-open');
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

if (autoNextDelaySelect) {
autoNextDelaySelect.addEventListener('change', (event) => {
  const val = Number(event.target.value);
  const safe = AUTO_NEXT_DELAY_OPTIONS.includes(val) ? val : defaults.autoNextDelay;
  const current = loadSettings();
  const updated = { ...current, autoNextDelay: safe };
  try { localStorage.setItem('kanji-settings', JSON.stringify(updated)); } catch (e) { /* ignore */ }
  if (autoNextDelaySelect) autoNextDelaySelect.value = String(safe);
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
  // Offline pack entries already carry the downloaded (translated) meaning —
  // never hit the network when the quiz is served from an offline pack.
  try {
    if (typeof window !== 'undefined' && window.__quizFromOfflinePack === true) return;
  } catch (e) { /* ignore */ }
  if (isDeviceOffline()) return;
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

function shuffleArray(values) {
  const arr = Array.isArray(values) ? [...values] : [];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function refreshOfflineSourceLabel() {
  try {
    if (typeof updatePracticeTopLabel === 'function') updatePracticeTopLabel();
    if (window.__quizFromOfflinePack === true && practiceTopLabel) {
      practiceTopLabel.textContent += ' · 📴 offline';
    }
  } catch (e) { /* never break UI */ }
}

function renderQuizCard() {
  if (autoNextTimer) {
    clearTimeout(autoNextTimer);
    autoNextTimer = null;
  }

  const currentPool = getCurrentKanjiPool();
  try {
    window.__quizFromOfflinePack = shouldUseOfflinePack() && Array.isArray(currentPool) && currentPool.length > 0;
  } catch (e) { /* ignore */ }
  if (!currentPool || currentPool.length === 0) {
    if (kanjiWord) kanjiWord.textContent = '—';
    if (kanjiMeta) kanjiMeta.classList.add('hidden');
    return;
  }

  const card = currentPool[Math.floor(Math.random() * currentPool.length)];

  try { refreshOfflineSourceLabel(); } catch (e) { /* ignore */ }

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
    // Offline pack entries already store the final meaning — use it as-is.
    // Online entries keep the old behaviour (cached/offline-dict + live fetch).
    try {
      metaRows[1].children[1].textContent = (window.__quizFromOfflinePack === true)
        ? (card.meaning || '—')
        : (localizedMeaning(card.meaning) || '—');
    } catch (e) {
      metaRows[1].children[1].textContent = card.meaning || '—';
    }
    metaRows[2].children[1].textContent = card.example || '—';
    enhanceMeaningTranslation(card);
  }

  const allPools = [n5Kanji, n4Kanji, n3Kanji, n2Kanji, n1Kanji]
    .filter(Array.isArray)
    .flat();

  // Offline pack mode: build wrong options only from the downloaded pack text —
  // the full online pools may be unavailable / stale while offline.
  const distractorSource = (window.__quizFromOfflinePack === true) ? currentPool : allPools;
  const uniqueReadings = [...new Set(
    distractorSource
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

  // Shuffle FIRST, then slice — otherwise .slice(0, 9) always picks the same
  // first 9 readings (original data order) and wrong options keep repeating.
  const distractors = shuffleArray(
    candidateDistractors.filter((value) => value !== (card.reading || ''))
  ).slice(0, 9);

  const fallbackOptions = ['にほんご', 'みず', 'やま', 'きょう', 'あめ', 'おはよう'];
  const choicePool = shuffleArray([card.reading || '', ...distractors, ...fallbackOptions]
    .filter((value, index, array) => typeof value === 'string' && value.trim() && array.indexOf(value) === index)
    .filter((value) => value !== (card.reading || '')));

  const choices = shuffleArray([card.reading || '', ...choicePool]
    .filter((value, index, array) => value && array.indexOf(value) === index)
    .slice(0, 4));

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
  // The bundled window.KANJI_*_DATA arrays are the curated source of truth: they
  // ship with the app, work offline and are what tools/check-*.js validate. A
  // level only falls back to the remote pool (and then to the local .json file)
  // when its bundled data is missing — previously all five GitHub pools were
  // downloaded and then silently overwritten by the bundled data.
  await Promise.all(
    Object.keys(publicLevelSource).map(async (levelName) => {
      if (loadLocalLevelFallback(levelName).length > 0) return;
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

  await Promise.all(
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
      }, getAutoNextDelay());
    };

    const correctButton = [...answerButtons].find((option) => option.dataset.isCorrect === 'true');

    if (button.dataset.isCorrect === 'true') {
      // Green hit -> lock everything + show meaning section + auto next
      try { logFirstAttemptResult(currentKanjiChar, wrongAttempts === 0); } catch (e) { /* ignore */ }
      answerButtons.forEach((option) => {
        option.disabled = true;
      });
      button.classList.add('correct', 'selected');
      revealTranslation();
      refreshStreakBadge();
      scheduleAutoNext();
    } else {
      // Wrong -> red only on clicked button, keep other 2 options clickable
      wrongAttempts += 1;
      button.disabled = true;
      button.classList.add('wrong', 'selected');

      if (wrongAttempts >= 3) {
        // 3rd attempt fail -> lock everything, show correct green + meaning section + auto next
        try { logFirstAttemptResult(currentKanjiChar, false); } catch (e) { /* ignore */ }
        answerButtons.forEach((option) => {
          option.disabled = true;
        });
        if (correctButton) {
          correctButton.classList.add('correct');
        }
        revealTranslation();
        refreshStreakBadge();
        scheduleAutoNext();
      }
    }
  });
});

function speakKanjiReading(skipLimit) {
  try {
    // Offline pack mode excludes voice — needs internet (device voice data / TTS).
    if (isDeviceOffline() && shouldUseOfflinePack()) {
      showLimitToast('Voice needs internet.');
      return;
    }
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
    // Offline pack mode excludes hints — hint builder data is online-only.
    if (isDeviceOffline() && shouldUseOfflinePack()) {
      box.textContent = '💡 Hints need internet.';
      box.dataset.kanji = currentKanjiChar;
      box.hidden = false;
      return;
    }
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
    const tab = item.getAttribute('data-nav-tab') || '';
    if (tab === 'offline') {
      openOfflinePanel();
      setActiveMenuItem('offline');
      return;
    }
    if (tab === 'stats') {
      try { renderProgressPanel(); } catch (e) { /* ignore */ }
      if (progressPanel) progressPanel.classList.add('is-open');
      if (settingsPanel) settingsPanel.classList.remove('is-open');
      if (savedSessionPanel) savedSessionPanel.classList.remove('is-open');
      if (offlinePanel) offlinePanel.classList.remove('is-open');
      setActiveMenuItem('progress');
      return;
    }
    if (tab === 'record') {
      try { renderSavedSessions(); } catch (e) { /* ignore */ }
      if (savedSessionPanel) savedSessionPanel.classList.add('is-open');
      if (settingsPanel) settingsPanel.classList.remove('is-open');
      if (progressPanel) progressPanel.classList.remove('is-open');
      if (offlinePanel) offlinePanel.classList.remove('is-open');
      setActiveMenuItem('saved');
      return;
    }
    if (tab === 'settings' || item.textContent.includes('設定')) {
      if (settingsPanel) settingsPanel.classList.add('is-open');
      if (progressPanel) progressPanel.classList.remove('is-open');
      if (savedSessionPanel) savedSessionPanel.classList.remove('is-open');
      if (offlinePanel) offlinePanel.classList.remove('is-open');
      setActiveMenuItem('settings');
    } else {
      // Home (or other bottom tab) -> close panels and return to main page.
      closeAllPanels();
    }
  });
});

if (closeOfflinePanel) {
  closeOfflinePanel.addEventListener('click', () => {
    closeOfflinePanelUI();
  });
}

const footerOfflineBtn = document.getElementById('footerOfflineBtn');
if (footerOfflineBtn) {
  footerOfflineBtn.addEventListener('click', (event) => {
    if (event) event.stopPropagation();
    openOfflinePanel();
    try { setActiveMenuItem('offline'); } catch (e) { /* ignore */ }
  });
}

if (offlinePanel) {
  offlinePanel.addEventListener('click', (event) => {
    if (event.target === offlinePanel) {
      closeOfflinePanelUI();
    }
  });
}

if (offlineDownloadBtn) {
  offlineDownloadBtn.addEventListener('click', () => {
    downloadOfflinePack();
  });
}

if (offlineModeToggle) {
  offlineModeToggle.addEventListener('click', () => {
    try {
      const next = !isOfflineModePreferred();
      setOfflinePref({ ...(getOfflinePref() || {}), useOffline: next });
      refreshOfflineUI();
      renderQuizCard();
    } catch (error) { /* ignore */ }
  });
}

try {
  window.addEventListener('online', () => { try { renderQuizCard(); } catch (e) { /* ignore */ } });
  window.addEventListener('offline', () => { try { renderQuizCard(); } catch (e) { /* ignore */ } });
} catch (error) { /* ignore */ }

try {
  applySettings();
} catch (error) { /* keep UI alive */ }
try { refreshHelperLimitUI(); } catch (error) { /* ignore */ }
try { refreshStreakBadge(); } catch (error) { /* ignore */ }
try {
  if (Object.keys(loadProgressSnapshot()).length > 0) {
    setTimeout(() => showResumeProgressPrompt(), 200);
  } else {
    renderQuizCard();
  }
} catch (error) {
  try { renderQuizCard(); } catch (innerError) { /* ignore */ }
}
