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
    levelSelect.value = settings.level || 'N5';
  }

  if (languageSelect) {
    languageSelect.value = settings.language || 'en';
  }

  if (practiceTopLabel) {
    const lvl = settings.level || 'N5';
    practiceTopLabel.textContent = `今日の練習: ${lvl} 漢字`;
  }
}

function saveSettings(next) {
  const current = loadSettings();
  const updated = { ...current, ...next };
  localStorage.setItem('kanji-settings', JSON.stringify(updated));
  applySettings();
}

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
  };
  levelSelect.addEventListener('change', (e) => updateLevel(e.target.value));
  levelSelect.addEventListener('input', (e) => updateLevel(e.target.value));
}

if (languageSelect) {
  languageSelect.addEventListener('change', (event) => {
    saveSettings({ language: event.target.value });
  });
}

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
