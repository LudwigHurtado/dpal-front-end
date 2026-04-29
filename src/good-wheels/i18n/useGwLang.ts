/**
 * Good Wheels — language store
 * Persists the user's chosen language in localStorage.
 * Usage:  const t = useGwLang(s => s.t);  then  t('signOut')
 */

import { create } from 'zustand';
import { GW_TRANSLATIONS, type GwLang, type GwTranslationKey } from './gwTranslations';

const LS_KEY = 'gw_lang';

function readLang(): GwLang {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v === 'en' || v === 'es' || v === 'pt') return v;
    if (v === 'EN') return 'en';
    if (v === 'ES') return 'es';
  } catch { /* ignore */ }
  return 'en';
}

interface GwLangState {
  lang: GwLang;
  setLang: (l: GwLang) => void;
  t: (key: GwTranslationKey) => string;
  tf: (key: GwTranslationKey, values: Record<string, string | number>) => string;
}

export const useGwLang = create<GwLangState>((set, get) => ({
  lang: readLang(),

  setLang: (lang) => {
    try { localStorage.setItem(LS_KEY, lang); } catch { /* ignore */ }
    set({ lang });
  },

  t: (key) => {
    const { lang } = get();
    return GW_TRANSLATIONS[lang][key] ?? GW_TRANSLATIONS.en[key] ?? key;
  },

  tf: (key, values) => {
    const { lang } = get();
    const template = GW_TRANSLATIONS[lang][key] ?? GW_TRANSLATIONS.en[key] ?? key;
    return Object.entries(values).reduce((acc, [k, v]) => {
      return acc.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g'), String(v));
    }, template);
  },
}));
