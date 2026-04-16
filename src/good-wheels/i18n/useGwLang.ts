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
    if (v === 'EN' || v === 'ES') return v;
  } catch { /* ignore */ }
  return 'EN';
}

interface GwLangState {
  lang: GwLang;
  setLang: (l: GwLang) => void;
  t: (key: GwTranslationKey) => string;
}

export const useGwLang = create<GwLangState>((set, get) => ({
  lang: readLang(),

  setLang: (lang) => {
    try { localStorage.setItem(LS_KEY, lang); } catch { /* ignore */ }
    set({ lang });
  },

  t: (key) => {
    const { lang } = get();
    return GW_TRANSLATIONS[lang][key] ?? GW_TRANSLATIONS.EN[key] ?? key;
  },
}));
