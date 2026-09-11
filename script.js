const body = document.body;
const menuButton = document.getElementById('menuButton');
const sideMenu = document.getElementById('sideMenu');
const screenContent = document.querySelector('.screen-content');
const settingsPanel = document.getElementById('settingsPanel');
const closePanel = document.getElementById('closePanel');
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
  const saved = JSON.parse(localStorage.getItem('kanji-settings') || '{}');
  return { ...defaults, ...saved };
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
  en: { write: 'Write', read: 'Read', meaning: 'Meaning', next: 'Next' },
  phil: { write: 'Sumulat', read: 'Basahin', meaning: 'Kahulugan', next: 'Susunod' },
  id: { write: 'Tulis', read: 'Baca', meaning: 'Arti', next: 'Berikutnya' },
  ne: { write: 'लिख्नु', read: 'पढ्नु', meaning: 'अर्थ', next: 'अर्को' },
  ko: { write: '쓰기', read: '읽기', meaning: '의미', next: '다음' },
  vi: { write: 'Viết', read: 'Đọc', meaning: 'Ý nghĩa', next: 'Tiếp' }
};

const nepaliNumberMap = {
  one: '१', two: '२', three: '३', four: '४', five: '५', six: '६', seven: '७', eight: '८', nine: '९', ten: '१०',
  eleven: '११', twelve: '१२', thirteen: '१३', fourteen: '१४', fifteen: '१५', sixteen: '१६', seventeen: '१७', eighteen: '१८', nineteen: '१९', twenty: '२०'
};

function localizedMeaning(value) {
  const language = (languageSelect && languageSelect.value) || 'en';
  if (language !== 'ne' || typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim().toLowerCase();
  return nepaliNumberMap[normalized] || value;
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
    actionButtons[0].querySelector('span:last-child').textContent = labels.write;
    actionButtons[1].querySelector('span:last-child').textContent = labels.read;
    actionButtons[2].querySelector('span:last-child').textContent = labels.meaning;
    actionButtons[3].querySelector('span:last-child').textContent = labels.next;
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
  const settings = loadSettings();
  body.dataset.theme = settings.theme;
  soundToggle.classList.toggle('active', settings.sound);
  soundToggle.setAttribute('aria-pressed', String(settings.sound));
  vibrationToggle.classList.toggle('active', settings.vibration);
  vibrationToggle.setAttribute('aria-pressed', String(settings.vibration));
  backgroundSelect.value = settings.theme;
  fontSizeRange.value = settings.fontSize;
  document.documentElement.style.setProperty('--kanji-font-size', `${settings.fontSize}px`);
  document.documentElement.style.setProperty('--word-size', `${Math.max(64, settings.fontSize * 3.4)}px`);

  if (levelSelect) {
    const levelValue = ['N5', 'N4', 'N3', 'N2', 'N1'].includes(settings.level) ? settings.level : 'N5';
    levelSelect.value = levelValue;
  }

  if (languageSelect) {
    languageSelect.value = settings.language || 'en';
  }

  updatePracticeTopLabel();
  updateMetaLabels();
  updateActionLabels();
  renderQuizCard();
}

function saveSettings(next) {
  const current = loadSettings();
  const updated = { ...current, ...next };
  localStorage.setItem('kanji-settings', JSON.stringify(updated));
  applySettings();
}

function getSavedSessions() {
  try {
    const stored = JSON.parse(localStorage.getItem('kanji-saved-sessions') || '[]');
    return Array.isArray(stored) ? stored : [];
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
  const merged = [nextSession, ...sessions.filter((item) => item.id !== nextSession.id)].slice(0, 8);
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
  saveProgressSnapshot();
  const message = 'Save your Kanji practice progress before closing?';
  event.preventDefault();
  event.returnValue = message;
  showSaveProgressPrompt();
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
        localStorage.removeItem('kanji-progress');
      }
    }
    hideSaveProgressPrompt();
  });
}

applySettings();
if (Object.keys(loadProgressSnapshot()).length > 0) {
  setTimeout(() => showResumeProgressPrompt(), 200);
} else {
  renderQuizCard();
}

loadKanjiData();

menuButton.addEventListener('click', () => {
  sideMenu.classList.toggle('is-open');
});

document.addEventListener('click', (event) => {
  const target = event.target;
  const clickedInsideMenu = sideMenu.contains(target);
  const clickedMenuButton = menuButton.contains(target);

  if (!clickedInsideMenu && !clickedMenuButton && sideMenu.classList.contains('is-open')) {
    sideMenu.classList.remove('is-open');
  }
});

closePanel.addEventListener('click', () => {
  settingsPanel.classList.remove('is-open');
});

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
      savedSessionPanel.classList.remove('is-open');
      sideMenu.classList.remove('is-open');
      return;
    }

    if (item.dataset.panel === 'saved') {
      renderSavedSessions();
      savedSessionPanel.classList.add('is-open');
      settingsPanel.classList.remove('is-open');
      sideMenu.classList.remove('is-open');
      return;
    }

    if (item.dataset.panel === 'home') {
      savedSessionPanel.classList.remove('is-open');
      settingsPanel.classList.remove('is-open');
    }

    sideMenu.classList.remove('is-open');
  });
});

soundToggle.addEventListener('click', () => {
  const enabled = !soundToggle.classList.contains('active');
  saveSettings({ sound: enabled });
});

vibrationToggle.addEventListener('click', () => {
  const enabled = !vibrationToggle.classList.contains('active');
  saveSettings({ vibration: enabled });
});

backgroundSelect.addEventListener('change', (event) => {
  saveSettings({ theme: event.target.value });
});

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
};

function renderQuizCard() {
  const currentPool = getCurrentKanjiPool();
  if (!currentPool || currentPool.length === 0) {
    if (kanjiWord) kanjiWord.textContent = '—';
    if (kanjiMeta) kanjiMeta.classList.add('hidden');
    return;
  }

  const card = currentPool[Math.floor(Math.random() * currentPool.length)];

  if (kanjiWord) {
    kanjiWord.textContent = card.kanji || '—';
  }

  if (metaRows.length >= 3) {
    metaRows[0].children[1].textContent = card.reading || '—';
    metaRows[1].children[1].textContent = localizedMeaning(card.meaning) || '—';
    metaRows[2].children[1].textContent = card.example || '—';
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
    if (button.textContent === card.reading) {
      button.classList.add('correct');
    }
  });

  if (kanjiMeta) {
    kanjiMeta.classList.add('hidden');
  }
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
    revealTranslation();

    const correctButton = [...answerButtons].find((option) => option.classList.contains('correct'));

    answerButtons.forEach((option) => {
      option.disabled = true;
      option.classList.remove('selected', 'wrong', 'correct');
      if (option.textContent === (correctButton ? correctButton.textContent : '')) {
        option.classList.add('correct');
      }
    });

    button.classList.remove('correct');
    if (button.textContent === (correctButton ? correctButton.textContent : '')) {
      button.classList.add('correct', 'selected');
    } else {
      button.classList.add('wrong', 'selected');
      if (correctButton) {
        correctButton.classList.add('correct', 'selected');
      }
    }
  });
});

fontSizeRange.addEventListener('input', (event) => {
  saveSettings({ fontSize: Number(event.target.value) });
});
navItems.forEach((item) => {
  item.addEventListener('click', () => {
    navItems.forEach((button) => button.classList.remove('active'));
    item.classList.add('active');
    if (item.textContent.includes('設定') || item.textContent.includes('設定')) {
      settingsPanel.classList.add('is-open');
    }
  });
});

applySettings();
if (Object.keys(loadProgressSnapshot()).length > 0) {
  setTimeout(() => showResumeProgressPrompt(), 200);
} else {
  renderQuizCard();
}
