const body = document.body;
const menuButton = document.getElementById('menuButton');
const sideMenu = document.getElementById('sideMenu');
const settingsPanel = document.getElementById('settingsPanel');
const closePanel = document.getElementById('closePanel');
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

function loadSettings() {
  const saved = JSON.parse(localStorage.getItem('kanji-settings') || '{}');
  return { ...defaults, ...saved };
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

  if (practiceTopLabel) {
    const lvl = levelSelect ? levelSelect.value : (settings.level || 'N5');
    practiceTopLabel.textContent = `今日の練習: ${lvl} 漢字`;
  }

  renderQuizCard();
}

function saveSettings(next) {
  const current = loadSettings();
  const updated = { ...current, ...next };
  localStorage.setItem('kanji-settings', JSON.stringify(updated));
  applySettings();
}

loadKanjiData();

menuButton.addEventListener('click', () => {
  sideMenu.classList.toggle('is-open');
});

closePanel.addEventListener('click', () => {
  settingsPanel.classList.remove('is-open');
});

menuItems.forEach((item) => {
  item.addEventListener('click', () => {
    menuItems.forEach((button) => button.classList.remove('active'));
    item.classList.add('active');

    if (item.dataset.panel === 'settings') {
      settingsPanel.classList.add('is-open');
      sideMenu.classList.remove('is-open');
    }
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
    if (practiceTopLabel) practiceTopLabel.textContent = `今日の練習: ${val} 漢字`;
    saveSettings({ level: val });
    renderQuizCard();
  };
  levelSelect.addEventListener('change', (e) => updateLevel(e.target.value));
  levelSelect.addEventListener('input', (e) => updateLevel(e.target.value));
}

if (languageSelect) {
  languageSelect.addEventListener('change', (event) => {
    saveSettings({ language: event.target.value });
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
    metaRows[1].children[1].textContent = card.meaning || '—';
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

function loadKanjiData() {
  if (Array.isArray(window.KANJI_N5_DATA) && window.KANJI_N5_DATA.length > 0) {
    n5Kanji = window.KANJI_N5_DATA;
  } else {
    const request = new XMLHttpRequest();
    request.open('GET', 'kanji-n5-data.json', true);
    request.onreadystatechange = function () {
      if (request.readyState !== 4) return;

      if (request.status >= 200 && request.status < 300) {
        try {
          n5Kanji = JSON.parse(request.responseText);
        } catch (error) {
          n5Kanji = [];
        }
      } else {
        n5Kanji = [];
      }
      renderQuizCard();
    };
    request.send();
  }

  if (Array.isArray(window.KANJI_N4_DATA) && window.KANJI_N4_DATA.length > 0) {
    n4Kanji = window.KANJI_N4_DATA;
  } else {
    const n4Request = new XMLHttpRequest();
    n4Request.open('GET', 'kanji-n4-data.json', true);
    n4Request.onreadystatechange = function () {
      if (n4Request.readyState !== 4) return;

      if (n4Request.status >= 200 && n4Request.status < 300) {
        try {
          n4Kanji = JSON.parse(n4Request.responseText);
        } catch (error) {
          n4Kanji = [];
        }
      } else {
        n4Kanji = [];
      }
      renderQuizCard();
    };
    n4Request.send();
  }

  if (Array.isArray(window.KANJI_N3_DATA) && window.KANJI_N3_DATA.length > 0) {
    n3Kanji = window.KANJI_N3_DATA;
  } else {
    const n3Request = new XMLHttpRequest();
    n3Request.open('GET', 'kanji-n3-data.json', true);
    n3Request.onreadystatechange = function () {
      if (n3Request.readyState !== 4) return;

      if (n3Request.status >= 200 && n3Request.status < 300) {
        try {
          n3Kanji = JSON.parse(n3Request.responseText);
        } catch (error) {
          n3Kanji = [];
        }
      } else {
        n3Kanji = [];
      }
      renderQuizCard();
    };
    n3Request.send();
  }

  if (Array.isArray(window.KANJI_N2_DATA) && window.KANJI_N2_DATA.length > 0) {
    n2Kanji = window.KANJI_N2_DATA;
  } else {
    const n2Request = new XMLHttpRequest();
    n2Request.open('GET', 'kanji-n2-data.json', true);
    n2Request.onreadystatechange = function () {
      if (n2Request.readyState !== 4) return;

      if (n2Request.status >= 200 && n2Request.status < 300) {
        try {
          n2Kanji = JSON.parse(n2Request.responseText);
        } catch (error) {
          n2Kanji = [];
        }
      } else {
        n2Kanji = [];
      }
      renderQuizCard();
    };
    n2Request.send();
  }

  if (Array.isArray(window.KANJI_N1_DATA) && window.KANJI_N1_DATA.length > 0) {
    n1Kanji = window.KANJI_N1_DATA;
  } else {
    const n1Request = new XMLHttpRequest();
    n1Request.open('GET', 'kanji-n1-data.json', true);
    n1Request.onreadystatechange = function () {
      if (n1Request.readyState !== 4) return;

      if (n1Request.status >= 200 && n1Request.status < 300) {
        try {
          n1Kanji = JSON.parse(n1Request.responseText);
        } catch (error) {
          n1Kanji = [];
        }
      } else {
        n1Kanji = [];
      }
      renderQuizCard();
    };
    n1Request.send();
  }

  renderQuizCard();
}

answerButtons.forEach((button) => {
  button.addEventListener('click', () => {
    revealTranslation();

    answerButtons.forEach((option) => {
      option.disabled = true;
      option.classList.remove('selected');
      if (option.classList.contains('correct')) {
        option.classList.add('selected');
      }
    });

    if (!button.classList.contains('correct')) {
      const correctButton = [...answerButtons].find((option) => option.classList.contains('correct'));
      if (correctButton) {
        correctButton.classList.add('selected');
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

renderQuizCard();
applySettings();
