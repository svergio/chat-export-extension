import LN_en from '../../locales/LN_en.json' with { type: 'json' };
import LN_ru from '../../locales/LN_ru.json' with { type: 'json' };

export const LOCALES = Object.freeze(['auto', 'en', 'ru']);

const PACKS = Object.freeze({
  en: LN_en,
  ru: LN_ru
});

function detectBrowserLocale() {
  let raw = '';
  try {
    if (typeof chrome !== 'undefined' && chrome.i18n && typeof chrome.i18n.getUILanguage === 'function') {
      raw = String(chrome.i18n.getUILanguage() || '');
    }
  } catch (e) {
    raw = '';
  }
  if (!raw && typeof navigator !== 'undefined') {
    raw = String(navigator.language || navigator.userLanguage || '');
  }
  const low = raw.toLowerCase();
  if (low.indexOf('ru') === 0) return 'ru';
  return 'en';
}

export function resolveLocale(localeSetting) {
  if (localeSetting === 'en' || localeSetting === 'ru') return localeSetting;
  return detectBrowserLocale();
}

export function createTranslator(localeCode) {
  const code = localeCode === 'ru' ? 'ru' : 'en';
  const pack = PACKS[code] || PACKS.en;
  const fallback = PACKS.en;
  return function t(key) {
    const k = String(key || '');
    if (Object.prototype.hasOwnProperty.call(pack, k) && pack[k] != null) return String(pack[k]);
    if (Object.prototype.hasOwnProperty.call(fallback, k) && fallback[k] != null) return String(fallback[k]);
    return k;
  };
}

export function faqKeys() {
  return ['faq.1', 'faq.2', 'faq.3', 'faq.4', 'faq.5'];
}
